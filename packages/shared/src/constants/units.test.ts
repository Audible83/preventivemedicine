import { describe, it, expect } from 'vitest';
import { convertUnit } from './units';

describe('convertUnit', () => {
  it('converts mg/dL to mmol/L for glucose', () => {
    const result = convertUnit(100, 'mg/dL', 'mmol/L');
    expect(result).toBeCloseTo(5.55, 2);
  });

  it('roundtrips mmol/L to mg/dL and back', () => {
    const original = 6.2;
    const mgdl = convertUnit(original, 'mmol/L', 'mg/dL');
    const roundtrip = convertUnit(mgdl, 'mg/dL', 'mmol/L');
    expect(roundtrip).toBeCloseTo(original, 3);
  });

  it('converts lbs to kg', () => {
    const result = convertUnit(150, 'lbs', 'kg');
    expect(result).toBeCloseTo(68.04, 2);
  });

  it('roundtrips kg to lbs and back', () => {
    const original = 72.5;
    const lbs = convertUnit(original, 'kg', 'lbs');
    const roundtrip = convertUnit(lbs, 'lbs', 'kg');
    expect(roundtrip).toBeCloseTo(original, 3);
  });

  it('converts F to C', () => {
    const result = convertUnit(98.6, 'F', 'C');
    expect(result).toBeCloseTo(37, 3);
  });

  it('roundtrips C to F and back', () => {
    const original = 20;
    const f = convertUnit(original, 'C', 'F');
    const roundtrip = convertUnit(f, 'F', 'C');
    expect(roundtrip).toBeCloseTo(original, 3);
  });

  it('returns same value for same unit', () => {
    expect(convertUnit(42, 'mg/dL', 'mg/dL')).toBe(42);
  });

  it('throws for invalid conversion', () => {
    expect(() => convertUnit(1, 'mg/dL', 'kg')).toThrowError(
      'No conversion found from mg/dL to kg'
    );
  });
});