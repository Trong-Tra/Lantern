"use client";
import { useEffect, useMemo, useRef, type RefObject, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, ShaderMaterial } from "three";
import { ease, journeyState } from "@/libs/cinematic/chapter-transition";

import { hologramCycle } from "@/libs/cinematic/hologram-cycle";

// Three symbolic records; all displayed values belong to the labeled sample receipt.
function recordGeometry(kind: number) {
  const points: number[] = [], distances: number[] = [];
  let length=0;
  const line = (ax: number, ay: number, bx: number, by: number) => {
    points.push(ax, ay, 0, bx, by, 0);
    distances.push(length);
    length+=Math.hypot(bx-ax,by-ay);
    distances.push(length);
  };
  const circle = (x: number, y: number, radius: number, sweep = Math.PI * 2) => {
    for (let i = 0; i < 80; i++) {
      const a = i / 80 * sweep, b = (i + 1) / 80 * sweep;
      line(x + Math.sin(a) * radius, y + Math.cos(a) * radius, x + Math.sin(b) * radius, y + Math.cos(b) * radius);
    }
  };
  if (kind === 0) {
    line(-.62,-.8,.62,-.8); line(.62,-.8,.62,.8); line(.62,.8,-.62,.8); line(-.62,.8,-.62,-.8);
    line(-.48,-.8,-.48,.8);
    circle(0,.25,.28); line(-.28,.25,.28,.25); line(0,-.03,0,.53);
    for (let i=0;i<3;i++) line(-.29,-.25-i*.14,.34,-.25-i*.14);
    for (let i=0;i<14;i++) line(-.28+i*.044,-.64,-.28+i*.044,-.57+(i%3)*.02);
  } else if (kind === 1) {
    circle(0,0,.7); circle(0,0,.57,Math.PI*1.84);
    for(let i=0;i<24;i++) {
      const a=i/24*Math.PI*2;
      line(Math.sin(a)*.76,Math.cos(a)*.76,Math.sin(a)*.81,Math.cos(a)*.81);
    }
    // An upward signal in the dial, rather than an invented live score.
    line(-.3,-.16,-.07,.13);line(-.07,.13,.09,-.02);line(.09,-.02,.32,.28);
    line(.16,.28,.32,.28);line(.32,.28,.32,.12);
  } else {
    for(let i=0;i<4;i++) {
      const x=-.43+(i%2)*.86,y=.6-i*.4;
      circle(x,y,.115);
      if(i<3) line(x,y-.115,-x,y-.285);
      line(x-.045,y,x-.005,y-.04);line(x-.005,y-.04,x+.06,y+.04);
    }
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(points,3));
  g.setAttribute("path",new Float32BufferAttribute(distances.map(d=>d/length),1));return g;
}

function Record({kind, elapsed}:{kind:number; elapsed:MutableRefObject<number>}) {
  const group=useRef<Group>(null),material=useRef<ShaderMaterial>(null);
  const geometry=useMemo(()=>recordGeometry(kind),[kind]);
  const uniforms=useMemo(()=>({presence:{value:0},time:{value:0},reveal:{value:0}}),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{
    if(!group.current||!material.current)return;
    const cycle=hologramCycle(elapsed.current,journeyState.reducedMotion);
    const t=cycle.time;
    group.current.visible=cycle.kind===kind && cycle.opacity>.001;
    group.current.position.set(2.15,.1+Math.sin(t*.8)*.07,0);
    group.current.rotation.set(Math.sin(t*.45)*.06,Math.sin(t*.55)*.24,Math.sin(t*.35)*.035);
    group.current.scale.setScalar(1.35*(.94+.06*cycle.reveal));
    material.current.uniforms.presence.value=ease(journeyState.chapters[4])*cycle.opacity;
    material.current.uniforms.reveal.value=cycle.reveal;
    material.current.uniforms.time.value=t;
  });
  return <group ref={group} position={[2.15,.1,0]}>
    <lineSegments geometry={geometry}>
      <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false}
        vertexShader={`attribute float path;varying float trail;varying float height;void main(){trail=path;height=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`uniform float presence;uniform float time;uniform float reveal;varying float trail;varying float height;void main(){float formed=1.-smoothstep(reveal*2.-1.,reveal*2.-.8,height);float wave=pow(.5+.5*cos(6.283185*(trail-time*.18)),14.);float scan=.88+.12*sin(height*95.-time*2.);vec3 color=mix(vec3(1.35,.86,.3),vec3(2.4,2.05,1.4),wave);gl_FragColor=vec4(color,presence*(.65+.35*wave)*formed*scan);}`} />
    </lineSegments>
  </group>;
}

// A diffuse light wash connects the lantern to the hologram without visible rays.
function Projection({elapsed}:{readonly elapsed:MutableRefObject<number>}) {
  const material=useRef<ShaderMaterial>(null);
  const uniforms=useMemo(()=>({presence:{value:0}}),[]);
  useFrame(()=>{
    if(!material.current)return;
    const cycle=hologramCycle(elapsed.current,journeyState.reducedMotion);
    material.current.uniforms.presence.value=ease(journeyState.chapters[4])*cycle.opacity;
  });
  return <mesh position={[1.75,.1,-.18]} rotation={[0,0,-Math.PI/2]}>
    <planeGeometry args={[3.8,3.5]}/>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false}
      vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`uniform float presence;varying vec2 vUv;
      void main(){float h=vUv.y;float x=(vUv.x-.5)*3.8;float width=.18+h*1.55;float ray=x/width;
      float envelope=exp(-ray*ray*3.8)*(1.-smoothstep(.72,1.,h))*smoothstep(0.,.035,h);
      vec3 color=mix(vec3(2.8,1.35,.35),vec3(1.55,1.18,.62),smoothstep(0.,.25,h));
      gl_FragColor=vec4(color,presence*envelope*.11);}`}/>
  </mesh>;
}

export function IdentityHologram({lantern}:{lantern:RefObject<Group|null>}) {
  const group=useRef<Group>(null),elapsed=useRef(0);
  useFrame((state,dt)=>{
    if(!group.current||!lantern.current)return;
    const presence=ease(journeyState.chapters[4]);
    elapsed.current=presence<.001?0:elapsed.current+dt;
    group.current.visible=presence>.001;
    group.current.position.copy(lantern.current.position);
    group.current.quaternion.copy(state.camera.quaternion);
    group.current.scale.setScalar((state.size.width<760?.4:.72));
  });
  return <group ref={group}>
    <Projection elapsed={elapsed}/>
    <Record kind={0} elapsed={elapsed}/><Record kind={1} elapsed={elapsed}/><Record kind={2} elapsed={elapsed}/>
  </group>;
}
