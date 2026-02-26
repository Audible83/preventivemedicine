import { describe, it, expect } from 'vitest';
import { normalizeObservations } from './normalizer';

describe('normalizeObservations', () => {
  it('filters out observations with NaN values', () => {
    const input = [
      { value: 100, unit: 'mg/dL', code: 'glucose', timestamp: '2026-01-20' },
      { value: NaN, unit: 'mg/dL', code: 'glucose', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(100);
  });

  it('filters out observations with null values', () => {
    const input = [
      { value: null, unit: 'mg/dL', code: 'glucose', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);
    expect(results).toHaveLength(0);
  });

  it('converts mmol/L to mg/dL for glucose', () => {
    const input = [
      { value: 5.55, unit: 'mmol/L', code: 'glucose', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);

    expect(results).toHaveLength(1);
    // 5.55 mmol/L * 18.018 = ~100 mg/dL
    expect(results[0].value).toBeCloseTo(100, 0);
    expect(results[0].unit).toBe('mg/dL');
  });

  it('keeps mg/dL glucose as-is (already standard unit)', () => {
    const input = [
      { value: 100, unit: 'mg/dL', code: 'glucose', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(100);
    expect(results[0].unit).toBe('mg/dL');
  });

  it('converts lbs to kg for weight', () => {
    const input = [
      { value: 150, unit: 'lbs', code: 'weight', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);

    expect(results).toHaveLength(1);
    expect(results[0].value).toBeCloseTo(68.04, 1);
    expect(results[0].unit).toBe('kg');
  });

  it('converts in to cm for height', () => {
    const input = [
      { value: 70, unit: 'in', code: 'height', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);

    expect(results).toHaveLength(1);
    expect(results[0].value).toBeCloseTo(177.8, 1);
    expect(results[0].unit).toBe('cm');
  });

  it('converts string timestamps to Date objects', () => {
    const input = [
      { value: 100, unit: 'mg/dL', code: 'glucose', timestamp: '2026-01-20T08:00:00.000Z' },
    ];
    const results = normalizeObservations(input);

    expect(results[0].timestamp).toBeInstanceOf(Date);
  });

  it('leaves Date timestamps unchanged', () => {
    const date = new Date('2026-01-20T08:00:00.000Z');
    const input = [
      { value: 100, unit: 'mg/dL', code: 'glucose', timestamp: date },
    ];
    const results = normalizeObservations(input);
    expect(results[0].timestamp).toBe(date);
  });

  it('keeps observations with unknown codes unchanged', () => {
    const input = [
      { value: 42, unit: 'unknown-unit', code: 'rare-test', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(42);
    expect(results[0].unit).toBe('unknown-unit');
  });

  it('preserves rawReference when conversion happens', () => {
    const input = [
      { value: 5.55, unit: 'mmol/L', code: 'glucose', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);
    expect(results[0].rawReference).toBe('5.55 mmol/L');
  });

  it('does not overwrite existing rawReference', () => {
    const input = [
      { value: 5.55, unit: 'mmol/L', code: 'glucose', timestamp: '2026-01-20', rawReference: 'existing-ref' },
    ];
    const results = normalizeObservations(input);
    expect(results[0].rawReference).toBe('existing-ref');
  });

  it('handles conversion failure gracefully (keeps original)', () => {
    // No conversion from 'mg/dL' to 'kg' exists for glucose
    // But code 'glucose' standard unit is 'mg/dL', so if it's already mg/dL, no conversion needed
    // Let's test with a code that has a standard unit but an unconvertible source unit
    const input = [
      { value: 100, unit: 'weird-unit', code: 'glucose', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);

    expect(results).toHaveLength(1);
    // Should keep original since conversion from 'weird-unit' to 'mg/dL' doesn't exist
    expect(results[0].value).toBe(100);
    expect(results[0].unit).toBe('weird-unit');
  });

  it('processes multiple observations in a batch', () => {
    const input = [
      { value: 100, unit: 'mg/dL', code: 'glucose', timestamp: '2026-01-20' },
      { value: 150, unit: 'lbs', code: 'weight', timestamp: '2026-01-20' },
      { value: NaN, unit: 'mg/dL', code: 'glucose', timestamp: '2026-01-20' },
      { value: 72, unit: 'bpm', code: 'heartRate', timestamp: '2026-01-20' },
    ];
    const results = normalizeObservations(input);

    // NaN is filtered out
    expect(results).toHaveLength(3);
  });
});
