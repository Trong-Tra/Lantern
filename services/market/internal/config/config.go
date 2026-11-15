// Package config loads service configuration from the repo-root .env plus
// process environment (process wins), like apps/api does. Keys are documented
// in the root .env.example — never commit values.
package config

import (
	"bufio"
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
	}
	if cfg.RPCURL == "" {
		return Config{}, fmt.Errorf("config: AVAX_FUJI_RPC_URL is required (root .env)")
	}
	if cfg.MarketWSAddr == "" {
		cfg.MarketWSAddr = defaultMarketWSAddr
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
	return cfg, nil
}

const (
	defaultMarketWSAddr      = ":8081"
	defaultSolverSlippageBps = 50 // reference solver's minOut guard vs quotedOut
	bpsBase                  = 10_000
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
