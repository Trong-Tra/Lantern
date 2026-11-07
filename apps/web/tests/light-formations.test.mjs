import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { lightFormation, materialHandoff }=loadSource("src/libs/cinematic/light-formations.ts");
test("light material remains bounded and morph-compatible over its full surface",()=>{
  const signatures=new Set();
  for(let chapter=4;chapter<=10;chapter++){
    signatures.add(JSON.stringify(lightFormation(chapter,.37,.68)));
    for(let u=0;u<=1;u+=.025)for(let v=0;v<=1;v+=.025){
      const point=lightFormation(chapter,u,v);
      assert.equal(point.length,3);assert.ok(point.every(x=>Number.isFinite(x)&&Math.abs(x)<4.5));
      if(chapter<10){const next=lightFormation(chapter+1,u,v);assert.ok(point.every((x,i)=>Number.isFinite((x+next[i])/2)));}
    }
  }
  assert.equal(signatures.size,7);
  assert.deepEqual(lightFormation(3,.5,.5),[0,0,0]);assert.deepEqual(lightFormation(11,.5,.5),[0,0,0]);
});

test("the leading edge hands off first while every material point retains lantern clearance",()=>{
  for(let chapter=4;chapter<10;chapter++)for(let u=0;u<=1;u+=.1)for(let v=0;v<=1;v+=.1){
    const a=lightFormation(chapter,u,v),b=lightFormation(chapter+1,u,v);
    for(let p=0;p<=1;p+=.05){
      const mix=materialHandoff(p,u),x=a[0]*(1-mix)+b[0]*mix;
      assert.ok(x+.24<-.9);
      assert.equal(a[0],b[0]); // Length never collapses into a carrier or a flare.
    }
    assert.equal(materialHandoff(0,u),0);assert.equal(materialHandoff(1,u),1);
  }
  assert.ok(materialHandoff(.4,0)>materialHandoff(.4,1));
});
