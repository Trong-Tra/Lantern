"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, PerspectiveCamera, SphereGeometry, Vector3 } from "three";
import { journeyState, ease } from "@/libs/cinematic/chapter-transition";
import { warpFlight } from "@/libs/cinematic/warp-flight";
import { planetDrift } from "@/libs/cinematic/planet-route";
const colours=["#29466e","#ad7642","#527e8c","#665a8a","#487f92","#aa7653","#528079","#45699a","#78679c","#598b99","#977458","#54788b"];
export function ChapterPlanets(){
 const planets=useRef<(Group|null)[]>([]);
 const geometry=useMemo(()=>new SphereGeometry(1,48,32),[]);
 const position=useMemo(()=>new Vector3(),[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(({camera,clock,size})=>{
  const p=warpFlight.progress,from=warpFlight.from;
  const flying=!journeyState.reducedMotion&&p>.001&&p<.999;
  const active=journeyState.chapters.indexOf(Math.max(...journeyState.chapters));
  planets.current.forEach((planet,i)=>{
   if(!planet)return;
   planet.visible=flying?(i===from||i===warpFlight.to):i===active;
   if(!planet.visible)return;
   const distance=flying?(i===from?ease(p/.52):1-ease((p-.48)/.52))*320:0;
   const t=journeyState.reducedMotion?0:clock.elapsedTime,mobile=size.width<760;
   const point=planetDrift(t,i,size.width/size.height);
   const halfHeight=24*Math.tan((camera as PerspectiveCamera).fov*Math.PI/360);
   position.set(point.x*halfHeight,point.y*halfHeight,-24-distance);
   position.applyQuaternion(camera.quaternion).add(camera.position);
   planet.position.copy(position);planet.quaternion.copy(camera.quaternion);planet.rotateZ(.25+Math.sin(t*.025+i)*.06);
   planet.scale.setScalar((mobile?.65:1)*(.68+i%3*.08));
   const moons=planet.getObjectByName("satellites");if(moons)moons.rotation.z=t*.12;
   const sphere=planet.children[0];sphere.rotation.y=t*(.045+i%3*.012);sphere.rotation.z=.18;
  });
 },.6);
 return <>{colours.map((colour,i)=><group key={colour+i} ref={node=>{planets.current[i]=node;}}>
  <mesh geometry={geometry}>
   <shaderMaterial uniforms={{tint:{value:new Color(colour)},kind:{value:i%6}}} depthWrite={false} toneMapped={false}
    vertexShader={`varying vec3 n;varying vec3 world;void main(){n=normalize(mat3(modelMatrix)*normal);world=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
    fragmentShader={`uniform vec3 tint;uniform float kind;varying vec3 n;varying vec3 world;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(a),hash(a+vec3(1,0,0)),f.x),mix(hash(a+vec3(0,1,0)),hash(a+vec3(1,1,0)),f.x),f.y),mix(mix(hash(a+vec3(0,0,1)),hash(a+vec3(1,0,1)),f.x),mix(hash(a+vec3(0,1,1)),hash(a+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){float light=max(0.,dot(normalize(n),normalize(vec3(-.65,.4,.65))));float terrain=noise(world*5.)*.65+noise(world*16.)*.25+noise(world*45.)*.1;vec3 surface;
if(kind<.5){float continents=smoothstep(.44,.6,terrain);surface=mix(tint*.4,vec3(.24,.34,.28),continents);surface+=vec3(.35,.4,.42)*smoothstep(.62,.79,terrain)*.45;}
else if(kind<1.5){float bands=.5+.5*sin(world.y*35.+terrain*12.);surface=mix(tint*.55,vec3(.55,.39,.2),bands*.65);}
else if(kind<2.5){float cracks=pow(1.-abs(terrain-.5)*2.,12.);surface=mix(tint,vec3(.5,.64,.67),terrain)*.7;surface*=1.-cracks*.6;}
else if(kind<3.5){float fissure=pow(1.-abs(terrain-.5)*2.,24.);surface=mix(vec3(.09,.045,.025),vec3(.9,.18,.025),fissure);}
else if(kind<4.5){surface=mix(vec3(.015,.08,.16),vec3(.16,.4,.3),smoothstep(.43,.58,terrain));surface+=vec3(.42,.48,.5)*smoothstep(.64,.75,terrain);}
else {surface=mix(vec3(.14,.045,.1),vec3(.56,.3,.48),terrain);surface+=vec3(.13,.3,.4)*pow(1.-abs(terrain-.5)*2.,10.);}
float rim=pow(1.-max(0.,normalize(n).z),5.);gl_FragColor=vec4(surface*(.08+light*.85)+tint*rim*.22,1.);}`}/>

  </mesh>
  {i%6===4&&<group name="satellites"><mesh position={[1.8,.2,.3]} scale={.2} geometry={geometry}><meshStandardMaterial color="#8d929a" roughness={1}/></mesh><mesh position={[-2.1,-.3,.2]} scale={.13} geometry={geometry}><meshStandardMaterial color="#b4a590" roughness={1}/></mesh></group>}
  {i%6===1&&<mesh rotation={[1.03,.2,-.25]}><ringGeometry args={[1.3,1.95,128]}/><shaderMaterial transparent side={2} depthWrite={false} toneMapped={false}
vertexShader={`varying vec2 ring;void main(){ring=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
fragmentShader={`varying vec2 ring;void main(){float r=length(ring);float dust=.35+.65*pow(.5+.5*sin(r*185.),2.);float edge=smoothstep(1.3,1.37,r)*(1.-smoothstep(1.85,1.95,r));gl_FragColor=vec4(vec3(.52,.43,.29)*dust,edge*dust*.48);}`}/></mesh>}
 </group>)}</>;
}
