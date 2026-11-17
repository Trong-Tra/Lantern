package marketdata

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeConfig(t *testing.T, body string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "marketdata.json")
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestLoadFile_Happy(t *testing.T) {
	path := writeConfig(t, `{
		"coins": ["BTC"],
		"chains": [{
			"name": "ethereum",
			"rpc": "https://rpc.example",
			"factory": "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
			"tokens": [
				{"symbol": "WETH", "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "coin": "ETH"},
				{"symbol": "USDC", "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "coin": "USDC"}
			],
			"pairs": [["WETH", "USDC"]]
		}]
	}`)
	cfg, err := LoadFile(path)
	if err != nil {
		t.Fatalf("LoadFile: %v", err)
	}
	if cfg.PollSeconds != 3 || cfg.CandleInterval != "1h" || cfg.CandleHistory != 168 {
		t.Fatalf("defaults not applied: %+v", cfg)
	}
	if len(cfg.Chains) != 1 || cfg.Chains[0].Name != "ethereum" {
		t.Fatalf("chains: %+v", cfg.Chains)
	}
}

func TestLoadFile_Missing(t *testing.T) {
	if _, err := LoadFile(filepath.Join(t.TempDir(), "nope.json")); err == nil {
		t.Fatal("want error for missing file")
	}
}

func TestLoadFile_UnknownPairSymbol(t *testing.T) {
	path := writeConfig(t, `{
		"coins": ["BTC"],
		"chains": [{
			"name": "ethereum",
			"rpc": "https://rpc.example",
			"factory": "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
			"tokens": [{"symbol": "WETH", "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "coin": "ETH"}],
			"pairs": [["WETH", "USDC"]]
		}]
	}`)
	_, err := LoadFile(path)
	if err == nil || !strings.Contains(err.Error(), "unknown token symbol") {
		t.Fatalf("want unknown token symbol error, got %v", err)
	}
}

func TestLoadFile_UnknownField(t *testing.T) {
	path := writeConfig(t, `{"coins": ["BTC"], "bogus": true, "chains": []}`)
	if _, err := LoadFile(path); err == nil {
		t.Fatal("want error for unknown field")
	}
}

func TestLoadFile_BadFactory(t *testing.T) {
	path := writeConfig(t, `{
		"coins": ["BTC"],
		"chains": [{
			"name": "ethereum",
			"rpc": "https://rpc.example",
			"factory": "not-an-address",
			"tokens": [{"symbol": "WETH", "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "coin": "ETH"}],
			"pairs": [["WETH", "WETH"]]
		}]
	}`)
	_, err := LoadFile(path)
	if err == nil || !strings.Contains(err.Error(), "0x factory address") {
		t.Fatalf("want factory address error, got %v", err)
	}
}
