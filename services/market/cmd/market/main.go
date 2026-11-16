// cmd/market is the Lantern market service entrypoint. Phase 1: config,
// Envio subscription ingest into the in-memory graph store, and a periodic
// on-chain reserve consistency check. Phase 2: quote-protocol WebSocket +
// the in-process reference solver (enabled when its identity is configured).
// Phase 3: web-facing GraphQL API + the x402-paywalled graph snapshot feed.
package main

import (
	"context"
	"log"
	"math/big"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/lantern/market/internal/api"
	"github.com/lantern/market/internal/chain"
	"github.com/lantern/market/internal/chaincheck"
	"github.com/lantern/market/internal/config"
	"github.com/lantern/market/internal/graph"
	"github.com/lantern/market/internal/graphfeed"
	"github.com/lantern/market/internal/ingest"
	"github.com/lantern/market/internal/paywall"
	"github.com/lantern/market/internal/protocol"
	"github.com/lantern/market/internal/solver"
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
	startAPI(ctx, cfg, store)

	// Phase 2: quote protocol + reference solver. The verifier needs the
	// deployed registry, so the hub (and solver) come up only once the
	// Fuji redeploy has filled the addresses in (MEMORY §TBD).
	if cfg.MarketAddress != "" && cfg.RegistryAddress != "" {
		startQuoteProtocol(ctx, cfg, store)
	} else {
		log.Print("quote protocol disabled: LANTERN_MARKET_ADDRESS / AGENT_REGISTRY_ADDRESS not set (Fuji redeploy pending)")
	}

	log.Printf("market service up — ingest=%s rpc=%s", cfg.EnvioWSURL, cfg.RPCURL)
	<-ctx.Done()
	log.Print("shutdown")
}

// startQuoteProtocol dials the contracts, serves the quote WS, and (when the
// reference solver identity is configured) runs it against the live store.
func startQuoteProtocol(ctx context.Context, cfg config.Config, store *graph.Store) {
	client, err := chain.Dial(ctx, cfg.RPCURL,
		common.HexToAddress(cfg.RegistryAddress), common.HexToAddress(cfg.MarketAddress))
	if err != nil {
		log.Printf("quote protocol disabled: %v", err)
		return
	}
	hub := protocol.NewHub(client, solver.QuoteTTL)

	go func() {
		mux := http.NewServeMux()
		mux.Handle("/quotes", protocol.Handler(hub, cfg.WSAllowedOrigins))
		srv := &http.Server{Addr: cfg.MarketWSAddr, Handler: mux}
		go func() {
			<-ctx.Done()
			shutdown, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			srv.Shutdown(shutdown)
		}()
		log.Printf("quote protocol listening on %s", cfg.MarketWSAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("quote protocol: %v", err)
		}
	}()

	if cfg.SolverKey == "" {
		log.Print("reference solver disabled: REFERENCE_SOLVER_KEY / REFERENCE_SOLVER_AGENT_ID not set")
		return
	}
	key, err := crypto.HexToECDSA(strip0x(cfg.SolverKey))
	if err != nil {
		log.Printf("reference solver disabled: bad REFERENCE_SOLVER_KEY: %v", err)
		return
	}
	agentID, ok := new(big.Int).SetString(cfg.SolverAgentID, 10)
	if !ok {
		log.Printf("reference solver disabled: bad REFERENCE_SOLVER_AGENT_ID %q", cfg.SolverAgentID)
		return
	}
	runner := solver.NewRunner(hub, store, client, key, agentID, cfg.SolverSlippageBps, solver.QuoteTTL)
	go runner.Run(ctx)
	log.Printf("reference solver up (agentId=%s slippage=%dbps)", agentID, cfg.SolverSlippageBps)
}

func strip0x(s string) string {
	if len(s) >= 2 && (s[:2] == "0x" || s[:2] == "0X") {
		return s[2:]
	}
	return s
}

// startAPI serves the web-facing GraphQL API (identity + market reads,
// proxied from Hasura) and the graph snapshot feed behind the x402 paywall,
// plus a health endpoint. It comes up regardless of chain wiring — queries
// fail with an upstream error until the indexer is reachable, which is
// honest (docs/market.md §3).
func startAPI(ctx context.Context, cfg config.Config, store *graph.Store) {
	mux := http.NewServeMux()
	mux.Handle("/graphql", api.NewHandler(api.NewHasuraSource(cfg.EnvioHTTPURL, cfg.EnvioAdminSecret)))
	pw := paywall.New(paywall.Config{
		FacilitatorURL: cfg.X402FacilitatorURL,
		Network:        cfg.X402Network,
		Asset:          cfg.X402Asset,
		PayTo:          cfg.X402PayTo,
		Amount:         cfg.X402Amount,
	})
	mux.Handle("/graph/snapshot", pw.Wrap(graphfeed.Handler(store)))
	if pw.Gated() {
		log.Printf("graph feed: paywalled — %s base units of %s → %s via %s",
			cfg.X402Amount, cfg.X402Asset, cfg.X402PayTo, cfg.X402FacilitatorURL)
	} else {
		log.Print("graph feed: open (X402_ASSET / X402_PAY_TO / X402_AMOUNT not set)")
	}
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	srv := &http.Server{Addr: cfg.APIAddr, Handler: mux}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		srv.Shutdown(shutdown)
	}()
	go func() {
		log.Printf("web API listening on %s (graphql → %s)", cfg.APIAddr, cfg.EnvioHTTPURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("web API: %v", err)
		}
	}()
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
