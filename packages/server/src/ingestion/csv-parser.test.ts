import { describe, it, expect } from 'vitest';
import { parseCSV } from './csv-parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'tests', 'fixtures');

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('parseCSV', () => {
  it('parses sample-lab-report.csv fixture', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'sample-lab-report.csv'));
    const results = await parseCSV(buffer, USER_ID);

    expect(results).toHaveLength(6);
    expect(results.every((r) => r.userId === USER_ID)).toBe(true);
    expect(results.every((r) => r.source === 'csv')).toBe(true);
    expect(results.every((r) => r.confidence === 0.9)).toBe(true);
  });

  it('extracts glucose row correctly from fixture', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'sample-lab-report.csv'));
    const results = await parseCSV(buffer, USER_ID);

    const glucose = results.find((r) => r.code === 'Glucose Fasting');
    expect(glucose).toBeDefined();
    expect(glucose!.value).toBe(105);
    expect(glucose!.unit).toBe('mg/dL');
    expect(glucose!.category).toBe('lab'); // default category
  });

  it('extracts HbA1c row correctly from fixture', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'sample-lab-report.csv'));
    const results = await parseCSV(buffer, USER_ID);

    const hba1c = results.find((r) => r.code === 'HbA1c');
    expect(hba1c).toBeDefined();
    expect(hba1c!.value).toBe(5.8);
    expect(hba1c!.unit).toBe('%');
  });

  it('converts timestamps to Date objects', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'sample-lab-report.csv'));
    const results = await parseCSV(buffer, USER_ID);

    for (const r of results) {
      expect(r.timestamp).toBeInstanceOf(Date);
    }
  });

  it('handles CSV with standard column names', async () => {
    const csv = Buffer.from(
      'category,code,displayName,value,unit,timestamp\n' +
      'lab,glucose,Glucose,100,mg/dL,2026-01-20\n'
    );
    const results = await parseCSV(csv, USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('lab');
    expect(results[0].code).toBe('glucose');
    expect(results[0].displayName).toBe('Glucose');
    expect(results[0].value).toBe(100);
    expect(results[0].unit).toBe('mg/dL');
  });

  it('falls back to "lab" category when not specified', async () => {
    const csv = Buffer.from(
      'test,result,unit\n' +
      'Hemoglobin,14.5,g/dL\n'
    );
    const results = await parseCSV(csv, USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('lab');
  });

  it('defaults value to 0 for non-numeric result', async () => {
    const csv = Buffer.from(
      'test,result,unit\n' +
      'TestName,not-a-number,mg/dL\n'
    );
    const results = await parseCSV(csv, USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].value).toBeNaN();
  });

  it('stores raw row as rawReference JSON', async () => {
    const csv = Buffer.from(
      'test,result,unit\n' +
      'Glucose,100,mg/dL\n'
    );
    const results = await parseCSV(csv, USER_ID);
    const parsed = JSON.parse(results[0].rawReference);

    expect(parsed.test).toBe('Glucose');
    expect(parsed.result).toBe('100');
  });

  it('handles empty CSV', async () => {
    const csv = Buffer.from('test,result,unit\n');
    const results = await parseCSV(csv, USER_ID);
    expect(results).toHaveLength(0);
  });

  it('skips empty lines in CSV', async () => {
    const csv = Buffer.from(
      'test,result,unit\n' +
      'Glucose,100,mg/dL\n' +
      '\n' +
      'HDL,50,mg/dL\n'
    );
    const results = await parseCSV(csv, USER_ID);
    expect(results).toHaveLength(2);
  });
});
