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
