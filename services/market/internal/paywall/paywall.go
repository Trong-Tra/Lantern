// Package paywall gates an HTTP handler behind x402 micropayments settled
// through a facilitator (PayAI). Protocol reference:
// https://docs.payai.network/x402/reference — v2 exact scheme, headers
// PAYMENT-REQUIRED / PAYMENT-SIGNATURE / PAYMENT-RESPONSE (base64 JSON).
package paywall

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// Config carries the x402 payment terms. The middleware serves open access
// while Asset, PayTo and Amount are all empty; all three must be set together.
type Config struct {
	FacilitatorURL string
	Network        string // CAIP-2 id, e.g. eip155:43113
	Asset          string // ERC-20 address, e.g. USDC on Fuji
	PayTo          string // merchant receiving address
	Amount         string // price in asset base units, decimal string
}

// Gated reports whether payment terms are configured.
func (c Config) Gated() bool {
	return c.Asset != "" && c.PayTo != "" && c.Amount != ""
}

const (
	// assetName/assetVersion are the EIP-712 domain hints for the configured
	// asset (USDC v2 on Avalanche Fuji — PayAI's live Fuji route advertises
	// exactly these; revisit if X402_ASSET ever points elsewhere).
	assetName    = "USDC"
	assetVersion = "2"

	maxTimeoutSeconds  = 300
	facilitatorTimeout = 60 * time.Second // settle waits on-chain confirmation
	maxBodyBytes       = 1 << 20
)

type requirement struct {
	Scheme            string         `json:"scheme"`
	Network           string         `json:"network"`
	Amount            string         `json:"amount"`
	Asset             string         `json:"asset"`
	PayTo             string         `json:"payTo"`
	MaxTimeoutSeconds int            `json:"maxTimeoutSeconds"`
	Extra             map[string]any `json:"extra"`
}

type resource struct {
	URL         string `json:"url"`
	Description string `json:"description"`
	MIMEType    string `json:"mimeType"`
}

type challenge struct {
	X402Version int           `json:"x402Version"`
	Resource    resource      `json:"resource"`
	Accepts     []requirement `json:"accepts"`
	Error       string        `json:"error,omitempty"`
}

type settleResponse struct {
	Success      bool   `json:"success"`
	ErrorReason  string `json:"errorReason,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	Transaction  string `json:"transaction"`
	Network      string `json:"network"`
	Payer        string `json:"payer,omitempty"`
}

// Middleware wraps handlers with the x402 flow described in the package doc.
type Middleware struct {
	cfg    Config
	client *http.Client
}

// New builds a middleware for cfg (open access while terms are empty).
func New(cfg Config) *Middleware {
	return &Middleware{
		cfg:    cfg,
		client: &http.Client{Timeout: facilitatorTimeout},
	}
}

// Gated reports whether requests require payment.
func (m *Middleware) Gated() bool { return m.cfg.Gated() }

// Wrap returns next behind the payment flow. CORS preflight passes through
// unpaid (browsers cannot attach payment headers to OPTIONS).
func (m *Middleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "PAYMENT-SIGNATURE, PAYMENT-REQUIRED, PAYMENT-RESPONSE, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if !m.cfg.Gated() {
			next.ServeHTTP(w, r)
			return
		}
		m.servePaid(w, r, next)
	})
}

func (m *Middleware) servePaid(w http.ResponseWriter, r *http.Request, next http.Handler) {
	raw, err := decodePayment(r.Header.Get("PAYMENT-SIGNATURE"))
	if err != nil {
		m.challenge(w, r, err.Error())
		return
	}
	req := m.requirement()
	body, err := json.Marshal(struct {
		X402Version         int             `json:"x402Version"`
		PaymentPayload      json.RawMessage `json:"paymentPayload"`
		PaymentRequirements requirement     `json:"paymentRequirements"`
	}{2, raw, req})
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}

	respBody, err := m.post("/settle", body)
	if err != nil {
		log.Printf("paywall: facilitator settle: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"error":"facilitator_unavailable"}`))
		return
	}
	var settled settleResponse
	if err := json.Unmarshal(respBody, &settled); err != nil {
		log.Printf("paywall: facilitator settle: undecodable response: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"error":"facilitator_unavailable"}`))
		return
	}
	if !settled.Success {
		reason := settled.ErrorReason
		if reason == "" {
			reason = settled.ErrorMessage
		}
		if reason == "" {
			reason = "settlement_failed"
		}
		log.Printf("paywall: settle rejected: %s (tx=%q)", reason, settled.Transaction)
		m.challenge(w, r, reason)
		return
	}

	w.Header().Set("PAYMENT-RESPONSE", base64.StdEncoding.EncodeToString(respBody))
	next.ServeHTTP(w, r)
}

func (m *Middleware) requirement() requirement {
	return requirement{
		Scheme:            "exact",
		Network:           m.cfg.Network,
		Amount:            m.cfg.Amount,
		Asset:             m.cfg.Asset,
		PayTo:             m.cfg.PayTo,
		MaxTimeoutSeconds: maxTimeoutSeconds,
		Extra:             map[string]any{"name": assetName, "version": assetVersion},
	}
}

func (m *Middleware) post(path string, body []byte) ([]byte, error) {
	httpReq, err := http.NewRequest(http.MethodPost, m.cfg.FacilitatorURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := m.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
}

func (m *Middleware) challenge(w http.ResponseWriter, r *http.Request, reason string) {
	ch := challenge{
		X402Version: 2,
		Resource: resource{
			URL:         requestURL(r),
			Description: "Lantern Graph pool snapshot",
			MIMEType:    "application/json",
		},
		Accepts: []requirement{m.requirement()},
		Error:   reason,
	}
	body, err := json.Marshal(ch)
	if err != nil {
		http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("PAYMENT-REQUIRED", base64.StdEncoding.EncodeToString(body))
	w.WriteHeader(http.StatusPaymentRequired)
	_, _ = w.Write(body)
}

func requestURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if p := r.Header.Get("X-Forwarded-Proto"); p != "" {
		scheme = p
	}
	return scheme + "://" + r.Host + r.URL.RequestURI()
}

// decodePayment accepts the base64 JSON payment payload the client put in
// PAYMENT-SIGNATURE (standard padded/unpadded, URL-safe variants tolerated).
func decodePayment(v string) (json.RawMessage, error) {
	if v == "" {
		return nil, fmt.Errorf("PAYMENT-SIGNATURE header is required")
	}
	var raw []byte
	var err error
	for _, enc := range []*base64.Encoding{
		base64.StdEncoding, base64.RawStdEncoding,
		base64.URLEncoding, base64.RawURLEncoding,
	} {
		if raw, err = enc.DecodeString(v); err == nil {
			break
		}
	}
	if err != nil {
		return nil, fmt.Errorf("invalid PAYMENT-SIGNATURE: base64")
	}
	if !json.Valid(raw) {
		return nil, fmt.Errorf("invalid PAYMENT-SIGNATURE: not JSON")
	}
	return json.RawMessage(raw), nil
}
