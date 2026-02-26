import { describe, it, expect } from 'vitest';
import { detectTrend } from './trend';

describe('detectTrend', () => {
  it('marks increasing values as improving', () => {
    const values = [1, 2, 3, 4, 5].map((value, i) => ({
      value,
      timestamp: new Date(2024, 0, i + 1),
    }));
    const result = detectTrend(values);
    expect(result).not.toBeNull();
    expect(result?.trend).toBe('improving');
    expect(result?.slope).toBeGreaterThan(0);
  });

  it('marks decreasing values as declining', () => {
    const values = [5, 4, 3, 2, 1].map((value, i) => ({
      value,
      timestamp: new Date(2024, 0, i + 1),
    }));
    const result = detectTrend(values);
    expect(result).not.toBeNull();
    expect(result?.trend).toBe('declining');
    expect(result?.slope).toBeLessThan(0);
  });

  it('marks stable values as stable', () => {
    const values = [10, 10, 10, 10].map((value, i) => ({
      value,
      timestamp: new Date(2024, 0, i + 1),
    }));
    const result = detectTrend(values);
    expect(result).not.toBeNull();
    expect(result?.trend).toBe('stable');
  });

  it('returns null for a single value', () => {
    const values = [{ value: 10, timestamp: new Date(2024, 0, 1) }];
    expect(detectTrend(values)).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(detectTrend([])).toBeNull();
  });

  it('flags anomalies when latest value is far from the mean', () => {
    const values = [10, 10, 10, 10, 10, 100].map((value, i) => ({
      value,
      timestamp: new Date(2024, 0, i + 1),
    }));
    const result = detectTrend(values);
    expect(result).not.toBeNull();
    expect(result?.anomaly).toBe(true);
  });
});