// Package config loads service configuration from the repo-root .env plus
// process environment (process wins), like apps/api does. Keys are documented
// in the root .env.example — never commit values.
package config

import (
	"bufio"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config is the Phase 1 + Phase 2 surface: where the indexer serves GraphQL,
// which RPC to spot-check reserves against, and the market/quote-protocol
// wiring (contract addresses + the reference solver's agent identity).
type Config struct {
	// EnvioHTTPURL is the Hasura GraphQL endpoint, e.g. http://localhost:8080/v1/graphql.
	EnvioHTTPURL string
	// EnvioWSURL is EnvioHTTPURL with the scheme swapped to ws:// / wss://.
	EnvioWSURL string
	// EnvioAdminSecret authenticates local Hasura (empty is fine when unauthenticated).
	EnvioAdminSecret string
	// RPCURL is the Avalanche Fuji JSON-RPC used for on-chain reserve spot checks.
	RPCURL string
	// RegistryAddress is the deployed AgentRegistry (quote signature ownership).
	RegistryAddress string
	// MarketAddress is the deployed LanternMarket (quote digest domain + settlement).
	MarketAddress string
	// SolverKey is the reference solver's agent-owner key (hex, optional —
	// the reference solver stays disabled while empty, e.g. pre-Fuji-redeploy).
	SolverKey string
	// SolverAgentID is the ERC-8004 agent id the solver quotes under (optional).
	SolverAgentID string
	// SolverSlippageBps bounds minOut vs quotedOut for reference-solver quotes.
	SolverSlippageBps int64
	// MarketWSAddr is the listen address for the quote-protocol WebSocket.
	MarketWSAddr string
	// APIAddr is the listen address for the web-facing GraphQL API.
	APIAddr string
	// WSAllowedOrigins gates browser Origin headers on the quote WS
	// (empty = any origin; machine clients send no Origin either way).
	WSAllowedOrigins []string
	// X402 facilitator + payment terms for the paywalled /graph/snapshot
	// feed. Asset/PayTo/Amount are an all-or-nothing trio — all empty means
	// the feed serves open.
	X402FacilitatorURL string
	X402Network        string
	X402Asset          string
	X402PayTo          string
	X402Amount         string
	// MarketDataFile is the Phase 4 display-feed config (marketdata.json).
	// Missing file = feed disabled, never a startup failure.
	MarketDataFile string
	// DualRegistrationFile is the dual-registration mapping (our agent id →
	// canonical ERC-8004 token id) written by contracts/script/DualRegister.s.sol.
	// Missing file = Agent.canonicalTokenId stays null, never a startup failure.
	DualRegistrationFile string
}

const defaultEnvioURL = "http://localhost:8080/v1/graphql"

// Load reads process env overlaid on the repo-root .env (envPath may be empty
// to skip the file). Missing optional keys fall back to documented defaults.
func Load(envPath string) (Config, error) {
	fileEnv := map[string]string{}
	if envPath != "" {
		f, err := os.Open(envPath)
		if err != nil {
			if !os.IsNotExist(err) {
				return Config{}, fmt.Errorf("config: open %s: %w", envPath, err)
			}
		} else {
			defer f.Close()
			parsed, err := parseDotenv(f)
			if err != nil {
				return Config{}, err
			}
			fileEnv = parsed
		}
	}

	get := func(key string) string {
		if v, ok := os.LookupEnv(key); ok {
			return v
		}
		return fileEnv[key]
	}

	httpURL := get("ENVIO_GRAPHQL_URL")
	if httpURL == "" {
		httpURL = defaultEnvioURL
	}
	wsURL, err := httpToWS(httpURL)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		EnvioHTTPURL:     httpURL,
		EnvioWSURL:       wsURL,
		EnvioAdminSecret: get("ENVIO_ADMIN_SECRET"),
		RPCURL:           get("AVAX_FUJI_RPC_URL"),
		RegistryAddress:  get("AGENT_REGISTRY_ADDRESS"),
		MarketAddress:    get("LANTERN_MARKET_ADDRESS"),
		SolverKey:        get("REFERENCE_SOLVER_KEY"),
		SolverAgentID:    get("REFERENCE_SOLVER_AGENT_ID"),
		MarketWSAddr:     get("MARKET_WS_ADDR"),
		APIAddr:          get("API_ADDR"),
	}
	if cfg.RPCURL == "" {
		return Config{}, fmt.Errorf("config: AVAX_FUJI_RPC_URL is required (root .env)")
	}
	if cfg.MarketWSAddr == "" {
		cfg.MarketWSAddr = defaultMarketWSAddr
	}
	if cfg.APIAddr == "" {
		cfg.APIAddr = defaultAPIAddr
	}
	cfg.SolverSlippageBps = defaultSolverSlippageBps
	if v := get("REFERENCE_SOLVER_SLIPPAGE_BPS"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n < 0 || n >= bpsBase {
			return Config{}, fmt.Errorf("config: REFERENCE_SOLVER_SLIPPAGE_BPS %q: want integer in [0,10000)", v)
		}
		cfg.SolverSlippageBps = n
	}
	if (cfg.SolverKey == "") != (cfg.SolverAgentID == "") {
		return Config{}, fmt.Errorf("config: REFERENCE_SOLVER_KEY and REFERENCE_SOLVER_AGENT_ID must be set together")
	}
	if v := get("WS_ALLOWED_ORIGINS"); v != "" {
		for _, o := range strings.Split(v, ",") {
			if o = strings.TrimSpace(o); o != "" {
				cfg.WSAllowedOrigins = append(cfg.WSAllowedOrigins, o)
			}
		}
	}
	cfg.X402FacilitatorURL = get("X402_FACILITATOR_URL")
	if cfg.X402FacilitatorURL == "" {
		cfg.X402FacilitatorURL = defaultX402FacilitatorURL
	}
	cfg.X402Network = get("X402_NETWORK")
	if cfg.X402Network == "" {
		cfg.X402Network = defaultX402Network
	}
	cfg.X402Asset = get("X402_ASSET")
	cfg.X402PayTo = get("X402_PAY_TO")
	cfg.X402Amount = get("X402_AMOUNT")
	if err := validateX402(&cfg); err != nil {
		return Config{}, err
	}
	cfg.MarketDataFile = get("MARKETDATA_FILE")
	if cfg.MarketDataFile == "" {
		cfg.MarketDataFile = defaultMarketDataFile
	}
	cfg.DualRegistrationFile = get("DUAL_REGISTRATION_FILE")
	if cfg.DualRegistrationFile == "" {
		cfg.DualRegistrationFile = defaultDualRegistrationFile
	}
	return cfg, nil
}

