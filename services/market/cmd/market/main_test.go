package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestQuoteGate(t *testing.T) {
	g := &quoteGate{}

	// Before the hub is up (or when the quote protocol is disabled): 503.
	rec := httptest.NewRecorder()
	g.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/quotes", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("unset gate code = %d, want 503", rec.Code)
	}

	// After set: delegate to the protocol handler.
	g.set(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("up"))
	}))
	rec = httptest.NewRecorder()
	g.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/quotes", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "up" {
		t.Fatalf("set gate = %d %q, want 200 \"up\"", rec.Code, rec.Body.String())
	}
}
