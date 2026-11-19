package marketdata

import (
	"context"
	"log"
	"net/http"
	"time"
)

// candleSpecs are the chart timeframes the feed keeps. One entry per
// exchange timeframe button (apps/web/src/app/exchange/chart-data.ts): the
// interval is the native Hyperliquid candle size, `bars` is the closed bars
// plus the forming bar the button streams. 5m/1H/1D show 72 + 1 bars; 1W and
// 1M keep fewer because weekly/monthly history is already years deep.
var candleSpecs = []candleSpec{
	{interval: "5m", bars: 73},
	{interval: "1h", bars: 73},
	{interval: "1d", bars: 73},
	{interval: "1w", bars: 25},
	{interval: "1M", bars: 13},
}

// Service owns the Store and the background loops behind the /market feed.
type Service struct {
	cfg   Config
	store *Store
}

// New validates the config and wires the service. Network work happens in
// Start — a dead chain or Hyperliquid only degrades that loop.
func New(cfg Config) *Service {
	return &Service{cfg: cfg, store: NewStore()}
}

// Start resolves every chain (boot verification), then runs the pollers and
// the Hyperliquid stream until ctx ends.
func (s *Service) Start(ctx context.Context) {
	every := time.Duration(s.cfg.PollSeconds) * time.Second
	for _, ch := range s.cfg.Chains {
		ch := ch
		go func() {
			pools, err := ResolveChain(ctx, ch)
			if err != nil {
				log.Printf("marketdata: chain %s disabled: %v", ch.Name, err)
				return
			}
			log.Printf("marketdata: chain %s resolved %d pools (%s)", ch.Name, len(pools), ch.RPC)
			PollLoop(ctx, ch, pools, s.store, every)
		}()
	}
	go NewHL(s.cfg.Coins, candleSpecs, s.store).Run(ctx)
}

// Store exposes the feed for tests.
func (s *Service) Store() *Store { return s.store }

// Handler is the /market/ endpoint set.
func (s *Service) Handler() http.Handler { return Handler(s.store) }
