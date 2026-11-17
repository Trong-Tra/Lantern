package marketdata

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func fakeInfoServer(t *testing.T, mids map[string]string, candles []map[string]any) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]any
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Errorf("info: bad body: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		switch req["type"] {
		case "candleSnapshot":
			_ = json.NewEncoder(w).Encode(candles)
		case "metaAndAssetCtxs":
			universe := []map[string]any{}
			ctxs := []map[string]any{}
			for name := range mids {
				universe = append(universe, map[string]any{"name": name})
				ctxs = append(ctxs, map[string]any{"markPx": mids[name]})
			}
			// Live shape: [{"universe":[...]}, [ctxs...]].
			_ = json.NewEncoder(w).Encode([]any{map[string]any{"universe": universe}, ctxs})
		default:
			t.Errorf("info: unexpected type %v", req["type"])
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func candleRows() []map[string]any {
	return []map[string]any{
		{"t": int64(1700000000000), "T": int64(1700003599999), "s": "BTC", "i": "1h",
			"o": "64000.0", "h": "64500.0", "l": "63800.0", "c": "64200.0", "v": "123.4", "n": 10},
		{"t": int64(1700003600000), "T": int64(1700007199999), "s": "BTC", "i": "1h",
			"o": "64200.0", "h": "64300.0", "l": "64100.0", "c": "64250.0", "v": "88.8", "n": 5},
	}
}

func newTestHL(infoURL, wsURL string, store *Store) *HL {
	h := NewHL([]string{"BTC", "ETH"}, []candleSpec{{interval: "1h", history: 168 * time.Hour}}, store)
	h.infoURL = infoURL
	h.wsURL = wsURL
	return h
}

func TestHL_Boot(t *testing.T) {
	info := fakeInfoServer(t, map[string]string{"BTC": "64000.5", "ETH": "1800.0"}, candleRows())
	store := NewStore()
	h := newTestHL(info.URL, "", store)
	h.boot(context.Background())

	if got := store.Candles("BTC", "1h", 10); len(got) != 2 || got[0].O != 64000 || got[1].C != 64250 {
		t.Fatalf("candles: %+v", got)
	}
	// Open times must come from "t", never the "T" close time.
	if got := store.Candles("BTC", "1h", 10); got[0].T != 1700000000000 || got[1].T != 1700003600000 {
		t.Fatalf("candle open times: %d, %d", got[0].T, got[1].T)
	}
	prices := store.Prices()
	if prices["BTC"].USD != 64000.5 || prices["ETH"].USD != 1800 {
		t.Fatalf("prices: %+v", prices)
	}
	if store.UpdatedAt().IsZero() {
		t.Fatal("UpdatedAt not stamped")
	}
}

func TestHL_HandleFrame(t *testing.T) {
	store := NewStore()
	h := newTestHL("", "", store)

	h.handleFrame([]byte(`{"channel":"subscriptionResponse","data":{"method":"subscribe"}}`))
	h.handleFrame([]byte(`{"channel":"allMids","data":{"mids":{"BTC":"64100.0","ETH":"1810.5","SOL":"100"}}}`))
	// Frames carry BOTH t (open) and T (close) — regression for the key collision.
	h.handleFrame([]byte(`{"channel":"candle","data":{"t":1700000000000,"T":1700003599999,"s":"BTC","i":"1h","o":"64000.0","h":"64500.0","l":"63800.0","c":"64200.0","v":"123.4","n":10}}`))
	h.handleFrame([]byte(`{"channel":"error","data":"boom"}`))

	prices := store.Prices()
	if _, ok := prices["BTC"]; !ok {
		t.Fatalf("BTC price missing: %+v", prices)
	}
	if _, ok := prices["SOL"]; ok {
		t.Fatal("SOL should be filtered (not a configured coin)")
	}
	cs := store.Candles("BTC", "1h", 10)
	if len(cs) != 1 || cs[0].C != 64200 {
		t.Fatalf("candles: %+v", cs)
	}
	if cs[0].T != 1700000000000 {
		t.Fatalf("candle open time overwritten by close time: %d", cs[0].T)
	}
	// same open time replaces
	h.handleFrame([]byte(`{"channel":"candle","data":{"t":1700000000000,"s":"BTC","i":"1h","o":"64000.0","h":"64600.0","l":"63800.0","c":"64300.0","v":"200.0","n":20}}`))
	cs = store.Candles("BTC", "1h", 10)
	if len(cs) != 1 || cs[0].H != 64600 {
		t.Fatalf("candle replace: %+v", cs)
	}
}

// TestHL_WsLoop runs the client against a fake WS server that captures the
// subscription frames, pushes one mids + one candle frame, then hangs up.
func TestHL_WsLoop(t *testing.T) {
	subs := make(chan []string, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			t.Errorf("ws accept: %v", err)
			return
		}
		defer conn.Close(websocket.StatusNormalClosure, "bye")
		ctx := r.Context()
		var got []string
		for i := 0; i < 3; i++ {
			_, msg, err := conn.Read(ctx)
			if err != nil {
				break
			}
			got = append(got, string(msg))
		}
		subs <- got
		_ = conn.Write(ctx, websocket.MessageText, []byte(
			`{"channel":"allMids","data":{"mids":{"BTC":"64999.0","ETH":"1820.0"}}}`))
		_ = conn.Write(ctx, websocket.MessageText, []byte(
			`{"channel":"candle","data":{"t":1700007200000,"s":"BTC","i":"1h","o":"64250.0","h":"64310.0","l":"64200.0","c":"64300.0","v":"12.5","n":3}}`))
	}))
	t.Cleanup(srv.Close)

	store := NewStore()
	h := newTestHL("", "ws"+strings.TrimPrefix(srv.URL, "http"), store)
	err := h.wsLoop(context.Background())
	if err == nil {
		t.Fatal("wsLoop should return the server-close error")
	}

	got := <-subs
	joined := strings.Join(got, "\n")
	for _, want := range []string{`"allMids"`, `"coin":"BTC"`, `"coin":"ETH"`, `"interval":"1h"`} {
		if !strings.Contains(joined, want) {
			t.Errorf("subscription missing %s in %v", want, got)
		}
	}
	if p := store.Prices()["BTC"]; p.USD != 64999 {
		t.Fatalf("price after ws: %+v", p)
	}
	if len(store.Prices()) != 2 {
		t.Fatalf("prices should hold only configured coins: %+v", store.Prices())
	}
	cs := store.Candles("BTC", "1h", 10)
	if len(cs) != 1 || cs[0].C != 64300 || cs[0].T != 1700007200000 {
		t.Fatalf("candles after ws: %+v", cs)
	}
}

func TestHL_Run_ReconnectsUntilCancelled(t *testing.T) {
	store := NewStore()
	h := newTestHL("", "ws://127.0.0.1:1", store) // dead port → dial error
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	done := make(chan struct{})
	go func() {
		h.Run(ctx)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(6 * time.Second):
		t.Fatal("Run did not stop after ctx cancel")
	}
}
