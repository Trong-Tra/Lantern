// cmd/market is the Lantern market service entrypoint. Phase 1: config,
// Envio subscription ingest into the in-memory graph store, and a periodic
// on-chain reserve consistency check. Solver/quote/paywall land in Phases 2-3.
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/lantern/market/internal/chaincheck"
	"github.com/lantern/market/internal/config"
	"github.com/lantern/market/internal/graph"
	"github.com/lantern/market/internal/ingest"
)

const (
	reconnectDelay      = 3 * time.Second
	consistencyInterval = 30 * time.Second
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	envPath := filepath.Join("..", "..", ".env") // repo root, when run from services/market
	if v := os.Getenv("MARKET_ENV_PATH"); v != "" {
		envPath = v
	}
	cfg, err := config.Load(envPath)
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	store := graph.NewStore()
	checker := chaincheck.NewChecker(cfg.RPCURL)

	go ingestLoop(ctx, cfg, store)
	go consistencyLoop(ctx, checker, store)

	log.Printf("market service up — ingest=%s rpc=%s", cfg.EnvioWSURL, cfg.RPCURL)
	<-ctx.Done()
	log.Print("shutdown")
}

// ingestLoop keeps the Envio subscription alive, applying every pool update
// to the store and logging one line per update (block + reserves).
func ingestLoop(ctx context.Context, cfg config.Config, store *graph.Store) {
	client := ingest.NewClient(cfg.EnvioWSURL, cfg.EnvioAdminSecret)
	for {
		updates, errc := client.SubscribePools(ctx)
		for u := range updates {
			store.ApplySync(u)
			log.Printf("block %d pool %s reserves %s/%s (tracked=%d)",
				u.UpdatedAtBlock, u.Address, u.Reserve0, u.Reserve1, store.Len())
		}
		if err := <-errc; err != nil {
			log.Printf("ingest: %v", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(reconnectDelay):
			log.Print("ingest: reconnecting")
		}
	}
}

// consistencyLoop spot-checks every tracked pool against on-chain reserves —
// the Phase 1 "graph consistency" line. Mismatches mean the indexer feed and
// the chain disagree.
func consistencyLoop(ctx context.Context, checker *chaincheck.Checker, store *graph.Store) {
	ticker := time.NewTicker(consistencyInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pools := store.Snapshot()
			if len(pools) == 0 {
				log.Print("consistency: no pools tracked yet")
				continue
			}
			for _, p := range pools {
				mismatch, err := checker.Check(ctx, p)
				switch {
				case err != nil:
					log.Printf("consistency: %v", err)
				case mismatch != "":
					log.Printf("consistency: MISMATCH %s", mismatch)
				default:
					log.Printf("consistency: ok pool %s reserves %s/%s (block %d)",
						p.Address, p.Reserve0, p.Reserve1, p.UpdatedAtBlock)
				}
			}
		}
	}
}
