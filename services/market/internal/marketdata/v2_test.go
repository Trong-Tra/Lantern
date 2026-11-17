package marketdata

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// --- ABI encode helpers for the fake chain ---

func wordAddr(addr string) string {
	return strings.Repeat("0", 24) + strings.TrimPrefix(addr, "0x")
}

func encAddressRet(addr string) string {
	return "0x" + wordAddr(addr)
}

func encUintRet(v int64) string {
	return "0x" + hex.EncodeToString(common32(big.NewInt(v).Bytes()))
}

func encStringRet(s string) string {
	data := []byte(s)
	padded := make([]byte, (len(data)+31)/32*32)
	copy(padded, data)
	out := "0x" +
		hex.EncodeToString(common32(big.NewInt(32).Bytes())) +
		hex.EncodeToString(common32(big.NewInt(int64(len(data))).Bytes())) +
		hex.EncodeToString(padded)
	return out
}

func common32(b []byte) []byte {
	out := make([]byte, 32)
	copy(out[32-len(b):], b)
	return out
}

func encReservesRet(r0, r1 int64) string {
	return "0x" +
		hex.EncodeToString(common32(big.NewInt(r0).Bytes())) +
		hex.EncodeToString(common32(big.NewInt(r1).Bytes())) +
		hex.EncodeToString(common32(big.NewInt(1_700_000_000).Bytes()))
}

// --- fake V2 chain ---

type fakeChain struct {
	factory  string
	pair     string
	zeroPair bool   // getPair returns the zero address (pair not deployed)
	token0   string // config symbol order first
	token1   string
	symbols  map[string]string
	decimals map[string]int64
	reserves [2]int64
}

// serve runs an eth_call JSON-RPC endpoint for the fixture.
func (f *fakeChain) serve(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Method string            `json:"method"`
			Params []json.RawMessage `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Method != "eth_call" {
			t.Errorf("fake chain: bad request %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		var call struct {
			To   string `json:"to"`
			Data string `json:"data"`
		}
		_ = json.Unmarshal(req.Params[0], &call)
		data := strings.TrimPrefix(call.Data, "0x")
		sel, args := data[:8], data[8:]
		var result string
		switch {
		case sel == strings.TrimPrefix(selGetPair, "0x") && call.To == f.factory:
			a, b := decodeArgAddr(args[0:64]), decodeArgAddr(args[64:128])
			if f.zeroPair {
				result = encAddressRet("0x0000000000000000000000000000000000000000")
			} else if (a == f.token0 && b == f.token1) || (a == f.token1 && b == f.token0) {
				result = encAddressRet(f.pair)
			} else {
				result = encAddressRet("0x0000000000000000000000000000000000000000")
			}
		case sel == strings.TrimPrefix(selToken0, "0x") && call.To == f.pair:
			result = encAddressRet(f.token0)
		case sel == strings.TrimPrefix(selSymbol, "0x"):
			sym, ok := f.symbols[call.To]
			if !ok {
				t.Errorf("fake chain: symbol() on unknown %s", call.To)
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			result = encStringRet(sym)
		case sel == strings.TrimPrefix(selDecimals, "0x"):
			dec, ok := f.decimals[call.To]
			if !ok {
				t.Errorf("fake chain: decimals() on unknown %s", call.To)
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			result = encUintRet(dec)
		case sel == strings.TrimPrefix(selGetReserves, "0x") && call.To == f.pair:
			result = encReservesRet(f.reserves[0], f.reserves[1])
		default:
			t.Errorf("fake chain: unexpected call to=%s data=%s", call.To, call.Data)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":"` + result + `"}`))
	}))
}

func decodeArgAddr(word string) string {
	return "0x" + word[24:]
}

func fixture(t *testing.T) (*fakeChain, Chain, *httptest.Server) {
	t.Helper()
	f := &fakeChain{
		factory: "0x1111111111111111111111111111111111111111",
		pair:    "0x2222222222222222222222222222222222222222",
		token0:  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		token1:  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		symbols: map[string]string{
			"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": "AAA",
			"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb": "BBB",
		},
		decimals: map[string]int64{
			"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": 18,
			"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb": 6,
		},
		reserves: [2]int64{1_000_000_000_000_000_000, 2_000_000_000},
	}
	srv := f.serve(t)
	t.Cleanup(srv.Close)
	ch := Chain{
		Name:    "fake",
		RPC:     srv.URL,
		Factory: f.factory,
		Tokens: []Token{
			{Symbol: "AAA", Address: f.token0, Coin: "BTC"},
			{Symbol: "BBB", Address: f.token1, Coin: "ETH"},
		},
		Pairs: [][2]string{{"AAA", "BBB"}},
	}
	return f, ch, srv
}

