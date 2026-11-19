package marketdata

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func populatedStore() *Store {
	s := NewStore()
	s.SetPrices(map[string]string{"BTC": "64000.5", "ETH": "1800.25"}, time.Now())
	s.UpsertPool(&Pool{
		Chain:    "ethereum",
		Pair:     "WBTC/WETH",
		Address:  "0xbb2b8038a1640196fbe3e38816f3e67cba72d940",
		Token0:   Meta{Symbol: "WBTC", Address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", Decimals: 8, Coin: "BTC"},
		Token1:   Meta{Symbol: "WETH", Address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", Decimals: 18, Coin: "ETH"},
		Reserve0: "12345",
		Reserve1: "67890",
	})
	s.SetCandles("BTC", "1h", []Candle{
		{T: 1, O: 1, H: 2, L: 0.5, C: 1.5, V: 10},
		{T: 2, O: 1.5, H: 3, L: 1, C: 2.5, V: 20},
	})
	return s
}

func do(t *testing.T, h http.Handler, method, target string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, target, nil))
	return rec
}

func TestPricesEndpoint(t *testing.T) {
	h := Handler(populatedStore())
	rec := do(t, h, http.MethodGet, "/market/prices")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("CORS: %q", got)
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control: %q", got)
	}
	var body struct {
		Prices map[string]struct {
			USD float64 `json:"usd"`
		} `json:"prices"`
		UpdatedAt *time.Time `json:"updatedAt"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Prices["BTC"].USD != 64000.5 {
		t.Fatalf("BTC price: %+v", body.Prices)
	}
	if body.UpdatedAt == nil {
		t.Fatal("updatedAt null")
	}
}

func TestGraphEndpoint(t *testing.T) {
	h := Handler(populatedStore())
	rec := do(t, h, http.MethodGet, "/market/graph")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	var body struct {
		Pools []Pool `json:"pools"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(body.Pools) != 1 {
		t.Fatalf("pools: %+v", body.Pools)
	}
	p := body.Pools[0]
	if p.Pair != "WBTC/WETH" || p.Reserve0 != "12345" || p.Token0.Symbol != "WBTC" || p.Token0.Decimals != 8 {
		t.Fatalf("pool: %+v", p)
	}
}

func TestCandlesEndpoint(t *testing.T) {
	h := Handler(populatedStore())

	rec := do(t, h, http.MethodGet, "/market/candles?coin=BTC&interval=1h&limit=1")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	var body struct {
		Candles []Candle `json:"candles"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(body.Candles) != 1 || body.Candles[0].T != 2 {
		t.Fatalf("limit=1 should keep the newest candle: %+v", body.Candles)
	}

	if rec := do(t, h, http.MethodGet, "/market/candles?coin=BTC"); rec.Code != http.StatusBadRequest {
		t.Fatalf("missing interval: %d", rec.Code)
	}
	if rec := do(t, h, http.MethodGet, "/market/candles?coin=BTC&interval=1h&limit=abc"); rec.Code != http.StatusBadRequest {
		t.Fatalf("bad limit: %d", rec.Code)
	}
	if rec := do(t, h, http.MethodGet, "/market/candles?coin=BTC&interval=1h&limit=99999"); rec.Code != http.StatusBadRequest {
		t.Fatalf("limit out of range: %d", rec.Code)
	}
	// unknown coin → empty list, not an error (FE may race boot)
	rec = do(t, h, http.MethodGet, "/market/candles?coin=NOPE&interval=1h")
	if rec.Code != http.StatusOK {
		t.Fatalf("unknown coin: %d", rec.Code)
	}
}

func TestPreflightAndMethodGuard(t *testing.T) {
	h := Handler(populatedStore())
	rec := do(t, h, http.MethodOptions, "/market/prices")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("OPTIONS: %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("preflight CORS: %q", got)
	}
	if rec := do(t, h, http.MethodPost, "/market/prices"); rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST: %d", rec.Code)
	}
}
