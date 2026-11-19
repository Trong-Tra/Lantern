package solver

import (
	"math/big"
	"testing"

	"github.com/lantern/market/internal/graph"
)

const (
	tokenA        = "0x200000000000000000000000000000000000000a"
	tokenB        = "0x200000000000000000000000000000000000000b"
	tokenC        = "0x200000000000000000000000000000000000000c"
	poolABDeep    = "0x10000000000000000000000000000000000000d1"
	poolABShallow = "0x10000000000000000000000000000000000000d2"
	poolBC        = "0x10000000000000000000000000000000000000d3"
)

func ether(n int64) *big.Int {
	return new(big.Int).Mul(big.NewInt(n), big.NewInt(1_000_000_000_000_000_000))
}

func storeWith(pools ...graph.Sync) *graph.Store {
	s := graph.NewStore()
	for _, p := range pools {
		s.ApplySync(p)
	}
	return s
}

func pair(pool, t0, t1 string, r0, r1 *big.Int) graph.Sync {
	return graph.Sync{Address: pool, Token0: t0, Token1: t1, Reserve0: r0, Reserve1: r1, UpdatedAtBlock: 1}
}

func TestSolve_SinglePool(t *testing.T) {
	s := storeWith(pair(poolABDeep, tokenA, tokenB, ether(200_000), ether(200_000)))
	q := NewEngine().Solve(s, tokenA, tokenB, ether(1_000))
	if q == nil {
		t.Fatal("no quote")
	}
	if len(q.Routes) != 1 || q.Routes[0].Bps != 10_000 {
		t.Fatalf("routes = %+v", q.Routes)
	}
	want := amountOut(ether(1_000), ether(200_000), ether(200_000))
	if q.ExpectedOut.Cmp(want) != 0 {
		t.Errorf("ExpectedOut = %v, want %v", q.ExpectedOut, want)
	}
}

func TestSolve_SplitBeatsSoloOnLargeTrade(t *testing.T) {
	s := storeWith(
		pair(poolABDeep, tokenA, tokenB, ether(200_000), ether(200_000)),
		pair(poolABShallow, tokenA, tokenB, ether(20_000), ether(20_000)),
	)
	eng := NewEngine()
	trade := ether(10_000) // 5% of the deep pool — split should help

	split := eng.Solve(s, tokenA, tokenB, trade)
	if split == nil {
		t.Fatal("no quote")
	}
	solo := simulate(path{pools: []graph.Pool{mustPool(t, s, poolABDeep)}, tokens: []string{tokenA, tokenB}}, trade)

	if split.ExpectedOut.Cmp(solo) <= 0 {
		t.Errorf("split %v not better than solo %v", split.ExpectedOut, solo)
	}
	var bpsSum int
	for _, r := range split.Routes {
		bpsSum += int(r.Bps)
	}
	if bpsSum != 10_000 {
		t.Errorf("bps sum = %d", bpsSum)
	}
}

func TestSolve_MultiHop(t *testing.T) {
	s := storeWith(
		pair(poolABDeep, tokenA, tokenB, ether(200_000), ether(200_000)),
		pair(poolBC, tokenB, tokenC, ether(100_000), ether(50_000)),
	)
	q := NewEngine().Solve(s, tokenA, tokenC, ether(1_000))
	if q == nil {
		t.Fatal("no quote")
	}
	if len(q.Routes) != 1 || len(q.Routes[0].Pools) != 2 {
		t.Fatalf("routes = %+v", q.Routes)
	}
	hop1 := amountOut(ether(1_000), ether(200_000), ether(200_000))
	want := amountOut(hop1, ether(100_000), ether(50_000))
	if q.ExpectedOut.Cmp(want) != 0 {
		t.Errorf("ExpectedOut = %v, want %v", q.ExpectedOut, want)
	}
}

func TestSolve_NoPath(t *testing.T) {
	s := storeWith(pair(poolABDeep, tokenA, tokenB, ether(1), ether(1)))
	if q := NewEngine().Solve(s, tokenA, tokenC, ether(1)); q != nil {
		t.Errorf("expected nil, got %+v", q)
	}
}

func TestSolve_NoLiquidity(t *testing.T) {
	s := storeWith(pair(poolABDeep, tokenA, tokenB, big.NewInt(0), big.NewInt(0)))
	if q := NewEngine().Solve(s, tokenA, tokenB, ether(1)); q != nil {
		t.Errorf("expected nil, got %+v", q)
	}
}

func mustPool(t *testing.T, s *graph.Store, addr string) graph.Pool {
	t.Helper()
	p, ok := s.Pool(addr)
	if !ok {
		t.Fatalf("pool %s missing", addr)
	}
	return p
}