// validateX402 enforces the all-or-nothing payment-terms trio. The
// facilitator/network defaults already landed in cfg before this runs.
func validateX402(cfg *Config) error {
	set := 0
	for _, v := range []string{cfg.X402Asset, cfg.X402PayTo, cfg.X402Amount} {
		if v != "" {
			set++
		}
	}
	if set == 0 {
		return nil // open feed
	}
	if set != 3 {
		return fmt.Errorf("config: X402_ASSET, X402_PAY_TO and X402_AMOUNT must be set together (all empty = open feed)")
	}
	for _, pair := range []struct{ key, val string }{
		{"X402_ASSET", cfg.X402Asset},
		{"X402_PAY_TO", cfg.X402PayTo},
	} {
		if len(pair.val) != 42 || !strings.HasPrefix(pair.val, "0x") {
			return fmt.Errorf("config: %s %q: want 0x-prefixed 20-byte address", pair.key, pair.val)
		}
		if _, err := hex.DecodeString(pair.val[2:]); err != nil {
			return fmt.Errorf("config: %s %q: %v", pair.key, pair.val, err)
		}
	}
	for _, r := range cfg.X402Amount {
		if r < '0' || r > '9' {
			return fmt.Errorf("config: X402_AMOUNT %q: want decimal base-units string", cfg.X402Amount)
		}
	}
	if cfg.X402Amount == "0" {
		return fmt.Errorf("config: X402_AMOUNT must be > 0")
	}
	return nil
}

const (
	defaultMarketWSAddr      = ":8081"
	defaultAPIAddr           = ":8082" // web GraphQL API (Hasura stays internal)
	defaultSolverSlippageBps = 50      // reference solver's minOut guard vs quotedOut
	bpsBase                  = 10_000
	// PayAI facilitator serves avalanche-fuji v1/v2 exact (verified via
	// GET /supported 2026-11-16); network default is the v2 CAIP-2 id.
	defaultX402FacilitatorURL = "https://facilitator.payai.network"
	defaultX402Network        = "eip155:43113" // Avalanche Fuji
	// Phase 4 display feed — CWD-relative (service runs from services/market);
	// override with MARKETDATA_FILE when launched elsewhere.
	defaultMarketDataFile = "marketdata.json"
	// Dual-registration mapping — CWD-relative to services/market (the forge
	// script writes it into contracts/script/seed/ at the repo root); override
	// with DUAL_REGISTRATION_FILE when launched elsewhere.
	defaultDualRegistrationFile = "../../contracts/script/seed/dual-registered.json"
)

// httpToWS converts an http(s) URL to its ws(s) equivalent.
func httpToWS(url string) (string, error) {
	switch {
	case strings.HasPrefix(url, "http://"):
		return "ws://" + strings.TrimPrefix(url, "http://"), nil
	case strings.HasPrefix(url, "https://"):
		return "wss://" + strings.TrimPrefix(url, "https://"), nil
	case strings.HasPrefix(url, "ws://"), strings.HasPrefix(url, "wss://"):
		return url, nil
	default:
		return "", fmt.Errorf("config: ENVIO_GRAPHQL_URL %q has no http(s)/ws(s) scheme", url)
	}
}

// parseDotenv reads KEY=VALUE lines: '#' comments, blank lines, and an
// optional "export " prefix are tolerated. No quote/escape expansion —
// the repo's .env files carry plain values only.
func parseDotenv(f *os.File) (map[string]string, error) {
	out := map[string]string{}
	scanner := bufio.NewScanner(f)
	line := 0
	for scanner.Scan() {
		line++
		text := strings.TrimSpace(scanner.Text())
		if text == "" || strings.HasPrefix(text, "#") {
			continue
		}
		text = strings.TrimPrefix(text, "export ")
		key, value, ok := strings.Cut(text, "=")
		if !ok || strings.TrimSpace(key) == "" {
			return nil, fmt.Errorf("config: %s:%d: not a KEY=VALUE line", f.Name(), line)
		}
		out[strings.TrimSpace(key)] = strings.TrimSpace(value)
	}
	return out, scanner.Err()
}
