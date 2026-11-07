const clamp=(p:number)=>Math.max(0,Math.min(1,p));
export function lanternFlight(chapter:number,progress:number,time:number){
 const p=clamp(progress),envelope=Math.sin(Math.PI*p)**2,mode=chapter%4;
 const shock=p>.58?Math.sin(Math.min(1,(p-.58)/.42)*Math.PI)**2*.08:0;
 const phase=time*.32+chapter*1.73;
 const idle={x:Math.sin(phase)*.65+Math.sin(phase*.47)*.22,y:Math.sin(phase*.73)*.22,z:(.5+.5*Math.sin(phase*.6))*1.35,roll:Math.cos(phase)*.045};
 const paths=[
  {x:(p-.5)*7*envelope,y:Math.sin(p*Math.PI*2)*.6*envelope,z:3.8*envelope,roll:-.3*envelope},
  {x:Math.sin(p*Math.PI*2)*1.8*envelope,y:1.1*envelope,z:-5*envelope+shock*5,roll:shock*.5},
  {x:Math.sin(p*Math.PI*3)*envelope,y:-1.4*envelope,z:2.8*envelope,roll:.5*envelope},
  {x:(p<.5?-1:1)*Math.sin(Math.PI*p*2)**2*1.7,y:Math.sin(p*Math.PI*2)*envelope,z:-3.5*envelope+shock*4,roll:shock*.6},
 ];
 const flight=paths[mode];
 return {x:idle.x+flight.x*.1,y:idle.y+flight.y*.1,z:idle.z+flight.z*.08,roll:idle.roll+flight.roll*0,shock};
}
