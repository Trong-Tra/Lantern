package protocol

import (
	"context"
	"encoding/json"
	"math/big"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

// startWS serves the protocol handler on a test server and returns the
// ws:// URL of the endpoint.
func startWS(t *testing.T, h *Hub) string {
	t.Helper()
	srv := httptest.NewServer(Handler(h))
	t.Cleanup(srv.Close)
	return "ws" + strings.TrimPrefix(srv.URL, "http") + "/quotes"
}

func dialWS(t *testing.T, url string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.CloseNow() })
	return conn
}

func readFrame[T any](t *testing.T, conn *websocket.Conn) T {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, data, err := conn.Read(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var msg T
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("unmarshal %s: %v", data, err)
	}
	return msg
}

func writeFrame(t *testing.T, conn *websocket.Conn, msg any) {
	t.Helper()
	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := conn.Write(ctx, websocket.MessageText, data); err != nil {
		t.Fatal(err)
	}
}

// TestWS_UserOpensIntentSolverStreamsQuotePick drives the full wire flow:
// solver subscribes → user opens intent → solver receives broadcast →
// submits signed quote → user sees the offer → user picks.
func TestWS_FullFlow(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	url := startWS(t, h)

	solverConn := dialWS(t, url)
	writeFrame(t, solverConn, map[string]string{"type": "subscribe_intents"})
	userConn := dialWS(t, url)

	writeFrame(t, userConn, IntentMsg{
		Type: TypeIntent, User: intentUser, TokenIn: tokenIn, TokenOut: tokenOut,
		AmountIn: "1000000000000000000",
	})
	opened := readFrame[IntentOpenedMsg](t, userConn)
	if opened.Type != TypeIntentOpened || opened.IntentID == "" {
		t.Fatalf("got %+v", opened)
	}

	// The solver receives the intent broadcast.
	ev := readFrame[IntentEventMsg](t, solverConn)
	if ev.IntentID != opened.IntentID {
		t.Fatalf("intentId = %s, want %s", ev.IntentID, opened.IntentID)
	}

	// Solver answers with a signed quote.
	q := validQuote(t, 7)
	q.Deadline = jsonNumber(time.Now().Add(45 * time.Second).Unix())
	sig := signNonce(t, keyHex, big.NewInt(7))
	writeFrame(t, solverConn, QuoteMsg{Type: TypeQuote, IntentID: opened.IntentID, Quote: q, Signature: sig})

	offer := readFrame[QuoteOfferMsg](t, userConn)
	if offer.Type != TypeQuote || offer.IntentID != opened.IntentID {
		t.Fatalf("got %+v", offer)
	}

	// User picks; the close frame follows.
	writeFrame(t, userConn, PickMsg{Type: TypePick, IntentID: opened.IntentID, QuoteID: offer.QuoteID})
	picked := readFrame[PickedMsg](t, userConn)
	if picked.Type != TypePicked || picked.Signature != sig {
		t.Fatalf("got %+v", picked)
	}
	closed := readFrame[ClosedMsg](t, userConn)
	if closed.Type != TypeClosed || closed.Reason != "picked" {
		t.Fatalf("got %+v", closed)
	}
}

// TestWS_ErrorFrames: malformed / unknown frames get an error reply and the
// connection stays usable.
func TestWS_ErrorFrames(t *testing.T) {
	_, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	url := startWS(t, h)
	conn := dialWS(t, url)

	writeFrame(t, conn, map[string]string{"type": "nonsense"})
	if msg := readFrame[ErrorMsg](t, conn); msg.Type != TypeError {
		t.Fatalf("got %+v", msg)
	}

	writeFrame(t, conn, map[string]string{"type": "pick", "intentId": "i-404", "quoteId": "x"})
	if msg := readFrame[ErrorMsg](t, conn); msg.Type != TypeError {
		t.Fatalf("got %+v", msg)
	}

	// Still alive: a valid intent opens.
	writeFrame(t, conn, IntentMsg{
		Type: TypeIntent, User: intentUser, TokenIn: tokenIn, TokenOut: tokenOut,
		AmountIn: "1000000000000000000",
	})
	if msg := readFrame[IntentOpenedMsg](t, conn); msg.Type != TypeIntentOpened {
		t.Fatalf("got %+v", msg)
	}
}

// TestWS_ExternalSolverRejectedByVerifier: a quote signed by a non-owner
// key never reaches the user (error frame on the solver connection).
func TestWS_ExternalSolverRejected(t *testing.T) {
	_, owner := testKey(t)
	rogueKey, _ := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	url := startWS(t, h)

	userConn := dialWS(t, url)
	writeFrame(t, userConn, IntentMsg{
		Type: TypeIntent, User: intentUser, TokenIn: tokenIn, TokenOut: tokenOut,
		AmountIn: "1000000000000000000",
	})
	opened := readFrame[IntentOpenedMsg](t, userConn)

	solverConn := dialWS(t, url)
	q := validQuote(t, 7)
	q.Deadline = jsonNumber(time.Now().Add(45 * time.Second).Unix())
	sig := signNonce(t, rogueKey, big.NewInt(7))
	writeFrame(t, solverConn, QuoteMsg{Type: TypeQuote, IntentID: opened.IntentID, Quote: q, Signature: sig})

	if msg := readFrame[ErrorMsg](t, solverConn); msg.Type != TypeError {
		t.Fatalf("solver got %+v, want error", msg)
	}
	// User sees nothing.
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	_, _, err := userConn.Read(ctx)
	if err == nil {
		t.Fatal("user received a frame, want silence")
	}
}

func jsonNumber(n int64) string {
	b, _ := json.Marshal(n)
	return string(b)
}
