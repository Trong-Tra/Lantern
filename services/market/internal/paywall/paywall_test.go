package paywall

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func gatedConfig(facilitatorURL string) Config {
	return Config{
		FacilitatorURL: facilitatorURL,
		Network:        "eip155:43113",
		Asset:          "0x5425890298aed601595a70AB815c96711a31Bc65",
		PayTo:          "0xE3837fE309618AE075DbeF0A20735c0615a308E6",
		Amount:         "10000",
	}
}

func okHandler(called *bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		*called = true
		_, _ = w.Write([]byte(`{"pools":[]}`))
	})
}

func TestWrap_OpenModeServesWithoutPayment(t *testing.T) {
	called := false
	h := New(Config{}).Wrap(okHandler(&called))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/graph/snapshot", nil))
	if !called || rec.Code != http.StatusOK {
		t.Fatalf("open mode: called=%v code=%d", called, rec.Code)
	}
}

func TestWrap_NoPaymentChallenges(t *testing.T) {
	called := false
	h := New(gatedConfig("http://unused.invalid")).Wrap(okHandler(&called))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "http://api.local/graph/snapshot", nil))
	if called {
		t.Fatal("handler ran without payment")
	}
	if rec.Code != http.StatusPaymentRequired {
		t.Fatalf("code = %d, want 402", rec.Code)
	}
	chB64 := rec.Header().Get("PAYMENT-REQUIRED")
	if chB64 == "" {
		t.Fatal("missing PAYMENT-REQUIRED header")
	}
	raw, err := base64.StdEncoding.DecodeString(chB64)
	if err != nil {
		t.Fatalf("header not standard base64: %v", err)
	}
	if body := rec.Body.String(); string(raw) != body {
		t.Fatalf("header and body differ:\nheader %s\nbody   %s", raw, body)
	}
	var ch challenge
	if err := json.Unmarshal(raw, &ch); err != nil {
		t.Fatalf("challenge JSON: %v", err)
	}
	if ch.X402Version != 2 || len(ch.Accepts) != 1 {
		t.Fatalf("challenge = %+v", ch)
	}
	a := ch.Accepts[0]
	if a.Scheme != "exact" || a.Network != "eip155:43113" || a.Amount != "10000" ||
		a.Asset != gatedConfig("").Asset || a.PayTo != gatedConfig("").PayTo {
		t.Fatalf("accept = %+v", a)
	}
	if a.Extra["name"] != "USDC" || a.Extra["version"] != "2" {
		t.Fatalf("extra = %v", a.Extra)
	}
	if ch.Resource.URL != "http://api.local/graph/snapshot" {
		t.Fatalf("resource.url = %q", ch.Resource.URL)
	}
	if ch.Error != "PAYMENT-SIGNATURE header is required" {
		t.Fatalf("error = %q", ch.Error)
	}
}

func TestWrap_InvalidSignatureChallenges(t *testing.T) {
	called := false
	h := New(gatedConfig("http://unused.invalid")).Wrap(okHandler(&called))
	req := httptest.NewRequest(http.MethodGet, "/graph/snapshot", nil)
	req.Header.Set("PAYMENT-SIGNATURE", base64.StdEncoding.EncodeToString([]byte("not-json")))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if called || rec.Code != http.StatusPaymentRequired {
		t.Fatalf("called=%v code=%d", called, rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "invalid PAYMENT-SIGNATURE") {
		t.Fatalf("body = %s", rec.Body.String())
	}
}

// fakeFacilitator records the settle request and answers with want.
func fakeFacilitator(t *testing.T, wantStatus int, wantBody string, got *[]byte) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/settle" || r.Method != http.MethodPost {
			t.Errorf("facilitator got %s %s, want POST /settle", r.Method, r.URL.Path)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("content-type = %q", ct)
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		*got = body
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(wantStatus)
		_, _ = w.Write([]byte(wantBody))
	}))
}

