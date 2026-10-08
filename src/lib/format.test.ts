import {
  describeGap,
  describeVariationKind,
  formatDate,
  formatValue,
  formatVariation,
  trendOf,
} from './format';

describe('formatVariation', () => {
  it('writes changes in a percentage series as percentage points', () => {
    expect(formatVariation({ kind: 'percentage_points', value: 1.5 })).toBe('+1.5 pp');
  });

  it('writes other changes as relative percent', () => {
    expect(formatVariation({ kind: 'percent_change', value: 25 })).toBe('+25%');
    expect(formatVariation({ kind: 'percent_change', value: -3.8136 })).toBe('-3.81%');
  });

  it('does not sign a zero change', () => {
    expect(formatVariation({ kind: 'percentage_points', value: 0 })).toBe('0 pp');
  });
});

describe('formatValue', () => {
  it('adds the unit suffix where there is one', () => {
    expect(formatValue('percentage', 7.4)).toBe('7.4%');
    expect(formatValue('rate_per_thousand', 42.5)).toBe('42.5‰');
    expect(formatValue('count', 1225000)).toBe('1,225,000');
    expect(formatValue('index', 104.256)).toBe('104.26');
  });
});

describe('descriptions', () => {
  it('names the variation kind', () => {
    expect(describeVariationKind('percentage_points')).toContain('percentage points');
    expect(describeVariationKind('percent_change')).toContain('relative change');
  });

  it('explains each gap reason', () => {
    expect(describeGap('no_prior_year_observation')).toContain('a year earlier');
    expect(describeGap('prior_value_is_zero')).toContain('zero');
  });
});

describe('trendOf', () => {
  it('reads the sign of the change', () => {
    expect(trendOf({ kind: 'percent_change', value: 2 })).toBe('up');
    expect(trendOf({ kind: 'percent_change', value: -2 })).toBe('down');
    expect(trendOf({ kind: 'percent_change', value: 0 })).toBe('flat');
  });
});

describe('formatDate', () => {
  it('formats in UTC so server and browser agree', () => {
    expect(formatDate('2026-09-15T23:30:00.000Z')).toMatch(/15 Sept? 2026/);
  });
});
