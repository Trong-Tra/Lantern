package chain

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/lantern/market/internal/chain/bindings"
)

func testQuote() bindings.LanternMarketQuote {
	return bindings.LanternMarketQuote{
		AgentId:   big.NewInt(1),
		User:      common.HexToAddress("0x3000000000000000000000000000000000000001"),
		TokenIn:   common.HexToAddress("0x200000000000000000000000000000000000000a"),
		TokenOut:  common.HexToAddress("0x200000000000000000000000000000000000000b"),
		AmountIn:  big.NewInt(1_000_000_000_000_000_000),
		MinOut:    big.NewInt(990_000_000_000_000_000),
		QuotedOut: big.NewInt(995_000_000_000_000_000),
		Deadline:  big.NewInt(1_700_000_045),
		Nonce:     big.NewInt(7),
		Routes: []bindings.LanternMarketRoute{
			{Bps: 10_000, Pools: []common.Address{common.HexToAddress("0x1000000000000000000000000000000000000001")}},
		},
	}
}

func TestSignVerifyRoundtrip(t *testing.T) {
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	c := &Client{ChainID: big.NewInt(43113), MarketAddress: common.HexToAddress("0x4000000000000000000000000000000000000001")}

	digest, err := c.QuoteDigest(testQuote())
	if err != nil {
		t.Fatal(err)
	}
	sig, err := SignQuote(digest, key)
	if err != nil {
		t.Fatal(err)
	}
	if len(sig) != 65 {
		t.Fatalf("sig length = %d", len(sig))
	}

	signer, err := VerifyQuote(digest, sig)
	if err != nil {
		t.Fatal(err)
	}
	if signer != crypto.PubkeyToAddress(key.PublicKey) {
		t.Errorf("signer = %s, want %s", signer, crypto.PubkeyToAddress(key.PublicKey))
	}
}

func TestQuoteDigest_DomainSeparation(t *testing.T) {
	q := testQuote()
	market := common.HexToAddress("0x4000000000000000000000000000000000000001")

	c1 := &Client{ChainID: big.NewInt(43113), MarketAddress: market}
	c2 := &Client{ChainID: big.NewInt(31337), MarketAddress: market}
	c3 := &Client{ChainID: big.NewInt(43113), MarketAddress: common.HexToAddress("0x4000000000000000000000000000000000000002")}

	d1, err := c1.QuoteDigest(q)
	if err != nil {
		t.Fatal(err)
	}
	d2, _ := c2.QuoteDigest(q)
	d3, _ := c3.QuoteDigest(q)
	if d1 == d2 {
		t.Error("digest identical across chain ids")
	}
	if d1 == d3 {
		t.Error("digest identical across market addresses")
	}

	// Route change must change the digest.
	q2 := testQuote()
	q2.Routes[0].Bps = 9_999
	d4, _ := c1.QuoteDigest(q2)
	if d1 == d4 {
		t.Error("digest identical across quote contents")
	}
}

func TestVerifyQuote_BadLength(t *testing.T) {
	if _, err := VerifyQuote([32]byte{}, []byte{1, 2, 3}); err == nil {
		t.Fatal("expected length error")
	}
}
