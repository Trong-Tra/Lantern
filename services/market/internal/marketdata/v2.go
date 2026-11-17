package marketdata

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"
)

// ResolveChain boot-verifies one chain from marketdata.json: every token's
// on-chain symbol must match the config, every configured pair must exist in
// the factory, and canonical token0/token1 order comes from the chain.
func ResolveChain(ctx context.Context, ch Chain) ([]*Pool, error) {
	c := NewClient(ch.RPC)
	meta := make(map[string]Meta, len(ch.Tokens))
	for _, t := range ch.Tokens {
		decRet, err := c.Call(ctx, t.Address, selDecimals)
		if err != nil {
			return nil, fmt.Errorf("chain %s: %s decimals: %w", ch.Name, t.Symbol, err)
		}
		dec, err := decodeUint(decRet)
		if err != nil {
			return nil, fmt.Errorf("chain %s: %s decimals: %w", ch.Name, t.Symbol, err)
		}
		if dec.Cmp(big.NewInt(255)) > 0 {
			return nil, fmt.Errorf("chain %s: %s decimals %s out of range", ch.Name, t.Symbol, dec)
		}
		symRet, err := c.Call(ctx, t.Address, selSymbol)
		if err != nil {
			return nil, fmt.Errorf("chain %s: %s symbol: %w", ch.Name, t.Symbol, err)
		}
		onchain, err := decodeString(symRet)
		if err != nil {
			onchain = decodeBytes32(symRet)
		}
		if onchain != t.Symbol {
			return nil, fmt.Errorf("chain %s: %s symbol mismatch: config %q vs chain %q", ch.Name, t.Address, t.Symbol, onchain)
		}
		meta[t.Symbol] = Meta{
			Symbol:   t.Symbol,
			Address:  t.Address,
			Decimals: uint8(dec.Uint64()),
			Coin:     t.Coin,
		}
	}

	pools := make([]*Pool, 0, len(ch.Pairs))
	for _, p := range ch.Pairs {
		a, b := meta[p[0]], meta[p[1]]
		pairRet, err := c.Call(ctx, ch.Factory, selGetPair+padArg(a.Address)+padArg(b.Address))
		if err != nil {
			return nil, fmt.Errorf("chain %s: getPair(%s,%s): %w", ch.Name, a.Symbol, b.Symbol, err)
		}
		pairAddr, err := decodeAddress(pairRet)
		if err != nil {
			return nil, fmt.Errorf("chain %s: getPair(%s,%s): %w", ch.Name, a.Symbol, b.Symbol, err)
		}
		if pairAddr == "0x0000000000000000000000000000000000000000" {
			return nil, fmt.Errorf("chain %s: pair %s/%s not found in factory %s", ch.Name, a.Symbol, b.Symbol, ch.Factory)
		}
		t0Ret, err := c.Call(ctx, pairAddr, selToken0)
		if err != nil {
			return nil, fmt.Errorf("chain %s: pair %s token0: %w", ch.Name, pairAddr, err)
		}
		t0, err := decodeAddress(t0Ret)
		if err != nil {
			return nil, fmt.Errorf("chain %s: pair %s token0: %w", ch.Name, pairAddr, err)
		}
		first, second := a, b
		if strings.EqualFold(t0, b.Address) {
			first, second = b, a
		} else if !strings.EqualFold(t0, a.Address) {
			return nil, fmt.Errorf("chain %s: pair %s token0 %s matches neither token", ch.Name, pairAddr, t0)
		}
		pools = append(pools, &Pool{
			Chain:   ch.Name,
			Pair:    first.Symbol + "/" + second.Symbol,
			Address: pairAddr,
			Token0:  first,
			Token1:  second,
		})
	}
	return pools, nil
}

// PollLoop refreshes reserves for every resolved pool until ctx ends. A cycle
// that changed nothing stays silent; changed pools log one line each.
func PollLoop(ctx context.Context, ch Chain, pools []*Pool, store *Store, every time.Duration) {
	c := NewClient(ch.RPC)
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		polled := pollOnce(ctx, c, pools, store)
		if polled > 0 {
			log.Printf("marketdata: %s polled %d pools", ch.Name, polled)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// pollOnce fetches getReserves for each pool; returns how many changed.
func pollOnce(ctx context.Context, c *Client, pools []*Pool, store *Store) int {
	changed := 0
	for _, p := range pools {
		ret, err := c.Call(ctx, p.Address, selGetReserves)
		if err != nil {
			log.Printf("marketdata: %s %s getReserves: %v", p.Chain, p.Pair, err)
			continue
		}
		if len(ret) < 64 {
			log.Printf("marketdata: %s %s getReserves: short returndata %d", p.Chain, p.Pair, len(ret))
			continue
		}
		r0 := new(big.Int).SetBytes(ret[0:32])
		r1 := new(big.Int).SetBytes(ret[32:64])
		s0, s1 := r0.String(), r1.String()
		if p.Reserve0 == s0 && p.Reserve1 == s1 && !p.UpdatedAt.IsZero() {
			continue
		}
		p.Reserve0, p.Reserve1 = s0, s1
		p.UpdatedAt = time.Now().UTC()
		store.UpsertPool(p)
		changed++
		log.Printf("marketdata: %s %s reserves %s/%s", p.Chain, p.Pair, trimNum(s0), trimNum(s1))
	}
	return changed
}

// trimNum shortens raw base-unit strings for log lines.
func trimNum(s string) string {
	if len(s) <= 12 {
		return s
	}
	return s[:9] + "…" + s[len(s)-3:]
}
