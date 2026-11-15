// Package config loads service configuration from the repo-root .env plus
// process environment (process wins), like apps/api does. Keys are documented
// in the root .env.example — never commit values.
package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

// Config is the Phase 1 surface: where the indexer serves GraphQL and which
// RPC to spot-check reserves against. Market/solver keys arrive in Phase 2.
type Config struct {
	// EnvioHTTPURL is the Hasura GraphQL endpoint, e.g. http://localhost:8080/v1/graphql.
	EnvioHTTPURL string
	// EnvioWSURL is EnvioHTTPURL with the scheme swapped to ws:// / wss://.
	EnvioWSURL string
	// EnvioAdminSecret authenticates local Hasura (empty is fine when unauthenticated).
	EnvioAdminSecret string
	// RPCURL is the Avalanche Fuji JSON-RPC used for on-chain reserve spot checks.
	RPCURL string
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
	}
	if cfg.RPCURL == "" {
		return Config{}, fmt.Errorf("config: AVAX_FUJI_RPC_URL is required (root .env)")
	}
	return cfg, nil
}

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
