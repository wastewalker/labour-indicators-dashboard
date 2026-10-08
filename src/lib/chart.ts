/**
 * Geometry for the series chart, kept apart from the markup so the maths is
 * unit-tested directly instead of by reading SVG attributes back.
 */

export interface ChartBox {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export interface ChartPoint {
  x: number;
  y: number;
  label: string;
  value: number;
}

export interface ChartGeometry {
  points: ChartPoint[];
  ticks: { y: number; value: number }[];
  path: string;
  min: number;
  max: number;
}

/** Round numbers for axis ticks: 1, 2, 2.5 or 5 times a power of ten. */
export function niceStep(range: number, targetTicks: number): number {
  if (range <= 0) return 1;
  const raw = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const factor =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  return factor * magnitude;
}

export function computeGeometry(
  data: { label: string; value: number }[],
  box: ChartBox,
  targetTicks = 4,
): ChartGeometry {
  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // A flat series still needs a visible band, or every point sits on one edge.
  const spread = hi - lo || Math.abs(hi) || 1;
  const step = niceStep(spread, targetTicks);
  const min = Math.floor((lo - spread * 0.1) / step) * step;
  const max = Math.ceil((hi + spread * 0.1) / step) * step;

  const innerW = box.width - box.padLeft - box.padRight;
  const innerH = box.height - box.padTop - box.padBottom;
  const xFor = (i: number) =>
    box.padLeft + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yFor = (v: number) => box.padTop + innerH - ((v - min) / (max - min)) * innerH;

  const points = data.map((d, i) => ({
    x: xFor(i),
    y: yFor(d.value),
    label: d.label,
    value: d.value,
  }));
  const ticks: { y: number; value: number }[] = [];
  for (let v = min; v <= max + step / 2; v += step) {
    const value = Math.round(v * 1e6) / 1e6;
    ticks.push({ y: yFor(value), value });
  }
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return { points, ticks, path, min, max };
}

/** Which x labels to print so they never overlap: first, last, and evenly between. */
export function labelIndexes(count: number, maxLabels: number): number[] {
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const result = new Set<number>([0, count - 1]);
  const gaps = maxLabels - 1;
  for (let k = 1; k < gaps; k++) result.add(Math.round((k * (count - 1)) / gaps));
  return [...result].sort((a, b) => a - b);
}
