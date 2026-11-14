import { storySpace } from "./light-formations";
export type LightPoint = [number, number, number];
export type LightActor = { point: LightPoint; energy: number; verified: number; packet: number };
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
const mix=(a:LightPoint,b:LightPoint,t:number):LightPoint=>a.map((v,i)=>v+(b[i]-v)*clamp(t)) as LightPoint;
export const STORY_DURATION=12;

export function storyBeat(chapter:number,seconds:number,reduced=false){
  const phase=reduced?.72:((Math.max(0,seconds)%STORY_DURATION)/STORY_DURATION);
  const beat=phase*6,step=Math.min(5,Math.floor(beat));
  const energy=Math.sin(Math.PI*(beat-step))**4;
  const progress=chapter===9?smooth((phase-.25)/.6):phase;
  const gate=smooth((phase-.08)/.1)*(1-smooth((phase-.88)/.1));
  return {phase,step,energy,progress,gate};
}

function makeStations(chapter:number):LightPoint[]{
  if(chapter===4)return [[-1.65,.15,-.1],[-1.3,1,.1],[-.6,1.65,-.3],[.5,1.8,-.1],[1.65,1.2,.2],[-1.6,-.7,.1]];
  if(chapter===5)return Array.from({length:6},(_,i):LightPoint=>[-1.5+i*.58,1.65+Math.sin(i*.8)*.12,-.2]);
  if(chapter===6)return [[-1.7,1.55,0],[-.5,1.55,0],[.5,1.55,0],[1.7,1.55,0],[-1.8,.4,0],[1.55,1.9,-.2]];
  if(chapter===7)return [[-1.5,1.35,0],[0,1.75,-.2],[1.5,1.35,0],[2,1.7,-.3],[0,0,0],[0,0,0]];
  if(chapter===8)return Array.from({length:6},(_,i):LightPoint=>[i%2?1.65:-1.65,Math.floor(i/2)*.68-.2,(Math.floor(i/2)-1)*.3]);
  if(chapter===9)return [[-1.35,1.45,0],[0,1.9,-.2],[1.35,1.45,.1],[0,0,0],[0,0,0],[0,0,0]];
  return [[-1.5,.7,0],[-.8,1.45,-.2],[.5,1.5,.1],[1.5,.8,-.2],[1.25,-.25,.1],[-1.2,-.5,0]];
}

const stationCache=Array.from({length:7},(_,i)=>makeStations(i+4).map(storySpace));
export function storyStations(chapter:number):LightPoint[]{return stationCache[chapter-4]??[];}

export function storyActor(chapter:number,index:number,seconds:number,lamp:LightPoint,reduced=false):LightActor{
  const beat=storyBeat(chapter,seconds,reduced),p=beat.phase,stations=storyStations(chapter),clock=reduced?0:seconds;
  if(index<6){
    let energy=.12,verified=0;
    if(chapter===4){verified=smooth((p-(index+1)*.12)*30);energy=.16+verified*.84;}
    if(chapter===5){verified=smooth((p-(index+1)/7)*22);energy=.12+verified*.88;}
    if(chapter===6){energy=index<4?.3+beat.gate*.65:.18;verified=index<4?beat.gate:0;}
    if(chapter===7){verified=index<4?smooth((p-(index+1)*.2)*30):0;energy=index<4?.15+verified*.85:0;}
    if(chapter===8){energy=.55+.4*Math.sin((clock*.8-index*.15)*Math.PI)**2;verified=.6;}
    if(chapter===9){const arrive=smooth((p-.28)*18),chosen=smooth((p-.48)*20);energy=index<3?arrive*(index===1?.3+chosen*.7:.3*(1-chosen)):0;verified=index===1?chosen:0;}
    if(chapter===10){verified=index<2?1:smooth((p-(index-1)*.13)*20);energy=.15+verified*.85;}
    return {point:stations[index],energy,verified,packet:0};
  }
  const packet=index-6;
  let point:LightPoint=[0,0,0],energy=0;
  if(chapter===4){const travel=clamp((p-packet*.12)/.12);point=mix(lamp,stations[packet],smooth(travel));energy=travel>0&&travel<1?Math.sin(travel*Math.PI):0;}
  if(chapter===5){const t=clamp((p-packet/7)*7),source:LightPoint=storySpace([-1.65+packet*.6,-1.1,-.2]);point=t<.5?mix(source,lamp,smooth(t*2)):mix(lamp,stations[packet],smooth(t*2-1));energy=t>0&&t<1?Math.sin(Math.PI*t):0;}
  if(chapter===6){
    if(packet<5){const t=clamp((p-.2-packet*.09)*3.1);point=mix(stations[0],stations[3],smooth(t));energy=p>.2&&t>0&&t<1?Math.sin(Math.PI*t):0;}
    else {const t=clamp((p-.35)*3);point=mix(stations[4],storySpace([-1,.4,0]),Math.sin(t*Math.PI));energy=t>0&&t<1?.55:0;}
  }
  if(chapter===7){const t=clamp(p-packet*.012)*5,leg=Math.min(4,Math.floor(t)),local=t-leg;const route=[lamp,...stations.slice(0,4),stations[3]];point=mix(route[leg],route[leg+1],smooth(local));energy=t>0&&t<4.95?1-packet*.12:0;}
  if(chapter===8){const lane=Math.floor(packet/2),t=reduced?.65:(seconds*.42+(packet%2)*.5+lane*.16)%1;point=mix(stations[lane*2],stations[lane*2+1],t);energy=Math.sin(Math.PI*t)*.9;}
  if(chapter===9&&packet===0){if(p<.25){point=mix(storySpace([-2.2,-.4,0]),lamp,smooth(p/.25));energy=Math.sin(Math.PI*p/.25);}else if(p>.4){point=mix(lamp,stations[1],smooth((p-.4)/.35));energy=p<.8?1:1-smooth((p-.8)/.15);}}
  if(chapter===10){const next=(packet+1)%6,t=reduced?.7:(seconds*.18+packet*.14)%1,joined=packet<2?1:smooth((p-(packet-1)*.13)*20);point=mix(stations[packet],stations[next],smooth(t));energy=Math.sin(Math.PI*t)*joined;}
  return {point,energy,verified:0,packet:1};
}

export function storyLink(chapter:number,index:number,seconds:number,lamp:LightPoint,reduced=false):number[]{
  const beat=storyBeat(chapter,seconds,reduced),nodes=storyStations(chapter),p=beat.phase;
  let a=lamp,b=nodes[index],energy=0;
  if(chapter===4)energy=index===Math.min(5,Math.floor(p/.12))?.45:.04*smooth((p-index/6)*20);
  if(chapter===5){b=nodes[index];energy=.16*smooth((p-(index+1)/7)*20);}
  if(chapter===6&&index<3){a=nodes[index];b=nodes[index+1];energy=beat.gate*.25;}
  if(chapter===7&&index<4){a=index===0?lamp:nodes[index-1];b=nodes[index];energy=.24*smooth((p-index*.2)*20);}
  if(chapter===8&&index<3){a=nodes[index*2];b=nodes[index*2+1];energy=.2;}
  if(chapter===9&&index<3){energy=smooth((p-.28)*18)*(index===1?.12+.2*smooth((p-.48)*20):.12*(1-smooth((p-.48)*20)));}
  if(chapter===10){a=nodes[index];b=nodes[(index+1)%6];energy=.25*(index<2?1:smooth((p-(index-1)*.13)*20));}
  return [...a,...b,energy];
}
