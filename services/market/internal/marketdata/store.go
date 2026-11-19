package marketdata

import (
	"sort"
	"strconv"
	"sync"
	"time"
)

// Price is one coin's USD mark, stamped when Hyperliquid delivered it.
type Price struct {
	USD float64   `json:"usd"`
	Ts  time.Time `json:"ts"`
}

// Candle is one OHLCV bar (open time in unix ms, matching Hyperliquid).
type Candle struct {
	T int64   `json:"t"`
	O float64 `json:"o"`
	H float64 `json:"h"`
	L float64 `json:"l"`
	C float64 `json:"c"`
	V float64 `json:"v"`
}

// Meta is a token as the graph serves it — boot-verified on chain.
type Meta struct {
	Symbol   string `json:"symbol"`
	Address  string `json:"address"`
	Decimals uint8  `json:"decimals"`
	Coin     string `json:"coin"` // Hyperliquid coin for USD valuation
}

// Pool is one real-DEX pair with its latest polled reserves (raw base units).
type Pool struct {
	Chain     string    `json:"chain"`
	Pair      string    `json:"pair"` // canonical token0/token1 symbols
	Address   string    `json:"address"`
	Token0    Meta      `json:"token0"`
	Token1    Meta      `json:"token1"`
	Reserve0  string    `json:"reserve0"`
	Reserve1  string    `json:"reserve1"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Store is the thread-safe in-memory feed behind the /market endpoints.
type Store struct {
	mu      sync.RWMutex
	prices  map[string]Price
	candles map[string][]Candle // key: coin + "/" + interval
	pools   map[string]*Pool    // key: chain + "/" + pair
	updated time.Time
}

func NewStore() *Store {
	return &Store{
		prices:  map[string]Price{},
		candles: map[string][]Candle{},
		pools:   map[string]*Pool{},
	}
}

// SetPrices applies a Hyperliquid mid batch (coin → mid string).
func (s *Store) SetPrices(mids map[string]string, ts time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for coin, raw := range mids {
		usd, ok := parseFloat(raw)
		if !ok || usd <= 0 {
			continue
		}
		s.prices[coin] = Price{USD: usd, Ts: ts}
		s.updated = ts
	}
}

// SetCandles replaces a coin's candle history (boot fetch).
func (s *Store) SetCandles(coin, interval string, cs []Candle) {
	if len(cs) == 0 {
		return
	}
	sorted := append([]Candle(nil), cs...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].T < sorted[j].T })
	s.mu.Lock()
	defer s.mu.Unlock()
	s.candles[candleKey(coin, interval)] = sorted
	s.updated = time.Now().UTC()
}

// UpsertCandle merges one live candle (same open time replaces, else appends).
func (s *Store) UpsertCandle(coin, interval string, c Candle) {
	key := candleKey(coin, interval)
	s.mu.Lock()
	defer s.mu.Unlock()
	cs := s.candles[key]
	for i := range cs {
		if cs[i].T == c.T {
			cs[i] = c
			s.updated = time.Now().UTC()
			return
		}
	}
	cs = append(cs, c)
	sort.Slice(cs, func(i, j int) bool { return cs[i].T < cs[j].T })
	// Keep a generous window past the boot history so long demos don't grow unbounded.
	if max := 2000; len(cs) > max {
		cs = cs[len(cs)-max:]
	}
	s.candles[key] = cs
	s.updated = time.Now().UTC()
}

// UpsertPool stores a polled snapshot (copy — callers reuse their structs).
func (s *Store) UpsertPool(p *Pool) {
	key := p.Chain + "/" + p.Pair
	cp := *p
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pools[key] = &cp
	s.updated = p.UpdatedAt
}

// Prices returns a copy keyed by Hyperliquid coin.
func (s *Store) Prices() map[string]Price {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make(map[string]Price, len(s.prices))
	for k, v := range s.prices {
		out[k] = v
	}
	return out
}

// Candles returns up to limit most-recent candles for coin/interval.
func (s *Store) Candles(coin, interval string, limit int) []Candle {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cs := s.candles[candleKey(coin, interval)]
	if limit > 0 && len(cs) > limit {
		cs = cs[len(cs)-limit:]
	}
	return append([]Candle(nil), cs...)
}

// Pools returns a copy of every resolved, polled pool.
func (s *Store) Pools() []*Pool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Pool, 0, len(s.pools))
	for _, p := range s.pools {
		cp := *p
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Chain != out[j].Chain {
			return out[i].Chain < out[j].Chain
		}
		return out[i].Pair < out[j].Pair
	})
	return out
}

// UpdatedAt is the last write of any kind (zero until first data lands).
func (s *Store) UpdatedAt() time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.updated
}

func candleKey(coin, interval string) string { return coin + "/" + interval }

func parseFloat(s string) (float64, bool) {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil || f <= 0 {
		return 0, false
	}
	return f, true
}
