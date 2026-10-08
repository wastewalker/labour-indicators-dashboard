import type { Frequency, IndicatorStatus, Unit } from './api/types';

/**
 * Client-side copy of the API's rules, used for one purpose only: telling the
 * user what is wrong before a round trip. The API remains the authority — every
 * rule here is re-checked there, and its answer wins when the two disagree.
 */

interface UnitMeta {
  label: string;
  /** Short suffix used when rendering a value. */
  suffix: string;
  min: number;
  max: number;
  /** Whether `min` itself is allowed (an index must be strictly positive). */
  minInclusive: boolean;
  integerOnly: boolean;
  hint: string;
  step: string;
}

export const UNIT_META: Readonly<Record<Unit, UnitMeta>> = {
  percentage: {
    label: 'Percentage',
    suffix: '%',
    min: 0,
    max: 100,
    minInclusive: true,
    integerOnly: false,
    hint: 'Between 0 and 100, e.g. 7.4 for 7.4%',
    step: '0.01',
  },
  index: {
    label: 'Index',
    suffix: '',
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
    minInclusive: false,
    integerOnly: false,
    hint: 'Greater than 0, e.g. 104.2 with base 100',
    step: '0.01',
  },
  count: {
    label: 'Count',
    suffix: '',
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
    minInclusive: true,
    integerOnly: true,
    hint: 'A whole number, e.g. 125000',
    step: '1',
  },
  rate_per_thousand: {
    label: 'Rate per thousand',
    suffix: '‰',
    min: 0,
    max: 1000,
    minInclusive: true,
    integerOnly: false,
    hint: 'Between 0 and 1000, e.g. 42.5',
    step: '0.01',
  },
};

interface FrequencyMeta {
  label: string;
  pattern: RegExp;
  /** HTML `pattern` attribute equivalent, without anchors. */
  htmlPattern: string;
  example: string;
  format: string;
}

export const FREQUENCY_META: Readonly<Record<Frequency, FrequencyMeta>> = {
  annual: {
    label: 'Annual',
    pattern: /^(\d{4})$/,
    htmlPattern: '\\d{4}',
    example: '2024',
    format: 'YYYY',
  },
  quarterly: {
    label: 'Quarterly',
    pattern: /^(\d{4})-Q[1-4]$/,
    htmlPattern: '\\d{4}-[Qq][1-4]',
    example: '2024-Q1',
    format: 'YYYY-Qn',
  },
  monthly: {
    label: 'Monthly',
    pattern: /^(\d{4})-M(0[1-9]|1[0-2])$/,
    htmlPattern: '\\d{4}-[Mm](0[1-9]|1[0-2])',
    example: '2024-M01',
    format: 'YYYY-Mnn',
  },
};

export const STATUS_LABEL: Readonly<Record<IndicatorStatus, string>> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

const CODE_RE = /^[A-Z][A-Z0-9_]{2,31}$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2999;
export const MIN_OBSERVATIONS_FOR_PUBLICATION = 2;

/** Returns an error message, or null when the value is acceptable. */
export function validateCode(code: string): string | null {
  if (code.trim() === '') return 'Code is required';
  if (!CODE_RE.test(code)) {
    return 'Use 3-32 characters: uppercase letters, digits and underscores, starting with a letter';
  }
  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Name is required';
  if (trimmed.length > 200) return 'Name must be 200 characters or fewer';
  return null;
}

/** The API upper-cases periods before parsing, so the UI does the same. */
export function normalisePeriod(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validatePeriod(frequency: Frequency, raw: string): string | null {
  const meta = FREQUENCY_META[frequency];
  const value = normalisePeriod(raw);
  if (value === '') return 'Period is required';
  const match = meta.pattern.exec(value);
  if (!match) return `${meta.label} periods look like ${meta.example} (${meta.format})`;
  const year = Number(match[1]);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`;
  }
  return null;
}

export function validateValue(unit: Unit, raw: string): string | null {
  if (raw.trim() === '') return 'Value is required';
  const value = Number(raw);
  if (!Number.isFinite(value)) return 'Value must be a number';
  const meta = UNIT_META[unit];
  if (meta.integerOnly && !Number.isInteger(value)) return meta.hint;
  const belowMin = meta.minInclusive ? value < meta.min : value <= meta.min;
  if (belowMin || value > meta.max) return meta.hint;
  return null;
}

/**
 * Which status changes to offer. Mirrors the API's lifecycle: published never
 * goes back to draft, archived is final, and publishing needs two observations.
 */
export function availableTransitions(
  status: IndicatorStatus,
  observationCount: number,
): { status: IndicatorStatus; enabled: boolean; reason?: string }[] {
  switch (status) {
    case 'draft': {
      const enough = observationCount >= MIN_OBSERVATIONS_FOR_PUBLICATION;
      return [
        enough
          ? { status: 'published', enabled: true }
          : {
              status: 'published',
              enabled: false,
              reason: `Needs at least ${MIN_OBSERVATIONS_FOR_PUBLICATION} observations to publish`,
            },
        { status: 'archived', enabled: true },
      ];
    }
    case 'published':
      return [{ status: 'archived', enabled: true }];
    case 'archived':
      return [];
  }
}
