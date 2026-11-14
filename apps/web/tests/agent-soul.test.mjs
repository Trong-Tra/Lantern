import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './helpers/load-source.mjs';
const { soulPoint }=loadSource('src/libs/cinematic/agent-soul.ts');
test('agent soul has a bounded head and shoulders with a tapered body',()=>{
 for(let i=0;i<1600;i++){const [x,y,z]=soulPoint(i);assert.ok([x,y,z].every(Number.isFinite));assert.ok(Math.abs(x)<0.87&&y>-1.68&&y<1.96&&Math.abs(z)<0.38);}
 assert.ok(Math.abs(soulPoint(1599)[0])<0.02);
 assert.ok(soulPoint(0)[1]>soulPoint(399)[1]);
});
