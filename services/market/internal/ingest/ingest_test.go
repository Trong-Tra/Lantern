package ingest

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

// fakeHasura upgrades to WS, expects connection_init (+ optional admin
// secret), replies connection_ack, then serves the given data frames after
// "start".
func fakeHasura(t *testing.T, wantSecret string, frames []wsMessage) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{Subprotocols: []string{"graphql-ws"}})
		if err != nil {
			t.Errorf("accept: %v", err)
			return
		}
		defer conn.CloseNow()

		ctx := r.Context()
		msg, err := readMsg(ctx, conn)
		if err != nil || msg.Type != "connection_init" {
			t.Errorf("init: %v %q", err, msg.Type)
			return
		}
		if wantSecret != "" {
			var raw struct {
				Headers map[string]string `json:"headers"`
			}
			if err := json.Unmarshal(msg.Payload, &raw); err != nil {
				t.Errorf("init payload: %v", err)
				return
			}
			if got := raw.Headers["x-hasura-admin-secret"]; got != wantSecret {
				t.Errorf("admin secret = %q, want %q", got, wantSecret)
				return
			}
		}
		if err := writeMsg(ctx, conn, wsMessage{Type: "connection_ack"}); err != nil {
			t.Errorf("ack: %v", err)
			return
		}

		msg, err = readMsg(ctx, conn)
		if err != nil || msg.Type != "start" {
			t.Errorf("start: %v %q", err, msg.Type)
			return
		}
		var start struct {
			Query string `json:"query"`
		}
		if err := json.Unmarshal(msg.Payload, &start); err != nil || !strings.Contains(start.Query, "Pool") {
			t.Errorf("subscription query malformed: %v", err)
			return
		}
		for _, frame := range frames {
			frame.ID = msg.ID
			if err := writeMsg(ctx, conn, frame); err != nil {
				return
			}
		}
		// Keep the socket open until the test ends or the client goes away.
		<-ctx.Done()
	}))
}

func wsURL(s *httptest.Server) string {
	return "ws" + strings.TrimPrefix(s.URL, "http")
}

func dataFrame(t *testing.T, rows string) wsMessage {
	t.Helper()
	return wsMessage{Type: "data", Payload: json.RawMessage(`{"data":{"Pool":` + rows + `}}`)}
}

func TestSubscribePools_StreamsUpdates(t *testing.T) {
	frame := dataFrame(t, `[{
		"id": "0xPOOL", "token0": "0xA", "token1": "0xB",
		"reserve0": "1000", "reserve1": "2000", "updatedAtBlock": "42"
	}]`)
	srv := fakeHasura(t, "testing", []wsMessage{frame})
	defer srv.Close()

	c := NewClient(wsURL(srv), "testing")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	updates, errc := c.SubscribePools(ctx)
	select {
	case u := <-updates:
		if u.Address != "0xPOOL" || u.Reserve0.Int64() != 1000 || u.Reserve1.Int64() != 2000 || u.UpdatedAtBlock != 42 {
			t.Errorf("update = %+v", u)
		}
	case err := <-errc:
		t.Fatalf("stream error: %v", err)
	case <-ctx.Done():
		t.Fatal("timeout waiting for update")
	}
}

func TestSubscribePools_GraphQLErrorFailsStream(t *testing.T) {
	frame := wsMessage{Type: "data", Payload: json.RawMessage(`{"errors":[{"message":"boom"}]}`)}
	srv := fakeHasura(t, "", []wsMessage{frame})
	defer srv.Close()

	c := NewClient(wsURL(srv), "")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, errc := c.SubscribePools(ctx)
	select {
	case err := <-errc:
		if err == nil || !strings.Contains(err.Error(), "boom") {
			t.Errorf("err = %v", err)
		}
	case <-ctx.Done():
		t.Fatal("timeout waiting for error")
	}
}

func TestParseData_BadReserve(t *testing.T) {
	_, err := parseData(json.RawMessage(`{"data":{"Pool":[{"id":"0xP","token0":"0xA","token1":"0xB","reserve0":"NaN","reserve1":"1","updatedAtBlock":"1"}]}}`))
	if err == nil || !strings.Contains(err.Error(), "reserve0") {
		t.Errorf("err = %v", err)
	}
}

func TestParseData_BlockOverflow(t *testing.T) {
	big18446744073709551616 := "18446744073709551616"
	_, err := parseData(json.RawMessage(`{"data":{"Pool":[{"id":"0xP","token0":"0xA","token1":"0xB","reserve0":"1","reserve1":"1","updatedAtBlock":"` + big18446744073709551616 + `"}]}}`))
	if err == nil || !strings.Contains(err.Error(), "overflow") {
		t.Errorf("err = %v", err)
	}
}
