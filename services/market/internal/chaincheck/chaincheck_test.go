package chaincheck

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lantern/market/internal/graph"
)

// fakeRPC answers eth_call with the given reserves.
func fakeRPC(t *testing.T, r0, r1 *big.Int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Method string `json:"method"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Method != "eth_call" {
			t.Errorf("bad request: %v %q", err, req.Method)
			return
		}
		fmt.Fprintf(w, `{"jsonrpc":"2.0","id":1,"result":"0x%064x%064x"}`, r0, r1)
	}))
}

func TestCheck_Consistent(t *testing.T) {
	srv := fakeRPC(t, big.NewInt(100), big.NewInt(200))
	defer srv.Close()

	c := NewChecker(srv.URL)
	mismatch, err := c.Check(context.Background(), graph.Pool{
		Address: "0xpool", Reserve0: big.NewInt(100), Reserve1: big.NewInt(200),
	})
	if err != nil {
		t.Fatal(err)
	}
	if mismatch != "" {
		t.Errorf("unexpected mismatch: %s", mismatch)
	}
}

func TestCheck_Mismatch(t *testing.T) {
	srv := fakeRPC(t, big.NewInt(100), big.NewInt(200))
	defer srv.Close()

	c := NewChecker(srv.URL)
	mismatch, err := c.Check(context.Background(), graph.Pool{
		Address: "0xpool", Reserve0: big.NewInt(100), Reserve1: big.NewInt(199), UpdatedAtBlock: 7,
	})
	if err != nil {
		t.Fatal(err)
	}
	if mismatch == "" {
		t.Fatal("expected mismatch")
	}
}

func TestDecodeReserves_BadLength(t *testing.T) {
	if _, _, err := decodeReserves("0x1234"); err == nil {
		t.Fatal("expected error for short data")
	}
}

func TestCheck_RPCError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"jsonrpc":"2.0","id":1,"error":{"message":"execution reverted"}}`)
	}))
	defer srv.Close()

	c := NewChecker(srv.URL)
	_, err := c.Check(context.Background(), graph.Pool{
		Address: "0xpool", Reserve0: big.NewInt(1), Reserve1: big.NewInt(1),
	})
	if err == nil {
		t.Fatal("expected rpc error")
	}
}
