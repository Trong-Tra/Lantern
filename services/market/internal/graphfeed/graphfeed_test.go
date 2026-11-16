package graphfeed

import (
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lantern/market/internal/graph"
)

func TestHandler_SnapshotJSON(t *testing.T) {
	store := graph.NewStore()
	store.ApplySync(graph.Sync{
		Address: "0xBBB", Token0: "0xT0", Token1: "0xT1",
		Reserve0: big.NewInt(2), Reserve1: big.NewInt(3), UpdatedAtBlock: 7,
	})
	store.ApplySync(graph.Sync{
		Address: "0xAAA", Token0: "0xT1", Token1: "0xT2",
		Reserve0: big.NewInt(10), Reserve1: big.NewInt(20), UpdatedAtBlock: 9,
	})

	rec := httptest.NewRecorder()
	Handler(store).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/graph/snapshot", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("code = %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("content-type = %q", ct)
	}
	var got snapshotResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("JSON: %v (body %s)", err, rec.Body.String())
	}
	if got.Count != 2 || len(got.Pools) != 2 {
		t.Fatalf("count = %d pools = %d", got.Count, len(got.Pools))
	}
	// Sorted by address: 0xAAA before 0xBBB (store normalizes to lowercase).
	if got.Pools[0].Address != "0xaaa" || got.Pools[1].Address != "0xbbb" {
		t.Fatalf("order = %s, %s", got.Pools[0].Address, got.Pools[1].Address)
	}
	if got.Pools[0].Reserve0 != "10" || got.Pools[0].Reserve1 != "20" || got.Pools[0].UpdatedAtBlock != 9 {
		t.Fatalf("pool0 = %+v", got.Pools[0])
	}
}

func TestHandler_EmptyStore(t *testing.T) {
	rec := httptest.NewRecorder()
	Handler(graph.NewStore()).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/graph/snapshot", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("code = %d", rec.Code)
	}
	if rec.Body.String() != "{\"pools\":[],\"count\":0}\n" {
		t.Fatalf("body = %q", rec.Body.String())
	}
}

func TestHandler_MethodNotAllowed(t *testing.T) {
	rec := httptest.NewRecorder()
	Handler(graph.NewStore()).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/graph/snapshot", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("code = %d, want 405", rec.Code)
	}
}
