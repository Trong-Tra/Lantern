"use client";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { warpFlight } from "@/libs/cinematic/warp-flight";
import { journeyState } from "@/libs/cinematic/chapter-transition";
/** Shared timing for a quiet scene glide. No camera distortion, tunnel or shake. */
export function PortalCrossing(){
 const start=useRef(-Infinity),from=useRef(0);
 useEffect(()=>{const jump=()=>{start.current=performance.now();from.current=journeyState.chapters.indexOf(Math.max(...journeyState.chapters));};window.addEventListener("lattern:warp",jump);return()=>window.removeEventListener("lattern:warp",jump);},[]);
 useFrame(({camera})=>{
  const navigation=(performance.now()-start.current)/4500;
  warpFlight.progress=navigation<1?navigation:journeyState.portal;
  warpFlight.from=navigation<1?from.current:journeyState.transition;
  warpFlight.to=navigation<1?journeyState.chapters.indexOf(Math.max(...journeyState.chapters)):journeyState.transition+1;
  if("fov" in camera && camera.fov!==42){camera.fov=42;camera.updateProjectionMatrix();}
 },.5);
 return null;
}
