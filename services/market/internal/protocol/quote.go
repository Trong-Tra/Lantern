// Package protocol is the quote WS protocol: intents broadcast to solvers,
// signed quotes stream back, solvers may retract, the user picks. Transport
// is raw WebSocket with JSON frames (machine traffic — no GraphQL).
package protocol

import (
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"

	"github.com/lantern/market/internal/chain/bindings"
)

// Frame types on the wire.
const (
	TypeIntent       = "intent"        // user → server
	TypeIntentOpened = "intent_opened" // server → user
	TypeQuote        = "quote"         // solver → server; server → user
	TypeRetract      = "retract"       // solver → server; server → user
	TypePick         = "pick"          // user → server
	TypePicked       = "picked"        // server → user
	TypeClosed       = "closed"        // server → user (intent over)
	TypeError        = "error"
)

// RouteJSON mirrors LanternMarket.Route with hex addresses.
type RouteJSON struct {
	Bps   uint16   `json:"bps"`
	Pools []string `json:"pools"`
}

// QuoteJSON mirrors LanternMarket.Quote: addresses hex-encoded, bigints
// decimal strings.
type QuoteJSON struct {
	AgentID   string      `json:"agentId"`
	User      string      `json:"user"`
	TokenIn   string      `json:"tokenIn"`
	TokenOut  string      `json:"tokenOut"`
	AmountIn  string      `json:"amountIn"`
	MinOut    string      `json:"minOut"`
	QuotedOut string      `json:"quotedOut"`
	Deadline  string      `json:"deadline"` // unix seconds
	Nonce     string      `json:"nonce"`
	Routes    []RouteJSON `json:"routes"`
}

// QuoteID identifies a quote within an intent: "<agentId>:<nonce>".
func QuoteID(q QuoteJSON) string {
	return q.AgentID + ":" + q.Nonce
}

// Wire frames.
type (
	// IntentMsg is user → server: open a swap intent.
	IntentMsg struct {
		Type     string `json:"type"`
		User     string `json:"user"`
		TokenIn  string `json:"tokenIn"`
		TokenOut string `json:"tokenOut"`
		AmountIn string `json:"amountIn"`
	}
	// IntentOpenedMsg is server → user.
	IntentOpenedMsg struct {
		Type     string `json:"type"`
		IntentID string `json:"intentId"`
	}
	// IntentEventMsg is server → solvers (and the in-process reference solver).
	IntentEventMsg struct {
		Type     string `json:"type"`
		IntentID string `json:"intentId"`
		User     string `json:"user"`
		TokenIn  string `json:"tokenIn"`
		TokenOut string `json:"tokenOut"`
		AmountIn string `json:"amountIn"`
	}
	// QuoteMsg is solver → server; QuoteOfferMsg is server → user.
	QuoteMsg struct {
		Type      string    `json:"type"`
		IntentID  string    `json:"intentId"`
		Quote     QuoteJSON `json:"quote"`
		Signature string    `json:"signature"` // 0x-prefixed 65-byte sig
	}
	QuoteOfferMsg struct {
		Type      string    `json:"type"`
		IntentID  string    `json:"intentId"`
		QuoteID   string    `json:"quoteId"`
		Quote     QuoteJSON `json:"quote"`
		Signature string    `json:"signature"`
	}
	// RetractMsg: solver → server (Signature = EIP-191 sig over
	// RetractDigest(intentId, quoteId), by the quote's signer); server →
	// user (Signature omitted by the hub when forwarding — the user already
	// holds the quote's own signature).
	RetractMsg struct {
		Type      string `json:"type"`
		IntentID  string `json:"intentId"`
		QuoteID   string `json:"quoteId"`
		Signature string `json:"signature,omitempty"`
	}
	// PickMsg is user → server.
	PickMsg struct {
		Type     string `json:"type"`
		IntentID string `json:"intentId"`
		QuoteID  string `json:"quoteId"`
	}
	// PickedMsg is server → user: the quote to submit via executeSwap.
	PickedMsg struct {
		Type      string    `json:"type"`
		IntentID  string    `json:"intentId"`
		QuoteID   string    `json:"quoteId"`
		Quote     QuoteJSON `json:"quote"`
		Signature string    `json:"signature"`
	}
	// ClosedMsg ends a user's intent stream.
	ClosedMsg struct {
		Type     string `json:"type"`
		IntentID string `json:"intentId"`
		Reason   string `json:"reason"`
	}
	// ErrorMsg is server → anyone.
	ErrorMsg struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}
)

