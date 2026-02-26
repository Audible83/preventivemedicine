export interface UnitConversion {
  from: string;
  to: string;
  factor: number;
}

export const UNIT_CONVERSIONS: UnitConversion[] = [
  // Glucose
  { from: 'mg/dL', to: 'mmol/L', factor: 0.0555 },
  { from: 'mmol/L', to: 'mg/dL', factor: 18.018 },
  // Cholesterol
  { from: 'mg/dL-chol', to: 'mmol/L-chol', factor: 0.02586 },
  { from: 'mmol/L-chol', to: 'mg/dL-chol', factor: 38.67 },
  // Weight
  { from: 'lbs', to: 'kg', factor: 0.4536 },
  { from: 'kg', to: 'lbs', factor: 2.2046 },
  // Height
  { from: 'in', to: 'cm', factor: 2.54 },
  { from: 'cm', to: 'in', factor: 0.3937 },
  // Temperature
  { from: 'F', to: 'C', factor: -1 }, // special case, handled in function
  { from: 'C', to: 'F', factor: -1 }, // special case, handled in function
];

/** Standard units we normalize to */
export const STANDARD_UNITS: Record<string, string> = {
  glucose: 'mg/dL',
  cholesterol: 'mg/dL',
  weight: 'kg',
  height: 'cm',
  temperature: 'F',
  bloodPressure: 'mmHg',
  heartRate: 'bpm',
  steps: 'steps',
  sleep: 'hours',
  distance: 'km',
};

export function convertUnit(value: number, from: string, to: string): number {
  if (from === to) return value;

  // Temperature special cases
  if (from === 'F' && to === 'C') return (value - 32) * (5 / 9);
  if (from === 'C' && to === 'F') return value * (9 / 5) + 32;

  const conversion = UNIT_CONVERSIONS.find(
    (c) => c.from === from && c.to === to
  );
  if (!conversion) {
    throw new Error(`No conversion found from ${from} to ${to}`);
  }
  return value * conversion.factor;
}
