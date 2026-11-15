package protocol

import (
	"context"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/lantern/market/internal/chain/bindings"
)

// Verifier checks that a quote's signature belongs to the owner of
// quote.AgentId. Implemented by chain.Client; faked in tests.
type Verifier interface {
	VerifyQuote(ctx context.Context, quote bindings.LanternMarketQuote, signature []byte) error
}

// Hub owns the intent → quotes → retract → pick lifecycle.
type Hub struct {
	mu        sync.Mutex
	verifier  Verifier
	intentTTL time.Duration
	now       func() time.Time

	intents    map[string]*intentSession
	solverSubs map[chan IntentEventMsg]struct{}
	nextID     uint64
}

type quoteEntry struct {
	quote     QuoteJSON
	signature string
	retracted bool
}

type intentSession struct {
	intent IntentMsg
	quotes map[string]*quoteEntry
	userCh chan any // QuoteOfferMsg / RetractMsg / PickedMsg / ClosedMsg
	closed bool
}

func NewHub(verifier Verifier, intentTTL time.Duration) *Hub {
	return &Hub{
		verifier:   verifier,
		intentTTL:  intentTTL,
		now:        time.Now,
		intents:    map[string]*intentSession{},
		solverSubs: map[chan IntentEventMsg]struct{}{},
	}
}

// SubscribeIntents registers a solver (in-process reference solver or a WS
// client) for intent broadcasts. Cancel the returned func to unsubscribe.
func (h *Hub) SubscribeIntents() (<-chan IntentEventMsg, func()) {
	ch := make(chan IntentEventMsg, 32)
	h.mu.Lock()
	h.solverSubs[ch] = struct{}{}
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		delete(h.solverSubs, ch)
		h.mu.Unlock()
	}
}

// OpenIntent registers an intent, broadcasts it to solvers, and returns the
// id plus the user's event channel (quotes stream in one by one).
func (h *Hub) OpenIntent(msg IntentMsg) (string, <-chan any, error) {
	if !bigIntOK(msg.AmountIn) {
		return "", nil, fmt.Errorf("protocol: bad amountIn %q", msg.AmountIn)
	}
	h.mu.Lock()
	h.nextID++
	id := fmt.Sprintf("i-%d", h.nextID)
	sess := &intentSession{
		intent: msg,
		quotes: map[string]*quoteEntry{},
		userCh: make(chan any, 32),
	}
	h.intents[id] = sess
	subs := make([]chan IntentEventMsg, 0, len(h.solverSubs))
	for ch := range h.solverSubs {
		subs = append(subs, ch)
	}
	h.mu.Unlock()

	event := IntentEventMsg{
		Type:     TypeIntent,
		IntentID: id,
		User:     msg.User,
		TokenIn:  msg.TokenIn,
		TokenOut: msg.TokenOut,
		AmountIn: msg.AmountIn,
	}
	for _, ch := range subs {
		select {
		case ch <- event:
		default: // slow solver misses intents — it can reconnect
		}
	}

	time.AfterFunc(h.intentTTL, func() { h.closeIntent(id, "expired") })
	return id, sess.userCh, nil
}

