// Package chain wraps the Fuji RPC connection, the abigen contract bindings,
// and quote cryptography (digest / sign / verify), mirroring
// LanternMarket.quoteDigest exactly: EIP-191 personal-sign over
// keccak256(abi.encode(chainId, marketAddress, quote)).
package chain

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/lantern/market/internal/chain/bindings"
)

// Client is a typed handle on the deployed contract set.
type Client struct {
	Eth           *ethclient.Client
	ChainID       *big.Int
	Registry      *bindings.AgentRegistryCaller
	Market        *bindings.LanternMarketCaller
	MarketAddress common.Address
}

// Dial connects and binds the registry + market callers.
func Dial(ctx context.Context, rpcURL string, registryAddr, marketAddr common.Address) (*Client, error) {
	eth, err := ethclient.DialContext(ctx, rpcURL)
	if err != nil {
		return nil, fmt.Errorf("chain: dial %s: %w", rpcURL, err)
	}
	chainID, err := eth.ChainID(ctx)
	if err != nil {
		return nil, fmt.Errorf("chain: chain id: %w", err)
	}
	registry, err := bindings.NewAgentRegistryCaller(registryAddr, eth)
	if err != nil {
		return nil, fmt.Errorf("chain: bind registry: %w", err)
	}
	market, err := bindings.NewLanternMarketCaller(marketAddr, eth)
	if err != nil {
		return nil, fmt.Errorf("chain: bind market: %w", err)
	}
	return &Client{
		Eth:           eth,
		ChainID:       chainID,
		Registry:      registry,
		Market:        market,
		MarketAddress: marketAddr,
	}, nil
}

// AgentOwner resolves AgentRegistry.ownerOf(agentId).
func (c *Client) AgentOwner(ctx context.Context, agentID *big.Int) (common.Address, error) {
	owner, err := c.Registry.OwnerOf(&bind.CallOpts{Context: ctx}, agentID)
	if err != nil {
		return common.Address{}, fmt.Errorf("chain: ownerOf(%s): %w", agentID, err)
	}
	return owner, nil
}

// SettleSwap submits executeSwap for a picked quote. v1 rule (locked
// 2026-11-14): the caller key must control quote.user — the contract
// requires msg.sender == quote.user, and the user must have approved the
// market for quote.amountIn first. Waits for the receipt and returns it
// so callers can verify TradeSettled / attestations from receipt.Logs.
func (c *Client) SettleSwap(ctx context.Context, userKey *ecdsa.PrivateKey, quote bindings.LanternMarketQuote, signature []byte) (*types.Receipt, error) {
	if c.Eth == nil {
		return nil, fmt.Errorf("chain: not dialed")
	}
	transactor, err := bindings.NewLanternMarketTransactor(c.MarketAddress, c.Eth)
	if err != nil {
		return nil, fmt.Errorf("chain: bind market transactor: %w", err)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(userKey, c.ChainID)
	if err != nil {
		return nil, fmt.Errorf("chain: transactor: %w", err)
	}
	auth.Context = ctx
	tx, err := transactor.ExecuteSwap(auth, quote, signature)
	if err != nil {
		return nil, fmt.Errorf("chain: executeSwap: %w", err)
	}
	receipt, err := bind.WaitMined(ctx, c.Eth, tx)
	if err != nil {
		return nil, fmt.Errorf("chain: wait tx %s: %w", tx.Hash(), err)
	}
	if receipt.Status != 1 {
		return nil, fmt.Errorf("chain: executeSwap tx %s reverted", tx.Hash())
	}
	return receipt, nil
}

// VerifyQuote implements protocol.Verifier: recover the signer of the quote
// digest and require it to be the registered owner of quote.AgentId — the
// same check LanternMarket.executeSwap performs before settling. Returns the
// signer so the hub can bind it as the quote's retraction key.
func (c *Client) VerifyQuote(ctx context.Context, quote bindings.LanternMarketQuote, signature []byte) (common.Address, error) {
	digest, err := c.QuoteDigest(quote)
	if err != nil {
		return common.Address{}, err
	}
	signer, err := VerifyQuote(digest, signature)
	if err != nil {
		return common.Address{}, err
	}
	owner, err := c.AgentOwner(ctx, quote.AgentId)
	if err != nil {
		return common.Address{}, err
	}
	if signer != owner {
		return common.Address{}, fmt.Errorf("chain: signer %s is not owner %s of agent %s", signer, owner, quote.AgentId)
	}
	return signer, nil
}

// quoteABIEncode packs (chainId, marketAddress, quote) exactly like the
// contract's abi.encode(block.chainid, address(this), quote).
func quoteABIEncode(chainID *big.Int, market common.Address, quote bindings.LanternMarketQuote) ([]byte, error) {
	uint256Ty, _ := abi.NewType("uint256", "", nil)
	addressTy, _ := abi.NewType("address", "", nil)
	quoteTy, _ := abi.NewType("tuple", "", []abi.ArgumentMarshaling{
		{Name: "agentId", Type: "uint256"},
		{Name: "user", Type: "address"},
		{Name: "tokenIn", Type: "address"},
		{Name: "tokenOut", Type: "address"},
		{Name: "amountIn", Type: "uint256"},
		{Name: "minOut", Type: "uint256"},
		{Name: "quotedOut", Type: "uint256"},
		{Name: "deadline", Type: "uint256"},
		{Name: "nonce", Type: "uint256"},
		{Name: "routes", Type: "tuple[]", Components: []abi.ArgumentMarshaling{
			{Name: "bps", Type: "uint16"},
			{Name: "pools", Type: "address[]"},
		}},
	})
	args := abi.Arguments{
		{Type: uint256Ty},
		{Type: addressTy},
		{Type: quoteTy},
	}
	return args.Pack(chainID, market, quote)
}

// QuoteDigest computes the digest a solver signs, matching
// LanternMarket.quoteDigest off-chain:
// keccak256("\x19Ethereum Signed Message:\n32" || keccak256(abi.encode(...))).
func (c *Client) QuoteDigest(quote bindings.LanternMarketQuote) ([32]byte, error) {
	packed, err := quoteABIEncode(c.ChainID, c.MarketAddress, quote)
	if err != nil {
		return [32]byte{}, fmt.Errorf("chain: abi encode quote: %w", err)
	}
	structHash := crypto.Keccak256(packed)
	return crypto.Keccak256Hash([]byte("\x19Ethereum Signed Message:\n32"), structHash), nil
}

// SignQuote produces the 65-byte r||s||v signature (v = 0/1 — the contract
// normalizes to 27/28 itself).
func SignQuote(digest [32]byte, key *ecdsa.PrivateKey) ([]byte, error) {
	sig, err := crypto.Sign(digest[:], key)
	if err != nil {
		return nil, fmt.Errorf("chain: sign: %w", err)
	}
	return sig, nil
}

// VerifyQuote recovers the signer of a quote.
func VerifyQuote(digest [32]byte, sig []byte) (common.Address, error) {
	if len(sig) != 65 {
		return common.Address{}, fmt.Errorf("chain: signature length %d, want 65", len(sig))
	}
	pub, err := crypto.SigToPub(digest[:], sig)
	if err != nil {
		return common.Address{}, fmt.Errorf("chain: recover: %w", err)
	}
	return crypto.PubkeyToAddress(*pub), nil
}