func TestWrap_SettledServesAndSetsPaymentResponse(t *testing.T) {
	var got []byte
	fac := fakeFacilitator(t, http.StatusOK,
		`{"success":true,"transaction":"0xabc","network":"eip155:43113","payer":"0x857b"}`, &got)
	defer fac.Close()

	payload := `{"x402Version":2,"resource":{"url":"x"},"accepted":{"scheme":"exact"},"payload":{"signature":"0xs","authorization":{"value":"10000"}}}`
	called := false
	h := New(gatedConfig(fac.URL)).Wrap(okHandler(&called))
	req := httptest.NewRequest(http.MethodGet, "/graph/snapshot", nil)
	req.Header.Set("PAYMENT-SIGNATURE", base64.StdEncoding.EncodeToString([]byte(payload)))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if !called || rec.Code != http.StatusOK {
		t.Fatalf("called=%v code=%d body=%s", called, rec.Code, rec.Body.String())
	}
	prB64 := rec.Header().Get("PAYMENT-RESPONSE")
	if prB64 == "" {
		t.Fatal("missing PAYMENT-RESPONSE header")
	}
	pr, err := base64.StdEncoding.DecodeString(prB64)
	if err != nil {
		t.Fatalf("PAYMENT-RESPONSE base64: %v", err)
	}
	var settled settleResponse
	if err := json.Unmarshal(pr, &settled); err != nil {
		t.Fatalf("PAYMENT-RESPONSE JSON: %v", err)
	}
	if !settled.Success || settled.Transaction != "0xabc" {
		t.Fatalf("PAYMENT-RESPONSE = %+v", settled)
	}

	var reqBody struct {
		X402Version         int             `json:"x402Version"`
		PaymentPayload      json.RawMessage `json:"paymentPayload"`
		PaymentRequirements requirement     `json:"paymentRequirements"`
	}
	if err := json.Unmarshal(got, &reqBody); err != nil {
		t.Fatalf("facilitator body: %v", err)
	}
	if reqBody.X402Version != 2 {
		t.Fatalf("x402Version = %d", reqBody.X402Version)
	}
	if string(reqBody.PaymentPayload) != payload {
		t.Fatalf("paymentPayload not passed verbatim: %s", reqBody.PaymentPayload)
	}
	if reqBody.PaymentRequirements.Amount != "10000" || reqBody.PaymentRequirements.PayTo != gatedConfig("").PayTo {
		t.Fatalf("paymentRequirements = %+v", reqBody.PaymentRequirements)
	}
}

func TestWrap_SettlementRejectedChallenges(t *testing.T) {
	var got []byte
	fac := fakeFacilitator(t, http.StatusOK,
		`{"success":false,"errorReason":"insufficient_funds","transaction":"","network":"eip155:43113"}`, &got)
	defer fac.Close()

	called := false
	h := New(gatedConfig(fac.URL)).Wrap(okHandler(&called))
	req := httptest.NewRequest(http.MethodGet, "/graph/snapshot", nil)
	req.Header.Set("PAYMENT-SIGNATURE", base64.StdEncoding.EncodeToString([]byte(`{"x402Version":2}`)))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if called {
		t.Fatal("handler ran after failed settlement")
	}
	if rec.Code != http.StatusPaymentRequired {
		t.Fatalf("code = %d, want 402", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "insufficient_funds") {
		t.Fatalf("body = %s", rec.Body.String())
	}
	if rec.Header().Get("PAYMENT-RESPONSE") != "" {
		t.Fatal("PAYMENT-RESPONSE set on failed settlement")
	}
}

func TestWrap_FacilitatorDownReturns503(t *testing.T) {
	fac := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	fac.Close() // immediately refused

	called := false
	h := New(gatedConfig(fac.URL)).Wrap(okHandler(&called))
	req := httptest.NewRequest(http.MethodGet, "/graph/snapshot", nil)
	req.Header.Set("PAYMENT-SIGNATURE", base64.StdEncoding.EncodeToString([]byte(`{"x402Version":2}`)))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if called {
		t.Fatal("handler ran with facilitator down")
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("code = %d, want 503", rec.Code)
	}
}

func TestWrap_PreflightPassesUnpaid(t *testing.T) {
	called := false
	h := New(gatedConfig("http://unused.invalid")).Wrap(okHandler(&called))
	req := httptest.NewRequest(http.MethodOptions, "/graph/snapshot", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if called {
		t.Fatal("preflight reached handler")
	}
	if rec.Code != http.StatusNoContent {
		t.Fatalf("code = %d, want 204", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("missing CORS allow-origin on preflight")
	}
}

func TestDecodePayment_Variants(t *testing.T) {
	want := json.RawMessage(`{"x402Version":2}`)
	for _, enc := range []*base64.Encoding{base64.StdEncoding, base64.RawStdEncoding, base64.URLEncoding, base64.RawURLEncoding} {
		got, err := decodePayment(enc.EncodeToString(want))
		if err != nil {
			t.Fatalf("%v: %v", enc, err)
		}
		if string(got) != string(want) {
			t.Fatalf("%v: got %s", enc, got)
		}
	}
	if _, err := decodePayment(""); err == nil || !strings.Contains(err.Error(), "required") {
		t.Fatalf("empty input err = %v", err)
	}
	if _, err := decodePayment("!!!"); err == nil {
		t.Fatal("want error for non-base64")
	}
}
