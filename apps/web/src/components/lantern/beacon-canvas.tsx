"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

function Beacon() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * .3) * .16; });
  return <group ref={group} rotation={[.08, .35, 0]}>
    <ambientLight intensity={1.2} /><pointLight position={[0, 0, 2]} color="#ffd08a" intensity={15} />
    <mesh position={[0,-1,0]}><cylinderGeometry args={[.68,.75,.2,8]} /><meshStandardMaterial color="#81633e" metalness={.8} roughness={.3}/></mesh>
    <mesh position={[0,.7,0]}><cylinderGeometry args={[.28,.65,.4,8]} /><meshStandardMaterial color="#9c7b4b" metalness={.8} roughness={.3}/></mesh>
    <mesh position={[0,1.18,0]}><torusGeometry args={[.25,.035,8,32]} /><meshStandardMaterial color="#bd9864" metalness={.8} roughness={.3}/></mesh>
    <mesh position={[0,-.08,0]}><cylinderGeometry args={[.52,.58,1.35,8,1,true]} /><meshStandardMaterial color="#ffcf82" emissive="#ffb447" emissiveIntensity={.35} transparent opacity={.22} side={2} depthWrite={false}/></mesh>
    {Array.from({length:8},(_,i) => { const a=i*Math.PI/4; return <mesh key={i} position={[Math.sin(a)*.55,-.08,Math.cos(a)*.55]}><cylinderGeometry args={[.025,.025,1.45,6]}/><meshStandardMaterial color="#ae8956" metalness={.8} roughness={.3}/></mesh> })}
    <mesh position={[0,-.3,0]}><sphereGeometry args={[.16,24,24]}/><meshBasicMaterial color="#fff0bd"/></mesh>
    <mesh position={[0,-.3,0]}><sphereGeometry args={[.35,24,24]}/><meshBasicMaterial color="#ffb84d" transparent opacity={.12} depthWrite={false}/></mesh>
  </group>;
}
export default function BeaconCanvas() { return <Canvas camera={{position:[0,0,5],fov:36}} dpr={[1,1.5]} gl={{alpha:true}}><Beacon /></Canvas>; }
