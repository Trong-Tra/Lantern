package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// fakeHasura serves canned Hasura HTTP responses and records requests.
type fakeHasura struct {
	t        *testing.T
	body     string // canned data payload (inside "data")
	status   int
	gqlErr   string
	gotQuery string
	gotVars  map[string]any
	gotAdmin string
	gotCT    string
}

func (f *fakeHasura) handler(w http.ResponseWriter, r *http.Request) {
	raw, _ := io.ReadAll(r.Body)
	var req gqlRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		f.t.Errorf("bad request body %q: %v", raw, err)
	}
	f.gotQuery = req.Query
	f.gotVars = req.Variables
	f.gotAdmin = r.Header.Get("x-hasura-admin-secret")
	f.gotCT = r.Header.Get("Content-Type")

	w.Header().Set("Content-Type", "application/json")
	if f.status != 0 && f.status != http.StatusOK {
		w.WriteHeader(f.status)
		w.Write([]byte(`{"message":"boom"}`))
		return
	}
	resp := map[string]any{}
	if f.gqlErr != "" {
		resp["errors"] = []map[string]string{{"message": f.gqlErr}}
		resp["data"] = nil
	} else {
		resp["data"] = json.RawMessage(f.body)
	}
	json.NewEncoder(w).Encode(resp)
}

func newHasura(t *testing.T, fh *fakeHasura) (*HasuraSource, *httptest.Server) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(fh.handler))
	t.Cleanup(srv.Close)
	return NewHasuraSource(srv.URL+"/v1/graphql", "secret", nil), srv
}

func TestHasuraSource_StampsCanonicalTokenIDs(t *testing.T) {
	fh := &fakeHasura{t: t, body: `{
		"Agent": [
			{"id": "1", "owner": "0x1", "uri": "demo://a", "registeredAt": "10", "updatedAt": null, "attestations": []},
			{"id": "2", "owner": "0x2", "uri": "demo://b", "registeredAt": "11", "updatedAt": null, "attestations": []},
			{"id": "99", "owner": "0x3", "uri": "demo://c", "registeredAt": "12", "updatedAt": null, "attestations": []}
		]
	}`}
	srv := httptest.NewServer(http.HandlerFunc(fh.handler))
	t.Cleanup(srv.Close)
	src := NewHasuraSource(srv.URL+"/v1/graphql", "secret", map[string]string{"1": "314", "2": "315"})

	agents, err := src.Agents(context.Background())
	if err != nil {
		t.Fatalf("Agents: %v", err)
	}
	if len(agents) != 3 {
		t.Fatalf("len = %d", len(agents))
	}
	if agents[0].CanonicalTokenID == nil || *agents[0].CanonicalTokenID != "314" {
		t.Fatalf("agent 1 canonicalTokenId = %v, want 314", agents[0].CanonicalTokenID)
	}
	if agents[1].CanonicalTokenID == nil || *agents[1].CanonicalTokenID != "315" {
		t.Fatalf("agent 2 canonicalTokenId = %v, want 315", agents[1].CanonicalTokenID)
	}
	if agents[2].CanonicalTokenID != nil {
		t.Fatalf("unmapped agent canonicalTokenId = %v, want null", *agents[2].CanonicalTokenID)
	}
}

func TestHasuraSource_AgentsNestedAndIDsFilled(t *testing.T) {
	fh := &fakeHasura{t: t, body: `{
		"Agent": [{
			"id": "3", "owner": "0x1", "uri": "ipfs://a", "registeredAt": "10", "updatedAt": null,
			"attestations": [
				{"id": "11", "actionType": "SWAP", "result": "SUCCESS", "amount": "5",
				 "protocol": null, "uri": null, "mintedAt": "20", "blockNumber": "7", "txHash": "0xaa"},
				{"id": "12", "actionType": "STAKE", "result": "FAIL", "amount": null,
				 "protocol": "demo", "uri": "ipfs://b", "mintedAt": "21", "blockNumber": "8", "txHash": "0xbb"}
			]
		}]
	}`}
	src, _ := newHasura(t, fh)

	agents, err := src.Agents(context.Background())
	if err != nil {
		t.Fatalf("Agents: %v", err)
	}
	if len(agents) != 1 {
		t.Fatalf("len = %d", len(agents))
	}
	a := agents[0]
	if a.ID != "3" || a.UpdatedAt != nil {
		t.Fatalf("agent = %+v", a)
	}
	if len(a.Attestations) != 2 {
		t.Fatalf("attestations = %d", len(a.Attestations))
	}
	// Nested rows don't carry agent { id } — the source stamps it.
	if a.Attestations[0].AgentID != "3" || a.Attestations[1].AgentID != "3" {
		t.Fatalf("agentIds = %q / %q", a.Attestations[0].AgentID, a.Attestations[1].AgentID)
	}
	if a.Attestations[0].ActionType != ActionTypeSwap || a.Attestations[1].Result != ActionResultFail {
		t.Fatalf("enums = %q / %q", a.Attestations[0].ActionType, a.Attestations[1].Result)
	}
	if *a.Attestations[0].Amount != "5" || a.Attestations[1].Protocol == nil || *a.Attestations[1].Protocol != "demo" {
		t.Fatalf("nullable fields wrong: %+v", a.Attestations)
	}
	if !strings.Contains(fh.gotQuery, "Agent(order_by: {registeredAt: desc})") {
		t.Fatalf("query = %q", fh.gotQuery)
	}
	if fh.gotAdmin != "secret" {
		t.Fatalf("admin header = %q", fh.gotAdmin)
	}
	if !strings.HasPrefix(fh.gotCT, "application/json") {
		t.Fatalf("content-type = %q", fh.gotCT)
	}
}

