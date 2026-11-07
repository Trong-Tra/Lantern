import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const {conceptLine,conceptResponse,conceptPacket,conceptStrength,CONCEPT_STRANDS}=loadSource("src/libs/cinematic/lantern-line-concepts.ts");
test("seven complete line concepts retain physical lantern clearance through their handoffs",()=>{
 const signatures=new Set();
 for(let chapter=4;chapter<=10;chapter++){
  signatures.add(JSON.stringify(conceptLine(chapter,5,.37,3)));
  for(let strand=0;strand<CONCEPT_STRANDS;strand++)for(let u=0;u<=1;u+=.025)for(let time=0;time<11;time+=.7){
   const point=conceptLine(chapter,strand,u,time);assert.ok(point.every(Number.isFinite));assert.ok(point[0]<-.85);
   const next=conceptLine(chapter,strand,u+.0001,time);assert.ok(Math.hypot(...next.map((v,i)=>v-point[i]))<.02);
   const moved=conceptLine(chapter,strand,u,time+.001);assert.ok(Math.hypot(...moved.map((v,i)=>v-point[i]))<.02);
  }
 }
 assert.equal(signatures.size,7);
});
test("the lantern response and strand reach share a bounded, continuous cycle",()=>{
 for(let chapter=4;chapter<=10;chapter++)for(let time=0;time<30;time+=.02){const response=conceptResponse(chapter,time);assert.ok(response>=0&&response<=1);assert.ok(Math.abs(response-conceptResponse(chapter,time+.001))<.01);}
});

test("completed work lights its record after arrival and authorization holds rejected traffic",()=>{
 assert.ok(conceptStrength(5,6,.5,1)<conceptStrength(5,6,.5,8));
 assert.equal(conceptPacket(6,0,1).energy,0);
 assert.ok(conceptPacket(6,0,6).energy>0);
 for(let index=1;index<3;index++)for(let time=0;time<12;time+=.1){const packet=conceptPacket(6,index,time);assert.ok(packet.point.every(Number.isFinite));}
 assert.ok(conceptStrength(9,2,.5,9)>conceptStrength(9,1,.5,9));
});

test("a rejected signal reverses before the gate while the authorized signal completes the route",()=>{
 for(let index=1;index<3;index++){const turn=(.25+index*.07+.25)*12,peak=conceptPacket(6,index,turn).point[0];assert.ok(peak<-3.1);assert.ok(peak>conceptPacket(6,index,turn-.5).point[0]);assert.ok(peak>conceptPacket(6,index,turn+.5).point[0]);}
 assert.ok(conceptPacket(6,0,8.8).point[0]>-2);
 assert.ok(conceptPacket(9,0,11.2).point[0]>-1.1);
 const before=conceptStrength(7,4,.5,2),after=conceptStrength(7,4,.5,5);assert.ok(after>before);
 for(let chapter=4;chapter<=10;chapter++)for(let index=0;index<6;index++)for(let time=0;time<12;time+=.1){const packet=conceptPacket(chapter,index,time);assert.ok(packet.energy>=0&&packet.energy<=1);assert.ok(packet.point[0]<-.85);}
});


test("every celestial sculpture has continuous idle motion while its signal routes remain attached",()=>{
 for(let chapter=4;chapter<=10;chapter++){
  let travel=0;
  for(let strand=6;strand<CONCEPT_STRANDS;strand++){
   const a=conceptLine(chapter,strand,.23,3),b=conceptLine(chapter,strand,.23,4);
   travel+=Math.hypot(...b.map((value,i)=>value-a[i]));
   const before=conceptLine(chapter,strand,.23,11.999),after=conceptLine(chapter,strand,.23,12.001);
   assert.ok(Math.hypot(...after.map((value,i)=>value-before[i]))<.02);
  }
  assert.ok(travel>.02,`chapter ${chapter} should animate at rest`);
  for(let strand=0;strand<6;strand++)assert.deepEqual(conceptLine(chapter,strand,0,3),conceptLine(chapter,strand,0,4));
 }
});
