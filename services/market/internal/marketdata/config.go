// Package marketdata is the Phase 4 display feed: Hyperliquid price
// streaming (USD mids + candle history) plus a polled real-DEX graph
// (Uniswap/PancakeSwap V2 factories, boot-resolved pairs). Everything here
// is display-only — execution stays on the Fuji mock pools.
package marketdata

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// Token is one ERC-20 the graph tracks on a chain. Coin is the Hyperliquid
// symbol whose USD mid values it (e.g. WBTC → "BTC"); "$" is not a coin —
// stables map to "USDC".
type Token struct {
	Symbol  string `json:"symbol"`
	Address string `json:"address"`
	Coin    string `json:"coin"`
}

// Chain is one EVM deployment of a Uniswap-style V2 factory plus its pairs.
type Chain struct {
	Name    string      `json:"name"`
	RPC     string      `json:"rpc"`
	Factory string      `json:"factory"`
	Tokens  []Token     `json:"tokens"`
	Pairs   [][2]string `json:"pairs"` // token symbols, order irrelevant
}

// Config mirrors marketdata.json — checked-in data, never secrets.
type Config struct {
	// Coins are the Hyperliquid symbols to stream (prices + candles).
	Coins []string `json:"coins"`
	// Chains carry the real-DEX pools served on /market/graph.
	Chains []Chain `json:"chains"`
	// PollSeconds is the per-chain getReserves interval (default 3).
	PollSeconds int `json:"pollSeconds"`
	// CandleInterval is the Hyperliquid candle size for history + stream.
	CandleInterval string `json:"candleInterval"`
	// CandleHistory is how many candles to boot-fetch per coin (default 168).
	CandleHistory int `json:"candleHistory"`
}

// LoadFile reads and validates a marketdata.json. Structural problems are
// hard errors — callers disable the feed when the file is missing.
func LoadFile(path string) (Config, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("marketdata: open %s: %w", path, err)
	}
	var cfg Config
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&cfg); err != nil {
		return Config{}, fmt.Errorf("marketdata: parse %s: %w", path, err)
	}
	if err := cfg.validate(); err != nil {
		return Config{}, fmt.Errorf("marketdata: %s: %w", path, err)
	}
	return cfg, nil
}

func (c *Config) validate() error {
	if len(c.Coins) == 0 {
		return fmt.Errorf("coins: at least one Hyperliquid coin required")
	}
	if len(c.Chains) == 0 {
		return fmt.Errorf("chains: at least one chain required")
	}
	if c.PollSeconds == 0 {
		c.PollSeconds = 3
	}
	if c.PollSeconds < 1 {
		return fmt.Errorf("pollSeconds %d: want >= 1", c.PollSeconds)
	}
	if c.CandleInterval == "" {
		c.CandleInterval = "1h"
	}
	if c.CandleHistory == 0 {
		c.CandleHistory = 168
	}
	if c.CandleHistory < 1 {
		return fmt.Errorf("candleHistory %d: want >= 1", c.CandleHistory)
	}
	seen := map[string]bool{}
	for i := range c.Chains {
		ch := &c.Chains[i]
		if ch.Name == "" || ch.RPC == "" || !isAddress(ch.Factory) {
			return fmt.Errorf("chains[%d]: name, rpc and a 0x factory address are required", i)
		}
		if seen[ch.Name] {
			return fmt.Errorf("chains: duplicate name %q", ch.Name)
		}
		seen[ch.Name] = true
		tokens := map[string]bool{}
		for j, t := range ch.Tokens {
			if t.Symbol == "" || !isAddress(t.Address) || t.Coin == "" {
				return fmt.Errorf("chain %s tokens[%d]: symbol, 0x address and coin are required", ch.Name, j)
			}
			if tokens[t.Symbol] {
				return fmt.Errorf("chain %s: duplicate token %q", ch.Name, t.Symbol)
			}
			tokens[t.Symbol] = true
		}
		if len(ch.Pairs) == 0 {
			return fmt.Errorf("chain %s: at least one pair required", ch.Name)
		}
		for j, p := range ch.Pairs {
			if len(p) != 2 || p[0] == "" || p[1] == "" || p[0] == p[1] {
				return fmt.Errorf("chain %s pairs[%d]: want [symA, symB]", ch.Name, j)
			}
			if !tokens[p[0]] || !tokens[p[1]] {
				return fmt.Errorf("chain %s pairs[%d]: unknown token symbol (%q, %q)", ch.Name, j, p[0], p[1])
			}
		}
	}
	return nil
}

func isAddress(s string) bool {
	if len(s) != 42 || !strings.HasPrefix(s, "0x") {
		return false
	}
	for _, r := range s[2:] {
		if !strings.ContainsRune("0123456789abcdefABCDEF", r) {
			return false
		}
	}
	return true
}
