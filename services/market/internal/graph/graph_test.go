package graph

import (
	"math/big"
	"testing"
)

const (
	poolAddr = "0x1000000000000000000000000000000000000001"
	tokenA   = "0x200000000000000000000000000000000000000a"
	tokenB   = "0x200000000000000000000000000000000000000b"
	tokenC   = "0x200000000000000000000000000000000000000c"
)

func mkSync(pool string, r0, r1 int64, block uint64) Sync {
	return Sync{
		Address:        pool,
		Token0:         tokenA,
		Token1:         tokenB,
		Reserve0:       big.NewInt(r0),
		Reserve1:       big.NewInt(r1),
		UpdatedAtBlock: block,
	}
}

func TestApplySync_CreatesPool(t *testing.T) {
	s := NewStore()
	s.ApplySync(mkSync(poolAddr, 100, 200, 7))

	p, ok := s.Pool(poolAddr)
	if !ok {
		t.Fatal("pool not tracked")
	}
	if p.Reserve0.Cmp(big.NewInt(100)) != 0 || p.Reserve1.Cmp(big.NewInt(200)) != 0 {
		t.Errorf("reserves = %v/%v", p.Reserve0, p.Reserve1)
	}
	if p.UpdatedAtBlock != 7 {
		t.Errorf("block = %d", p.UpdatedAtBlock)
	}
	if s.Len() != 1 {
		t.Errorf("Len = %d", s.Len())
	}
}

func TestApplySync_UpdatesReservesKeepsTokens(t *testing.T) {
	s := NewStore()
	s.ApplySync(mkSync(poolAddr, 100, 200, 7))

	// Later update with empty token fields must not wipe the pair.
	u := mkSync(poolAddr, 150, 180, 9)
	u.Token0, u.Token1 = "", ""
	s.ApplySync(u)

	p, _ := s.Pool(poolAddr)
	if p.Token0 != tokenA || p.Token1 != tokenB {
		t.Errorf("tokens overwritten: %s/%s", p.Token0, p.Token1)
	}
	if p.Reserve0.Cmp(big.NewInt(150)) != 0 {
		t.Errorf("reserve0 = %v", p.Reserve0)
	}
}

func TestApplySync_NormalizesCase(t *testing.T) {
	s := NewStore()
	u := mkSync("0xABCDEF0000000000000000000000000000000001", 1, 2, 1)
	u.Token0 = "0xABCDEF00000000000000000000000000000000AA"
	s.ApplySync(u)

	if _, ok := s.Pool("0xabcdef0000000000000000000000000000000001"); !ok {
		t.Fatal("pool not found under lowercase address")
	}
	if got := s.PoolsByToken("0xabcdef00000000000000000000000000000000aa"); len(got) != 1 {
		t.Errorf("PoolsByToken mixed case = %d pools", len(got))
	}
}

func TestPoolsByToken(t *testing.T) {
	s := NewStore()
	s.ApplySync(mkSync(poolAddr, 100, 200, 1))
	s.ApplySync(Sync{
		Address: "0x3000000000000000000000000000000000000001", Token0: tokenB, Token1: tokenC,
		Reserve0: big.NewInt(1), Reserve1: big.NewInt(1), UpdatedAtBlock: 1,
	})

	if got := s.PoolsByToken(tokenB); len(got) != 2 {
		t.Errorf("tokenB pools = %d, want 2", len(got))
	}
	if got := s.PoolsByToken(tokenC); len(got) != 1 {
		t.Errorf("tokenC pools = %d, want 1", len(got))
	}
	if got := s.PoolsByToken("0x0000000000000000000000000000000000000dEaD"); len(got) != 0 {
		t.Errorf("unknown token pools = %d, want 0", len(got))
	}
}

func TestSnapshotCopies(t *testing.T) {
	s := NewStore()
	s.ApplySync(mkSync(poolAddr, 100, 200, 1))

	snap := s.Snapshot()
	snap[0].Reserve0.SetInt64(999)

	p, _ := s.Pool(poolAddr)
	if p.Reserve0.Cmp(big.NewInt(100)) != 0 {
		t.Error("snapshot mutation leaked into store")
	}
}

func TestReservesFor(t *testing.T) {
	p := Pool{Token0: tokenA, Token1: tokenB, Reserve0: big.NewInt(100), Reserve1: big.NewInt(200)}

	in, out, ok := ReservesFor(p, tokenA)
	if !ok || in.Int64() != 100 || out.Int64() != 200 {
		t.Errorf("tokenIn=token0: %v/%v ok=%v", in, out, ok)
	}
	in, out, ok = ReservesFor(p, tokenB)
	if !ok || in.Int64() != 200 || out.Int64() != 100 {
		t.Errorf("tokenIn=token1: %v/%v ok=%v", in, out, ok)
	}
	if _, _, ok = ReservesFor(p, tokenC); ok {
		t.Error("expected ok=false for foreign token")
	}
}
