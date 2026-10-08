import type { SeriesPoint } from '@/lib/api/types';
import { describeGap, formatVariation, trendOf } from '@/lib/format';
import styles from './VariationCell.module.css';

const ARROW = { up: '▲', down: '▼', flat: '■' } as const;
const SPOKEN = { up: 'up', down: 'down', flat: 'unchanged' } as const;

/**
 * Colour is deliberately neutral about direction: whether a rise is good news
 * depends on the indicator (employment up is good, unemployment up is not), so
 * the cell shows direction with an arrow and leaves the judgement to the reader.
 */
export function VariationCell({
  point,
}: {
  point: Pick<SeriesPoint, 'yearOverYear' | 'variationGap'>;
}) {
  if (point.yearOverYear === null) {
    const reason = point.variationGap ? describeGap(point.variationGap) : 'Not available';
    return (
      <span className={styles.gap} title={reason}>
        <span aria-hidden="true">—</span>
        <span className={styles.srOnly}>{reason}</span>
      </span>
    );
  }
  const trend = trendOf(point.yearOverYear);
  return (
    <span className={`${styles.variation} ${styles[trend]}`} data-trend={trend}>
      <span aria-hidden="true" className={styles.arrow}>
        {ARROW[trend]}
      </span>
      <span className={styles.srOnly}>{SPOKEN[trend]} </span>
      {formatVariation(point.yearOverYear)}
    </span>
  );
}
