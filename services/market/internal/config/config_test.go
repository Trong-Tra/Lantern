package config

import (
	"os"
	"path/filepath"
	"testing"
)

func writeEnv(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestLoad_FromFile(t *testing.T) {
	path := writeEnv(t, `# comment
ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql
ENVIO_ADMIN_SECRET=testing
AVAX_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.EnvioHTTPURL != "http://localhost:8080/v1/graphql" {
		t.Errorf("EnvioHTTPURL = %q", cfg.EnvioHTTPURL)
	}
	if cfg.EnvioWSURL != "ws://localhost:8080/v1/graphql" {
		t.Errorf("EnvioWSURL = %q", cfg.EnvioWSURL)
	}
	if cfg.EnvioAdminSecret != "testing" {
		t.Errorf("EnvioAdminSecret = %q", cfg.EnvioAdminSecret)
	}
	if cfg.RPCURL == "" {
		t.Error("RPCURL empty")
	}
}

func TestLoad_ProcessEnvWins(t *testing.T) {
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=https://file.example/rpc\n")
	t.Setenv("AVAX_FUJI_RPC_URL", "https://process.example/rpc")
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.RPCURL != "https://process.example/rpc" {
		t.Errorf("RPCURL = %q, want process env value", cfg.RPCURL)
	}
}

func TestLoad_DefaultEnvioURL(t *testing.T) {
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\n")
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.EnvioHTTPURL != defaultEnvioURL {
		t.Errorf("EnvioHTTPURL = %q, want default %q", cfg.EnvioHTTPURL, defaultEnvioURL)
	}
	if cfg.EnvioAdminSecret != "" {
		t.Errorf("EnvioAdminSecret = %q, want empty", cfg.EnvioAdminSecret)
	}
}

func TestLoad_MissingFileOK(t *testing.T) {
	t.Setenv("AVAX_FUJI_RPC_URL", "https://example.com/rpc")
	if _, err := Load(filepath.Join(t.TempDir(), "nope.env")); err != nil {
		t.Fatal(err)
	}
}

func TestLoad_RequiresRPC(t *testing.T) {
	if _, err := Load(writeEnv(t, "")); err == nil {
		t.Fatal("expected error for missing AVAX_FUJI_RPC_URL")
	}
}

func TestLoad_BadScheme(t *testing.T) {
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=x\nENVIO_GRAPHQL_URL=ftp://nope\n")
	if _, err := Load(path); err == nil {
		t.Fatal("expected error for bad ENVIO_GRAPHQL_URL scheme")
	}
}

func TestLoad_BadLine(t *testing.T) {
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=x\nnot-a-kv-line\n")
	if _, err := Load(path); err == nil {
		t.Fatal("expected parse error")
	}
}

func TestHTTPTOWS(t *testing.T) {
	cases := map[string]string{
		"http://a/b":  "ws://a/b",
		"https://a/b": "wss://a/b",
		"ws://a/b":    "ws://a/b",
		"wss://a/b":   "wss://a/b",
	}
	for in, want := range cases {
		got, err := httpToWS(in)
		if err != nil || got != want {
			t.Errorf("httpToWS(%q) = %q, %v; want %q", in, got, err, want)
		}
	}
}

func TestLoad_Phase2Keys(t *testing.T) {
	path := writeEnv(t, `AVAX_FUJI_RPC_URL=https://example.com/rpc
LANTERN_MARKET_ADDRESS=0x4000000000000000000000000000000000000001
AGENT_REGISTRY_ADDRESS=0x5000000000000000000000000000000000000001
REFERENCE_SOLVER_KEY=abc123
REFERENCE_SOLVER_AGENT_ID=7
REFERENCE_SOLVER_SLIPPAGE_BPS=25
MARKET_WS_ADDR=:9999
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.MarketAddress != "0x4000000000000000000000000000000000000001" {
		t.Errorf("MarketAddress = %q", cfg.MarketAddress)
	}
	if cfg.SolverKey != "abc123" || cfg.SolverAgentID != "7" {
		t.Errorf("solver identity = %q/%q", cfg.SolverKey, cfg.SolverAgentID)
	}
	if cfg.SolverSlippageBps != 25 {
		t.Errorf("SolverSlippageBps = %d", cfg.SolverSlippageBps)
	}
	if cfg.MarketWSAddr != ":9999" {
		t.Errorf("MarketWSAddr = %q", cfg.MarketWSAddr)
	}
}

func TestLoad_Phase2Defaults(t *testing.T) {
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\n")
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.MarketWSAddr != defaultMarketWSAddr {
		t.Errorf("MarketWSAddr = %q, want default", cfg.MarketWSAddr)
	}
	if cfg.SolverSlippageBps != defaultSolverSlippageBps {
		t.Errorf("SolverSlippageBps = %d, want default", cfg.SolverSlippageBps)
	}
	if cfg.SolverKey != "" || cfg.SolverAgentID != "" {
		t.Error("solver identity should default to empty (disabled)")
	}
}

func TestLoad_SolverIdentityMustPair(t *testing.T) {
	path := writeEnv(t, `AVAX_FUJI_RPC_URL=https://example.com/rpc
REFERENCE_SOLVER_KEY=abc123
`)
	if _, err := Load(path); err == nil {
		t.Fatal("expected error for key without agent id")
	}
}

func TestLoad_BadSlippageRejected(t *testing.T) {
	path := writeEnv(t, `AVAX_FUJI_RPC_URL=https://example.com/rpc
REFERENCE_SOLVER_SLIPPAGE_BPS=not-a-number
`)
	if _, err := Load(path); err == nil {
		t.Fatal("expected error for non-numeric slippage")
	}
}

func TestLoad_WSAllowedOrigins(t *testing.T) {
	path := writeEnv(t, `AVAX_FUJI_RPC_URL=https://example.com/rpc
WS_ALLOWED_ORIGINS=https://app.example, https://foo.example ,
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"https://app.example", "https://foo.example"}
	if len(cfg.WSAllowedOrigins) != len(want) {
		t.Fatalf("WSAllowedOrigins = %v", cfg.WSAllowedOrigins)
	}
	for i := range want {
		if cfg.WSAllowedOrigins[i] != want[i] {
			t.Fatalf("WSAllowedOrigins = %v, want %v", cfg.WSAllowedOrigins, want)
		}
	}

	path = writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\n")
	cfg, err = Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.WSAllowedOrigins) != 0 {
		t.Fatalf("default WSAllowedOrigins = %v, want empty", cfg.WSAllowedOrigins)
	}
}

func TestLoad_X402Terms(t *testing.T) {
	// All empty → open feed, facilitator/network defaults applied.
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\n")
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.X402FacilitatorURL != "https://facilitator.payai.network" {
		t.Errorf("X402FacilitatorURL = %q", cfg.X402FacilitatorURL)
	}
	if cfg.X402Network != "eip155:43113" {
		t.Errorf("X402Network = %q", cfg.X402Network)
	}
	if cfg.X402Asset != "" || cfg.X402PayTo != "" || cfg.X402Amount != "" {
		t.Errorf("terms set while open: %+v", cfg)
	}

	// Partial terms are a configuration error, not a silent open feed.
	path = writeEnv(t, `AVAX_FUJI_RPC_URL=https://example.com/rpc
X402_ASSET=0x5425890298aed601595a70AB815c96711a31Bc65
`)
	if _, err := Load(path); err == nil {
		t.Fatal("want error for partial x402 terms")
	}

	// Full terms are kept verbatim.
	path = writeEnv(t, `AVAX_FUJI_RPC_URL=https://example.com/rpc
X402_FACILITATOR_URL=https://facilitator.example
X402_NETWORK=eip155:43113
X402_ASSET=0x5425890298aed601595a70AB815c96711a31Bc65
X402_PAY_TO=0xE3837fE309618AE075DbeF0A20735c0615a308E6
X402_AMOUNT=10000
`)
	cfg, err = Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.X402FacilitatorURL != "https://facilitator.example" ||
		cfg.X402Network != "eip155:43113" ||
		cfg.X402Asset != "0x5425890298aed601595a70AB815c96711a31Bc65" ||
		cfg.X402PayTo != "0xE3837fE309618AE075DbeF0A20735c0615a308E6" ||
		cfg.X402Amount != "10000" {
		t.Errorf("x402 terms = %+v", cfg)
	}

	// Malformed payTo / non-decimal amount are rejected.
	for _, bad := range []string{
		"X402_PAY_TO=not-an-address\nX402_ASSET=0x5425890298aed601595a70AB815c96711a31Bc65\nX402_AMOUNT=10000\n",
		"X402_PAY_TO=0xE3837fE309618AE075DbeF0A20735c0615a308E6\nX402_ASSET=0x5425890298aed601595a70AB815c96711a31Bc65\nX402_AMOUNT=0.01\n",
		"X402_PAY_TO=0xE3837fE309618AE075DbeF0A20735c0615a308E6\nX402_ASSET=0x5425890298aed601595a70AB815c96711a31Bc65\nX402_AMOUNT=0\n",
	} {
		path = writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\n"+bad)
		if _, err := Load(path); err == nil {
			t.Errorf("want error for %q", bad)
		}
	}
}

func TestLoad_DualRegistrationFileDefaultAndOverride(t *testing.T) {
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\n")
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DualRegistrationFile != defaultDualRegistrationFile {
		t.Errorf("DualRegistrationFile = %q, want default %q", cfg.DualRegistrationFile, defaultDualRegistrationFile)
	}

	path = writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\nDUAL_REGISTRATION_FILE=/tmp/mapping.json\n")
	cfg, err = Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DualRegistrationFile != "/tmp/mapping.json" {
		t.Errorf("DualRegistrationFile = %q, want env value", cfg.DualRegistrationFile)
	}
}

func TestLoad_APIAddrPORTFallback(t *testing.T) {
	path := writeEnv(t, "AVAX_FUJI_RPC_URL=https://example.com/rpc\n")
	t.Setenv("API_ADDR", "")

	// PaaS hosts inject PORT (bare number) → API_ADDR follows it.
	t.Setenv("PORT", "10000")
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.APIAddr != ":10000" {
		t.Errorf("APIAddr = %q with PORT=10000, want %q", cfg.APIAddr, ":10000")
	}

	// An explicit API_ADDR wins over PORT, colon form accepted as-is.
	t.Setenv("API_ADDR", ":6060")
	cfg, err = Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.APIAddr != ":6060" {
		t.Errorf("APIAddr = %q, want explicit :6060", cfg.APIAddr)
	}

	// PORT already colon-prefixed is not double-prefixed.
	t.Setenv("API_ADDR", "")
	t.Setenv("PORT", ":8083")
	cfg, err = Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.APIAddr != ":8083" {
		t.Errorf("APIAddr = %q, want %q", cfg.APIAddr, ":8083")
	}

	// Neither set → default.
	t.Setenv("PORT", "")
	cfg, err = Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.APIAddr != defaultAPIAddr {
		t.Errorf("APIAddr = %q, want default %q", cfg.APIAddr, defaultAPIAddr)
	}
}
