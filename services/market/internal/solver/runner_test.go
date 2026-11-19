package solver

import (
	"context"
	"encoding/hex"
	"math/big"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/lantern/market/internal/chain"
	"github.com/lantern/market/internal/chain/bindings"
	"github.com/lantern/market/internal/graph"
	"github.com/lantern/market/internal/protocol"
)

// ownerVerifier is the test double for chain.Client.VerifyQuote: real
// digest + ecrecover, with registry ownership faked by an agent→owner map.
type ownerVerifier struct {
	digester Digester
	owners   map[uint64]common.Address
}

func (v ownerVerifier) VerifyQuote(_ context.Context, quote bindings.LanternMarketQuote, sig []byte) (common.Address, error) {
	digest, err := v.digester.QuoteDigest(quote)
	if err != nil {
		return common.Address{}, err
	}
	signer, err := chain.VerifyQuote(digest, sig)
	if err != nil {
		return common.Address{}, err
	}
	owner, ok := v.owners[quote.AgentId.Uint64()]
	if !ok {
		return common.Address{}, errUnknownAgent
	}
	if signer != owner {
		return common.Address{}, errNotOwner
	}
	return signer, nil
}

var (
	errUnknownAgent = errStr("unknown agent")
	errNotOwner     = errStr("signer is not agent owner")
)

type errStr string

func (e errStr) Error() string { return string(e) }

func e2eSetup(t *testing.T) (*protocol.Hub, *Runner, *graph.Store, *protocol.IntentEventMsg) {
	t.Helper()
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	digester := &chain.Client{
		ChainID:       big.NewInt(43113),
		MarketAddress: common.HexToAddress("0x4000000000000000000000000000000000000001"),
	}
	agentID := big.NewInt(1)
	verifier := ownerVerifier{
		digester: digester,
		owners:   map[uint64]common.Address{1: crypto.PubkeyToAddress(key.PublicKey)},
	}
	hub := protocol.NewHub(verifier, time.Minute)

	store := graph.NewStore()
	store.ApplySync(graph.Sync{
		Address:  "0x1000000000000000000000000000000000000001",
		Token0:   "0x200000000000000000000000000000000000000a",
		Token1:   "0x200000000000000000000000000000000000000b",
		Reserve0: ether(200_000),
		Reserve1: ether(200_000),
	})

	runner := NewRunner(hub, store, digester, key, agentID, 50, 45*time.Second)
	ev := &protocol.IntentEventMsg{
		Type: protocol.TypeIntent, IntentID: "i-1",
		User:     "0x3000000000000000000000000000000000000001",
		TokenIn:  "0x200000000000000000000000000000000000000a",
		TokenOut: "0x200000000000000000000000000000000000000b",
		AmountIn: ether(1_000).String(),
	}
	return hub, runner, store, ev
}

// TestE2E_IntentQuotePick walks the Phase 2 flow in-process: intent →
// reference solver signs a quote → hub verifies (digest + ownership) →
// quote streams to the user → pick returns it ready for executeSwap.
func TestE2E_IntentQuotePick(t *testing.T) {
	hub, runner, _, ev := e2eSetup(t)

	// The user opens the intent (normally: WS frame → OpenIntent).
	intent := protocol.IntentMsg{
		Type: protocol.TypeIntent, User: ev.User,
		TokenIn: ev.TokenIn, TokenOut: ev.TokenOut, AmountIn: ev.AmountIn,
	}
	id, userCh, err := hub.OpenIntent(intent)
	if err != nil {
		t.Fatal(err)
	}
	ev.IntentID = id

	// The runner answers the broadcast with a signed quote.
	if err := runner.Answer(context.Background(), *ev); err != nil {
		t.Fatalf("Answer: %v", err)
	}

	// The quote streams to the user.
	var offer protocol.QuoteOfferMsg
	select {
	case msg := <-userCh:
		var ok bool
		offer, ok = msg.(protocol.QuoteOfferMsg)
		if !ok {
			t.Fatalf("got %T, want QuoteOfferMsg", msg)
		}
	case <-time.After(time.Second):
		t.Fatal("no quote streamed")
	}

	// Quote sanity: right intent, routes sum to 100%, minOut ≤ quotedOut.
	if offer.IntentID != id {
		t.Errorf("intentId = %s, want %s", offer.IntentID, id)
	}
	var bps int
	for _, r := range offer.Quote.Routes {
		bps += int(r.Bps)
	}
	if bps != 10_000 {
		t.Errorf("route bps sum = %d", bps)
	}
	minOut, _ := new(big.Int).SetString(offer.Quote.MinOut, 10)
	quotedOut, _ := new(big.Int).SetString(offer.Quote.QuotedOut, 10)
	if minOut.Cmp(quotedOut) > 0 {
		t.Errorf("minOut %s > quotedOut %s", minOut, quotedOut)
	}
	if slippage := new(big.Int).Sub(quotedOut, minOut); slippage.Sign() < 0 {
		t.Errorf("minOut above quotedOut")
	}

	// Signature is a well-formed 65-byte sig (0x + 130 hex).
	sigHex := strings.TrimPrefix(offer.Signature, "0x")
	if len(sigHex) != 130 {
		t.Fatalf("signature length = %d hex chars", len(sigHex))
	}
	if _, err := hex.DecodeString(sigHex); err != nil {
		t.Fatalf("signature not hex: %v", err)
	}

	// The user picks; the picked message carries quote + signature for
	// on-chain executeSwap.
	picked, err := hub.Pick(id, offer.QuoteID)
	if err != nil {
		t.Fatalf("Pick: %v", err)
	}
	if picked.Quote.QuotedOut != offer.Quote.QuotedOut {
		t.Error("picked quote differs from offered quote")
	}
	if picked.Signature != offer.Signature {
		t.Error("picked signature differs from offered signature")
	}
	if msg := <-userCh; msg.(protocol.PickedMsg).Type != protocol.TypePicked {
		t.Fatalf("got %v, want picked", msg)
	}
	if msg := <-userCh; msg.(protocol.ClosedMsg).Reason != "picked" {
		t.Fatalf("got %v", msg)
	}
}

// TestE2E_NoRouteStaysSilent: an unsolvable pair produces no quote and no
// error — the solver just doesn't answer.
func TestE2E_NoRouteStaysSilent(t *testing.T) {
	hub, runner, _, ev := e2eSetup(t)
	ev.TokenOut = "0x20000000000000000000000000000000000000ff" // no pools

	id, userCh, err := hub.OpenIntent(protocol.IntentMsg{
		Type: protocol.TypeIntent, User: ev.User,
		TokenIn: ev.TokenIn, TokenOut: ev.TokenOut, AmountIn: ev.AmountIn,
	})
	if err != nil {
		t.Fatal(err)
	}
	ev.IntentID = id

	if err := runner.Answer(context.Background(), *ev); err != nil {
		t.Fatalf("Answer: %v", err)
	}
	select {
	case msg := <-userCh:
		t.Fatalf("user received %T, want silence", msg)
	case <-time.After(50 * time.Millisecond):
	}
}
