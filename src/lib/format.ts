import type { Unit, Variation, VariationGap, VariationKind } from './api/types';
import { UNIT_META } from './domain';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const signedFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

export function formatValue(unit: Unit, value: number): string {
  const suffix = UNIT_META[unit].suffix;
  return `${numberFormat.format(value)}${suffix}`;
}

/**
 * Render a year-over-year variation in the unit the API says it is in.
 *
 * The distinction matters: an unemployment rate going from 6.0% to 7.5% is
 * "+1.5 pp", and printing it as "+1.5%" would claim a 1.5% relative rise —
 * a different, and wrong, statement.
 */
export function formatVariation(variation: Variation): string {
  const number = signedFormat.format(variation.value);
  return variation.kind === 'percentage_points' ? `${number} pp` : `${number}%`;
}

export function describeVariationKind(kind: VariationKind): string {
  return kind === 'percentage_points'
    ? 'Year-over-year change in percentage points (pp)'
    : 'Year-over-year relative change (%)';
}

export function describeGap(gap: VariationGap): string {
  return gap === 'no_prior_year_observation'
    ? 'No observation for the same period a year earlier'
    : 'Prior-year value is zero, so relative change is undefined';
}

export type Trend = 'up' | 'down' | 'flat';

export function trendOf(variation: Variation): Trend {
  if (variation.value > 0) return 'up';
  if (variation.value < 0) return 'down';
  return 'flat';
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
