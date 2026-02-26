import { IntegrationAdapter, ParsedObservation } from './adapter.js';

/**
 * Apple Health XML Export Parser
 * Apple Health exports data as a large XML file (export.xml).
 * We parse relevant health records into observations.
 */

const RECORD_MAP: Record<string, { category: string; code: string; displayName: string; unit: string }> = {
  HKQuantityTypeIdentifierHeartRate: { category: 'vital', code: 'heart_rate', displayName: 'Heart Rate', unit: 'bpm' },
  HKQuantityTypeIdentifierBloodPressureSystolic: { category: 'vital', code: 'bp_systolic', displayName: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  HKQuantityTypeIdentifierBloodPressureDiastolic: { category: 'vital', code: 'bp_diastolic', displayName: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  HKQuantityTypeIdentifierBodyMass: { category: 'vital', code: 'weight', displayName: 'Body Weight', unit: 'kg' },
  HKQuantityTypeIdentifierHeight: { category: 'vital', code: 'height', displayName: 'Height', unit: 'cm' },
  HKQuantityTypeIdentifierBodyMassIndex: { category: 'vital', code: 'bmi', displayName: 'BMI', unit: 'kg/m²' },
  HKQuantityTypeIdentifierStepCount: { category: 'activity', code: 'steps', displayName: 'Steps', unit: 'count' },
  HKQuantityTypeIdentifierDistanceWalkingRunning: { category: 'activity', code: 'distance_walking', displayName: 'Walking/Running Distance', unit: 'km' },
  HKQuantityTypeIdentifierActiveEnergyBurned: { category: 'activity', code: 'active_energy', displayName: 'Active Energy Burned', unit: 'kcal' },
  HKQuantityTypeIdentifierBasalEnergyBurned: { category: 'activity', code: 'basal_energy', displayName: 'Basal Energy Burned', unit: 'kcal' },
  HKQuantityTypeIdentifierAppleExerciseTime: { category: 'activity', code: 'exercise_minutes', displayName: 'Exercise Minutes', unit: 'min' },
  HKCategoryTypeIdentifierSleepAnalysis: { category: 'sleep', code: 'sleep_duration', displayName: 'Sleep Duration', unit: 'hours' },
  HKQuantityTypeIdentifierOxygenSaturation: { category: 'vital', code: 'spo2', displayName: 'Blood Oxygen', unit: '%' },
  HKQuantityTypeIdentifierRespiratoryRate: { category: 'vital', code: 'respiratory_rate', displayName: 'Respiratory Rate', unit: 'breaths/min' },
  HKQuantityTypeIdentifierBodyTemperature: { category: 'vital', code: 'temperature', displayName: 'Body Temperature', unit: '°C' },
  HKQuantityTypeIdentifierBloodGlucose: { category: 'lab', code: 'glucose', displayName: 'Blood Glucose', unit: 'mg/dL' },
  HKQuantityTypeIdentifierDietaryWater: { category: 'nutrition', code: 'water_intake', displayName: 'Water Intake', unit: 'mL' },
  HKQuantityTypeIdentifierDietaryEnergyConsumed: { category: 'nutrition', code: 'calories_consumed', displayName: 'Calories Consumed', unit: 'kcal' },
};

function parseAppleHealthXML(xmlContent: string): ParsedObservation[] {
  const observations: ParsedObservation[] = [];

  // Parse <Record> elements using regex (avoids heavy XML parser dependency)
  const recordRegex = /<Record\s+([^>]+)\/>/g;
  let match;

  while ((match = recordRegex.exec(xmlContent)) !== null) {
    const attrs = match[1];
    const type = extractAttr(attrs, 'type');
    const value = extractAttr(attrs, 'value');
    const startDate = extractAttr(attrs, 'startDate');
    const unit = extractAttr(attrs, 'unit');

    if (!type || !value || !startDate) continue;

    const mapping = RECORD_MAP[type];
    if (!mapping) continue;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) continue;

    observations.push({
      category: mapping.category,
      code: mapping.code,
      displayName: mapping.displayName,
      value: numValue,
      unit: unit || mapping.unit,
      timestamp: new Date(startDate),
      source: 'sensor:apple_health',
      confidence: 0.95,
      rawReference: `${value} ${unit || mapping.unit}`,
      metadata: { appleHealthType: type },
    });
  }

  return observations;
}

function extractAttr(attrs: string, name: string): string | null {
  const regex = new RegExp(`${name}="([^"]*)"`, 'i');
  const match = regex.exec(attrs);
  return match ? match[1] : null;
}

export const appleHealthAdapter: IntegrationAdapter = {
  config: {
    id: 'apple_health',
    name: 'Apple Health',
    description: 'Import data from Apple Health XML export. On your iPhone, go to Health > Profile > Export All Health Data.',
    type: 'file_import',
    supportedCategories: ['vital', 'activity', 'sleep', 'nutrition', 'lab'],
  },

  async parseExport(buffer: Buffer): Promise<ParsedObservation[]> {
    const content = buffer.toString('utf-8');
    return parseAppleHealthXML(content);
  },
};
