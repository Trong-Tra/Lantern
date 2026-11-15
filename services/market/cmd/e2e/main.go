// cmd/e2e is the scripted Phase 2 on-chain e2e: it boots the quote protocol +
// reference solver in-process against live Fuji, drives intent → quote → pick
// over the real WebSocket, settles the picked quote via executeSwap, and
// verifies the TradeSettled event + Reputation attestation.
//
// Run from services/market: go run ./cmd/e2e
// Needs the repo-root .env (deploy + solver keys/addresses). All addresses
// come from .env / the deploy broadcast — nothing is hardcoded as a fact.
package main

import (
	"bufio"
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http/httptest"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/coder/websocket"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/lantern/market/internal/chain"
	"github.com/lantern/market/internal/chain/bindings"
	"github.com/lantern/market/internal/config"
	"github.com/lantern/market/internal/graph"
	"github.com/lantern/market/internal/protocol"
	"github.com/lantern/market/internal/solver"
)

const (
	// broadcastPath is the DeployMarket deploy record the pool/token addresses
	// come from (relative to services/market — same convention as .env below).
	broadcastPath = "../../contracts/broadcast/DeployMarket.s.sol/43113/run-latest.json"
	// Token indices into the broadcast's deploy order (seed order:
	// 0=mUSDC 1=mUSDT 2=mWAVAX 3=mWETH 4=mWBTC).
	idxTokenIn  = 0 // mUSDC
	idxTokenOut = 3 // mWETH — a direct mUSDC/mWETH pool exists in the seed

	amountInTokens = 1000 // whole tokens (MockToken = 18 decimals)
	frameWait      = 30 * time.Second
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	envPath := filepath.Join("..", "..", ".env")
	if v := os.Getenv("MARKET_ENV_PATH"); v != "" {
		envPath = v
	}
	cfg, err := config.Load(envPath)
	fatal("config", err)

	// Deployer wallet = intent user + settle caller. v1 runs the reference
	// solver under the same key; the hub still verifies signer == agent owner.
	deployerHex := lookupEnv(envPath, "DEPLOYER_PRIVATE_KEY")
	userKey, err := crypto.HexToECDSA(strip0x(deployerHex))
	fatal("deployer key", err)
	solverKey, err := crypto.HexToECDSA(strip0x(cfg.SolverKey))
	fatal("solver key", err)
	agentID, ok := new(big.Int).SetString(cfg.SolverAgentID, 10)
	if !ok {
		log.Fatalf("bad REFERENCE_SOLVER_AGENT_ID %q", cfg.SolverAgentID)
	}

	client, err := chain.Dial(ctx, cfg.RPCURL,
		common.HexToAddress(cfg.RegistryAddress), common.HexToAddress(cfg.MarketAddress))
	fatal("dial chain", err)
	chainIDForSigner = client.ChainID
	userAddr := crypto.PubkeyToAddress(userKey.PublicKey)
	reputationAddr := common.HexToAddress(lookupEnv(envPath, "REPUTATION_ADDRESS"))
	if reputationAddr == (common.Address{}) {
		log.Fatal("REPUTATION_ADDRESS missing from .env")
	}

	tokens, pools, err := readDeploy(broadcastPath)
	fatal("read deploy broadcast", err)
	if len(tokens) <= idxTokenOut || len(pools) == 0 {
		log.Fatalf("broadcast: want >%d tokens and ≥1 pool, got %d tokens %d pools",
			idxTokenOut, len(tokens), len(pools))
	}

	// Graph store seeded straight from chain (the e2e exercises the quote
	// path; the indexer feed is Phase 1's own verification).
	store := graph.NewStore()
	for _, pool := range pools {
		sync, err := readPool(ctx, client, pool)
		fatal(fmt.Sprintf("read pool %s", pool), err)
		store.ApplySync(sync)
	}
	log.Printf("graph seeded: %d pools, tokens mUSDC=%s mWETH=%s",
		store.Len(), tokens[idxTokenIn], tokens[idxTokenOut])

	// Quote protocol + reference solver (same wiring as cmd/market).
	hub := protocol.NewHub(client, solver.QuoteTTL)
	runner := solver.NewRunner(hub, store, client, solverKey, agentID, cfg.SolverSlippageBps, solver.QuoteTTL)
	go runner.Run(ctx)

	srv := httptest.NewServer(protocol.Handler(hub))
	defer srv.Close()
	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http")
	log.Printf("quote protocol on %s (user=%s agent=%s)", wsURL, userAddr, agentID)

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	fatal("ws dial", err)
	defer conn.CloseNow()
	frames := readFrames(ctx, conn)

	// 1. Open an intent.
	amountIn := new(big.Int).Mul(big.NewInt(amountInTokens), new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil))
	sendFrame(ctx, conn, protocol.IntentMsg{
		Type:     protocol.TypeIntent,
		User:     userAddr.Hex(),
		TokenIn:  tokens[idxTokenIn].Hex(),
		TokenOut: tokens[idxTokenOut].Hex(),
		AmountIn: amountIn.String(),
	})
	opened := expectFrame(ctx, frames, protocol.TypeIntentOpened).(protocol.IntentOpenedMsg)
	log.Printf("intent opened: %s", opened.IntentID)

	// 2. Quote streams in from the reference solver.
	offer := expectFrame(ctx, frames, protocol.TypeQuote).(protocol.QuoteOfferMsg)
	log.Printf("quote %s: out=%s minOut=%s deadline=%s routes=%d",
		offer.QuoteID, offer.Quote.QuotedOut, offer.Quote.MinOut, offer.Quote.Deadline, len(offer.Quote.Routes))

	// 3. Pick it — this is the quote that settles.
	sendFrame(ctx, conn, protocol.PickMsg{
		Type: protocol.TypePick, IntentID: opened.IntentID, QuoteID: offer.QuoteID,
	})
	picked := expectFrame(ctx, frames, protocol.TypePicked).(protocol.PickedMsg)
	contract, err := picked.Quote.ToContract()
	fatal("picked quote → contract", err)
	sig, err := hex.DecodeString(strings.TrimPrefix(picked.Signature, "0x"))
	fatal("decode signature", err)

	// 4. User-side on-chain prep: mint if short, approve the market.
	token, err := bindings.NewMockToken(tokens[idxTokenIn], client.Eth)
	fatal("bind token", err)
	bal, err := token.BalanceOf(&bind.CallOpts{Context: ctx}, userAddr)
	fatal("balanceOf", err)
	if bal.Cmp(amountIn) < 0 {
		short := new(big.Int).Sub(amountIn, bal)
		tx, err := token.Mint(signer(ctx, userKey), userAddr, short)
		fatal("mint", err)
		waitTx(ctx, client, tx, "mint")
	}
	tx, err := token.Approve(signer(ctx, userKey), client.MarketAddress, amountIn)
	fatal("approve", err)
	waitTx(ctx, client, tx, "approve")

	// 5. Settle the picked quote on-chain (executeSwap as the user).
	receipt, err := client.SettleSwap(ctx, userKey, contract, sig)
	fatal("settle", err)
	log.Printf("executeSwap mined in block %d (tx %s)", receipt.BlockNumber, receipt.TxHash)

	// 6. Verify TradeSettled + the Reputation attestation from the receipt.
	verifySettlement(client, receipt, reputationAddr, userAddr, agentID, amountIn)

	log.Print("E2E PASS: intent → quote → pick → executeSwap → TradeSettled + attestation")
}

