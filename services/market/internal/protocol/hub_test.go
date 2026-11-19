package protocol

import (
	"context"
	"encoding/hex"
	"errors"
	"math/big"
	"strconv"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/lantern/market/internal/chain/bindings"
)

// fakeVerifier accepts signatures from exactly one key (the "agent owner").
type fakeVerifier struct {
	owner common.Address
	err   error // forced failure, if set
}

func (v fakeVerifier) VerifyQuote(_ context.Context, quote bindings.LanternMarketQuote, sig []byte) (common.Address, error) {
	if v.err != nil {
		return common.Address{}, v.err
	}
	// Mirror the contract: ecrecover over a placeholder digest is not the
	// point here — hub tests care about plumbing, so recover via a fixed
	// digest built from the quote's nonce (tests sign that digest).
	digest := crypto.Keccak256Hash(bigToBytes32(quote.Nonce))
	signer, err := recoverSigner(digest, sig)
	if err != nil {
		return common.Address{}, err
	}
	if signer != v.owner {
		return common.Address{}, errors.New("not agent owner")
	}
	return signer, nil
}

func bigToBytes32(n *big.Int) []byte {
	var b [32]byte
	n.FillBytes(b[:])
	return b[:]
}

func recoverSigner(digest [32]byte, sig []byte) (common.Address, error) {
	if len(sig) != 65 {
		return common.Address{}, errors.New("bad sig length")
	}
	pub, err := crypto.SigToPub(digest[:], sig)
	if err != nil {
		return common.Address{}, err
	}
	return crypto.PubkeyToAddress(*pub), nil
}

func signNonce(t *testing.T, keyHex string, nonce *big.Int) string {
	t.Helper()
	key, err := crypto.HexToECDSA(keyHex)
	if err != nil {
		t.Fatal(err)
	}
	digest := crypto.Keccak256Hash(bigToBytes32(nonce))
	sig, err := crypto.Sign(digest[:], key)
	if err != nil {
		t.Fatal(err)
	}
	return "0x" + hex.EncodeToString(sig)
}

// signRetract signs the Phase 3 retract digest with the given key.
func signRetract(t *testing.T, keyHex, intentID, quoteID string) string {
	t.Helper()
	key, err := crypto.HexToECDSA(keyHex)
	if err != nil {
		t.Fatal(err)
	}
	sig, err := SignRetract(intentID, quoteID, key)
	if err != nil {
		t.Fatal(err)
	}
	return sig
}

func testKey(t *testing.T) (string, common.Address) {
	t.Helper()
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	return hex.EncodeToString(crypto.FromECDSA(key)), crypto.PubkeyToAddress(key.PublicKey)
}

const (
	intentUser = "0x3000000000000000000000000000000000000001"
	tokenIn    = "0x200000000000000000000000000000000000000a"
	tokenOut   = "0x200000000000000000000000000000000000000b"
)

func openIntent(t *testing.T, h *Hub) (string, <-chan any) {
	t.Helper()
	id, ch, err := h.OpenIntent(IntentMsg{
		Type: TypeIntent, User: intentUser, TokenIn: tokenIn, TokenOut: tokenOut,
		AmountIn: "1000000000000000000",
	})
	if err != nil {
		t.Fatal(err)
	}
	return id, ch
}

func validQuote(t *testing.T, nonce int64) QuoteJSON {
	t.Helper()
	return QuoteJSON{
		AgentID: "1", User: intentUser, TokenIn: tokenIn, TokenOut: tokenOut,
		AmountIn: "1000000000000000000", MinOut: "990000000000000000",
		QuotedOut: "995000000000000000",
		Nonce:     big.NewInt(nonce).String(),
		Routes: []RouteJSON{{Bps: 10_000,
			Pools: []string{"0x1000000000000000000000000000000000000001"}}},
	}
}

