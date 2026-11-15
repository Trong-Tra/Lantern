// Package chaincheck spot-checks the graph store against on-chain reserves
// via raw JSON-RPC eth_call. It deliberately avoids go-ethereum for Phase 1 —
// abigen bindings arrive with the chain package in Phase 2.
package chaincheck

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/lantern/market/internal/graph"
)

// getReservesSelector is keccak256("getReserves()")[0:4] — the same selector
// Uniswap V2 uses, since DemoPool matches the signature.
const getReservesSelector = "0x0902f1ac"

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  []any  `json:"params"`
}

type rpcResponse struct {
	Result string `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Checker compares tracked pools against on-chain reserves.
type Checker struct {
	rpcURL string
	http   *http.Client
}

func NewChecker(rpcURL string) *Checker {
	return &Checker{rpcURL: rpcURL, http: &http.Client{Timeout: 10 * time.Second}}
}

// Check calls getReserves() for the pool and reports whether the store
// agrees. A mismatch string is returned (empty when consistent); errors are
// transport/decoding failures, not mismatches.
func (c *Checker) Check(ctx context.Context, p graph.Pool) (mismatch string, err error) {
	r0, r1, err := c.getReserves(ctx, p.Address)
	if err != nil {
		return "", err
	}
	if r0.Cmp(p.Reserve0) != 0 || r1.Cmp(p.Reserve1) != 0 {
		return fmt.Sprintf("pool %s: store=%s/%s on-chain=%s/%s (block %d)",
			p.Address, p.Reserve0, p.Reserve1, r0, r1, p.UpdatedAtBlock), nil
	}
	return "", nil
}

func (c *Checker) getReserves(ctx context.Context, pool string) (*big.Int, *big.Int, error) {
	reqBody, _ := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "eth_call",
		Params: []any{
			map[string]string{"to": pool, "data": getReservesSelector},
			"latest",
		},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.rpcURL, bytes.NewReader(reqBody))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("chaincheck: rpc call: %w", err)
	}
	defer resp.Body.Close()

	var rpcResp rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, nil, fmt.Errorf("chaincheck: decode response: %w", err)
	}
	if rpcResp.Error != nil {
		return nil, nil, fmt.Errorf("chaincheck: rpc error: %s", rpcResp.Error.Message)
	}
	return decodeReserves(rpcResp.Result)
}

// decodeReserves parses an eth_call result of two ABI-encoded uint256s.
func decodeReserves(hexData string) (*big.Int, *big.Int, error) {
	data := strings.TrimPrefix(hexData, "0x")
	if len(data) != 128 {
		return nil, nil, fmt.Errorf("chaincheck: getReserves returned %d hex chars, want 128", len(data))
	}
	r0, ok0 := new(big.Int).SetString(data[:64], 16)
	r1, ok1 := new(big.Int).SetString(data[64:], 16)
	if !ok0 || !ok1 {
		return nil, nil, fmt.Errorf("chaincheck: bad reserve encoding")
	}
	return r0, r1, nil
}
