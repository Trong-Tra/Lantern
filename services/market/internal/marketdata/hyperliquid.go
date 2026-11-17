package marketdata

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/coder/websocket"
)

const (
	defaultHLInfoURL = "https://api.hyperliquid.xyz/info"
	defaultHLWSURL   = "wss://api.hyperliquid.xyz/ws"
	hlReconnectDelay = 3 * time.Second
	// hlPingInterval keeps the socket warm (Hyperliquid replies to
	// `{"method":"ping"}` with a pong frame).
	hlPingInterval = 30 * time.Second
	// hlStaleAfter reconnects when nothing — not even a pong — arrives in
	// this long. A half-open socket never errors on Read, so without this
	// the feed can sit "connected" and silent for hours.
	hlStaleAfter = 90 * time.Second
)

// candleSpec is one native Hyperliquid candle size the feed keeps, with how
// many bars to hold (closed bars + the forming one).
type candleSpec struct {
	interval string
	bars     int
}

// HL streams Hyperliquid USD mids + candles into the Store. URLs are fields
// so tests can point at fakes; production uses the defaults.
type HL struct {
	coins   []string
	specs   []candleSpec
	store   *Store
	infoURL string
	wsURL   string
	http    *http.Client
	// pingEvery/staleAfter drive the liveness guard; tests shorten them.
	pingEvery  time.Duration
	staleAfter time.Duration
}

func NewHL(coins []string, specs []candleSpec, store *Store) *HL {
	return &HL{
		coins:      coins,
		specs:      specs,
		store:      store,
		infoURL:    defaultHLInfoURL,
		wsURL:      defaultHLWSURL,
		http:       &http.Client{Timeout: 15 * time.Second},
		pingEvery:  hlPingInterval,
		staleAfter: hlStaleAfter,
	}
}

// Run boot-fetches history + initial mids, then keeps the WS alive until ctx
// ends. Failures log and retry — the feed degrades, the service never dies.
func (h *HL) Run(ctx context.Context) {
	h.boot(ctx)
	for ctx.Err() == nil {
		if err := h.wsLoop(ctx); ctx.Err() != nil {
			return
		} else if err != nil {
			log.Printf("marketdata: hyperliquid ws: %v — reconnecting in %s", err, hlReconnectDelay)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(hlReconnectDelay):
		}
	}
}

// boot loads candle history and a first mids batch over REST so the endpoints
// serve data before the first WS frame arrives.
func (h *HL) boot(ctx context.Context) {
	now := time.Now().UTC()
	for _, coin := range h.coins {
		for _, spec := range h.specs {
			span, ok := candleSpan(spec.interval)
			if !ok {
				log.Printf("marketdata: hyperliquid unknown candle interval %q", spec.interval)
				continue
			}
			// Ask for whole bars from `bars` spans back: HL returns the closed
			// bars plus the one still forming.
			cs, err := h.candleSnapshot(ctx, coin, spec.interval, now.Add(-time.Duration(spec.bars)*span))
			if err != nil {
				log.Printf("marketdata: hyperliquid %s %s history: %v", coin, spec.interval, err)
				continue
			}
			if len(cs) > spec.bars {
				cs = cs[len(cs)-spec.bars:]
			}
			h.store.SetCandles(coin, spec.interval, cs)
			log.Printf("marketdata: hyperliquid %s %s history: %d candles", coin, spec.interval, len(cs))
		}
	}
	if mids, err := h.metaMids(ctx); err != nil {
		log.Printf("marketdata: hyperliquid mids: %v", err)
	} else {
		filtered := h.filterMids(mids)
		h.store.SetPrices(filtered, time.Now().UTC())
		log.Printf("marketdata: hyperliquid mids: %d coins", len(filtered))
	}
}

// filterMids keeps only the configured coins (HL publishes hundreds).
func (h *HL) filterMids(mids map[string]string) map[string]string {
	wanted := map[string]bool{}
	for _, c := range h.coins {
		wanted[c] = true
	}
	out := map[string]string{}
	for coin, mid := range mids {
		if wanted[coin] {
			out[coin] = mid
		}
	}
	return out
}

