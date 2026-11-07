import test from "node:test";
import assert from "node:assert/strict";
import {loadSource} from "./helpers/load-source.mjs";
const {lanternFlight}=loadSource("src/libs/cinematic/flight-choreography.ts");
test("flight paths settle at both ends and remain bounded and continuous",()=>{
 for(let chapter=0;chapter<12;chapter++){
  const start=lanternFlight(chapter,0,4),end=lanternFlight(chapter,1,4);
  for(const key of ["x","y","z","roll"])assert.ok(Math.abs(start[key]-end[key])<1e-8);
  for(let p=0;p<1;p+=.001){const a=lanternFlight(chapter,p,4),b=lanternFlight(chapter,p+.0001,4);for(const key of ["x","y","z","roll"]){assert.ok(Number.isFinite(a[key]));assert.ok(Math.abs(a[key])<8);assert.ok(Math.abs(a[key]-b[key])<.02);}}
 }
});
