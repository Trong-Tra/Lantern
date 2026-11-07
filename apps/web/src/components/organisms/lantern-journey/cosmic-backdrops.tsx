"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";
import { journeyState } from "@/libs/cinematic/chapter-transition";

// Each chapter visits another region of the same universe, with steady illumination.
const regions = [
  "#96805c",
  "#a17b61",
  "#527f80",
  "#94815f",
  "#83739b",
  "#a17b61",
  "#527f80",
  "#998461",
  "#83739b",
  "#527f80",
  "#94815f",
  "#83739b",
];
export function CosmicBackdrops() {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      chapters: { value: new Float32Array(12) },
      hues: { value: regions.map((hex) => new Color(hex)) },
      time: { value: 0 },
      aspect: { value: 1 },
      travel: { value: 0 },
      departure: { value: 0 },
    }),
    []
  );
  useFrame(({ clock, size }) => {
    if (!material.current) return;
    const live = material.current.uniforms;
    live.chapters.value.set(journeyState.chapters);
    live.time.value = journeyState.reducedMotion ? 0 : clock.elapsedTime;
    live.aspect.value = size.width / size.height;
    live.travel.value = journeyState.reducedMotion ? 0 : journeyState.portal;
    live.departure.value = journeyState.transition;
  });
  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}`}
        fragmentShader={`
        varying vec2 vUv;uniform float chapters[12];uniform vec3 hues[12];uniform float time;uniform float aspect;uniform float travel;uniform float departure;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float cloud(vec2 p){float n=0.,a=.5;mat2 turn=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){n+=noise(p)*a;p=turn*p*2.07+vec2(3.7,9.2);a*=.5;}return n;}
        float band(float x,float width){return exp(-x*x/width);}
        void main(){
          vec2 p=(vUv-.5)*vec2(aspect,1.);vec2 drift=vec2(time*.002,time*.0007);
          float n=cloud(p*3.+drift),fine=cloud(p*7.+n*.6);
          vec3 colour=vec3(.027,.031,.040);
          for(int i=0;i<12;i++){
            float weight=chapters[i];
            bool flying=travel>0.001 && travel<.999;
            bool outgoing=abs(float(i)-departure)<.1;
            bool incoming=abs(float(i)-departure-1.)<.1;
            if(flying){if(!outgoing&&!incoming)continue;weight=1.;}
            else {if(weight<.5)continue;weight=1.;}
            float worldDistance=0.;
            if(flying)worldDistance=outgoing?300.*smoothstep(0.,.52,travel):300.*(1.-smoothstep(.48,1.,travel));
            // Distant nebula bands must lose energy rather than collapse into bright stripes.
            float distanceLight=1./(1.+worldDistance*worldDistance*.04);
            vec2 screen=p;
            vec2 universe=screen*(1.+worldDistance);

            float shape=0.;vec2 p=universe;vec2 q=p;float theta=float(i)*.47;
            q=mat2(cos(theta),sin(theta),-sin(theta),cos(theta))*q;
            if(i==0)shape=band(p.y+p.x*.25+.26,.018)*(.3+n);
            else if(i==1)shape=exp(-length((p-vec2(.34,.12))*vec2(1.6,2.3))*3.)*(.4+n*1.5);
            else if(i==2)shape=band(length(p*vec2(.8,1.6))-.54,.006)*(n+.25);
            else if(i==3)shape=band(p.x+.28+sin(p.y*5.)*.12,.024)*smoothstep(-.5,.45,p.y)*(n+.3);
            else if(i==4)shape=band(length((p+vec2(.27,-.08))*vec2(1.,1.2))-.3,.013)*(n+.25);
            else if(i==5)shape=band(p.y-p.x*.5-.08+sin(p.x*5.)*.08,.025)*(n+.25);
            else if(i==6)shape=(band(p.x-.42,.012)+band(p.x-.66,.022))*(.3+n);
            else if(i==7)shape=band(p.y+.16-sin(p.x*2.8)*.3,.009)*(n+.4);
            else if(i==8)shape=(band(p.y-.29,.006)+band(p.y+.25,.009))*(n+.3);
            else if(i==9)shape=exp(-length((p-vec2(.4,.1))*vec2(1.4,2.))*3.)*(n+.4)+band(length(p-vec2(.4,.1))-.4,.003)*.25;
            else if(i==10)shape=(exp(-length(p-vec2(.42,.2))*6.)+exp(-length(p-vec2(.13,-.25))*6.))*(.3+n);
            else shape=band(length(p*vec2(.8,1.2))-.5,.018)*(n+.4)+exp(-length(p)*4.)*n;
            float copySide=(i==3||i==4||i==5)?smoothstep(.3,.8,vUv.x):1.-smoothstep(.2,.65,vUv.x);
            float quiet=mix(1.,.36,copySide);
            colour+=hues[i]*shape*(.22+fine*.3)*quiet*weight*distanceLight;
            colour+=hues[i]*pow(max(0.,cloud(universe*3.+drift)-.35),2.)*.13*distanceLight/(1.+worldDistance);

          }
          gl_FragColor=vec4(colour,1.);
        }`}
      />
    </mesh>
  );
}