type hlInfoResp struct {
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// candleSnapshot POSTs /info type=candleSnapshot for one coin since start.
func (h *HL) candleSnapshot(ctx context.Context, coin, interval string, start time.Time) ([]Candle, error) {
	req := map[string]any{
		"type": "candleSnapshot",
		"req": map[string]any{
			"coin":      coin,
			"interval":  interval,
			"startTime": start.UnixMilli(),
			"endTime":   time.Now().UTC().UnixMilli(),
		},
	}
	raw, err := h.postInfo(ctx, req)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		OpenMs  int64  `json:"t"`
		CloseMs int64  `json:"T"` // distinct field: both keys exist, don't collide
		O       string `json:"o"`
		H       string `json:"h"`
		L       string `json:"l"`
		C       string `json:"c"`
		V       string `json:"v"`
	}
	if err := json.Unmarshal(raw, &rows); err != nil {
		return nil, fmt.Errorf("candleSnapshot decode: %w", err)
	}
	out := make([]Candle, 0, len(rows))
	for _, r := range rows {
		o, ok1 := parseFloat(r.O)
		hh, ok2 := parseFloat(r.H)
		l, ok3 := parseFloat(r.L)
		c, ok4 := parseFloat(r.C)
		v, ok5 := parseFloat(r.V)
		if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 {
			continue
		}
		out = append(out, Candle{T: r.OpenMs, O: o, H: hh, L: l, C: c, V: v})
	}
	return out, nil
}

// metaMids POSTs /info type=metaAndAssetCtxs and zips universe names to
// markPx values. Shape (verified live 2026-11-16):
// [{"universe":[{name...},...]}, [{markPx...},...]] — two parallel arrays.
func (h *HL) metaMids(ctx context.Context) (map[string]string, error) {
	raw, err := h.postInfo(ctx, map[string]any{"type": "metaAndAssetCtxs"})
	if err != nil {
		return nil, err
	}
	var meta []json.RawMessage
	if err := json.Unmarshal(raw, &meta); err != nil || len(meta) < 2 {
		return nil, fmt.Errorf("metaAndAssetCtxs: unexpected shape (err=%v len=%d)", err, len(meta))
	}
	var head struct {
		Universe []struct {
			Name string `json:"name"`
		} `json:"universe"`
	}
	if err := json.Unmarshal(meta[0], &head); err != nil {
		return nil, fmt.Errorf("metaAndAssetCtxs universe: %w", err)
	}
	var ctxs []struct {
		MarkPx string `json:"markPx"`
		MidPx  string `json:"midPx"`
	}
	if err := json.Unmarshal(meta[1], &ctxs); err != nil {
		return nil, fmt.Errorf("metaAndAssetCtxs ctxs: %w", err)
	}
	mids := map[string]string{}
	for i, u := range head.Universe {
		if i >= len(ctxs) || u.Name == "" {
			continue
		}
		px := ctxs[i].MarkPx
		if px == "" {
			px = ctxs[i].MidPx
		}
		if px != "" {
			mids[u.Name] = px
		}
	}
	return mids, nil
}

func (h *HL) postInfo(ctx context.Context, payload any) (json.RawMessage, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.infoURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := h.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("hyperliquid info: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("hyperliquid info: HTTP %d: %s", resp.StatusCode, truncate(raw, 200))
	}
	var envelope struct {
		Result json.RawMessage `json:"result"`
	}
	if err := json.Unmarshal(raw, &envelope); err == nil && len(envelope.Result) > 0 {
		return envelope.Result, nil
	}
	return raw, nil
}

