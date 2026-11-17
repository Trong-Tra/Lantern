package marketdata

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/coder/websocket"
)

// TestHL_LiveShapes dials the real Hyperliquid WS and prints raw frames so
// the parser targets actual shapes. Skipped unless LANTERN_LIVE=1.
func TestHL_LiveShapes(t *testing.T) {
	if os.Getenv("LANTERN_LIVE") != "1" {
		t.Skip("set LANTERN_LIVE=1 for live Hyperliquid probe")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, "wss://api.hyperliquid.xyz/ws", nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "bye")

	subs := []string{
		`{"method":"subscribe","subscription":{"type":"allMids"}}`,
		`{"method":"subscribe","subscription":{"type":"candle","coin":"BTC","interval":"1m"}}`,
	}
	for _, s := range subs {
		if err := conn.Write(ctx, websocket.MessageText, []byte(s)); err != nil {
			t.Fatalf("subscribe: %v", err)
		}
	}
	for i := 0; i < 6; i++ {
		_, data, err := conn.Read(ctx)
		if err != nil {
			t.Fatalf("read %d: %v", i, err)
		}
		t.Logf("frame %d: %s", i, data)
	}
}
