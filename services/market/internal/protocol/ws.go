package protocol

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/coder/websocket"
)

// wsServer serves the quote protocol over raw JSON WebSocket frames
// (machine traffic — no GraphQL; docs/market.md §3).
//
// Frame roles (one connection may act as both user and solver):
//
//	user →   {"type":"intent",...}      open an intent (reply: intent_opened,
//	         then quote/retract/picked/closed stream on the same connection)
//	user →   {"type":"pick",...}
//	solver → {"type":"subscribe_intents"}  stream intent broadcasts
//	solver → {"type":"quote",...}
//	solver → {"type":"retract",...}
type wsServer struct {
	hub *Hub
}

// Handler returns the HTTP handler for the quote-protocol endpoint.
func Handler(hub *Hub) http.Handler {
	return &wsServer{hub: hub}
}

func (s *wsServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // v1: no origin policy — external auth is Phase 3
	})
	if err != nil {
		log.Printf("protocol: accept: %v", err)
		return
	}
	defer conn.CloseNow()

	c := &wsConn{
		hub:  s.hub,
		conn: conn,
		out:  make(chan any, 64),
		done: make(chan struct{}),
	}
	ctx := r.Context()
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		c.writeLoop(ctx)
	}()
	c.readLoop(ctx)
	close(c.done) // pumps stop sending; out itself is never closed (races)
	wg.Wait()
}

// wsConn is one client connection: reads frames in, serializes writes out.
type wsConn struct {
	hub  *Hub
	conn *websocket.Conn
	out  chan any
	done chan struct{}

	writeMu sync.Mutex // serializes conn writes
}

func (c *wsConn) writeLoop(ctx context.Context) {
	for {
		select {
		case <-c.done:
			return
		case msg := <-c.out:
			data, err := json.Marshal(msg)
			if err != nil {
				log.Printf("protocol: marshal: %v", err)
				continue
			}
			c.writeMu.Lock()
			werr := c.conn.Write(ctx, websocket.MessageText, data)
			c.writeMu.Unlock()
			if werr != nil {
				return
			}
		}
	}
}

// send queues a frame to the client; drops the connection when full (slow
// consumer — the market's streams are live, not buffered forever).
func (c *wsConn) send(msg any) {
	select {
	case <-c.done:
		return
	default:
	}
	select {
	case c.out <- msg:
	case <-c.done:
	default:
		log.Print("protocol: client too slow, closing")
		c.conn.Close(websocket.StatusPolicyViolation, "slow consumer")
	}
}

func (c *wsConn) readLoop(ctx context.Context) {
	for {
		_, data, err := c.conn.Read(ctx)
		if err != nil {
			return
		}
		var head struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(data, &head); err != nil {
			c.send(ErrorMsg{Type: TypeError, Message: "bad frame"})
			continue
		}
		if err := c.dispatch(ctx, head.Type, data); err != nil {
			c.send(ErrorMsg{Type: TypeError, Message: err.Error()})
		}
	}
}

func (c *wsConn) dispatch(ctx context.Context, typ string, data []byte) error {
	switch typ {
	case TypeIntent:
		var msg IntentMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			return errors.New("bad intent frame")
		}
		msg.Type = TypeIntent
		id, userCh, err := c.hub.OpenIntent(msg)
		if err != nil {
			return err
		}
		c.send(IntentOpenedMsg{Type: TypeIntentOpened, IntentID: id})
		go c.pumpUser(ctx, userCh)
		return nil

	case TypeQuote:
		var msg QuoteMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			return errors.New("bad quote frame")
		}
		return c.hub.SubmitQuote(ctx, msg.IntentID, msg.Quote, msg.Signature)

	case TypeRetract:
		var msg RetractMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			return errors.New("bad retract frame")
		}
		return c.hub.RetractQuote(msg.IntentID, msg.QuoteID)

	case TypePick:
		var msg PickMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			return errors.New("bad pick frame")
		}
		_, err := c.hub.Pick(msg.IntentID, msg.QuoteID) // replies stream via pumpUser
		return err

	case "subscribe_intents":
		c.subscribeIntents(ctx) // lives until ctx ends (connection close)
		return nil

	default:
		return fmt.Errorf("unknown frame type %q", typ)
	}
}

// subscribeIntents forwards intent broadcasts to this connection until ctx
// ends (the connection closing cancels r.Context in ServeHTTP).
func (c *wsConn) subscribeIntents(ctx context.Context) {
	ch, unsub := c.hub.SubscribeIntents()
	go func() {
		defer unsub()
		for {
			select {
			case <-ctx.Done():
				return
			case ev, ok := <-ch:
				if !ok {
					return
				}
				c.send(ev)
			}
		}
	}()
}

// pumpUser forwards an intent's user stream (quote offers, retractions, the
// pick result, close) until the hub closes the channel.
func (c *wsConn) pumpUser(ctx context.Context, userCh <-chan any) {
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-userCh:
			if !ok {
				return
			}
			c.send(msg)
		}
	}
}