func TestResolveChain(t *testing.T) {
	_, ch, _ := fixture(t)
	pools, err := ResolveChain(context.Background(), ch)
	if err != nil {
		t.Fatalf("ResolveChain: %v", err)
	}
	if len(pools) != 1 {
		t.Fatalf("pools: %d", len(pools))
	}
	p := pools[0]
	if p.Pair != "AAA/BBB" || p.Address != "0x2222222222222222222222222222222222222222" {
		t.Fatalf("pool: %+v", p)
	}
	if p.Token0.Symbol != "AAA" || p.Token0.Decimals != 18 || p.Token0.Coin != "BTC" {
		t.Fatalf("token0: %+v", p.Token0)
	}
	if p.Token1.Symbol != "BBB" || p.Token1.Decimals != 6 {
		t.Fatalf("token1: %+v", p.Token1)
	}
}

func TestResolveChain_SymbolMismatch(t *testing.T) {
	f, ch, _ := fixture(t)
	f.symbols[f.token0] = "WRONG"
	if _, err := ResolveChain(context.Background(), ch); err == nil || !strings.Contains(err.Error(), "symbol mismatch") {
		t.Fatalf("want symbol mismatch, got %v", err)
	}
}

func TestResolveChain_PairMissing(t *testing.T) {
	f, ch, _ := fixture(t)
	f.zeroPair = true
	_, err := ResolveChain(context.Background(), ch)
	if err == nil || !strings.Contains(err.Error(), "not found in factory") {
		t.Fatalf("want pair-not-found, got %v", err)
	}
}

func TestPollOnce_UpdatesStore(t *testing.T) {
	f, ch, _ := fixture(t)
	pools, err := ResolveChain(context.Background(), ch)
	if err != nil {
		t.Fatalf("ResolveChain: %v", err)
	}
	store := NewStore()
	c := NewClient(ch.RPC)
	if n := pollOnce(context.Background(), c, pools, store); n != 1 {
		t.Fatalf("first poll changed=%d, want 1", n)
	}
	got := store.Pools()
	if len(got) != 1 || got[0].Reserve0 == "" || got[0].Reserve1 == "" {
		t.Fatalf("store pools: %+v", got)
	}
	if n := pollOnce(context.Background(), c, pools, store); n != 0 {
		t.Fatalf("idempotent poll changed=%d, want 0", n)
	}
	f.reserves = [2]int64{5_000_000_000_000_000_000, 7_000_000_000}
	if n := pollOnce(context.Background(), c, pools, store); n != 1 {
		t.Fatalf("reserve move poll changed=%d, want 1", n)
	}
	if p := store.Pools()[0]; p.Reserve0 != "5000000000000000000" || p.Reserve1 != "7000000000" {
		t.Fatalf("reserves: %s/%s", p.Reserve0, p.Reserve1)
	}
	if store.UpdatedAt().IsZero() {
		t.Fatal("UpdatedAt not stamped")
	}
}

func TestSelectors_MatchKeccak(t *testing.T) {
	// Guard against ever hand-typing a wrong selector.
	want := map[string]string{
		selGetPair:     "getPair(address,address)",
		selToken0:      "token0()",
		selSymbol:      "symbol()",
		selDecimals:    "decimals()",
		selGetReserves: "getReserves()",
	}
	for s, sig := range want {
		if got := sel(sig); got != s {
			t.Errorf("sel(%q) = %s, want %s", sig, got, s)
		}
	}
	// Known mainnet values (verified against live eth_call earlier).
	if selGetPair != "0xe6a43905" {
		t.Errorf("getPair selector drifted: %s", selGetPair)
	}
}

func TestDecodeString_RoundTrip(t *testing.T) {
	raw, err := hex.DecodeString(strings.TrimPrefix(encStringRet("WBTC"), "0x"))
	if err != nil {
		t.Fatal(err)
	}
	got, err := decodeString(raw)
	if err != nil || got != "WBTC" {
		t.Fatalf("decodeString = %q, %v", got, err)
	}
}
