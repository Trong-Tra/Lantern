package solver

import (
	"context"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"strconv"
	"strings"
	"time"

	"github.com/lantern/market/internal/chain"
	"github.com/lantern/market/internal/chain/bindings"
	"github.com/lantern/market/internal/graph"
	"github.com/lantern/market/internal/protocol"
)

// QuoteTTL is the locked off-chain quote lifetime (MEMORY §TBD: ~45s; the
// contract enforces only the resulting deadline).
const QuoteTTL = 45 * time.Second

// Digester is the quote-digest half of chain.Client (kept narrow so tests
// can run without an RPC connection).
type Digester interface {
	QuoteDigest(quote bindings.LanternMarketQuote) ([32]byte, error)
}

// Runner is the reference solver wired into the hub: it listens for intents,
// solves them over the live graph store, signs the quote with the agent
// owner's key, and submits it so it streams to the user.
type Runner struct {
	hub      *protocol.Hub
	store    *graph.Store
	engine   *Engine
	digester Digester
	key      *ecdsa.PrivateKey
	agentID  *big.Int

	slippageBps int64 // minOut = quotedOut * (1 - slippage)
	ttl         time.Duration
	now         func() time.Time
}

// NewRunner builds the reference solver. slippageBps bounds how far reserves
// may move between quoting and settlement (contract reverts below minOut);
// ttl is the quote lifetime.
func NewRunner(hub *protocol.Hub, store *graph.Store, digester Digester,
	key *ecdsa.PrivateKey, agentID *big.Int, slippageBps int64, ttl time.Duration) *Runner {
	return &Runner{
		hub: hub, store: store, engine: NewEngine(), digester: digester,
		key: key, agentID: agentID, slippageBps: slippageBps, ttl: ttl, now: time.Now,
	}
}

// Run consumes intent broadcasts until ctx is cancelled, answering each with
// one signed quote (the market streams solvers' quotes one by one; this is
// the in-process reference one).
func (r *Runner) Run(ctx context.Context) {
	ch, unsub := r.hub.SubscribeIntents()
	defer unsub()
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-ch:
			if !ok {
				return
			}
			if err := r.Answer(ctx, ev); err != nil {
				log.Printf("solver: intent %s: %v", ev.IntentID, err)
			}
		}
	}
}

// Answer solves one intent and submits the signed quote to the hub. A nil
// error means the quote is now streaming to the user; a nil quote path
// (no route) is not an error — the solver simply stays silent.
func (r *Runner) Answer(ctx context.Context, ev protocol.IntentEventMsg) error {
	amountIn, ok := new(big.Int).SetString(ev.AmountIn, 10)
	if !ok || amountIn.Sign() <= 0 {
		return fmt.Errorf("bad amountIn %q", ev.AmountIn)
	}
	// The store keys tokens lowercase; intents may arrive checksummed.
	tokenIn := strings.ToLower(ev.TokenIn)
	tokenOut := strings.ToLower(ev.TokenOut)

	solved := r.engine.Solve(r.store, tokenIn, tokenOut, amountIn)
	if solved == nil {
		return nil // no route for this pair — stay silent
	}

	quote, err := r.buildQuote(ev, amountIn, solved)
	if err != nil {
		return err
	}
	contract, err := quote.ToContract()
	if err != nil {
		return err
	}
	digest, err := r.digester.QuoteDigest(contract)
	if err != nil {
		return fmt.Errorf("digest: %w", err)
	}
	sig, err := chain.SignQuote(digest, r.key)
	if err != nil {
		return fmt.Errorf("sign: %w", err)
	}
	return r.hub.SubmitQuote(ctx, ev.IntentID, quote, "0x"+hex.EncodeToString(sig))
}

// buildQuote fills the wire quote from the intent plus the solved routes.
func (r *Runner) buildQuote(ev protocol.IntentEventMsg, amountIn *big.Int, solved *Quote) (protocol.QuoteJSON, error) {
	minOut := new(big.Int).Set(solved.ExpectedOut)
	minOut.Mul(minOut, big.NewInt(bpsBase-r.slippageBps))
	minOut.Div(minOut, big.NewInt(bpsBase))

	nonce, err := randUint64()
	if err != nil {
		return protocol.QuoteJSON{}, err
	}
	routes := make([]protocol.RouteJSON, len(solved.Routes))
	for i, rt := range solved.Routes {
		routes[i] = protocol.RouteJSON{Bps: rt.Bps, Pools: rt.Pools}
	}
	return protocol.QuoteJSON{
		AgentID:   r.agentID.String(),
		User:      ev.User,
		TokenIn:   ev.TokenIn,
		TokenOut:  ev.TokenOut,
		AmountIn:  ev.AmountIn,
		MinOut:    minOut.String(),
		QuotedOut: solved.ExpectedOut.String(),
		Deadline:  strconv.FormatInt(r.now().Add(r.ttl).Unix(), 10),
		Nonce:     strconv.FormatUint(nonce, 10),
		Routes:    routes,
	}, nil
}

func randUint64() (uint64, error) {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return 0, fmt.Errorf("nonce: %w", err)
	}
	return uint64(b[0])<<56 | uint64(b[1])<<48 | uint64(b[2])<<40 | uint64(b[3])<<32 |
		uint64(b[4])<<24 | uint64(b[5])<<16 | uint64(b[6])<<8 | uint64(b[7]), nil
}
