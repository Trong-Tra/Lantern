package marketdata

import (
	"context"
	"log"
	"net/http"
	"time"
)

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
	specs := []candleSpec{{
		interval: s.cfg.CandleInterval,
		history:  time.Duration(s.cfg.CandleHistory) * time.Hour,
	}}
	if s.cfg.CandleInterval != "1m" {
		specs = append(specs, candleSpec{
			interval: "1m",
			history:  time.Duration(s.cfg.CandleHistoryMinutes) * time.Minute,
		})
	}
	go NewHL(s.cfg.Coins, specs, s.store).Run(ctx)
}

// Store exposes the feed for tests.
func (s *Service) Store() *Store { return s.store }

// Handler is the /market/ endpoint set.
func (s *Service) Handler() http.Handler { return Handler(s.store) }
