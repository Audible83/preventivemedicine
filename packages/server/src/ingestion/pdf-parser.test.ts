import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pdf-parse before importing the module under test
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

import { parsePDF } from './pdf-parser';
import pdfParse from 'pdf-parse';

const mockedPdfParse = vi.mocked(pdfParse);

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function mockPdfText(text: string) {
  mockedPdfParse.mockResolvedValue({
    text,
    numpages: 1,
    numrender: 1,
    info: {},
    metadata: null,
    version: '1.0',
  } as any);
}

describe('parsePDF — regex pattern extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts glucose value with mg/dL unit', async () => {
    mockPdfText('Glucose: 105 mg/dL');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('glucose');
    expect(results[0].value).toBe(105);
    expect(results[0].unit).toBe('mg/dL');
    expect(results[0].source).toBe('pdf');
    expect(results[0].confidence).toBe(0.7);
  });

  it('extracts glucose value with mmol/L unit', async () => {
    mockPdfText('Glucose: 5.8 mmol/L');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('glucose');
    expect(results[0].value).toBeCloseTo(5.8);
    expect(results[0].unit).toBe('mmol/L');
  });

  it('extracts cholesterol value', async () => {
    mockPdfText('Cholesterol: 215 mg/dL');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('cholesterol-total');
    expect(results[0].value).toBe(215);
  });

  it('extracts HDL value', async () => {
    mockPdfText('HDL: 55 mg/dL');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('cholesterol-hdl');
    expect(results[0].value).toBe(55);
  });

  it('extracts LDL value', async () => {
    mockPdfText('LDL: 130 mg/dL');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('cholesterol-ldl');
    expect(results[0].value).toBe(130);
  });

  it('extracts triglycerides value', async () => {
    mockPdfText('Triglycerides: 160 mg/dL');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('triglycerides');
    expect(results[0].value).toBe(160);
  });

  it('extracts HbA1c percentage', async () => {
    mockPdfText('HbA1c: 5.7 %');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('hba1c');
    expect(results[0].value).toBeCloseTo(5.7);
  });

  it('extracts blood pressure as two observations (systolic + diastolic)', async () => {
    mockPdfText('Blood Pressure: 130/85');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(2);

    const systolic = results.find((r) => r.code === 'blood-pressure-systolic');
    const diastolic = results.find((r) => r.code === 'blood-pressure-diastolic');

    expect(systolic).toBeDefined();
    expect(systolic!.value).toBe(130);
    expect(systolic!.unit).toBe('mmHg');

    expect(diastolic).toBeDefined();
    expect(diastolic!.value).toBe(85);
    expect(diastolic!.unit).toBe('mmHg');
  });

  it('extracts BMI value', async () => {
    mockPdfText('BMI: 25.4');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('bmi');
    expect(results[0].value).toBeCloseTo(25.4);
  });

  it('extracts heart rate', async () => {
    mockPdfText('Heart Rate: 72');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('heart-rate');
    expect(results[0].value).toBe(72);
  });

  it('extracts weight in kg', async () => {
    mockPdfText('Weight: 82.5 kg');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('weight');
    expect(results[0].value).toBeCloseTo(82.5);
    expect(results[0].unit).toBe('kg');
  });

  it('extracts weight in lbs', async () => {
    mockPdfText('Weight: 180 lbs');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('weight');
    expect(results[0].value).toBe(180);
    expect(results[0].unit).toBe('lbs');
  });

  it('extracts multiple values from a full report', async () => {
    mockPdfText(
      'Lab Report\n' +
      'Glucose: 110 mg/dL\n' +
      'Cholesterol: 220 mg/dL\n' +
      'HDL: 45 mg/dL\n' +
      'LDL: 140 mg/dL\n' +
      'Triglycerides: 180 mg/dL\n' +
      'HbA1c: 6.1 %\n' +
      'Blood Pressure: 135/90\n' +
      'BMI: 27.3\n' +
      'Heart Rate: 80\n' +
      'Weight: 90 kg\n'
    );
    const results = await parsePDF(Buffer.from(''), USER_ID);

    // BP yields 2, rest yield 1 each = 11 total
    expect(results).toHaveLength(11);
    expect(results.every((r) => r.userId === USER_ID)).toBe(true);
    expect(results.every((r) => r.source === 'pdf')).toBe(true);
  });

  it('returns empty array when no patterns match', async () => {
    mockPdfText('This is a generic document with no lab values.');
    const results = await parsePDF(Buffer.from(''), USER_ID);
    expect(results).toHaveLength(0);
  });

  it('sets category correctly for vitals vs labs', async () => {
    mockPdfText('Glucose: 100 mg/dL\nBMI: 22');
    const results = await parsePDF(Buffer.from(''), USER_ID);

    const glucose = results.find((r) => r.code === 'glucose');
    const bmi = results.find((r) => r.code === 'bmi');

    expect(glucose!.category).toBe('lab');
    expect(bmi!.category).toBe('vital');
  });
});
