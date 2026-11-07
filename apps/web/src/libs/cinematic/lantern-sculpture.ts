export const CONCEPT_LINE_COUNT = 128;
type Point = [number, number, number];
const noise = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

function buildField(chapter: number): number[][] {
  const lines: number[][] = [];
  const line = (a: Point, b: Point) => lines.push([...a, ...b]);
  if (chapter === 4) {
    // Identity emerges from a volumetric cloud of local relationships.
    const nodes: Point[] = Array.from({length:32},(_,i)=>{
      const cluster=i%3, angle=i*2.39996323, radius=.3+noise(i+1)*.75;
      return [Math.cos(angle)*radius+(cluster-1)*.7,Math.sin(angle)*radius+Math.cos(cluster*2.1)*.55,(noise(i+90)-.5)*1.6];
    });
    nodes.forEach((point,i)=>{
      const near=nodes.map((p,j)=>({j,d:Math.hypot(...p.map((v,k)=>v-point[k]))})).filter(p=>p.j!==i).sort((a,b)=>a.d-b.d);
      for(const neighbor of near.slice(0,4))line(point,nodes[neighbor.j]);
    });
  } else if (chapter === 5) {
    // History accumulates into continuous, softly folded strata of light.
    for(let layer=0;layer<16;layer++)for(let part=0;part<8;part++){
      const point=(t:number):Point=>{
        const x=(t-.5)*3.7;
        return [x,(layer-7.5)*.17+Math.sin(x*1.1+layer*.22)*.3,Math.cos(layer*.4)*.6+Math.sin(x*.7)*.2];
      };
      line(point(part/8),point((part+1)/8));
    }
  } else if (chapter === 6) {
    // Permission is a field of flow that narrows, then opens again.
    const point=(lane:number,t:number):Point=>{
      const spread=.18+Math.abs(t-.5)*2;
      return [(t-.5)*4,(lane%4-1.5)*.55*spread, (Math.floor(lane/4)-1.5)*.45*spread];
    };
    for(let lane=0;lane<16;lane++)for(let part=0;part<8;part++)line(point(lane,part/8),point(lane,(part+1)/8));
  } else if (chapter === 7) {
    // A branching decision field grows from one shared point.
    let parents:Point[]=[[0,-1.55,0]];
    for(let depth=0;depth<6;depth++){
      const next:Point[]=[];
      for(const parent of parents)for(const side of [-1,1]){
        const child:Point=[parent[0]+side*1.05/2**depth,parent[1]+.48,parent[2]+side*.24*Math.sin(depth+1)];
        line(parent,child);next.push(child);
      }
      parents=next;
    }
    line([0,-1.85,0],[0,-1.55,0]);line([0,-2.05,0],[0,-1.85,0]);
  } else if (chapter === 8) {
    // Independent parallel currents fill a three-dimensional working volume.
    for(let lane=0;lane<16;lane++)for(let mark=0;mark<8;mark++){
      const x=-2+mark*.52+(lane%2)*.12,y=(lane%4-1.5)*.55,z=(Math.floor(lane/4)-1.5)*.5;
      line([x,y,z],[x+.26,y+.04,z+.03]);
    }
  } else if (chapter === 9) {
    // Intent appears as interference: a field of short, resonant strokes.
    for(let row=0;row<8;row++)for(let col=0;col<16;col++){
      const x=(col-7.5)*.24,y=(row-3.5)*.32;
      const wave=Math.sin(x*3)+Math.cos(y*4),z=wave*.35,length=.06+Math.abs(wave)*.09;
      line([x,y-length/2,z],[x,y+length/2,z]);
    }
  } else if (chapter === 10) {
    // Trust is an interdependent weave, with no enclosing object boundary.
    for(let direction=0;direction<2;direction++)for(let strand=0;strand<8;strand++)for(let part=0;part<8;part++){
      const point=(t:number):Point=>{
        const across=(t-.5)*3.4,along=(strand-3.5)*.38;
        return direction?[along,across,-Math.sin(t*Math.PI*8)*.12]:[across,along,Math.sin(t*Math.PI*8)*.12];
      };
      line(point(part/8),point((part+1)/8));
    }
  }
  return lines;
}

const fields=Array.from({length:7},(_,i)=>buildField(i+4));
export function conceptLines(chapter:number):number[][] { return fields[chapter-4]??[]; }

export function sampleConceptLine(chapter:number,index:number,seconds=0):number[] {
  const base=conceptLines(chapter)[index];
  if(!base)return [0,0,0,0,0,0];
  return base.map((value,axis)=>{
    const endpoint=axis<3?0:3,x=base[endpoint],y=base[endpoint+1],z=base[endpoint+2],dimension=axis%3;
    if(chapter===4)return value*(.97+.035*Math.sin(seconds*.35));
    if(chapter===5&&dimension===1)return value+.025*Math.sin(seconds*.35+x*1.3);
    if(chapter===6&&dimension===1)return value+.07*Math.sin(x*2-seconds*.55);
    if(chapter===7&&dimension===0)return value+.035*Math.sin(seconds*.3+y)*Math.max(0,y+.5);
    if(chapter===8&&dimension===0)return value+.1*Math.sin(seconds*.65+y+z);
    if(chapter===9&&dimension===2)return .35*(Math.sin(x*3-seconds*.35)+Math.cos(y*4+seconds*.25));
    if(chapter===10&&dimension===2)return value+.045*Math.sin(x*2+y*2+seconds*.3);
    return value;
  });
}
