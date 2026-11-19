package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Source is the read model behind the GraphQL API. Production
// implementation: HasuraSource (Envio indexer). Tests use an in-memory fake.
type Source interface {
	// Agents returns every registered agent with Attestations populated.
	Agents(ctx context.Context) ([]*Agent, error)
	// Agent returns one agent (Attestations populated) or nil when unknown.
	Agent(ctx context.Context, id string) (*Agent, error)
	// Attestations returns an agent's track record, newest first.
	Attestations(ctx context.Context, agentID string) ([]*Attestation, error)
	// Pools returns the live pool graph.
	Pools(ctx context.Context) ([]*Pool, error)
	// Trades returns settled trades newest first, limit already clamped.
	Trades(ctx context.Context, limit int) ([]*Trade, error)
}

// HasuraSource reads through the Envio indexer's Hasura GraphQL endpoint —
// the same one the ingest subscription uses (docs/market.md §2: no custom
// indexing code). BigInt columns arrive as decimal strings; the model
// structs decode them as-is. canonicalIDs (dual-registration, may be nil)
// stamps Agent.canonicalTokenId — the id 8004scan indexes — after the fetch.
type HasuraSource struct {
	httpURL      string
	adminSecret  string
	client       *http.Client
	canonicalIDs map[string]string
}

// NewHasuraSource builds a source against the given Hasura HTTP endpoint
// (e.g. http://localhost:8080/v1/graphql). adminSecret may be empty.
// canonicalIDs may be nil (no dual-registration mapping loaded).
func NewHasuraSource(httpURL, adminSecret string, canonicalIDs map[string]string) *HasuraSource {
	return &HasuraSource{
		httpURL:      strings.TrimRight(httpURL, "/"),
		adminSecret:  adminSecret,
		client:       &http.Client{Timeout: 10 * time.Second},
		canonicalIDs: canonicalIDs,
	}
}

// gqlRequest is the Hasura HTTP POST envelope.
type gqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables,omitempty"`
}

type gqlResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// query POSTs one GraphQL document and decodes data into out.
func (s *HasuraSource) query(ctx context.Context, gql string, vars map[string]any, out any) error {
	body, err := json.Marshal(gqlRequest{Query: gql, Variables: vars})
	if err != nil {
		return fmt.Errorf("api: encode request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.httpURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("api: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if s.adminSecret != "" {
		req.Header.Set("x-hasura-admin-secret", s.adminSecret)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("api: hasura %s: %w", s.httpURL, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("api: read response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("api: hasura status %d: %s", resp.StatusCode, truncate(string(raw), 200))
	}
	var parsed gqlResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return fmt.Errorf("api: decode response: %w", err)
	}
	if len(parsed.Errors) > 0 {
		return fmt.Errorf("api: hasura: %s", parsed.Errors[0].Message)
	}
	if len(parsed.Data) == 0 || string(parsed.Data) == "null" {
		return fmt.Errorf("api: hasura: empty data")
	}
	if err := json.Unmarshal(parsed.Data, out); err != nil {
		return fmt.Errorf("api: decode data: %w", err)
	}
	return nil
}

// Hasura documents. Field sets mirror indexer/schema.graphql.

const agentsQuery = `query Agents {
	Agent(order_by: {registeredAt: desc}) {
		id owner uri registeredAt updatedAt
		attestations(order_by: {mintedAt: desc}) {
			id actionType result amount protocol uri mintedAt blockNumber txHash
		}
	}
}`

const agentQuery = `query Agent($id: String!) {
	Agent(where: {id: {_eq: $id}}, limit: 1) {
		id owner uri registeredAt updatedAt
		attestations(order_by: {mintedAt: desc}) {
			id actionType result amount protocol uri mintedAt blockNumber txHash
		}
	}
}`

const attestationsQuery = `query Attestations($agentId: String!) {
	Attestation(where: {agent: {id: {_eq: $agentId}}}, order_by: {mintedAt: desc}) {
		id actionType result amount protocol uri mintedAt blockNumber txHash
		agent { id }
	}
}`

const poolsQuery = `query Pools {
	Pool { id token0 token1 reserve0 reserve1 updatedAtBlock }
}`

const tradesQuery = `query Trades($limit: Int!) {
	Trade(order_by: {settledAt: desc}, limit: $limit) {
		id user tokenIn tokenOut amountIn amountOut fee nonce settledAt blockNumber txHash
		agent { id }
	}
}`

// Row shapes: nested relations come back as {"agent":{"id":...}}, so the
// top-level Attestation/Trade rows decode through these before conversion.

type attestationRow struct {
	ID          string       `json:"id"`
	ActionType  ActionType   `json:"actionType"`
	Result      ActionResult `json:"result"`
	Amount      *string      `json:"amount"`
	Protocol    *string      `json:"protocol"`
	URI         *string      `json:"uri"`
	MintedAt    string       `json:"mintedAt"`
	BlockNumber string       `json:"blockNumber"`
	TxHash      string       `json:"txHash"`
	Agent       struct {
		ID string `json:"id"`
	} `json:"agent"`
}

func (r attestationRow) model() *Attestation {
	return &Attestation{
		ID:          r.ID,
		AgentID:     r.Agent.ID,
		ActionType:  r.ActionType,
		Result:      r.Result,
		Amount:      r.Amount,
		Protocol:    r.Protocol,
		URI:         r.URI,
		MintedAt:    r.MintedAt,
		BlockNumber: r.BlockNumber,
		TxHash:      r.TxHash,
	}
}

type tradeRow struct {
	ID          string `json:"id"`
	User        string `json:"user"`
	TokenIn     string `json:"tokenIn"`
	TokenOut    string `json:"tokenOut"`
	AmountIn    string `json:"amountIn"`
	AmountOut   string `json:"amountOut"`
	Fee         string `json:"fee"`
	Nonce       string `json:"nonce"`
	SettledAt   string `json:"settledAt"`
	BlockNumber string `json:"blockNumber"`
	TxHash      string `json:"txHash"`
	Agent       struct {
		ID string `json:"id"`
	} `json:"agent"`
}

func (r tradeRow) model() *Trade {
	return &Trade{
		ID:          r.ID,
		AgentID:     r.Agent.ID,
		User:        r.User,
		TokenIn:     r.TokenIn,
		TokenOut:    r.TokenOut,
		AmountIn:    r.AmountIn,
		AmountOut:   r.AmountOut,
		Fee:         r.Fee,
		Nonce:       r.Nonce,
		SettledAt:   r.SettledAt,
		BlockNumber: r.BlockNumber,
		TxHash:      r.TxHash,
	}
}

func (s *HasuraSource) Agents(ctx context.Context) ([]*Agent, error) {
	var resp struct {
		Agent []*Agent `json:"Agent"`
	}
	if err := s.query(ctx, agentsQuery, nil, &resp); err != nil {
		return nil, err
	}
	fillAgentIDs(resp.Agent)
	s.stampCanonicalIDs(resp.Agent)
	return resp.Agent, nil
}

func (s *HasuraSource) Agent(ctx context.Context, id string) (*Agent, error) {
	var resp struct {
		Agent []*Agent `json:"Agent"`
	}
	if err := s.query(ctx, agentQuery, map[string]any{"id": id}, &resp); err != nil {
		return nil, err
	}
	if len(resp.Agent) == 0 {
		return nil, nil
	}
	fillAgentIDs(resp.Agent)
	s.stampCanonicalIDs(resp.Agent)
	return resp.Agent[0], nil
}

func (s *HasuraSource) Attestations(ctx context.Context, agentID string) ([]*Attestation, error) {
	var resp struct {
		Attestation []attestationRow `json:"Attestation"`
	}
	if err := s.query(ctx, attestationsQuery, map[string]any{"agentId": agentID}, &resp); err != nil {
		return nil, err
	}
	out := make([]*Attestation, len(resp.Attestation))
	for i, r := range resp.Attestation {
		out[i] = r.model()
	}
	return out, nil
}

func (s *HasuraSource) Pools(ctx context.Context) ([]*Pool, error) {
	var resp struct {
		Pool []*Pool `json:"Pool"`
	}
	if err := s.query(ctx, poolsQuery, nil, &resp); err != nil {
		return nil, err
	}
	return resp.Pool, nil
}

func (s *HasuraSource) Trades(ctx context.Context, limit int) ([]*Trade, error) {
	var resp struct {
		Trade []tradeRow `json:"Trade"`
	}
	if err := s.query(ctx, tradesQuery, map[string]any{"limit": limit}, &resp); err != nil {
		return nil, err
	}
	out := make([]*Trade, len(resp.Trade))
	for i, r := range resp.Trade {
		out[i] = r.model()
	}
	return out, nil
}

// fillAgentIDs stamps the parent agent id onto nested attestations (the
// nested selection doesn't repeat agent { id }).
func fillAgentIDs(agents []*Agent) {
	for _, a := range agents {
		for _, att := range a.Attestations {
			att.AgentID = a.ID
		}
	}
}

// stampCanonicalIDs sets Agent.canonicalTokenId from the dual-registration
// mapping; unmapped agents keep null (the FE hides the 8004scan button).
func (s *HasuraSource) stampCanonicalIDs(agents []*Agent) {
	for _, a := range agents {
		if id, ok := s.canonicalIDs[a.ID]; ok {
			a.CanonicalTokenID = &id
		}
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
