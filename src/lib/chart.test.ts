import { computeGeometry, labelIndexes, niceStep } from './chart';

const BOX = { width: 200, height: 100, padLeft: 0, padRight: 0, padTop: 0, padBottom: 0 };

describe('niceStep', () => {
  it('rounds to 1, 2, 2.5, 5 or 10 times a power of ten', () => {
    expect(niceStep(10, 4)).toBe(2.5);
    expect(niceStep(1, 4)).toBe(0.25);
    expect(niceStep(7, 4)).toBe(2);
    expect(niceStep(16, 4)).toBe(5);
    expect(niceStep(40, 4)).toBe(10);
    expect(niceStep(4, 4)).toBe(1);
    expect(niceStep(0, 4)).toBe(1);
  });
});

describe('computeGeometry', () => {
  it('spans the full width and keeps higher values higher on screen', () => {
    const g = computeGeometry(
      [
        { label: 'a', value: 1 },
        { label: 'b', value: 3 },
      ],
      BOX,
    );
    expect(g.points[0]?.x).toBe(0);
    expect(g.points[1]?.x).toBe(200);
    expect(g.points[1]!.y).toBeLessThan(g.points[0]!.y);
    expect(g.path.startsWith('M0.0,')).toBe(true);
    expect(g.min).toBeLessThanOrEqual(1);
    expect(g.max).toBeGreaterThanOrEqual(3);
  });

  it('centres a single point and still produces a visible range', () => {
    const g = computeGeometry([{ label: 'only', value: 5 }], BOX);
    expect(g.points[0]?.x).toBe(100);
    expect(g.max).toBeGreaterThan(g.min);
    expect(g.ticks.length).toBeGreaterThan(1);
  });

  it('handles a flat series of zeros', () => {
    const g = computeGeometry(
      [
        { label: 'a', value: 0 },
        { label: 'b', value: 0 },
      ],
      BOX,
    );
    expect(g.max).toBeGreaterThan(g.min);
  });
});

describe('labelIndexes', () => {
  it('shows every label when they fit', () => {
    expect(labelIndexes(3, 6)).toEqual([0, 1, 2]);
  });

  it('keeps the first and last and spreads the rest', () => {
    const shown = labelIndexes(20, 4);
    expect(shown[0]).toBe(0);
    expect(shown[shown.length - 1]).toBe(19);
    expect(shown).toHaveLength(4);
  });
});
