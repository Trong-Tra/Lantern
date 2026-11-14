/** A persistent illuminated ribbon: every chapter retains the same longitudinal material. */
function rawFormation(chapter:number,u:number,v:number):number[]{
  const x=(u-.5)*4.2*(.72+.28*Math.sin(v*Math.PI)),w=(v-.5)*2.4;
  if(chapter===4){ // An open credential scroll, gently rolled at its two edges.
    const curl=Math.cos(u*Math.PI*2);
    return [x,w*(.65+.35*Math.sin(u*Math.PI))+.48*Math.sin(u*Math.PI*1.5),curl*.85+Math.sin(w*1.6)*.16];
  }
  if(chapter===5){ // The credential gains six permanent folds: a history of actions.
    return [x,w+.3*Math.sin(u*Math.PI*2),.6*Math.sin(u*Math.PI*6)+w*.12];
  }
  if(chapter===6){ // The same material separates into an accepted corridor and a bypass.
    const side=v<.5?-1:1,local=(v% .5)*2-.5;
    return [x,side*(.5+.45*Math.sin(u*Math.PI))+local*.8,.3*Math.sin(u*Math.PI*2)+local*.2];
  }
  if(chapter===7){ // Authorized lanes carry an action from left to right.
    return [x,w*.8+Math.sin(u*Math.PI*2)*.35,.28*Math.cos(u*Math.PI*3)+w*.18];
  }
  if(chapter===8){ // Independent lanes run together, without losing their material identity.
    return [x,w+Math.sin(u*Math.PI*2+w*2)*.25,Math.sin(u*Math.PI*4+w*2)*.4];
  }
  if(chapter===9){ // One intention fans into possible routes, then converges on an answer.
    const fan=.3+Math.sin(u*Math.PI)*.95;
    return [x,w*fan,Math.sin(u*Math.PI)*w*.45+.18*Math.cos(u*Math.PI*2)];
  }
  if(chapter===10){ // Accumulated routes interlace into a durable shared fabric.
    return [x,w,.4*Math.sin(u*Math.PI*6)*Math.cos(v*Math.PI*6)];
  }
  return [0,0,0];
}
export function storySpace(point:readonly number[]):[number,number,number]{
  return [point[0]*.65-2.65,point[1]*.8+1,point[2]*.6];
}
export function lightFormation(chapter:number,u:number,v:number):number[]{
  return chapter>=4&&chapter<=10?storySpace(rawFormation(chapter,u,v)):[0,0,0];
}
/** The leading edge changes first; the rest follows without collapsing or fading out. */
export function materialHandoff(progress:number,u:number):number{
  const p=Math.max(0,Math.min(1,(progress-u*.28)/.72));
  return p*p*(3-2*p);
}
