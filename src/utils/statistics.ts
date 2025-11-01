/**
 * Statistical Analysis Utilities
 * Provides statistical functions for analyzing AI model performance data
 */

/**
 * Chi-Square Test for Independence
 * Tests whether there's a significant relationship between categorical variables
 *
 * @param observed - Array of observed frequencies
 * @param expected - Array of expected frequencies
 * @returns Chi-square statistic, p-value, and significance
 */
export function calculateChiSquare(observed: number[], expected: number[]): {
  chiSquare: number;
  pValue: number;
  significant: boolean;
  degreesOfFreedom: number;
} {
  if (observed.length !== expected.length) {
    throw new Error('Observed and expected arrays must have the same length');
  }

  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] === 0) continue; // Skip to avoid division by zero
    chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
  }

  const degreesOfFreedom = observed.length - 1;
  const pValue = chiSquareToP(chiSquare, degreesOfFreedom);

  return {
    chiSquare,
    pValue,
    significant: pValue < 0.05,
    degreesOfFreedom
  };
}

/**
 * Convert Chi-Square statistic to p-value
 * Uses approximation for chi-square distribution
 */
function chiSquareToP(chiSquare: number, df: number): number {
  // Simple approximation using Wilson-Hilferty transformation
  if (df <= 0) return 1;

  const k = df;
  const x = chiSquare;

  // For small df, use lookup table approximation
  if (df === 1) {
    if (x >= 3.841) return 0.05;
    if (x >= 6.635) return 0.01;
    if (x >= 10.828) return 0.001;
  } else if (df === 2) {
    if (x >= 5.991) return 0.05;
    if (x >= 9.210) return 0.01;
    if (x >= 13.816) return 0.001;
  } else if (df === 3) {
    if (x >= 7.815) return 0.05;
    if (x >= 11.345) return 0.01;
    if (x >= 16.266) return 0.001;
  }

  // For larger df, use normal approximation
  const mean = k;
  const variance = 2 * k;
  const z = (x - mean) / Math.sqrt(variance);

  // Convert z-score to p-value (two-tailed)
  return 1 - normalCDF(z);
}

/**
 * Normal cumulative distribution function
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Calculate Confidence Interval for a dataset
 *
 * @param data - Array of numerical values
 * @param confidence - Confidence level (0.95 for 95%, 0.99 for 99%)
 * @returns Mean and confidence interval bounds
 */
export function calculateConfidenceInterval(
  data: number[],
  confidence: number = 0.95
): {
  mean: number;
  lower: number;
  upper: number;
  standardError: number;
  sampleSize: number;
} {
  if (data.length === 0) {
    throw new Error('Cannot calculate confidence interval for empty dataset');
  }

  const n = data.length;
  const mean = data.reduce((sum, val) => sum + val, 0) / n;

  // Calculate standard deviation
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
  const std = Math.sqrt(variance);

  // Calculate standard error
  const standardError = std / Math.sqrt(n);

  // Get z-score for confidence level
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.96;

  // Calculate margin of error
  const margin = z * standardError;

  return {
    mean,
    lower: mean - margin,
    upper: mean + margin,
    standardError,
    sampleSize: n
  };
}

/**
 * Cohen's Kappa - Measures inter-rater reliability
 * Useful for validating that different users' ratings are consistent
 *
 * @param rater1 - Array of ratings from first rater
 * @param rater2 - Array of ratings from second rater
 * @returns Kappa coefficient and interpretation
 */
export function calculateCohensKappa(
  rater1: number[],
  rater2: number[]
): {
  kappa: number;
  interpretation: string;
  agreement: number;
  chanceAgreement: number;
} {
  if (rater1.length !== rater2.length) {
    throw new Error('Rater arrays must have the same length');
  }

  const n = rater1.length;
  if (n === 0) {
    throw new Error('Cannot calculate kappa for empty arrays');
  }

  // Calculate observed agreement
  let agreements = 0;
  for (let i = 0; i < n; i++) {
    if (rater1[i] === rater2[i]) {
      agreements++;
    }
  }
  const observedAgreement = agreements / n;

  // Calculate expected agreement by chance
  const categories = [...new Set([...rater1, ...rater2])];
  let expectedAgreement = 0;

  for (const category of categories) {
    const p1 = rater1.filter(r => r === category).length / n;
    const p2 = rater2.filter(r => r === category).length / n;
    expectedAgreement += p1 * p2;
  }

  // Calculate Cohen's Kappa
  const kappa = (observedAgreement - expectedAgreement) / (1 - expectedAgreement);

  // Interpret kappa value
  let interpretation: string;
  if (kappa < 0) interpretation = 'Poor agreement (worse than chance)';
  else if (kappa < 0.20) interpretation = 'Slight agreement';
  else if (kappa < 0.40) interpretation = 'Fair agreement';
  else if (kappa < 0.60) interpretation = 'Moderate agreement';
  else if (kappa < 0.80) interpretation = 'Substantial agreement';
  else interpretation = 'Almost perfect agreement';

  return {
    kappa,
    interpretation,
    agreement: observedAgreement,
    chanceAgreement: expectedAgreement
  };
}

/**
 * Calculate effect size (Cohen's d) for comparing two groups
 * Useful for determining practical significance of differences
 */
export function calculateCohenD(group1: number[], group2: number[]): {
  cohenD: number;
  interpretation: string;
} {
  const mean1 = group1.reduce((sum, val) => sum + val, 0) / group1.length;
  const mean2 = group2.reduce((sum, val) => sum + val, 0) / group2.length;

  const var1 = group1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (group1.length - 1);
  const var2 = group2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (group2.length - 1);

  // Pooled standard deviation
  const pooledSD = Math.sqrt((var1 + var2) / 2);

  const cohenD = (mean1 - mean2) / pooledSD;

  let interpretation: string;
  const absD = Math.abs(cohenD);
  if (absD < 0.2) interpretation = 'Negligible effect';
  else if (absD < 0.5) interpretation = 'Small effect';
  else if (absD < 0.8) interpretation = 'Medium effect';
  else interpretation = 'Large effect';

  return { cohenD, interpretation };
}

/**
 * Calculate Pearson correlation coefficient
 * Measures linear relationship between two variables
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): {
  correlation: number;
  strength: string;
} {
  if (x.length !== y.length) {
    throw new Error('Arrays must have the same length');
  }

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const correlation = numerator / Math.sqrt(denomX * denomY);

  let strength: string;
  const abs = Math.abs(correlation);
  if (abs < 0.3) strength = 'Weak';
  else if (abs < 0.7) strength = 'Moderate';
  else strength = 'Strong';

  return { correlation, strength };
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(data: number[]): number {
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

/**
 * Calculate percentile rank
 */
export function calculatePercentile(data: number[], value: number): number {
  const sorted = [...data].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}
