import {
  availableTransitions,
  normalisePeriod,
  validateCode,
  validateName,
  validatePeriod,
  validateValue,
} from './domain';

describe('validateCode', () => {
  it.each(['UNEMP_RATE', 'ABC', 'A1_B2'])('accepts %s', (code) => {
    expect(validateCode(code)).toBeNull();
  });

  it.each([
    ['', 'Code is required'],
    ['ab', 'Use 3-32'],
    ['1ABC', 'Use 3-32'],
    ['unemp', 'Use 3-32'],
    ['A'.repeat(33), 'Use 3-32'],
  ])('rejects %j', (code, message) => {
    expect(validateCode(code)).toContain(message);
  });
});

describe('validateName', () => {
  it('requires a non-blank name of at most 200 characters', () => {
    expect(validateName('Unemployment rate')).toBeNull();
    expect(validateName('   ')).toBe('Name is required');
    expect(validateName('x'.repeat(201))).toContain('200');
  });
});

describe('validatePeriod', () => {
  it('follows the frequency of the series', () => {
    expect(validatePeriod('annual', '2024')).toBeNull();
    expect(validatePeriod('quarterly', '2024-q3')).toBeNull();
    expect(validatePeriod('monthly', ' 2024-M12 ')).toBeNull();
  });

  it('rejects a period written for another frequency', () => {
    expect(validatePeriod('quarterly', '2024')).toContain('2024-Q1');
    expect(validatePeriod('monthly', '2024-Q1')).toContain('2024-M01');
    expect(validatePeriod('annual', '2024-M01')).toContain('YYYY');
  });

  it('rejects slots and years the API would refuse', () => {
    expect(validatePeriod('quarterly', '2024-Q5')).not.toBeNull();
    expect(validatePeriod('monthly', '2024-M13')).not.toBeNull();
    expect(validatePeriod('monthly', '2024-M3')).not.toBeNull();
    expect(validatePeriod('annual', '1899')).toContain('between 1900 and 2999');
    expect(validatePeriod('annual', '')).toBe('Period is required');
  });

  it('normalises case and whitespace the way the API does', () => {
    expect(normalisePeriod(' 2024-q1 ')).toBe('2024-Q1');
  });
});

describe('validateValue', () => {
  it('bounds percentages to 0-100', () => {
    expect(validateValue('percentage', '7.4')).toBeNull();
    expect(validateValue('percentage', '0')).toBeNull();
    expect(validateValue('percentage', '100.1')).toContain('Between 0 and 100');
    expect(validateValue('percentage', '-1')).not.toBeNull();
  });

  it('requires an index to be strictly positive', () => {
    expect(validateValue('index', '104.2')).toBeNull();
    expect(validateValue('index', '0')).toContain('Greater than 0');
  });

  it('requires whole numbers for counts', () => {
    expect(validateValue('count', '125000')).toBeNull();
    expect(validateValue('count', '12.5')).toContain('whole number');
  });

  it('bounds rates per thousand to 0-1000', () => {
    expect(validateValue('rate_per_thousand', '1000')).toBeNull();
    expect(validateValue('rate_per_thousand', '1001')).not.toBeNull();
  });

  it('rejects blanks and non-numbers', () => {
    expect(validateValue('index', '')).toBe('Value is required');
    expect(validateValue('index', 'abc')).toBe('Value must be a number');
  });
});

describe('availableTransitions', () => {
  it('lets a draft with enough observations publish or archive', () => {
    expect(availableTransitions('draft', 2)).toEqual([
      { status: 'published', enabled: true },
      { status: 'archived', enabled: true },
    ]);
  });

  it('explains why a thin draft cannot be published yet', () => {
    const [publish] = availableTransitions('draft', 1);
    expect(publish).toMatchObject({ status: 'published', enabled: false });
    expect(publish?.reason).toContain('at least 2 observations');
  });

  it('never offers returning a published series to draft', () => {
    expect(availableTransitions('published', 10).map((t) => t.status)).toEqual(['archived']);
  });

  it('offers nothing once archived', () => {
    expect(availableTransitions('archived', 10)).toEqual([]);
  });
});