func TestHub_QuoteStreamsToUser(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, ch := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	sig := signNonce(t, keyHex, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err != nil {
		t.Fatalf("SubmitQuote: %v", err)
	}

	msg := <-ch
	offer, ok := msg.(QuoteOfferMsg)
	if !ok {
		t.Fatalf("got %T, want QuoteOfferMsg", msg)
	}
	if offer.QuoteID != q.AgentID+":"+q.Nonce {
		t.Errorf("quoteId = %q", offer.QuoteID)
	}
}

func TestHub_RejectsBadSignature(t *testing.T) {
	_, owner := testKey(t)
	otherKey, _ := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, ch := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	// Sign with a key that is not the agent owner.
	sig := signNonce(t, otherKey, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err == nil {
		t.Fatal("expected signature rejection")
	}
	select {
	case msg := <-ch:
		t.Fatalf("user received %T, want nothing", msg)
	default:
	}
}

func TestHub_RejectsMismatchedAndDuplicateQuotes(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, _ := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	q.AmountIn = "42" // does not answer this intent
	sig := signNonce(t, keyHex, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err == nil {
		t.Fatal("expected mismatch rejection")
	}

	q = validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	if err := h.SubmitQuote(context.Background(), id, q, sig); err != nil {
		t.Fatalf("first submit: %v", err)
	}
	if err := h.SubmitQuote(context.Background(), id, q, sig); err == nil {
		t.Fatal("expected duplicate rejection")
	}
}

func TestHub_RejectsExpiredQuote(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, _ := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(-time.Second).Unix(), 10)
	sig := signNonce(t, keyHex, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err == nil {
		t.Fatal("expected expired rejection")
	}
}

func TestHub_RetractThenPickFails(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, ch := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	sig := signNonce(t, keyHex, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err != nil {
		t.Fatal(err)
	}
	<-ch // offer

	if err := h.RetractQuote(id, QuoteID(q), signRetract(t, keyHex, id, QuoteID(q))); err != nil {
		t.Fatalf("RetractQuote: %v", err)
	}
	if msg := <-ch; msg.(RetractMsg).Type != TypeRetract {
		t.Fatalf("got %v", msg)
	}
	if _, err := h.Pick(id, QuoteID(q)); err == nil {
		t.Fatal("expected pick-of-retracted rejection")
	}
}

// TestHub_RetractRequiresQuoteSigner: retractions must be signed by the
// quote's own signer — a wrong key (or no signature) never retracts.
func TestHub_RetractRequiresQuoteSigner(t *testing.T) {
	keyHex, owner := testKey(t)
	otherKey, _ := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, ch := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	sig := signNonce(t, keyHex, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err != nil {
		t.Fatal(err)
	}
	<-ch // offer

	if err := h.RetractQuote(id, QuoteID(q), ""); err == nil {
		t.Fatal("expected missing-signature rejection")
	}
	if err := h.RetractQuote(id, QuoteID(q), signRetract(t, otherKey, id, QuoteID(q))); err == nil {
		t.Fatal("expected wrong-signer rejection")
	}
	// Quote still live: a valid pick goes through.
	if _, err := h.Pick(id, QuoteID(q)); err != nil {
		t.Fatalf("Pick after failed retracts: %v", err)
	}
}

// TestHub_RetractDigestIsBound: a signature over a different intent/quote
// pair does not retract (no cross-quote replay).
func TestHub_RetractDigestIsBound(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, ch := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	sig := signNonce(t, keyHex, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err != nil {
		t.Fatal(err)
	}
	<-ch // offer

	// Signed by the right key but bound to a fabricated quote id.
	if err := h.RetractQuote(id, "1:999", signRetract(t, keyHex, id, "1:999")); err == nil {
		t.Fatal("expected unknown-quote rejection")
	}
	// Right quote id, wrong intent id in the digest.
	if err := h.RetractQuote(id, QuoteID(q), signRetract(t, keyHex, "i-forged", QuoteID(q))); err == nil {
		t.Fatal("expected wrong-signer rejection for forged intent digest")
	}
	if _, err := h.Pick(id, QuoteID(q)); err != nil {
		t.Fatalf("Pick after replayed retracts: %v", err)
	}
}

func TestHub_PickClosesIntent(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	id, ch := openIntent(t, h)

	q := validQuote(t, 7)
	q.Deadline = strconv.FormatInt(time.Now().Add(45*time.Second).Unix(), 10)
	sig := signNonce(t, keyHex, big.NewInt(7))
	if err := h.SubmitQuote(context.Background(), id, q, sig); err != nil {
		t.Fatal(err)
	}
	<-ch // offer

	picked, err := h.Pick(id, QuoteID(q))
	if err != nil {
		t.Fatalf("Pick: %v", err)
	}
	if picked.Signature != sig {
		t.Error("picked signature mismatch")
	}
	if msg := <-ch; msg.(PickedMsg).Type != TypePicked {
		t.Fatalf("got %v", msg)
	}
	if msg := <-ch; msg.(ClosedMsg).Reason != "picked" {
		t.Fatalf("got %v", msg)
	}
	if _, ok := <-ch; ok {
		t.Error("user channel not closed")
	}
	// Intent is gone: further picks fail.
	if _, err := h.Pick(id, QuoteID(q)); err == nil {
		t.Fatal("expected unknown-intent rejection")
	}
}

func TestHub_IntentExpires(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, 10*time.Millisecond)
	_, ch := openIntent(t, h)

	select {
	case msg := <-ch:
		if closed, ok := msg.(ClosedMsg); !ok || closed.Reason != "expired" {
			t.Fatalf("got %v, want expired close", msg)
		}
	case <-time.After(time.Second):
		t.Fatal("intent never expired")
	}
	if _, ok := <-ch; ok {
		t.Error("user channel not closed after expiry")
	}
	_ = keyHex
}

func TestHub_SubscribeIntentsReceivesBroadcast(t *testing.T) {
	keyHex, owner := testKey(t)
	h := NewHub(fakeVerifier{owner: owner}, time.Minute)
	ch, unsub := h.SubscribeIntents()
	defer unsub()

	id, _ := openIntent(t, h)
	select {
	case ev := <-ch:
		if ev.IntentID != id || ev.AmountIn != "1000000000000000000" {
			t.Fatalf("got %+v", ev)
		}
	case <-time.After(time.Second):
		t.Fatal("no broadcast")
	}
	_ = keyHex
}