// wsLoop dials, subscribes, and applies frames until the connection or ctx
// fails.
func (h *HL) wsLoop(ctx context.Context) error {
	conn, _, err := websocket.Dial(ctx, h.wsURL, nil)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "bye")
	log.Printf("marketdata: hyperliquid ws connected (%s)", h.wsURL)

	subs := []string{`{"method":"subscribe","subscription":{"type":"allMids"}}`}
	for _, coin := range h.coins {
		for _, spec := range h.specs {
			subs = append(subs, fmt.Sprintf(
				`{"method":"subscribe","subscription":{"type":"candle","coin":%q,"interval":%q}}`,
				coin, spec.interval))
		}
	}
	for _, s := range subs {
		if err := conn.Write(ctx, websocket.MessageText, []byte(s)); err != nil {
			return fmt.Errorf("subscribe: %w", err)
		}
	}

	// Heartbeat: pings keep the connection alive and give the read side
	// regular proof of life, so a silently half-open socket is detected
	// instead of freezing the feed.
	pingCtx, stopPings := context.WithCancel(ctx)
	defer stopPings()
	pingErr := make(chan error, 1)
	go func() {
		ticker := time.NewTicker(h.pingEvery)
		defer ticker.Stop()
		for {
			select {
			case <-pingCtx.Done():
				return
			case <-ticker.C:
				if err := conn.Write(ctx, websocket.MessageText, []byte(`{"method":"ping"}`)); err != nil {
					select {
					case pingErr <- err:
					default:
					}
					conn.Close(websocket.StatusInternalError, "ping failed")
					return
				}
			}
		}
	}()

	for {
		readCtx, cancel := context.WithTimeout(ctx, h.staleAfter)
		_, data, err := conn.Read(readCtx)
		stale := readCtx.Err() == context.DeadlineExceeded
		cancel()
		if err != nil {
			select {
			case pingErr := <-pingErr:
				return fmt.Errorf("ping: %w", pingErr)
			default:
			}
			if stale {
				return fmt.Errorf("read: no frames for %s", h.staleAfter)
			}
			return fmt.Errorf("read: %w", err)
		}
		h.handleFrame(data)
	}
}

// handleFrame applies one WS frame: allMids batches, candle updates, errors.
func (h *HL) handleFrame(data []byte) {
	var frame struct {
		Channel string          `json:"channel"`
		Data    json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(data, &frame); err != nil {
		return
	}
	switch frame.Channel {
	case "allMids":
		var payload struct {
			Mids map[string]string `json:"mids"`
		}
		if err := json.Unmarshal(frame.Data, &payload); err != nil {
			return
		}
		filtered := h.filterMids(payload.Mids)
		if len(filtered) > 0 {
			h.store.SetPrices(filtered, time.Now().UTC())
		}
	case "candle":
		var c struct {
			OpenMs  int64  `json:"t"`
			CloseMs int64  `json:"T"` // present in frames; exact key absorbs it
			S       string `json:"s"`
			I       string `json:"i"`
			O       string `json:"o"`
			H       string `json:"h"`
			L       string `json:"l"`
			C       string `json:"c"`
			V       string `json:"v"`
		}
		if err := json.Unmarshal(frame.Data, &c); err != nil || c.S == "" {
			return
		}
		o, ok1 := parseFloat(c.O)
		hh, ok2 := parseFloat(c.H)
		l, ok3 := parseFloat(c.L)
		cc, ok4 := parseFloat(c.C)
		v, ok5 := parseFloat(c.V)
		if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 {
			return
		}
		interval := c.I
		if interval == "" && len(h.specs) > 0 {
			interval = h.specs[0].interval
		}
		h.store.UpsertCandle(c.S, interval, Candle{T: c.OpenMs, O: o, H: hh, L: l, C: cc, V: v})
	case "error":
		log.Printf("marketdata: hyperliquid ws error: %s", truncate(frame.Data, 300))
	case "pong":
		// Heartbeat reply — keeps the stale-read deadline refreshed.
	}
}

// candleSpan is one bar's duration for a Hyperliquid interval ("5m", "1h",
// "1d", "1w", "1M", …). Boot history needs it to compute the snapshot start.
func candleSpan(interval string) (time.Duration, bool) {
	if interval == "1M" {
		return 30 * 24 * time.Hour, true
	}
	if len(interval) < 2 {
		return 0, false
	}
	count, err := strconv.Atoi(interval[:len(interval)-1])
	if err != nil || count < 1 {
		return 0, false
	}
	units := map[byte]time.Duration{
		'm': time.Minute,
		'h': time.Hour,
		'd': 24 * time.Hour,
		'w': 7 * 24 * time.Hour,
	}
	unit, ok := units[interval[len(interval)-1]]
	if !ok {
		return 0, false
	}
	return time.Duration(count) * unit, true
}

func truncate(b []byte, n int) string {
	s := strings.TrimSpace(string(b))
	if len(s) > n {
		return s[:n] + "…"
	}
	return s
}
