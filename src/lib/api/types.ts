/**
 * Wire types for the Labour Indicators API.
 *
 * These mirror the serialisers in labour-indicators-api (src/http/routes/indicators.ts).
 * They describe what crosses the network, so dates are ISO strings, not Date objects.
 */

export const UNITS = ['percentage', 'index', 'count', 'rate_per_thousand'] as const;
export type Unit = (typeof UNITS)[number];

export const FREQUENCIES = ['annual', 'quarterly', 'monthly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const STATUSES = ['draft', 'published', 'archived'] as const;
export type IndicatorStatus = (typeof STATUSES)[number];

export type VariationKind = 'percentage_points' | 'percent_change';
export type VariationGap = 'no_prior_year_observation' | 'prior_value_is_zero';

export interface Indicator {
  id: string;
  code: string;
  name: string;
  unit: Unit;
  frequency: Frequency;
  status: IndicatorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IndicatorList {
  items: Indicator[];
  total: number;
  limit: number;
  offset: number;
}

export interface Variation {
  kind: VariationKind;
  value: number;
}

export interface SeriesPoint {
  period: string;
  value: number;
  yearOverYear: Variation | null;
  variationGap: VariationGap | null;
}

export interface Series {
  indicator: Indicator;
  variationKind: VariationKind;
  points: SeriesPoint[];
}

export interface CreateIndicatorInput {
  code: string;
  name: string;
  unit: Unit;
  frequency: Frequency;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