// SubmitQuote validates and forwards a solver quote to the user.
func (h *Hub) SubmitQuote(ctx context.Context, intentID string, quote QuoteJSON, signature string) error {
	contract, err := quote.ToContract()
	if err != nil {
		return err
	}
	sigBytes, err := decodeHexSig(signature)
	if err != nil {
		return err
	}

	h.mu.Lock()
	sess, ok := h.intents[intentID]
	if !ok || sess.closed {
		h.mu.Unlock()
		return fmt.Errorf("protocol: unknown or closed intent %s", intentID)
	}
	// The quote must answer this intent exactly.
	if !addrsEqual(quote.User, sess.intent.User) ||
		!addrsEqual(quote.TokenIn, sess.intent.TokenIn) ||
		!addrsEqual(quote.TokenOut, sess.intent.TokenOut) ||
		quote.AmountIn != sess.intent.AmountIn {
		h.mu.Unlock()
		return fmt.Errorf("protocol: quote does not match intent")
	}
	quoteID := QuoteID(quote)
	if _, dup := sess.quotes[quoteID]; dup {
		h.mu.Unlock()
		return fmt.Errorf("protocol: duplicate quote %s", quoteID)
	}
	deadline := contract.Deadline.Int64()
	if h.now().Unix() >= deadline {
		h.mu.Unlock()
		return fmt.Errorf("protocol: quote already expired")
	}
	h.mu.Unlock()

	// Signature check hits the chain (registry ownership) — off the lock.
	if err := h.verifier.VerifyQuote(ctx, contract, sigBytes); err != nil {
		return fmt.Errorf("protocol: %w", err)
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	sess, ok = h.intents[intentID]
	if !ok || sess.closed {
		return fmt.Errorf("protocol: unknown or closed intent %s", intentID)
	}
	if _, dup := sess.quotes[quoteID]; dup {
		return fmt.Errorf("protocol: duplicate quote %s", quoteID)
	}
	sess.quotes[quoteID] = &quoteEntry{quote: quote, signature: signature}
	return send(sess.userCh, QuoteOfferMsg{
		Type: TypeQuote, IntentID: intentID, QuoteID: quoteID, Quote: quote, Signature: signature,
	})
}

// RetractQuote marks a quote retracted and notifies the user. v1 trusts the
// solver connection for retraction identity — signed retractions are Phase 3
// hardening (docs/market.md).
func (h *Hub) RetractQuote(intentID, quoteID string) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	sess, ok := h.intents[intentID]
	if !ok || sess.closed {
		return fmt.Errorf("protocol: unknown or closed intent %s", intentID)
	}
	entry, ok := sess.quotes[quoteID]
	if !ok {
		return fmt.Errorf("protocol: unknown quote %s", quoteID)
	}
	entry.retracted = true
	return send(sess.userCh, RetractMsg{Type: TypeRetract, IntentID: intentID, QuoteID: quoteID})
}

// Pick returns the chosen quote for on-chain submission and closes the intent.
func (h *Hub) Pick(intentID, quoteID string) (PickedMsg, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	sess, ok := h.intents[intentID]
	if !ok || sess.closed {
		return PickedMsg{}, fmt.Errorf("protocol: unknown or closed intent %s", intentID)
	}
	entry, ok := sess.quotes[quoteID]
	if !ok {
		return PickedMsg{}, fmt.Errorf("protocol: unknown quote %s", quoteID)
	}
	if entry.retracted {
		return PickedMsg{}, fmt.Errorf("protocol: quote %s was retracted", quoteID)
	}
	deadline, _ := new(big.Int).SetString(entry.quote.Deadline, 10)
	if h.now().Unix() >= deadline.Int64() {
		return PickedMsg{}, fmt.Errorf("protocol: quote %s expired", quoteID)
	}
	sess.closed = true
	delete(h.intents, intentID)

	picked := PickedMsg{
		Type: TypePicked, IntentID: intentID, QuoteID: quoteID,
		Quote: entry.quote, Signature: entry.signature,
	}
	if err := send(sess.userCh, picked); err != nil {
		return PickedMsg{}, err
	}
	send(sess.userCh, ClosedMsg{Type: TypeClosed, IntentID: intentID, Reason: "picked"})
	close(sess.userCh)
	return picked, nil
}

func (h *Hub) closeIntent(id, reason string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	sess, ok := h.intents[id]
	if !ok || sess.closed {
		return
	}
	sess.closed = true
	delete(h.intents, id)
	send(sess.userCh, ClosedMsg{Type: TypeClosed, IntentID: id, Reason: reason})
	close(sess.userCh)
}

func send(ch chan any, msg any) error {
	select {
	case ch <- msg:
		return nil
	default:
		return fmt.Errorf("protocol: user channel full")
	}
}

func bigIntOK(s string) bool {
	_, ok := new(big.Int).SetString(s, 10)
	return ok
}

func addrsEqual(a, b string) bool {
	return common.HexToAddress(a) == common.HexToAddress(b)
}

func decodeHexSig(s string) ([]byte, error) {
	if len(s) >= 2 && s[:2] == "0x" {
		s = s[2:]
	}
	if len(s) != 130 {
		return nil, fmt.Errorf("protocol: signature hex length %d, want 130", len(s))
	}
	out := make([]byte, 65)
	for i := range out {
		var b int
		if _, err := fmt.Sscanf(s[2*i:2*i+2], "%02x", &b); err != nil {
			return nil, fmt.Errorf("protocol: bad signature hex: %w", err)
		}
		out[i] = byte(b)
	}
	return out, nil
}