// ToContract converts to the abigen struct (the exact on-chain shape).
func (q QuoteJSON) ToContract() (bindings.LanternMarketQuote, error) {
	fail := func(field, v string, err error) (bindings.LanternMarketQuote, error) {
		return bindings.LanternMarketQuote{}, fmt.Errorf("quote %s %q: %w", field, v, err)
	}
	bigFrom := func(v string) (*big.Int, bool) {
		n, ok := new(big.Int).SetString(v, 10)
		return n, ok
	}
	agentID, ok := bigFrom(q.AgentID)
	if !ok {
		return fail("agentId", q.AgentID, fmt.Errorf("not a decimal integer"))
	}
	amountIn, ok := bigFrom(q.AmountIn)
	if !ok {
		return fail("amountIn", q.AmountIn, fmt.Errorf("not a decimal integer"))
	}
	minOut, ok := bigFrom(q.MinOut)
	if !ok {
		return fail("minOut", q.MinOut, fmt.Errorf("not a decimal integer"))
	}
	quotedOut, ok := bigFrom(q.QuotedOut)
	if !ok {
		return fail("quotedOut", q.QuotedOut, fmt.Errorf("not a decimal integer"))
	}
	deadline, ok := bigFrom(q.Deadline)
	if !ok {
		return fail("deadline", q.Deadline, fmt.Errorf("not a decimal integer"))
	}
	nonce, ok := bigFrom(q.Nonce)
	if !ok {
		return fail("nonce", q.Nonce, fmt.Errorf("not a decimal integer"))
	}
	if !common.IsHexAddress(q.User) || !common.IsHexAddress(q.TokenIn) || !common.IsHexAddress(q.TokenOut) {
		return fail("address", q.User+"/"+q.TokenIn+"/"+q.TokenOut, fmt.Errorf("not hex addresses"))
	}
	routes := make([]bindings.LanternMarketRoute, len(q.Routes))
	for i, r := range q.Routes {
		pools := make([]common.Address, len(r.Pools))
		for j, p := range r.Pools {
			if !common.IsHexAddress(p) {
				return fail("route pool", p, fmt.Errorf("not a hex address"))
			}
			pools[j] = common.HexToAddress(p)
		}
		routes[i] = bindings.LanternMarketRoute{Bps: r.Bps, Pools: pools}
	}
	return bindings.LanternMarketQuote{
		AgentId:   agentID,
		User:      common.HexToAddress(q.User),
		TokenIn:   common.HexToAddress(q.TokenIn),
		TokenOut:  common.HexToAddress(q.TokenOut),
		AmountIn:  amountIn,
		MinOut:    minOut,
		QuotedOut: quotedOut,
		Deadline:  deadline,
		Nonce:     nonce,
		Routes:    routes,
	}, nil
}

// QuoteFromContract converts the abigen struct to its wire form.
func QuoteFromContract(q bindings.LanternMarketQuote) QuoteJSON {
	routes := make([]RouteJSON, len(q.Routes))
	for i, r := range q.Routes {
		pools := make([]string, len(r.Pools))
		for j, p := range r.Pools {
			pools[j] = p.Hex()
		}
		routes[i] = RouteJSON{Bps: r.Bps, Pools: pools}
	}
	return QuoteJSON{
		AgentID:   q.AgentId.String(),
		User:      q.User.Hex(),
		TokenIn:   q.TokenIn.Hex(),
		TokenOut:  q.TokenOut.Hex(),
		AmountIn:  q.AmountIn.String(),
		MinOut:    q.MinOut.String(),
		QuotedOut: q.QuotedOut.String(),
		Deadline:  q.Deadline.String(),
		Nonce:     q.Nonce.String(),
		Routes:    routes,
	}
}
