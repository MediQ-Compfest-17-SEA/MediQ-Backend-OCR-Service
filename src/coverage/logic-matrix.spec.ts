import { decide, generateMatrix, normalize, riskScore } from './logic-matrix';

describe('coverage.logic-matrix.normalize()', () => {
  it('applies defaults and preserves provided fields', () => {
    const n = normalize({ age: 50, gender: 'L', tempC: 39 });
    expect(n.age).toBe(50);
    expect(n.gender).toBe('L');
    expect(n.tempC).toBe(39);
    expect(n.spo2).toBe(98);
    expect(n.priority).toBe(0);
  });
});

describe('coverage.logic-matrix.riskScore()', () => {
  it('produces higher score for higher risk inputs', () => {
    const low = normalize({ age: 16, tempC: 36.8, spo2: 99, symptoms: [] });
    const high = normalize({ age: 70, tempC: 40, spo2: 85, symptoms: ['CP', 'DYSP', 'FEV', 'COUGH'], chronic: true, smoker: true, priority: 3 });
    expect(riskScore(low)).toBeLessThan(riskScore(high));
  });
});

describe('coverage.logic-matrix.decide()', () => {
  it('returns ALLOW for trivial healthy inputs', () => {
    const i = normalize({ age: 25, gender: 'U', tempC: 36.8, spo2: 99, priority: 0, symptoms: [] });
    expect(decide(i)).toBe('ALLOW');
  });

  it('returns DENY for critical conditions', () => {
    const i = normalize({ age: 70, gender: 'P', pregnant: true, tempC: 40.0, spo2: 85, priority: 3, symptoms: ['CP', 'DYSP'] });
    expect(decide(i)).toBe('DENY');
  });

  it('returns REVIEW for mixed cases', () => {
    const i = normalize({ age: 35, gender: 'L', tempC: 38.0, spo2: 94, priority: 2, symptoms: ['FEV'] });
    expect(decide(i)).toBe('REVIEW');
  });
});

describe('coverage.logic-matrix.generateMatrix()', () => {
  it('generates a grid and runs through decide()', () => {
    const grid = generateMatrix();
    expect(grid.length).toBeGreaterThan(0);
    const verdicts = grid.slice(0, 20).map(decide);
    expect(new Set(verdicts).size).toBeGreaterThan(1);
  });
});