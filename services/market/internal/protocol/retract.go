package protocol

import (
	"crypto/ecdsa"
	"fmt"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// RetractDigest is the EIP-191 digest a solver signs to retract one of its
// quotes: personal_sign("lantern:retract:<intentId>:<quoteId>"). The message
// binds the exact intent + quote (not replayable across quotes), and the hub
// requires the recovered signer to equal the signer of the quote itself
// (hub.RetractQuote) — retractions are Phase 3 hardening, no connection
// trust (docs/market.md §3).
func RetractDigest(intentID, quoteID string) [32]byte {
	var d [32]byte
	copy(d[:], accounts.TextHash([]byte(retractMessage(intentID, quoteID))))
	return d
}

func retractMessage(intentID, quoteID string) string {
	return fmt.Sprintf("lantern:retract:%s:%s", intentID, quoteID)
}

// SignRetract produces the wire-form 0x-prefixed 65-byte r||s||v signature
// (v = 0/1 — recovered as-is off-chain).
func SignRetract(intentID, quoteID string, key *ecdsa.PrivateKey) (string, error) {
	digest := RetractDigest(intentID, quoteID)
	sig, err := crypto.Sign(digest[:], key)
	if err != nil {
		return "", fmt.Errorf("protocol: sign retract: %w", err)
	}
	return "0x" + common.Bytes2Hex(sig), nil
}

// RecoverRetractSigner recovers the address that signed the retraction.
func RecoverRetractSigner(intentID, quoteID string, sig []byte) (common.Address, error) {
	if len(sig) != 65 {
		return common.Address{}, fmt.Errorf("protocol: retract signature length %d, want 65", len(sig))
	}
	digest := RetractDigest(intentID, quoteID)
	pub, err := crypto.SigToPub(digest[:], sig)
	if err != nil {
		return common.Address{}, fmt.Errorf("protocol: retract recover: %w", err)
	}
	return crypto.PubkeyToAddress(*pub), nil
}
