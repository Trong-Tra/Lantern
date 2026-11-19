// Package graphfeed serves the Lantern Graph pool snapshot over HTTP —
// the paid read surface solvers buy instead of running their own indexing.
package graphfeed

import (
	"encoding/json"
	"math/big"
	"net/http"
	"sort"

	"github.com/lantern/market/internal/graph"
)

type poolJSON struct {
	Address        string `json:"address"`
	Token0         string `json:"token0"`
	Token1         string `json:"token1"`
	Reserve0       string `json:"reserve0"`
	Reserve1       string `json:"reserve1"`
	UpdatedAtBlock uint64 `json:"updatedAtBlock"`
}

type snapshotResponse struct {
	Pools []poolJSON `json:"pools"`
	Count int        `json:"count"`
}

// Handler serves GET /graph/snapshot as JSON sorted by pool address.
func Handler(store *graph.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, `{"error":"method_not_allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		pools := store.Snapshot()
		sort.Slice(pools, func(i, j int) bool { return pools[i].Address < pools[j].Address })
		out := make([]poolJSON, 0, len(pools))
		for _, p := range pools {
			out = append(out, poolJSON{
				Address:        p.Address,
				Token0:         p.Token0,
				Token1:         p.Token1,
				Reserve0:       reserveString(p.Reserve0),
				Reserve1:       reserveString(p.Reserve1),
				UpdatedAtBlock: p.UpdatedAtBlock,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(snapshotResponse{Pools: out, Count: len(out)})
	})
}

func reserveString(v *big.Int) string {
	if v == nil {
		return "0"
	}
	return v.String()
}
