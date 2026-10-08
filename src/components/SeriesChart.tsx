import type { SeriesPoint, Unit } from '@/lib/api/types';
import { computeGeometry, labelIndexes } from '@/lib/chart';
import { formatValue } from '@/lib/format';
import styles from './SeriesChart.module.css';

const BOX = { width: 720, height: 260, padLeft: 56, padRight: 20, padTop: 16, padBottom: 32 };

/**
 * A dependency-free SVG line chart, rendered on the server. The table below it
 * carries the same numbers, so the chart is decorative for assistive tech and
 * only gets a one-line summary.
 */
export function SeriesChart({
  unit,
  points,
  name,
}: {
  unit: Unit;
  points: SeriesPoint[];
  name: string;
}) {
  if (points.length === 0) {
    return <div className={styles.empty}>No observations yet. Add the first one below.</div>;
  }
  const geometry = computeGeometry(
    points.map((p) => ({ label: p.period, value: p.value })),
    BOX,
  );
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const summary = `${name}: ${points.length} observations from ${first.period} (${formatValue(unit, first.value)}) to ${last.period} (${formatValue(unit, last.value)})`;
  const shown = new Set(labelIndexes(points.length, 6));

  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        className={styles.svg}
        role="img"
        aria-label={summary}
      >
        {geometry.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={BOX.padLeft}
              x2={BOX.width - BOX.padRight}
              y1={tick.y}
              y2={tick.y}
              className={styles.grid}
            />
            <text
              x={BOX.padLeft - 10}
              y={tick.y}
              className={styles.tick}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatValue(unit, tick.value)}
            </text>
          </g>
        ))}
        <path d={geometry.path} className={styles.line} />
        {geometry.points.map((p, i) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r={4} className={styles.dot}>
              <title>{`${p.label}: ${formatValue(unit, p.value)}`}</title>
            </circle>
            {shown.has(i) ? (
              <text x={p.x} y={BOX.height - 10} className={styles.tick} textAnchor="middle">
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </figure>
  );
}
