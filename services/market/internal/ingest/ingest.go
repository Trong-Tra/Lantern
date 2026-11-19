// Package ingest streams pool state from the Envio indexer's Hasura GraphQL
// subscriptions (WebSocket, subscriptions-transport-ws protocol) into domain
// updates. No custom indexing code — Hasura is the only data source.
package ingest

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/coder/websocket"

	"github.com/lantern/market/internal/graph"
)

// poolsSubscription mirrors the Pool entity in indexer/schema.graphql.
const poolsSubscription = `subscription PoolReserves {
	Pool { id token0 token1 reserve0 reserve1 updatedAtBlock }
}`

// wsMessage is the subscriptions-transport-ws ("graphql-ws") envelope.
type wsMessage struct {
	ID      string          `json:"id,omitempty"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type subscriptionPayload struct {
	Data struct {
		Pool []poolRow `json:"Pool"`
	} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

type poolRow struct {
	ID             string `json:"id"`
	Token0         string `json:"token0"`
	Token1         string `json:"token1"`
	Reserve0       string `json:"reserve0"`
	Reserve1       string `json:"reserve1"`
	UpdatedAtBlock string `json:"updatedAtBlock"`
}

// Client is a single-use Hasura subscription connection.
type Client struct {
	wsURL       string
	adminSecret string
	dialTimeout time.Duration
}

func NewClient(wsURL, adminSecret string) *Client {
	return &Client{wsURL: wsURL, adminSecret: adminSecret, dialTimeout: 10 * time.Second}
}

// SubscribePools connects and streams pool updates until ctx is cancelled or
// the server errors/closes. The channel closes on return; a non-nil error from
// the stream is delivered via the returned error value of the goroutine —
// callers should treat channel close as "reconnect".
func (c *Client) SubscribePools(ctx context.Context) (<-chan graph.Sync, <-chan error) {
	out := make(chan graph.Sync, 64)
	errc := make(chan error, 1)
	go func() {
		defer close(out)
		defer close(errc)
		if err := c.run(ctx, out); err != nil {
			errc <- err
		}
	}()
	return out, errc
}

func (c *Client) run(ctx context.Context, out chan<- graph.Sync) error {
	dialCtx, cancel := context.WithTimeout(ctx, c.dialTimeout)
	conn, _, err := websocket.Dial(dialCtx, c.wsURL, &websocket.DialOptions{
		Subprotocols: []string{"graphql-ws"},
	})
	cancel()
	if err != nil {
		return fmt.Errorf("ingest: dial %s: %w", c.wsURL, err)
	}
	defer conn.CloseNow()

	initPayload := map[string]any{}
	if c.adminSecret != "" {
		initPayload["headers"] = map[string]string{"x-hasura-admin-secret": c.adminSecret}
	}
	if err := writeMsg(ctx, conn, wsMessage{Type: "connection_init", Payload: mustJSON(initPayload)}); err != nil {
		return err
	}

	// Expect connection_ack before starting the subscription. Some Hasura
	// builds send keep-alive ("ka") frames first — tolerate those.
	for {
		msg, err := readMsg(ctx, conn)
		if err != nil {
			return err
		}
		switch msg.Type {
		case "connection_ack":
			goto acked
		case "ka":
			continue
		default:
			return fmt.Errorf("ingest: expected connection_ack, got %q", msg.Type)
		}
	}
acked:

	subID := "pools-1"
	startPayload, _ := json.Marshal(map[string]any{
		"query": poolsSubscription,
	})
	if err := writeMsg(ctx, conn, wsMessage{ID: subID, Type: "start", Payload: startPayload}); err != nil {
		return err
	}

	for {
		msg, err := readMsg(ctx, conn)
		if err != nil {
			return fmt.Errorf("ingest: read: %w", err)
		}
		switch msg.Type {
		case "data":
			if msg.ID != subID {
				continue
			}
			syncs, err := parseData(msg.Payload)
			if err != nil {
				return err
			}
			for _, s := range syncs {
				select {
				case out <- s:
				case <-ctx.Done():
					return nil
				}
			}
		case "ka": // keep-alive
		case "error":
			return fmt.Errorf("ingest: subscription error: %s", string(msg.Payload))
		case "complete":
			return fmt.Errorf("ingest: subscription completed by server")
		}
	}
}

// parseData decodes one data frame into pool updates. A GraphQL-level error
// payload fails the whole frame (partial data is worse than none).
func parseData(raw json.RawMessage) ([]graph.Sync, error) {
	var payload subscriptionPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, fmt.Errorf("ingest: decode data frame: %w", err)
	}
	if len(payload.Errors) > 0 {
		return nil, fmt.Errorf("ingest: graphql error: %s", payload.Errors[0].Message)
	}
	out := make([]graph.Sync, 0, len(payload.Data.Pool))
	for _, row := range payload.Data.Pool {
		s, err := row.toSync()
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}

func (r poolRow) toSync() (graph.Sync, error) {
	parseBig := func(field, v string) (*big.Int, error) {
		n, ok := new(big.Int).SetString(v, 10)
		if !ok {
			return nil, fmt.Errorf("ingest: pool %s: bad %s %q", r.ID, field, v)
		}
		return n, nil
	}
	r0, err := parseBig("reserve0", r.Reserve0)
	if err != nil {
		return graph.Sync{}, err
	}
	r1, err := parseBig("reserve1", r.Reserve1)
	if err != nil {
		return graph.Sync{}, err
	}
	block, err := parseBig("updatedAtBlock", r.UpdatedAtBlock)
	if err != nil {
		return graph.Sync{}, err
	}
	if !block.IsUint64() {
		return graph.Sync{}, fmt.Errorf("ingest: pool %s: updatedAtBlock overflows uint64", r.ID)
	}
	return graph.Sync{
		Address:        r.ID,
		Token0:         r.Token0,
		Token1:         r.Token1,
		Reserve0:       r0,
		Reserve1:       r1,
		UpdatedAtBlock: block.Uint64(),
	}, nil
}

func writeMsg(ctx context.Context, conn *websocket.Conn, msg wsMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return conn.Write(ctx, websocket.MessageText, data)
}

func readMsg(ctx context.Context, conn *websocket.Conn) (wsMessage, error) {
	_, data, err := conn.Read(ctx)
	if err != nil {
		return wsMessage{}, err
	}
	var msg wsMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return wsMessage{}, fmt.Errorf("ingest: decode frame: %w", err)
	}
	return msg, nil
}

func mustJSON(v any) json.RawMessage {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return data
}
