package marketdata

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/crypto"
)

// Client is the minimal eth_call JSON-RPC surface the V2 poller needs.
type Client struct {
	rpc  string
	http *http.Client
}

func NewClient(rpc string) *Client {
	return &Client{
		rpc:  rpc,
		http: &http.Client{Timeout: 10 * time.Second},
	}
}

// Call runs eth_call at "latest" and returns the raw returndata.
func (c *Client) Call(ctx context.Context, to, data string) ([]byte, error) {
	body, err := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "eth_call",
		"params":  []any{map[string]string{"to": to, "data": data}, "latest"},
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.rpc, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("marketdata: eth_call %s: %w", c.rpc, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var out struct {
		Result string `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("marketdata: eth_call decode %s: %w", c.rpc, err)
	}
	if out.Error != nil {
		return nil, fmt.Errorf("marketdata: eth_call %s: %s (code %d)", c.rpc, out.Error.Message, out.Error.Code)
	}
	if out.Result == "" {
		return nil, fmt.Errorf("marketdata: eth_call %s: empty result", c.rpc)
	}
	return hex.DecodeString(strings.TrimPrefix(out.Result, "0x"))
}

// sel is the 4-byte function selector, derived (never hand-typed).
func sel(sig string) string {
	return "0x" + hex.EncodeToString(crypto.Keccak256([]byte(sig))[:4])
}

var (
	selGetPair     = sel("getPair(address,address)")
	selToken0      = sel("token0()")
	selToken1      = sel("token1()")
	selSymbol      = sel("symbol()")
	selDecimals    = sel("decimals()")
	selGetReserves = sel("getReserves()")
)

// padArg left-pads a hex address into one 32-byte ABI word.
func padArg(addr string) string {
	return strings.Repeat("0", 64-len(addr)+2) + strings.TrimPrefix(addr, "0x")
}

func wordUint(v *big.Int) string {
	return fmt.Sprintf("%064x", v)
}

// decodeAddress reads a single-word address returndata.
func decodeAddress(ret []byte) (string, error) {
	if len(ret) != 32 {
		return "", fmt.Errorf("marketdata: address returndata len %d, want 32", len(ret))
	}
	return "0x" + hex.EncodeToString(ret[12:]), nil
}

// decodeUint reads the first word as an unsigned integer.
func decodeUint(ret []byte) (*big.Int, error) {
	if len(ret) < 32 {
		return nil, fmt.Errorf("marketdata: uint returndata len %d, want >= 32", len(ret))
	}
	return new(big.Int).SetBytes(ret[:32]), nil
}

// decodeString reads standard ABI string returndata (offset + length + data).
func decodeString(ret []byte) (string, error) {
	if len(ret) < 64 {
		return "", fmt.Errorf("marketdata: string returndata len %d, want >= 64", len(ret))
	}
	offset := new(big.Int).SetBytes(ret[:32]).Uint64()
	if offset+32 > uint64(len(ret)) {
		return "", fmt.Errorf("marketdata: string offset %d out of range", offset)
	}
	length := new(big.Int).SetBytes(ret[offset : offset+32]).Uint64()
	if offset+32+length > uint64(len(ret)) {
		return "", fmt.Errorf("marketdata: string length %d out of range", length)
	}
	return string(ret[offset+32 : offset+32+length]), nil
}

// decodeBytes32 reads legacy bytes32 symbol() returndata (trailing zeros cut).
func decodeBytes32(ret []byte) string {
	if len(ret) < 32 {
		return ""
	}
	return strings.TrimRight(string(ret[:32]), "\x00")
}