func TestHasuraSource_AgentUnknownNil(t *testing.T) {
	fh := &fakeHasura{t: t, body: `{"Agent": []}`}
	src, _ := newHasura(t, fh)

	a, err := src.Agent(context.Background(), "404")
	if err != nil {
		t.Fatalf("Agent: %v", err)
	}
	if a != nil {
		t.Fatalf("agent = %+v, want nil", a)
	}
	if fh.gotVars["id"] != "404" {
		t.Fatalf("variables = %v", fh.gotVars)
	}
}

func TestHasuraSource_AttestationsRowMapping(t *testing.T) {
	fh := &fakeHasura{t: t, body: `{
		"Attestation": [
			{"id": "5", "actionType": "SWAP", "result": "SUCCESS", "amount": null,
			 "protocol": null, "uri": null, "mintedAt": "30", "blockNumber": "9", "txHash": "0xcc",
			 "agent": {"id": "2"}}
		]
	}`}
	src, _ := newHasura(t, fh)

	atts, err := src.Attestations(context.Background(), "2")
	if err != nil {
		t.Fatalf("Attestations: %v", err)
	}
	if len(atts) != 1 || atts[0].AgentID != "2" || atts[0].ID != "5" {
		t.Fatalf("atts = %+v", atts)
	}
	if fh.gotVars["agentId"] != "2" {
		t.Fatalf("variables = %v", fh.gotVars)
	}
}

func TestHasuraSource_TradesMapping(t *testing.T) {
	fh := &fakeHasura{t: t, body: `{
		"Trade": [{
			"id": "0xtx", "user": "0xu", "tokenIn": "0xin", "tokenOut": "0xout",
			"amountIn": "1000", "amountOut": "999", "fee": "2", "nonce": "1",
			"settledAt": "40", "blockNumber": "10", "txHash": "0xtx",
			"agent": {"id": "4"}
		}]
	}`}
	src, _ := newHasura(t, fh)

	trades, err := src.Trades(context.Background(), 50)
	if err != nil {
		t.Fatalf("Trades: %v", err)
	}
	if len(trades) != 1 || trades[0].AgentID != "4" || trades[0].AmountIn != "1000" {
		t.Fatalf("trades = %+v", trades)
	}
	if got, ok := fh.gotVars["limit"].(float64); !ok || got != 50 {
		t.Fatalf("limit variable = %v", fh.gotVars["limit"])
	}
}

func TestHasuraSource_Pools(t *testing.T) {
	fh := &fakeHasura{t: t, body: `{
		"Pool": [{"id": "0xpool", "token0": "0xa", "token1": "0xb",
			"reserve0": "1", "reserve1": "2", "updatedAtBlock": "3"}]
	}`}
	src, _ := newHasura(t, fh)

	pools, err := src.Pools(context.Background())
	if err != nil {
		t.Fatalf("Pools: %v", err)
	}
	if len(pools) != 1 || pools[0].Reserve0 != "1" || pools[0].UpdatedAtBlock != "3" {
		t.Fatalf("pools = %+v", pools)
	}
}

func TestHasuraSource_GraphQLErrorsFail(t *testing.T) {
	fh := &fakeHasura{t: t, gqlErr: "field not found"}
	src, _ := newHasura(t, fh)

	if _, err := src.Agents(context.Background()); err == nil || !strings.Contains(err.Error(), "field not found") {
		t.Fatalf("err = %v", err)
	}
}

func TestHasuraSource_HTTPStatusFails(t *testing.T) {
	fh := &fakeHasura{t: t, status: http.StatusInternalServerError}
	src, _ := newHasura(t, fh)

	if _, err := src.Pools(context.Background()); err == nil || !strings.Contains(err.Error(), "status 500") {
		t.Fatalf("err = %v", err)
	}
}
