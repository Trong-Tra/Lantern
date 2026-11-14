"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, Mesh, ShaderMaterial } from "three";
import { journeyState, ease } from "@/libs/cinematic/chapter-transition";
import { soulPoint } from "@/libs/cinematic/agent-soul";

export function AgentSoul({lantern}:{lantern:RefObject<Group|null>}) {
  const group=useRef<Group>(null),heart=useRef<Mesh>(null),material=useRef<ShaderMaterial>(null);
  const elapsed=useRef(0);
  const geometry=useMemo(()=>{
    const g=new BufferGeometry();const positions:number[]=[],seeds:number[]=[];
    for(let i=0;i<1600;i++){positions.push(...soulPoint(i));seeds.push((i*0.618034)%1);}
    g.setAttribute("position",new Float32BufferAttribute(positions,3));g.setAttribute("seed",new Float32BufferAttribute(seeds,1));return g;
  },[]);
  const uniforms=useMemo(()=>({presence:{value:0},time:{value:0},reveal:{value:0}}),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame((state,dt)=>{
    if(!group.current||!lantern.current||!material.current||!heart.current)return;
    const presence=ease(journeyState.chapters[3]);
    elapsed.current=presence<0.001?0:elapsed.current+dt;
    const time=journeyState.reducedMotion?0:elapsed.current;
    const reveal=journeyState.reducedMotion?1:ease(elapsed.current/3.2);
    const mobile=state.gl.domElement.clientWidth<760,scale=mobile?0.48:0.94;
    group.current.visible=presence>0.001;
    group.current.position.copy(lantern.current.position);
    const distance=state.camera.position.distanceTo(lantern.current.position);
    group.current.position.lerp(state.camera.position,-0.6/distance);
    group.current.quaternion.copy(state.camera.quaternion);
    group.current.translateY(scale*0.9);
    group.current.scale.setScalar(scale);
    material.current.uniforms.presence.value=presence;
    material.current.uniforms.time.value=time;material.current.uniforms.reveal.value=reveal;
    const beat=1+Math.pow(Math.max(0,Math.sin(time*1.7)),8)*0.18;
    heart.current.scale.setScalar(0.13*beat*presence*reveal);
  });
  return <group ref={group}>
    <points geometry={geometry}>
      <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false}
        vertexShader={`attribute float seed;uniform float time;uniform float reveal;varying float light;varying float warmth;
        void main(){vec3 p=position;float d=length(p-vec3(0.,.55,0.));float wave=pow(max(0.,sin(d*5.-time*1.7)),10.);float formed=smoothstep(d*.16,d*.16+.4,reveal);p.x+=sin(time*.6+seed*6.28)*.018;p.y+=sin(time*.7)*.035;
        light=formed*(.15+wave*.65+pow(seed,8.)*.35);warmth=exp(-d*1.7);vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((12.+seed*12.)/-v.z,1.,3.2);}`}
        fragmentShader={`uniform float presence;varying float light;varying float warmth;void main(){float d=length(gl_PointCoord-.5)*2.;float a=exp(-d*d*4.)*(1.-smoothstep(.65,1.,d));vec3 color=mix(vec3(.8,1.05,1.65),vec3(2.8,1.65,.55),warmth);gl_FragColor=vec4(color,a*light*presence);}`} />
    </points>
    <mesh ref={heart} position={[0,.55,.05]}>
      <icosahedronGeometry args={[1,2]}/><meshBasicMaterial color={[4,2.1,.65]} toneMapped={false}/>
    </mesh>
  </group>;
}
