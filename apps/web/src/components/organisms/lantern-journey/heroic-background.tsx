"use client";
import { useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh,  ShaderMaterial, Vector2, Vector3 } from "three";
import { journeyState, ease } from "@/libs/cinematic/chapter-transition";
import { warpFlight } from "@/libs/cinematic/warp-flight";
const assets=["/images/heroic-combat.png","/images/heroic-shield-clash.png","/images/heroic-sword-clash.png"];
const impacts=[[1.5,.5],[1,.5],[0,3.2]];
const random=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
/** High-detail sculpture tableaux appear as distant memories of a powerful clash. */
export function HeroicBackground(){
 const textures=useTexture(assets),group=useRef<Group>(null),image=useRef<Mesh>(null),waves=useRef<(Mesh|null)[]>([]);
 const position=useMemo(()=>new Vector3(),[]);
 useFrame(({camera,clock,size})=>{
  if(!group.current||!image.current)return;
  const reduced=journeyState.reducedMotion,t=reduced?1:clock.elapsedTime;
  const cycle=Math.floor(t/13),local=t%13;
  const active=journeyState.chapters.indexOf(Math.max(...journeyState.chapters));
  const side=[3,4,5].includes(active)?-1:1;
  const p=warpFlight.progress,flying=!reduced&&p>.001&&p<.999;
  const depth=flying?ease(p/.5)*(1-ease((p-.5)/.5))*360:0;
  const mobile=size.width<760;
  const x=side*(mobile?2+random(cycle+1)*2:4+random(cycle+1)*8),y=-2+random(cycle+13)*8;
  position.set(x*1.5,y*1.5,-76-depth).applyQuaternion(camera.quaternion).add(camera.position);
  group.current.position.copy(position);group.current.quaternion.copy(camera.quaternion);
  group.current.rotateZ((random(cycle+7)-.5)*.12);
  group.current.scale.setScalar((mobile?.65:1)*(.65+random(cycle+4)*.2));
  const fade=reduced?.4:ease(local/.65)*(1-ease((local-1.7)/1.3))*.5;
  const material=image.current.material as ShaderMaterial;
  const map=textures[cycle%textures.length];material.uniforms.art.value=map;
  const source=map.image as {width:number;height:number};
  image.current.scale.y=source.height/source.width*15/7.6;
  material.uniforms.alpha.value=fade;material.uniforms.texel.value.set(24/source.width,24/source.height);image.current.visible=fade>.001;
  waves.current.forEach((wave,i)=>{
   if(!wave)return;const age=local-(.85+i*.32),life=age/1.05;
   wave.visible=!reduced&&life>0&&life<1&&fade>.001;
   if(!wave.visible)return;
   const contact=impacts[cycle%impacts.length];wave.position.set(contact[0],contact[1],.2);
   wave.scale.setScalar(.2+life*5.5);wave.rotation.z=life*.25;
   (wave.material as ShaderMaterial).uniforms.alpha.value=(1-life)**2*.06;
  });
 },.7);
 return <group ref={group}>
  <mesh ref={image} renderOrder={-20}><planeGeometry args={[15,7.6]}/><shaderMaterial transparent depthWrite={false} toneMapped={false} uniforms={{art:{value:textures[0]},alpha:{value:0},texel:{value:new Vector2(.007,.014)}}}
vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
fragmentShader={`uniform sampler2D art;uniform float alpha;uniform vec2 texel;varying vec2 vUv;void main(){vec4 c=texture2D(art,vUv)*.25;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){if(x==0&&y==0)continue;float w=(x==0||y==0)?.125:.0625;c+=texture2D(art,vUv+vec2(float(x),float(y))*texel)*w;}gl_FragColor=vec4(vec3(.008,.01,.016),c.a*alpha);}`}/>
</mesh>
  {[0,1].map(i=><mesh key={i} ref={node=>{waves.current[i]=node;}} position={[0,1,.2]} renderOrder={-19}>
   <planeGeometry args={[2,2]}/><shaderMaterial transparent depthWrite={false} toneMapped={false} uniforms={{alpha:{value:0}}}
    vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
    fragmentShader={`varying vec2 vUv;uniform float alpha;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float ring=exp(-pow((r-.83)*42.,2.));float wake=exp(-pow((r-.76)*16.,2.))*.18;gl_FragColor=vec4(vec3(.72,.65,.46),(ring+wake)*alpha);}`}/>
  </mesh>)}
 </group>;
}
