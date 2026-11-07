import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { hologramCycle }=loadSource("src/libs/cinematic/hologram-cycle.ts");
test("holograms hold, disappear completely and cycle passport / score / history",()=>{
  for(let k=0;k<3;k++) {
    assert.equal(hologramCycle(k*7+3).kind,k);
    assert.equal(hologramCycle(k*7+3).opacity,1);
    assert.equal(hologramCycle(k*7+6.5).opacity,0);
    assert.equal(hologramCycle(k*7+7).opacity,0);
  }
  assert.equal(hologramCycle(21).kind,0);
  for(let t=0;t<22;t+=.013){const c=hologramCycle(t);assert.ok(c.reveal>=0&&c.reveal<=1&&c.opacity>=0&&c.opacity<=1);}
});
test("reduced motion holds a complete still passport",()=>{
  assert.deepEqual(hologramCycle(500,true),{kind:0,reveal:1,opacity:1,time:0});
  assert.equal(hologramCycle(NaN).kind,0);
});
