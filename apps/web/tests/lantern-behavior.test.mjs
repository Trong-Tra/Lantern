import test from "node:test";
import assert from "node:assert/strict";
import {loadSource} from "./helpers/load-source.mjs";
const {storyActor,storyBeat,storyLink,storyStations}=loadSource("src/libs/cinematic/lantern-behavior.ts");
const lamp=[.3,-.5,.8];
test("identity becomes verified only after the scan reaches it",()=>{
  assert.equal(storyActor(4,3,2,lamp).verified,0);
  assert.equal(storyActor(4,3,8,lamp).verified,1);
});
test("authorization waits for permission and the rejected actor never crosses the gate",()=>{
  assert.equal(storyActor(6,6,1,lamp).energy,0);
  for(let t=0;t<12;t+=.05)assert.ok(storyActor(6,11,t,lamp).point[0]<=storyStations(6)[1][0]+1e-9);
  assert.ok(storyActor(6,6,5,lamp).point[0]>storyStations(6)[2][0]);
});
test("intent gets a selected response after arrival, and reduced-motion poses remain still",()=>{
  assert.equal(storyActor(9,1,2,lamp).verified,0);
  assert.equal(storyActor(9,1,9,lamp).verified,1);
  for(let chapter=4;chapter<=10;chapter++){
    assert.deepEqual(storyBeat(chapter,1,true),storyBeat(chapter,100,true));
    for(let i=0;i<12;i++)assert.deepEqual(storyActor(chapter,i,1,lamp,true),storyActor(chapter,i,100,lamp,true));
    for(let i=0;i<12;i++){
      const actor=storyActor(chapter,i,8,lamp);
      assert.ok(actor.point.every(Number.isFinite));assert.ok(actor.energy>=0&&actor.energy<=1.01);
    }
  }
});
test("beacons, replies and their links share the authored world-space destination",()=>{
  const stations=storyStations(9);
  assert.deepEqual(storyActor(9,1,9,lamp).point,stations[1]);
  storyActor(9,6,9,lamp).point.forEach((value,i)=>assert.ok(Math.abs(value-stations[1][i])<1e-12));
  assert.deepEqual(storyLink(9,1,9,lamp).slice(3,6),stations[1]);
});
test("all visible agents and paths stay beside the lantern without clipping",()=>{
  const port=[-1.05,-.2,.6];
  for(let chapter=4;chapter<=10;chapter++)for(let seconds=0;seconds<12;seconds+=.1){
    for(let i=0;i<12;i++){const actor=storyActor(chapter,i,seconds,port);if(actor.energy>.001)assert.ok(actor.point[0]<=-.9);}
    for(let i=0;i<6;i++){const link=storyLink(chapter,i,seconds,port);if(link[6]>.001)assert.ok(link[0]<=-.9&&link[3]<=-.9);}
  }
});
