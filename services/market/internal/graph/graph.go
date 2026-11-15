// Package graph is the in-memory Lantern Graph: assets are nodes, pools are
// edges, reserves track the indexer feed. Phase 1 keeps it a plain store;
// the solver (Phase 2) queries it for route search.
package graph

import (
	"math/big"
	"strings"
	"sync"
)

// Pool is one constant-product edge between two tokens.
type Pool struct {
	Address        string
	Token0         string
	Token1         string
	Reserve0       *big.Int
	Reserve1       *big.Int
	UpdatedAtBlock uint64
}

// Sync is one reserve update, mapped from the indexer's Pool entity.
type Sync struct {
	Address        string
	Token0         string
	Token1         string
	Reserve0       *big.Int
	Reserve1       *big.Int
	UpdatedAtBlock uint64
}

// Store is a thread-safe pool graph keyed by pool address (lowercase).
type Store struct {
	mu      sync.RWMutex
	pools   map[string]Pool
	byToken map[string]map[string]struct{} // token address -> pool addresses
}

func NewStore() *Store {
	return &Store{
		pools:   make(map[string]Pool),
		byToken: make(map[string]map[string]struct{}),
	}
}

// ApplySync upserts a pool from a Sync update. Addresses are normalized to
// lowercase. Token indexes are only built once the pair is known (the indexer
// always sends the pair on the first update for a pool).
func (s *Store) ApplySync(u Sync) {
	addr := strings.ToLower(u.Address)
	t0 := strings.ToLower(u.Token0)
	t1 := strings.ToLower(u.Token1)

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.pools[addr]; ok {
		// Tokens are immutable per pool; never re-index.
		t0, t1 = existing.Token0, existing.Token1
	} else {
		s.indexLocked(t0, addr)
		s.indexLocked(t1, addr)
	}
	s.pools[addr] = Pool{
		Address:        addr,
		Token0:         t0,
		Token1:         t1,
		Reserve0:       new(big.Int).Set(u.Reserve0),
		Reserve1:       new(big.Int).Set(u.Reserve1),
		UpdatedAtBlock: u.UpdatedAtBlock,
	}
}

// Pool returns a copy of the pool at addr, if tracked.
func (s *Store) Pool(addr string) (Pool, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.pools[strings.ToLower(addr)]
	return p.clone(), ok
}

// PoolsByToken returns copies of every pool touching token, in map order.
func (s *Store) PoolsByToken(token string) []Pool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	addrs := s.byToken[strings.ToLower(token)]
	out := make([]Pool, 0, len(addrs))
	for addr := range addrs {
		out = append(out, s.pools[addr].clone())
	}
	return out
}

// Snapshot returns copies of all tracked pools, in map order.
func (s *Store) Snapshot() []Pool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Pool, 0, len(s.pools))
	for _, p := range s.pools {
		out = append(out, p.clone())
	}
	return out
}

// Len reports how many pools are tracked.
func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.pools)
}

// ReservesFor returns (reserveIn, reserveOut) for a swap of tokenIn through
// the pool p. Comparison is case-insensitive; pools read from the Store are
// already normalized.
func ReservesFor(p Pool, tokenIn string) (reserveIn, reserveOut *big.Int, ok bool) {
	switch strings.ToLower(tokenIn) {
	case strings.ToLower(p.Token0):
		return p.Reserve0, p.Reserve1, true
	case strings.ToLower(p.Token1):
		return p.Reserve1, p.Reserve0, true
	default:
		return nil, nil, false
	}
}

// clone deep-copies the pool (reserves are *big.Int — callers get their own).
func (p Pool) clone() Pool {
	p.Reserve0 = new(big.Int).Set(p.Reserve0)
	p.Reserve1 = new(big.Int).Set(p.Reserve1)
	return p
}

func (s *Store) indexLocked(token, poolAddr string) {
	if s.byToken[token] == nil {
		s.byToken[token] = map[string]struct{}{}
	}
	s.byToken[token][poolAddr] = struct{}{}
}
