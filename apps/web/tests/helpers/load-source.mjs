// Exercise the actual TS modules without adding a separate test runtime.
// Shared by tests/*.test.mjs — transpiles a TS file and runs it in a sandbox
// where only relative imports are allowed (type-only imports are elided).
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const cache = new Map();

export function loadSource(relativePath) {
  const filename = path.resolve(import.meta.dirname, "..", "..", relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const sourceModule = { exports: {} };
  cache.set(filename, sourceModule);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const localRequire = (specifier) => {
    if (!specifier.startsWith("."))
      throw new Error(`Unexpected import: ${specifier}`);
    return loadSource(path.resolve(path.dirname(filename), `${specifier}.ts`));
  };
  new Function("require", "module", "exports", source)(
    localRequire,
    sourceModule,
    sourceModule.exports
  );
  return sourceModule.exports;
}
