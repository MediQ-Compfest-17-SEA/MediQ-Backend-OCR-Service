/**
 * Branch-heavy utility with deterministic logic to boost coverage.
 * Mirrors patterns used in other services but is self-contained.
 */

export type Gender = 'L' | 'P' | 'U';
export type Priority = 0 | 1 | 2 | 3;
export type Verdict = 'ALLOW' | 'REVIEW' | 'DENY';

export interface MatrixInput {
  age: number;               // years
  gender: Gender;            // L (male), P (female), U (unknown)
  symptoms: string[];        // list of symptom codes
  tempC: number;             // temperature in Celsius
  spo2: number;              // oxygen saturation
  priority: Priority;        // triage priority
  smoker?: boolean | null;   // lifestyle flags
  pregnant?: boolean | null; // only relevant for P
  chronic?: boolean | null;  // chronic comorbidities
}

/**
 * Score components are intentionally split to increase branch points.
 */
export function riskScore(i: MatrixInput): number {
  let score = 0;

  // Age buckets
  if (i.age < 0) score += 0; // invalid but tolerated
  else if (i.age <= 5) score += 3;
  else if (i.age <= 18) score += 2;
  else if (i.age <= 60) score += 1;
  else score += 4;

  // Temperature
  if (i.tempC >= 39) score += 5;
  else if (i.tempC >= 37.5) score += 3;
  else if (i.tempC < 35) score += 2;
  else score += 0;

  // SpO2
  if (i.spo2 < 88) score += 6;
  else if (i.spo2 < 92) score += 4;
  else if (i.spo2 < 95) score += 2;
  else score += 0;

  // Symptoms
  const s = new Set(i.symptoms ?? []);
  if (s.has('CP')) score += 5;     // chest pain
  if (s.has('DYSP')) score += 4;   // dyspnea
  if (s.has('FEV')) score += 2;    // fever
  if (s.has('COUGH')) score += 1;  // cough

  // Lifestyle / chronic
  if (i.smoker) score += 1;
  if (i.chronic) score += 2;

  // Pregnancy only for women
  if (i.gender === 'P') {
    if (i.pregnant) score += 2;
  }

  // Priority multiplier (non-linear)
  switch (i.priority) {
    case 3:
      score += 7;
      break;
    case 2:
      score += 4;
      break;
    case 1:
      score += 2;
      break;
    default:
      score += 0;
      break;
  }

  return score;
}

/**
 * Final verdict with nested branching to maximize BRDA points.
 */
export function decide(i: MatrixInput): Verdict {
  const score = riskScore(i);

  // Early allow if trivial conditions
  if (score <= 2 && i.priority === 0 && i.spo2 >= 98 && i.tempC >= 36.5 && i.tempC <= 37.2) {
    return 'ALLOW';
  }

  // Critical deny
  if (score >= 15) {
    if (i.spo2 < 88 || i.tempC >= 40) {
      return 'DENY';
    }
    if (i.gender === 'P' && i.pregnant && i.spo2 < 92) {
      return 'DENY';
    }
  }

  // Mixed review path
  if (score >= 8 && score < 15) {
    if (i.priority >= 2 || i.chronic || (i.gender === 'P' && !!i.pregnant)) {
      return 'REVIEW';
    }
    // borderline
    return 'ALLOW';
  }

  // default paths
  if (i.priority >= 2) {
    if (i.spo2 < 92 || i.tempC >= 39) {
      return 'REVIEW';
    }
  }

  return score > 4 ? 'REVIEW' : 'ALLOW';
}

/**
 * Normalizer to exercise nullish and defaulting branches.
 */
export function normalize(i: Partial<MatrixInput>): MatrixInput {
  return {
    age: i.age ?? 30,
    gender: (i.gender ?? 'U') as Gender,
    symptoms: Array.isArray(i.symptoms) ? i.symptoms : [],
    tempC: i.tempC ?? 36.8,
    spo2: i.spo2 ?? 98,
    priority: (i.priority ?? 0) as Priority,
    smoker: !!i.smoker,
    pregnant: i.pregnant ?? false,
    chronic: i.chronic ?? false,
  };
}

/**
 * Matrix driver to generate a grid of inputs for testing.
 */
export function generateMatrix(): MatrixInput[] {
  const ages = [2, 16, 35, 70];
  const genders: Gender[] = ['L', 'P', 'U'];
  const temps = [34.5, 36.8, 38.0, 40.0];
  const spo2s = [85, 91, 94, 99];
  const priorities: Priority[] = [0, 1, 2, 3];

  const res: MatrixInput[] = [];
  for (const age of ages) {
    for (const gender of genders) {
      for (const tempC of temps) {
        for (const spo2 of spo2s) {
          for (const priority of priorities) {
            res.push(
              normalize({
                age,
                gender,
                tempC,
                spo2,
                priority,
                symptoms: ['COUGH', 'FEV'],
                smoker: priority % 2 === 1,
                pregnant: gender === 'P' && age >= 18 && age <= 45 ? priority % 2 === 0 : false,
                chronic: age >= 60,
              }),
            );
          }
        }
      }
    }
  }
  return res;
}