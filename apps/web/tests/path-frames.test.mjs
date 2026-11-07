import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { bakePathFrame, samplePathFrame, pathSegments, PATH_FPS } = loadSource("src/libs/cinematic/path-frames.ts");
const { conceptLine } = loadSource("src/libs/cinematic/lantern-line-concepts.ts");
const { sectionThreePath } = loadSource("src/libs/cinematic/chapter-transition.ts");
const direct = (kind, strand, u, time) => {
  if(kind >= 4) return conceptLine(kind, strand, u, time);
  const p=sectionThreePath(strand,u,strand<16?5:3,time,kind);
  return [p.x,p.y,p.z];
};
test("prepared paths preserve endpoints and sampled vertices",()=>{
  for(const kind of [0,1,4,5,6,7,8,9,10]) {
    const a=bakePathFrame(kind,27), segments=pathSegments(kind);
    const frames={a,b:a,mix:0,segments};
    for(const strand of [0,5,18,31]) for(const u of [0,12/segments,1]) {
      const p=samplePathFrame(frames,strand,u), expected=direct(kind,strand,u,27/PATH_FPS);
      p.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-6));
    }
  }
});
test("temporal interpolation stays close to authored paths, including cycle boundaries",()=>{
  let error=0;
  for(const kind of [0,1,4,5,6,7,8,9,10]) for(const time of [0.02,1.19,11.98,12.02,25.43]) {
    const at=time*PATH_FPS, frame=Math.floor(at);
    const frames={a:bakePathFrame(kind,frame),b:bakePathFrame(kind,frame+1),mix:at-frame,segments:pathSegments(kind)};
    for(const strand of [0,5,18,31]) for(const u of [0,.125,.5,.875,1]) {
      const p=samplePathFrame(frames,strand,u),expected=direct(kind,strand,u,time);
      error=Math.max(error,Math.hypot(...p.map((v,i)=>v-expected[i])));
    }
  }
  assert.ok(error<0.015,`maximum path error ${error}`);
});
test("prepared frame playback is reversible and has finite clamped endpoints",()=>{
  const a=bakePathFrame(6,180),b=bakePathFrame(6,181),segments=pathSegments(6);
  const forward=samplePathFrame({a,b,mix:.3,segments},20,.37);
  const reverse=samplePathFrame({a:b,b:a,mix:.7,segments},20,.37);
  forward.forEach((v,i)=>assert.ok(Math.abs(v-reverse[i])<1e-7));
  for(const u of [-1,0,1,2]) assert.ok(samplePathFrame({a,b,mix:.5,segments},0,u).every(Number.isFinite));
});
