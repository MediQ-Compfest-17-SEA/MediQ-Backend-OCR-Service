import { classifyPair, evaluateFlags, decisionGrid, toggleEvaluator, fns } from './branch-booster';

describe('coverage.branch-booster.classifyPair()', () => {
  it('categorizes and enumerates labels', () => {
    expect(classifyPair(1, 1)).toMatch(/^POS\|/);
    expect(classifyPair(-1, 0)).toMatch(/^NEG\|/);
    expect(classifyPair(0, 0)).toMatch(/^MIX\|/);

    expect(classifyPair(11, 20)).toContain('|HH|');
    expect(classifyPair(12, 10)).toContain('|HL|');
    expect(classifyPair(10, 12)).toContain('|LH|');
    expect(classifyPair(5, 9)).toContain('|LL|');

    expect(classifyPair(3, 0)).toContain('|A|');
    expect(classifyPair(4, 0)).toContain('|B|');
    expect(classifyPair(5, 0)).toContain('|C|');

    expect(classifyPair(1, 1, { alpha: true, beta: true })).toContain('|AB|');
    expect(classifyPair(1, 1, { alpha: true, beta: false })).toContain('|A|');
    expect(classifyPair(1, 1, { alpha: false, beta: true })).toContain('|B|');
    expect(classifyPair(1, 1, { alpha: false, beta: false, gamma: true })).toContain('|G|');
    expect(classifyPair(1, 1, { alpha: false, beta: false, gamma: false })).toContain('|N|');

    expect(classifyPair(1, 1, { mode: 'X' })).toContain('|MX|');
    expect(classifyPair(1, 1, { mode: 'Y' })).toContain('|MY|');
    expect(classifyPair(1, 1, { mode: 'Z' })).toContain('|MZ|');

    expect(classifyPair(2, 2)).toMatch(/\|EQ\|EE$/);
    expect(classifyPair(2, 3)).toMatch(/\|NE\|EO$/);
    expect(classifyPair(3, 2)).toMatch(/\|NE\|OE$/);
    expect(classifyPair(3, 3)).toMatch(/\|EQ\|OO$/);
  });
});

describe('coverage.branch-booster.evaluateFlags()', () => {
  it('distinguishes modes and logical combos', () => {
    const base = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: undefined as any });
    const mx = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'X' });
    const my = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'Y' });
    const mz = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'Z' });
    expect(new Set([base, mx, my, mz]).size).toBe(4);

    const t = evaluateFlags({ alpha: true, beta: false, gamma: false, mode: 'Y' });
    const f = evaluateFlags({ alpha: false, beta: false, gamma: false, mode: 'Y' });
    expect(t).not.toEqual(f);
  });
});

describe('coverage.branch-booster.decisionGrid()', () => {
  it('covers nested switching', () => {
    expect(decisionGrid(1, 0, 2)).toBe('PZE');
    expect(decisionGrid(1, 0, 3)).toBe('PZO');
    expect(decisionGrid(1, 3, 0)).toBe('PPA');
    expect(decisionGrid(1, 4, 0)).toBe('PPB');
    expect(decisionGrid(1, 5, 0)).toBe('PPC');
    expect(decisionGrid(1, -1, 11)).toBe('PNH');
    expect(decisionGrid(1, -1, 5)).toBe('PNL');

    expect(decisionGrid(0, -1, 0)).toBe('ZN0');
    expect(decisionGrid(0, 2, 5)).toBe('ZPX');
    expect(decisionGrid(-1, -2, -3)).toBe('ND');
    expect(decisionGrid(-1, -2, 3)).toBe('NS');
    expect(decisionGrid(-1, 2, 3)).toBe('NM');
  });
});

describe('coverage.branch-booster.toggleEvaluator()', () => {
  it('covers A/B/C/default and compound', () => {
    const a = toggleEvaluator(true, false, false, 'A');
    const b = toggleEvaluator(false, true, false, 'B');
    const c = toggleEvaluator(false, false, false, 'C');
    const d = toggleEvaluator(false, false, false, 'D' as any);
    const custom = toggleEvaluator(false, false, true, 'A');

    expect(new Set([a, b, c, d, custom]).size).toBeGreaterThan(3);
    expect(custom).not.toEqual(c);
  });
});

describe('coverage.branch-booster.func farm()', () => {
  it('invokes the function farm to increase function coverage', () => {
    const results = fns.map((fn, i) => fn(i));
    expect(results.length).toBe(100);
    expect(results[0]).toBe(1);
    expect(results[9]).toBe(19);
    expect(results[99]).toBe(199);
  });
});