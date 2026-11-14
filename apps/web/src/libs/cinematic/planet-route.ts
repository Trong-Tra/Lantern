/** Free drift at a fixed speed, reflecting only at the outer screen edges. */
export function planetDrift(time: number, index: number, aspect: number) {
  const width = Math.max(0.1, aspect) * 0.9;
  const height = 0.78;
  const angle = 0.48 + index * 2.399963;
  const speed = 0.035;
  const reflect = (value: number, extent: number) => {
    const span = extent * 2;
    const phase = ((value + extent) % (span * 2) + span * 2) % (span * 2);
    return extent - Math.abs(phase - span);
  };
  return {
    x: reflect(Math.sin(index * 1.73) * width + Math.cos(angle) * speed * time, width),
    y: reflect(Math.cos(index * 2.17) * height + Math.sin(angle) * speed * time, height),
  };
}
