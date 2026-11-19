package api

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDualRegistration_MissingFileIsEmpty(t *testing.T) {
	ids, err := LoadDualRegistration(filepath.Join(t.TempDir(), "nope.json"))
	if err != nil {
		t.Fatalf("missing file must not fail: %v", err)
	}
	if ids != nil {
		t.Fatalf("ids = %v, want nil", ids)
	}
}

func TestLoadDualRegistration_ParsesMapping(t *testing.T) {
	path := filepath.Join(t.TempDir(), "dual-registered.json")
	raw := `{"chainId":43113,"identityRegistry":"0x8004a818bfb912233c491871b3d84c89a494bd9e",` +
		`"ourRegistry":"0x62cd4e0c5b0d4587861a21710ed15ba1823a6341","count":2,` +
		`"agents":[{"ourId":1,"canonicalTokenId":314},{"ourId":15,"canonicalTokenId":328}]}`
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}
	ids, err := LoadDualRegistration(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 2 || ids["1"] != "314" || ids["15"] != "328" {
		t.Fatalf("ids = %v", ids)
	}
}

func TestLoadDualRegistration_MalformedFails(t *testing.T) {
	path := filepath.Join(t.TempDir(), "dual-registered.json")
	if err := os.WriteFile(path, []byte("{not json"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadDualRegistration(path); err == nil {
		t.Fatal("malformed mapping must fail loudly")
	}
}
