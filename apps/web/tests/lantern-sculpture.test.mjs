import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { conceptLines, sampleConceptLine, CONCEPT_LINE_COUNT } = loadSource("src/libs/cinematic/lantern-sculpture.ts");
test("seven distinct line concepts share topology and morph without missing or unbounded vertices", () => {
  const identities=new Set();
  for(let chapter=4;chapter<=10;chapter++){
    const lines=conceptLines(chapter);
    assert.equal(lines.length,CONCEPT_LINE_COUNT);
    identities.add(JSON.stringify(lines));
    for(const line of lines){assert.equal(line.length,6);assert.ok(line.every(v=>Number.isFinite(v)&&Math.abs(v)<3.5));}
    if(chapter<10)for(let mix=0;mix<=1;mix+=.1)for(let i=0;i<CONCEPT_LINE_COUNT;i++){
      const next=conceptLines(chapter+1)[i];
      assert.ok(lines[i].every((v,j)=>Number.isFinite(v*(1-mix)+next[j]*mix)));
    }
  }
  assert.equal(identities.size,7);
  assert.deepEqual(conceptLines(3),[]);assert.deepEqual(conceptLines(11),[]);
});

test("abstract field motion remains continuous and bounded",()=>{
  for(let chapter=4;chapter<=10;chapter++)for(let i=0;i<128;i++){
    for(const time of [1,20,100]){
      const a=sampleConceptLine(chapter,i,time),b=sampleConceptLine(chapter,i,time+.001);
      assert.ok(a.every((v,j)=>Number.isFinite(v)&&Math.abs(v)<3.5&&Math.abs(v-b[j])<.01));
    }
  }
});
