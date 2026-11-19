package marketdata

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

// Handler serves the display-only feed:
//
//	GET /market/prices   — Hyperliquid USD mids per coin
//	GET /market/graph    — real-DEX pools with polled reserves
//	GET /market/candles?coin=&interval=&limit= — OHLCV history + live updates
//
// CORS is open (the FE runs on its own origin) and responses are never
// cached — every frame is as fresh as the last poll/stream tick.
func Handler(store *Store) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/market/prices", func(w http.ResponseWriter, r *http.Request) {
		if !allowGET(w, r) {
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"prices":    store.Prices(),
			"updatedAt": ts(store.UpdatedAt()),
		})
	})
	mux.HandleFunc("/market/graph", func(w http.ResponseWriter, r *http.Request) {
		if !allowGET(w, r) {
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"pools":     store.Pools(),
			"updatedAt": ts(store.UpdatedAt()),
		})
	})
	mux.HandleFunc("/market/candles", func(w http.ResponseWriter, r *http.Request) {
		if !allowGET(w, r) {
			return
		}
		q := r.URL.Query()
		coin := q.Get("coin")
		interval := q.Get("interval")
		if coin == "" || interval == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "coin and interval query params are required"})
			return
		}
		limit := 168
		if v := q.Get("limit"); v != "" {
			n, err := strconv.Atoi(v)
			if err != nil || n < 1 || n > 4000 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "limit must be an integer in [1,4000]"})
				return
			}
			limit = n
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"coin":      coin,
			"interval":  interval,
			"candles":   store.Candles(coin, interval, limit),
			"updatedAt": ts(store.UpdatedAt()),
		})
	})
	return cors(mux)
}

// allowGET answers non-GET/OPTIONS with 405; OPTIONS preflight returns 204.
func allowGET(w http.ResponseWriter, r *http.Request) bool {
	switch r.Method {
	case http.MethodGet:
		return true
	case http.MethodOptions:
		w.WriteHeader(http.StatusNoContent)
		return false
	default:
		w.Header().Set("Allow", "GET, OPTIONS")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return false
	}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// ts renders a (possibly zero) time as JSON — zero stays the null instant.
func ts(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return t.UTC()
}
