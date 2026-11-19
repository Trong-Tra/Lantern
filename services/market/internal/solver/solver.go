// Package solver is the reference solver: depth-capped DFS route search over
// the pool graph plus a grid-search split allocation, scored by simulated
// output after price impact. It mirrors DemoPool's constant-product math
// exactly (30 bps fee) so quotedOut matches what LanternMarket re-quotes.
package solver

import (
	"math/big"

	"github.com/lantern/market/internal/graph"
)

const (
	// PoolFeeBps mirrors DemoPool.FEE_BPS.
	PoolFeeBps = 30
	bpsBase    = 10_000
)

// Route is one allocated path: bps of the input through these pools in order.
type Route struct {
	Bps   uint16
	Pools []string
}

// Quote is the solver's answer to an intent.
type Quote struct {
	Routes      []Route
	ExpectedOut *big.Int
}

// Engine searches routes over a graph snapshot.
type Engine struct {
	MaxHops      int    // route depth cap (contract allows 4)
	MaxPaths     int    // candidate paths carried into split search
	SplitStepBps uint16 // grid resolution (500 = 5%)
}

func NewEngine() *Engine {
	return &Engine{MaxHops: 4, MaxPaths: 3, SplitStepBps: 500}
}

// path is a pool sequence with its token sequence (len(tokens)=len(pools)+1).
type path struct {
	pools  []graph.Pool
	tokens []string
}

// rankedPath is a path with its solo (100% allocation) simulated output.
type rankedPath struct {
	p   path
	out *big.Int
}

// Solve finds the best route set for tokenIn→tokenOut of amountIn.
// Returns nil when no path exists.
func (e *Engine) Solve(store *graph.Store, tokenIn, tokenOut string, amountIn *big.Int) *Quote {
	paths := findPaths(store, tokenIn, tokenOut, e.MaxHops)
	if len(paths) == 0 {
		return nil
	}

	// Rank paths by solo output, keep the best MaxPaths.
	ranked := make([]rankedPath, 0, len(paths))
	for _, p := range paths {
		if out := simulate(p, amountIn); out != nil {
			ranked = append(ranked, rankedPath{p, out})
		}
	}
	if len(ranked) == 0 {
		return nil
	}
	for i := 0; i < len(ranked); i++ { // insertion sort, tiny n
		for j := i + 1; j < len(ranked); j++ {
			if ranked[j].out.Cmp(ranked[i].out) > 0 {
				ranked[i], ranked[j] = ranked[j], ranked[i]
			}
		}
	}
	if len(ranked) > e.MaxPaths {
		ranked = ranked[:e.MaxPaths]
	}

	// Grid-search bps splits over the candidate paths; last route takes the
	// remainder, mirroring LanternMarket._routeAmountIn.
	best := &Quote{ExpectedOut: big.NewInt(0)}
	alloc := make([]uint16, len(ranked))
	var search func(i int, remaining uint16)
	search = func(i int, remaining uint16) {
		if i == len(ranked)-1 {
			alloc[i] = remaining
			if q := evalAlloc(ranked, alloc, amountIn); q != nil && q.ExpectedOut.Cmp(best.ExpectedOut) > 0 {
				best = q
			}
			return
		}
		for share := uint16(0); share <= remaining; share += e.SplitStepBps {
			alloc[i] = share
			search(i+1, remaining-share)
		}
	}
	search(0, bpsBase)

	if best.ExpectedOut.Sign() == 0 {
		return nil
	}
	return best
}

// evalAlloc simulates one allocation across the ranked paths; zero-share
// paths are dropped from the result.
func evalAlloc(ranked []rankedPath, alloc []uint16, amountIn *big.Int) *Quote {
	q := &Quote{ExpectedOut: big.NewInt(0)}
	consumed := big.NewInt(0)
	for i, rp := range ranked {
		if alloc[i] == 0 {
			continue
		}
		share := new(big.Int).Mul(amountIn, big.NewInt(int64(alloc[i])))
		share.Div(share, big.NewInt(bpsBase))
		if j := lastNonZero(alloc); i == j {
			share.Sub(amountIn, consumed) // remainder to last route
		}
		consumed.Add(consumed, share)
		out := simulate(rp.p, share)
		if out == nil {
			return nil // illiquid hop under this allocation
		}
		poolAddrs := make([]string, len(rp.p.pools))
		for k, pool := range rp.p.pools {
			poolAddrs[k] = pool.Address
		}
		q.Routes = append(q.Routes, Route{Bps: alloc[i], Pools: poolAddrs})
		q.ExpectedOut.Add(q.ExpectedOut, out)
	}
	if len(q.Routes) == 0 {
		return nil
	}
	return q
}

func lastNonZero(alloc []uint16) int {
	for i := len(alloc) - 1; i >= 0; i-- {
		if alloc[i] > 0 {
			return i
		}
	}
	return 0
}

// findPaths DFS: all simple token paths tokenIn→tokenOut within maxHops.
// Multiple pools on the same pair are distinct paths (different price impact).
func findPaths(store *graph.Store, tokenIn, tokenOut string, maxHops int) []path {
	var out []path
	var visit func(token string, pools []graph.Pool, tokens []string, seen map[string]bool)
	visit = func(token string, pools []graph.Pool, tokens []string, seen map[string]bool) {
		if len(pools) >= maxHops {
			return
		}
		for _, pool := range store.PoolsByToken(token) {
			next := otherToken(pool, token)
			if next == "" {
				continue
			}
			newPools := append(append([]graph.Pool{}, pools...), pool)
			newTokens := append(append([]string{}, tokens...), next)
			if next == tokenOut {
				out = append(out, path{pools: newPools, tokens: newTokens})
				continue
			}
			if seen[next] {
				continue
			}
			seen[next] = true
			visit(next, newPools, newTokens, seen)
			delete(seen, next)
		}
	}
	seen := map[string]bool{tokenIn: true}
	visit(tokenIn, nil, []string{tokenIn}, seen)
	return out
}

// simulate computes output of amountIn through a path, per-hop
// constant-product with the pool fee. Returns nil if any hop is illiquid.
func simulate(p path, amountIn *big.Int) *big.Int {
	amount := new(big.Int).Set(amountIn)
	for i, pool := range p.pools {
		reserveIn, reserveOut, ok := graph.ReservesFor(pool, p.tokens[i])
		if !ok || reserveIn.Sign() == 0 || reserveOut.Sign() == 0 || amount.Sign() == 0 {
			return nil
		}
		amount = amountOut(amount, reserveIn, reserveOut)
		if amount.Sign() == 0 {
			return nil
		}
	}
	return amount
}

// amountOut mirrors DemoPool.getAmountOut.
func amountOut(amountIn, reserveIn, reserveOut *big.Int) *big.Int {
	inWithFee := new(big.Int).Mul(amountIn, big.NewInt(bpsBase-PoolFeeBps))
	num := new(big.Int).Mul(inWithFee, reserveOut)
	den := new(big.Int).Add(new(big.Int).Mul(reserveIn, big.NewInt(bpsBase)), inWithFee)
	return num.Div(num, den)
}

func otherToken(p graph.Pool, token string) string {
	switch token {
	case p.Token0:
		return p.Token1
	case p.Token1:
		return p.Token0
	default:
		return ""
	}
}
