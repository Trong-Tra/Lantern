package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// fakeSource is an in-memory Source for handler tests.
type fakeSource struct {
	agents         []*Agent
	byID           map[string]*Agent
	attestations   map[string][]*Attestation
	pools          []*Pool
	trades         []*Trade
	lastTradeLimit int
	err            error
}

func (f *fakeSource) Agents(context.Context) ([]*Agent, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.agents, nil
}

func (f *fakeSource) Agent(_ context.Context, id string) (*Agent, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.byID[id], nil
}

func (f *fakeSource) Attestations(_ context.Context, agentID string) ([]*Attestation, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.attestations[agentID], nil
}

func (f *fakeSource) Pools(context.Context) ([]*Pool, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.pools, nil
}

func (f *fakeSource) Trades(_ context.Context, limit int) ([]*Trade, error) {
	if f.err != nil {
		return nil, f.err
	}
	f.lastTradeLimit = limit
	return f.trades, nil
}

func postGraphQL(t *testing.T, h http.Handler, query string) (int, map[string]json.RawMessage, []any) {
	t.Helper()
	body, err := json.Marshal(map[string]string{"query": query})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	var resp struct {
		Data   map[string]json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response %q: %v", rec.Body.String(), err)
	}
	var errs []any
	for _, e := range resp.Errors {
		errs = append(errs, e.Message)
	}
	return rec.Code, resp.Data, errs
}

func TestHandler_AgentsNested(t *testing.T) {
	src := &fakeSource{
		agents: []*Agent{{
			ID:           "7",
			Owner:        "0xabc",
			URI:          "ipfs://x",
			RegisteredAt: "100",
			Attestations: []*Attestation{{
				ID: "9", AgentID: "7", ActionType: ActionTypeSwap,
				Result: ActionResultSuccess, MintedAt: "110", BlockNumber: "5", TxHash: "0xdead",
			}},
		}},
	}
	code, data, errs := postGraphQL(t, NewHandler(src), `{ agents { id owner attestations { id actionType result } } }`)
	if code != http.StatusOK || len(errs) != 0 {
		t.Fatalf("code=%d errs=%v", code, errs)
	}
	var got []struct {
		ID           string `json:"id"`
		Attestations []struct {
			ID         string `json:"id"`
			ActionType string `json:"actionType"`
		} `json:"attestations"`
	}
	if err := json.Unmarshal(data["agents"], &got); err != nil {
		t.Fatalf("decode agents: %v", err)
	}
	if len(got) != 1 || got[0].ID != "7" {
		t.Fatalf("agents = %+v", got)
	}
	if len(got[0].Attestations) != 1 || got[0].Attestations[0].ActionType != "SWAP" {
		t.Fatalf("attestations = %+v", got[0].Attestations)
	}
}

func TestHandler_AgentNullWhenUnknown(t *testing.T) {
	src := &fakeSource{byID: map[string]*Agent{}}
	code, data, errs := postGraphQL(t, NewHandler(src), `{ agent(id: "999") { id } }`)
	if code != http.StatusOK || len(errs) != 0 {
		t.Fatalf("code=%d errs=%v", code, errs)
	}
	if string(data["agent"]) != "null" {
		t.Fatalf("agent = %s, want null", data["agent"])
	}
}

func TestHandler_TradesLimitClamped(t *testing.T) {
	src := &fakeSource{}
	for _, tc := range []struct {
		query string
		want  int
	}{
		{`{ trades { id } }`, 50},
		{`{ trades(limit: 5000) { id } }`, 200},
		{`{ trades(limit: 0) { id } }`, 1},
		{`{ trades(limit: 10) { id } }`, 10},
	} {
		src.lastTradeLimit = 0
		if code, _, errs := postGraphQL(t, NewHandler(src), tc.query); code != http.StatusOK || len(errs) != 0 {
			t.Fatalf("%s: code=%d errs=%v", tc.query, code, errs)
		}
		if src.lastTradeLimit != tc.want {
			t.Fatalf("%s: source limit = %d, want %d", tc.query, src.lastTradeLimit, tc.want)
		}
	}
}

func TestHandler_SourceErrorSurfaces(t *testing.T) {
	src := &fakeSource{err: errors.New("hasura down")}
	code, data, errs := postGraphQL(t, NewHandler(src), `{ agents { id } }`)
	if code != http.StatusOK {
		t.Fatalf("code = %d", code)
	}
	if len(errs) != 1 || !strings.Contains(errs[0].(string), "hasura down") {
		t.Fatalf("errs = %v", errs)
	}
	if string(data["agents"]) != "null" && data["agents"] != nil {
		t.Fatalf("data.agents = %s, want null", data["agents"])
	}
}

func TestHandler_CORS(t *testing.T) {
	h := NewHandler(&fakeSource{})
	req := httptest.NewRequest(http.MethodOptions, "/graphql", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("preflight code = %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("allow-origin = %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(got, "Content-Type") {
		t.Fatalf("allow-headers = %q", got)
	}
}
