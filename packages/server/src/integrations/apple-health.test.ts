import { describe, it, expect } from 'vitest';
import { appleHealthAdapter } from './apple-health';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <Record type="HKQuantityTypeIdentifierHeartRate" value="72" unit="count/min" startDate="2026-01-15 08:30:00 -0500" endDate="2026-01-15 08:30:00 -0500" />
  <Record type="HKQuantityTypeIdentifierStepCount" value="8500" unit="count" startDate="2026-01-15 00:00:00 -0500" endDate="2026-01-15 23:59:00 -0500" />
  <Record type="HKQuantityTypeIdentifierBloodPressureSystolic" value="125" unit="mmHg" startDate="2026-01-15 09:00:00 -0500" endDate="2026-01-15 09:00:00 -0500" />
  <Record type="HKQuantityTypeIdentifierBloodPressureDiastolic" value="80" unit="mmHg" startDate="2026-01-15 09:00:00 -0500" endDate="2026-01-15 09:00:00 -0500" />
  <Record type="HKQuantityTypeIdentifierBodyMass" value="82.5" unit="kg" startDate="2026-01-15 07:00:00 -0500" endDate="2026-01-15 07:00:00 -0500" />
  <Record type="HKQuantityTypeIdentifierBloodGlucose" value="95" unit="mg/dL" startDate="2026-01-16 06:00:00 -0500" endDate="2026-01-16 06:00:00 -0500" />
  <Record type="HKQuantityTypeIdentifierOxygenSaturation" value="98" unit="%" startDate="2026-01-16 10:00:00 -0500" endDate="2026-01-16 10:00:00 -0500" />
  <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" value="450" unit="kcal" startDate="2026-01-15 00:00:00 -0500" endDate="2026-01-15 23:59:00 -0500" />
</HealthData>`;

const EMPTY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
</HealthData>`;

const UNKNOWN_TYPE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <Record type="HKQuantityTypeIdentifierUnknownMetric" value="42" unit="units" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" />
</HealthData>`;

describe('appleHealthAdapter config', () => {
  it('has correct adapter ID', () => {
    expect(appleHealthAdapter.config.id).toBe('apple_health');
  });

  it('is a file_import type', () => {
    expect(appleHealthAdapter.config.type).toBe('file_import');
  });

  it('supports expected categories', () => {
    expect(appleHealthAdapter.config.supportedCategories).toContain('vital');
    expect(appleHealthAdapter.config.supportedCategories).toContain('activity');
    expect(appleHealthAdapter.config.supportedCategories).toContain('sleep');
  });
});

describe('appleHealthAdapter.parseExport', () => {
  it('parses all records from sample XML', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    expect(results).toHaveLength(8);
  });

  it('extracts heart rate correctly', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    const hr = results.find((r) => r.code === 'heart_rate');
    expect(hr).toBeDefined();
    expect(hr!.value).toBe(72);
    expect(hr!.category).toBe('vital');
    expect(hr!.source).toBe('sensor:apple_health');
    expect(hr!.confidence).toBe(0.95);
  });

  it('extracts step count correctly', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    const steps = results.find((r) => r.code === 'steps');
    expect(steps).toBeDefined();
    expect(steps!.value).toBe(8500);
    expect(steps!.category).toBe('activity');
  });

  it('extracts blood pressure values', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    const systolic = results.find((r) => r.code === 'bp_systolic');
    const diastolic = results.find((r) => r.code === 'bp_diastolic');

    expect(systolic).toBeDefined();
    expect(systolic!.value).toBe(125);
    expect(systolic!.unit).toBe('mmHg');

    expect(diastolic).toBeDefined();
    expect(diastolic!.value).toBe(80);
  });

  it('extracts blood glucose', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    const glucose = results.find((r) => r.code === 'glucose');
    expect(glucose).toBeDefined();
    expect(glucose!.value).toBe(95);
    expect(glucose!.unit).toBe('mg/dL');
    expect(glucose!.category).toBe('lab');
  });

  it('extracts body weight', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    const weight = results.find((r) => r.code === 'weight');
    expect(weight).toBeDefined();
    expect(weight!.value).toBe(82.5);
    expect(weight!.unit).toBe('kg');
  });

  it('includes metadata with apple health type', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    const hr = results.find((r) => r.code === 'heart_rate');
    expect(hr!.metadata).toEqual({ appleHealthType: 'HKQuantityTypeIdentifierHeartRate' });
  });

  it('parses timestamps from startDate attribute', async () => {
    const buffer = Buffer.from(SAMPLE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');

    for (const r of results) {
      expect(r.timestamp).toBeInstanceOf(Date);
      expect(r.timestamp.getTime()).not.toBeNaN();
    }
  });

  it('returns empty array for empty XML', async () => {
    const buffer = Buffer.from(EMPTY_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });

  it('skips unknown record types', async () => {
    const buffer = Buffer.from(UNKNOWN_TYPE_XML);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });

  it('skips records with non-numeric values', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <Record type="HKQuantityTypeIdentifierHeartRate" value="abc" unit="count/min" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" />
</HealthData>`;
    const buffer = Buffer.from(xml);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });

  it('skips records missing required attributes', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-01-15 08:00:00 -0500" />
</HealthData>`;
    const buffer = Buffer.from(xml);
    const results = await appleHealthAdapter.parseExport!(buffer, 'test-user');
    // Missing value attribute
    expect(results).toHaveLength(0);
  });
});