// verifySettlement parses the settle receipt's logs: TradeSettled on the
// market (our user/amount) and the SWAP/SUCCESS AttestationMinted on
// Reputation for the quoting agent.
func verifySettlement(client *chain.Client, receipt *types.Receipt, reputation, user common.Address, agentID, amountIn *big.Int) {
	market, err := bindings.NewLanternMarketFilterer(client.MarketAddress, client.Eth)
	fatal("market filterer", err)
	rep, err := bindings.NewReputationFilterer(reputation, client.Eth)
	fatal("reputation filterer", err)

	settled, attested := false, false
	for _, lg := range receipt.Logs {
		if lg.Address == client.MarketAddress {
			ev, err := market.ParseTradeSettled(*lg)
			if err == nil && ev.User == user && ev.AmountIn.Cmp(amountIn) == 0 && ev.AgentId.Cmp(agentID) == 0 {
				settled = true
				log.Printf("TradeSettled: agent=%s out=%s fee=%s nonce=%s",
					ev.AgentId, ev.AmountOut, ev.Fee, ev.Nonce)
			}
		}
		if lg.Address == reputation {
			ev, err := rep.ParseAttestationMinted(*lg)
			if err == nil && ev.AgentId.Cmp(agentID) == 0 &&
				int(ev.ActionType) == 3 && int(ev.Result) == 0 { // SWAP / SUCCESS
				attested = true
				log.Printf("AttestationMinted: agent=%s tokenId=%s SWAP/SUCCESS",
					ev.AgentId, ev.TokenId)
			}
		}
	}
	if !settled {
		log.Fatal("verify: receipt has no matching TradeSettled")
	}
	if !attested {
		log.Fatal("verify: receipt has no SWAP/SUCCESS attestation for the agent")
	}
}

// readDeploy extracts the deployed MockToken + DemoPool addresses from the
// Foundry broadcast in first-appearance order (deploy order = seed order).
func readDeploy(path string) ([]common.Address, []common.Address, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, err
	}
	var rec struct {
		Transactions []struct {
			ContractName    string `json:"contractName"`
			ContractAddress string `json:"contractAddress"`
		} `json:"transactions"`
	}
	if err := json.Unmarshal(raw, &rec); err != nil {
		return nil, nil, err
	}
	seen := map[string]bool{}
	var tokens, pools []common.Address
	for _, tx := range rec.Transactions {
		if tx.ContractAddress == "" {
			continue
		}
		key := strings.ToLower(tx.ContractAddress)
		if seen[key] {
			continue
		}
		addr := common.HexToAddress(tx.ContractAddress)
		switch tx.ContractName {
		case "MockToken":
			seen[key] = true
			tokens = append(tokens, addr)
		case "DemoPool":
			seen[key] = true
			pools = append(pools, addr)
		}
	}
	return tokens, pools, nil
}

