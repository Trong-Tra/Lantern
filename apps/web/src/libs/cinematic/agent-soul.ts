/** A faceless head and shoulder silhouette, tapering into an incorporeal body. */
export function soulPoint(index: number) {
  const angle = index * 2.399963;
  if(index < 400) {
    const y = 1 - 2 * (index + 0.5) / 400;
    const radius = Math.sqrt(1-y*y);
    return [Math.cos(angle)*radius*0.38,1.47+y*0.48,Math.sin(angle)*radius*0.31];
  }
  const p = (index-400)/1200;
  const y = 0.98-p*2.65;
  const width = p<0.16 ? 0.25+p*3.8 : 0.86*Math.pow(1-(p-0.16)/0.84,0.7);
  return [Math.cos(angle)*width,y,Math.sin(angle)*width*0.43];
}
