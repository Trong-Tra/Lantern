package api

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
)

// dualRegistration mirrors contracts/script/seed/dual-registered.json —
// written by forge script/DualRegister.s.sol (our AgentRegistry agent id →
// canonical ERC-8004 Fuji singleton token id, the one 8004scan indexes).
type dualRegistration struct {
	ChainID          uint64 `json:"chainId"`
	IdentityRegistry string `json:"identityRegistry"`
	OurRegistry      string `json:"ourRegistry"`
	Count            int    `json:"count"`
	Agents           []struct {
		OurID            uint64 `json:"ourId"`
		CanonicalTokenID uint64 `json:"canonicalTokenId"`
	} `json:"agents"`
}

// LoadDualRegistration reads the dual-registration mapping file and returns
// our agent id → canonical token id as decimal strings (GraphQL ID shape).
// A missing file returns (nil, nil): canonicalTokenId simply stays null —
// never a startup failure (same posture as MARKETDATA_FILE). A malformed
// file is an error: it came from our own script, so corruption is loud.
func LoadDualRegistration(path string) (map[string]string, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("api: read dual-registration %s: %w", path, err)
	}
	var file dualRegistration
	if err := json.Unmarshal(raw, &file); err != nil {
		return nil, fmt.Errorf("api: parse dual-registration %s: %w", path, err)
	}
	ids := make(map[string]string, len(file.Agents))
	for _, a := range file.Agents {
		ids[strconv.FormatUint(a.OurID, 10)] = strconv.FormatUint(a.CanonicalTokenID, 10)
	}
	return ids, nil
}
