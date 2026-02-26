import { describe, it, expect } from 'vitest';
import {
  detectTrend,
  generateTrendSummary,
  isValidWindow,
  windowToDays,
  type TrendResult,
} from './trend';

// ── detectTrend ─────────────────────────────────────────────────────

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

// ── generateTrendSummary ────────────────────────────────────────────

describe('generateTrendSummary', () => {
  const baseTrend: TrendResult = {
    trend: 'stable',
    slope: 0,
    movingAverage: 100,
    anomaly: false,
  };

  // --- Trend directions ---

  it('produces improving summary', () => {
    const result = generateTrendSummary('blood_pressure', {
      ...baseTrend,
      trend: 'improving',
    });
    expect(result).toContain('blood pressure');
    expect(result).toContain('improving');
    expect(result).toContain('the observed period');
  });

  it('produces declining summary', () => {
    const result = generateTrendSummary('cholesterol', {
      ...baseTrend,
      trend: 'declining',
    });
    expect(result).toContain('cholesterol');
    expect(result).toContain('declining');
  });

  it('produces stable summary', () => {
    const result = generateTrendSummary('cholesterol', baseTrend);
    expect(result).toContain('stable');
    expect(result).toContain('Cholesterol');
  });

  // --- With window parameter ---

  it('includes 7d window label', () => {
    const result = generateTrendSummary(
      'step_count',
      { ...baseTrend, trend: 'improving' },
      '7d',
    );
    expect(result).toContain('the past 7 days');
  });

  it('includes 30d window label', () => {
    const result = generateTrendSummary(
      'blood_pressure',
      { ...baseTrend, trend: 'declining' },
      '30d',
    );
    expect(result).toContain('the past 30 days');
  });

  it('includes 90d window label', () => {
    const result = generateTrendSummary(
      'heart_rate',
      { ...baseTrend, trend: 'stable' },
      '90d',
    );
    expect(result).toContain('the past 90 days');
  });

  it('includes 6mo window label', () => {
    const result = generateTrendSummary(
      'glucose',
      { ...baseTrend, trend: 'improving' },
      '6mo',
    );
    expect(result).toContain('the past 6 months');
  });

  it('uses generic period label when no window provided', () => {
    const result = generateTrendSummary('sleep', {
      ...baseTrend,
      trend: 'improving',
    });
    expect(result).toContain('the observed period');
  });

  // --- Anomaly flag ---

  it('appends anomaly note when anomaly is true', () => {
    const result = generateTrendSummary('glucose', {
      ...baseTrend,
      trend: 'improving',
      anomaly: true,
    });
    expect(result).toContain('the latest reading appears unusual');
  });

  it('does not append anomaly note when anomaly is false', () => {
    const result = generateTrendSummary('glucose', {
      ...baseTrend,
      trend: 'declining',
      anomaly: false,
    });
    expect(result).not.toContain('unusual');
  });

  // --- Category formatting ---

  it('formats underscored category names', () => {
    const result = generateTrendSummary('blood_pressure', {
      ...baseTrend,
      trend: 'improving',
    });
    expect(result).toContain('blood pressure');
    expect(result).not.toContain('blood_pressure');
  });

  it('formats hyphenated category names', () => {
    const result = generateTrendSummary('heart-rate', {
      ...baseTrend,
      trend: 'declining',
    });
    expect(result).toContain('heart rate');
    expect(result).not.toContain('heart-rate');
  });

  it('handles single-word category', () => {
    const result = generateTrendSummary('sleep', {
      ...baseTrend,
      trend: 'stable',
    });
    expect(result).toContain('Sleep');
  });

  // --- Combined: declining + anomaly + window ---

  it('handles combined declining + anomaly + 30d window', () => {
    const result = generateTrendSummary(
      'cholesterol',
      { ...baseTrend, trend: 'declining', anomaly: true },
      '30d',
    );
    expect(result).toContain('declining');
    expect(result).toContain('the past 30 days');
    expect(result).toContain('the latest reading appears unusual');
  });
});

// ── isValidWindow ───────────────────────────────────────────────────

describe('isValidWindow', () => {
  it('accepts 7d', () => expect(isValidWindow('7d')).toBe(true));
  it('accepts 30d', () => expect(isValidWindow('30d')).toBe(true));
  it('accepts 90d', () => expect(isValidWindow('90d')).toBe(true));
  it('accepts 6mo', () => expect(isValidWindow('6mo')).toBe(true));
  it('rejects empty string', () => expect(isValidWindow('')).toBe(false));
  it('rejects arbitrary string', () => expect(isValidWindow('1y')).toBe(false));
  it('rejects numeric string', () => expect(isValidWindow('30')).toBe(false));
});

// ── windowToDays ────────────────────────────────────────────────────

describe('windowToDays', () => {
  it('returns 7 for 7d', () => expect(windowToDays('7d')).toBe(7));
  it('returns 30 for 30d', () => expect(windowToDays('30d')).toBe(30));
  it('returns 90 for 90d', () => expect(windowToDays('90d')).toBe(90));
  it('returns 183 for 6mo', () => expect(windowToDays('6mo')).toBe(183));
});