// readPool pulls token0/token1/reserves straight from a DemoPool.
func readPool(ctx context.Context, client *chain.Client, pool common.Address) (graph.Sync, error) {
	caller, err := bindings.NewDemoPoolCaller(pool, client.Eth)
	if err != nil {
		return graph.Sync{}, err
	}
	token0, err := caller.Token0(&bind.CallOpts{Context: ctx})
	if err != nil {
		return graph.Sync{}, err
	}
	token1, err := caller.Token1(&bind.CallOpts{Context: ctx})
	if err != nil {
		return graph.Sync{}, err
	}
	r0, r1, err := caller.GetReserves(&bind.CallOpts{Context: ctx})
	if err != nil {
		return graph.Sync{}, err
	}
	return graph.Sync{
		Address:  pool.Hex(),
		Token0:   token0.Hex(),
		Token1:   token1.Hex(),
		Reserve0: r0,
		Reserve1: r1,
	}, nil
}

// --- WS client ------------------------------------------------------------

// readFrames pumps decoded frames on a channel until the connection ends.
func readFrames(ctx context.Context, conn *websocket.Conn) <-chan map[string]any {
	out := make(chan map[string]any, 64)
	go func() {
		defer close(out)
		for {
			_, data, err := conn.Read(ctx)
			if err != nil {
				return
			}
			var m map[string]any
			if json.Unmarshal(data, &m) != nil {
				continue
			}
			out <- m
		}
	}()
	return out
}

func sendFrame(ctx context.Context, conn *websocket.Conn, v any) {
	data, err := json.Marshal(v)
	fatal("marshal frame", err)
	if err := conn.Write(ctx, websocket.MessageText, data); err != nil {
		log.Fatalf("ws write: %v", err)
	}
}

// expectFrame waits for the next frame of the given type (others are logged
// and skipped — e.g. `closed` may follow `picked`).
func expectFrame(ctx context.Context, frames <-chan map[string]any, typ string) any {
	deadline := time.NewTimer(frameWait)
	defer deadline.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Fatalf("waiting for %q: %v", typ, ctx.Err())
		case <-deadline.C:
			log.Fatalf("waiting for %q: timeout", typ)
		case m, ok := <-frames:
			if !ok {
				log.Fatalf("waiting for %q: connection closed", typ)
			}
			got, _ := m["type"].(string)
			if got == protocol.TypeError {
				log.Fatalf("server error frame: %v", m["message"])
			}
			if got != typ {
				log.Printf("skip frame %q", got)
				continue
			}
			data, _ := json.Marshal(m)
			switch typ {
			case protocol.TypeIntentOpened:
				var v protocol.IntentOpenedMsg
				fatal("decode "+typ, json.Unmarshal(data, &v))
				return v
			case protocol.TypeQuote:
				var v protocol.QuoteOfferMsg
				fatal("decode "+typ, json.Unmarshal(data, &v))
				return v
			case protocol.TypePicked:
				var v protocol.PickedMsg
				fatal("decode "+typ, json.Unmarshal(data, &v))
				return v
			default:
				return m
			}
		}
	}
}

// --- helpers ---------------------------------------------------------------

// chainIDForSigner is set right after Dial (signer() needs it for tx signing).
var chainIDForSigner *big.Int

func signer(ctx context.Context, key *ecdsa.PrivateKey) *bind.TransactOpts {
	opts, err := bind.NewKeyedTransactorWithChainID(key, chainIDForSigner)
	fatal("transactor", err)
	opts.Context = ctx
	return opts
}

func waitTx(ctx context.Context, client *chain.Client, tx *types.Transaction, label string) {
	receipt, err := bind.WaitMined(ctx, client.Eth, tx)
	fatal(label+" wait", err)
	if receipt.Status != 1 {
		log.Fatalf("%s tx %s reverted", label, tx.Hash())
	}
	log.Printf("%s tx %s ok (block %d)", label, tx.Hash(), receipt.BlockNumber)
}

func lookupEnv(envPath, key string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	f, err := os.Open(envPath)
	if err != nil {
		return ""
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		line = strings.TrimPrefix(line, "export ")
		if k, v, ok := strings.Cut(line, "="); ok && strings.TrimSpace(k) == key {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func strip0x(s string) string {
	return strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(s), "0x"), "0X")
}

func fatal(label string, err error) {
	if err != nil {
		log.Fatalf("%s: %v", label, err)
	}
}
