import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const vault = loadSource("src/libs/explorer/vault.ts");

test("validateMonAmount accepts sane MON amounts", () => {
  assert.equal(vault.validateMonAmount("1"), null);
  assert.equal(vault.validateMonAmount("0.5"), null);
  assert.equal(vault.validateMonAmount("12.34567890123456789"), null);
  assert.equal(vault.validateMonAmount("  2.5  "), null);
});

test("validateMonAmount rejects empty, zero, malformed, and over-precise input", () => {
  assert.match(vault.validateMonAmount(""), /Enter an amount/);
  assert.match(vault.validateMonAmount("   "), /Enter an amount/);
  assert.match(vault.validateMonAmount("0"), /greater than 0/);
  assert.match(vault.validateMonAmount("0.000"), /greater than 0/);
  assert.match(vault.validateMonAmount("abc"), /non-negative number/);
  assert.match(vault.validateMonAmount("-1"), /non-negative number/);
  assert.match(vault.validateMonAmount("1.2.3"), /non-negative number/);
  assert.match(vault.validateMonAmount("0.1234567890123456789"), /18 decimals/);
});
