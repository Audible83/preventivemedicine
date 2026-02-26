import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB queries module
vi.mock('../db/queries.js', () => ({
  getUserById: vi.fn(),
  getObservationsByUser: vi.fn(),
  createRecommendation: vi.fn(),
  createRiskSignal: vi.fn(),
  clearRecommendationsByUser: vi.fn(),
  clearRiskSignalsByUser: vi.fn(),
}));

// Mock guideline loader
vi.mock('./loader.js', () => ({
  loadGuidelines: vi.fn(),
}));

import { evaluateGuidelines } from './evaluator';
import {
  getUserById,
  getObservationsByUser,
  createRecommendation,
  createRiskSignal,
  clearRecommendationsByUser,
  clearRiskSignalsByUser,
} from '../db/queries.js';
import { loadGuidelines } from './loader.js';
import type { Guideline } from '@pm-valet/shared';

const mockedGetUserById = vi.mocked(getUserById);
const mockedGetObservations = vi.mocked(getObservationsByUser);
const mockedCreateRecommendation = vi.mocked(createRecommendation);
const mockedCreateRiskSignal = vi.mocked(createRiskSignal);
const mockedClearRecs = vi.mocked(clearRecommendationsByUser);
const mockedClearSignals = vi.mocked(clearRiskSignalsByUser);
const mockedLoadGuidelines = vi.mocked(loadGuidelines);

const SAMPLE_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  displayName: 'Test User',
  dateOfBirth: '1985-06-15',
  sex: 'male',
  heightCm: 178,
  weightKg: 82,
  consentDataProcessing: true,
  consentNotifications: true,
  settings: {},
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2026-02-26'),
};

const SAMPLE_OBSERVATIONS = [
  {
    id: 'obs-1',
    userId: SAMPLE_USER.id,
    category: 'lab',
    code: 'glucose',
    displayName: 'Fasting Glucose',
    value: 105,
    unit: 'mg/dL',
    timestamp: new Date('2026-01-20'),
    source: 'csv',
    confidence: 0.9,
    metadata: {},
  },
  {
    id: 'obs-2',
    userId: SAMPLE_USER.id,
    category: 'vital',
    code: 'blood-pressure-systolic',
    displayName: 'Systolic BP',
    value: 135,
    unit: 'mmHg',
    timestamp: new Date('2026-01-15'),
    source: 'manual',
    confidence: 1.0,
    metadata: {},
  },
];

const DIABETES_GUIDELINE: Guideline = {
  id: 'uspstf-diabetes-screening',
  source: 'USPSTF 2021',
  version: '1.0',
  appliesTo: { ageMin: 35, ageMax: 70, sex: ['male', 'female'] },
  trigger: { category: 'lab', code: 'glucose' },
  recommendation: 'Adults aged 35-70 may benefit from discussing prediabetes screening with a clinician.',
  riskFactors: ['Overweight/obesity', 'Family history'],
  citation: 'https://example.com/uspstf-diabetes',
  referenceRange: { min: 70, max: 100, unit: 'mg/dL', label: 'Normal fasting: 70-100 mg/dL' },
};

const BP_GUIDELINE: Guideline = {
  id: 'uspstf-bp-screening',
  source: 'USPSTF 2023',
  version: '1.0',
  appliesTo: { ageMin: 18, ageMax: 79, sex: ['male', 'female'] },
  trigger: { category: 'vital', code: 'blood-pressure-systolic' },
  recommendation: 'Adults aged 18+ may benefit from periodic blood pressure screening.',
  riskFactors: ['Family history of hypertension'],
  citation: 'https://example.com/uspstf-bp',
  referenceRange: { min: 90, max: 130, unit: 'mmHg', label: 'Normal: <130 mmHg systolic' },
};

const BREAST_CANCER_GUIDELINE: Guideline = {
  id: 'uspstf-breast-cancer-screening',
  source: 'USPSTF 2024',
  version: '1.0',
  appliesTo: { ageMin: 40, ageMax: 74, sex: ['female'] },
  trigger: { category: 'screening', code: 'mammography' },
  recommendation: 'Women aged 40-74 may benefit from discussing breast cancer screening with a clinician.',
  riskFactors: ['Family history'],
  citation: 'https://example.com/uspstf-breast',
  referenceRange: null,
};

describe('evaluateGuidelines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateRecommendation.mockResolvedValue({ id: 'rec-1' } as any);
    mockedCreateRiskSignal.mockResolvedValue({ id: 'signal-1' } as any);
    mockedClearRecs.mockResolvedValue(undefined);
    mockedClearSignals.mockResolvedValue(undefined);
  });

  it('throws if user not found', async () => {
    mockedGetUserById.mockResolvedValue(undefined);
    await expect(evaluateGuidelines('nonexistent-user')).rejects.toThrow('User not found');
  });

  it('clears previous recommendations and risk signals for idempotency', async () => {
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue([]);
    mockedLoadGuidelines.mockResolvedValue([]);

    await evaluateGuidelines(SAMPLE_USER.id);

    expect(mockedClearRecs).toHaveBeenCalledWith(SAMPLE_USER.id);
    expect(mockedClearSignals).toHaveBeenCalledWith(SAMPLE_USER.id);
  });

  it('matches guidelines by age', async () => {
    // User born 1985 => age ~40 in 2026
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue(SAMPLE_OBSERVATIONS as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    // User age 40 is within 35-70, so diabetes guideline matches
    expect(mockedCreateRecommendation).toHaveBeenCalledTimes(1);
    expect(result.recommendations).toHaveLength(1);
  });

  it('skips guidelines when user is too young', async () => {
    const youngUser = { ...SAMPLE_USER, dateOfBirth: '2010-01-01' }; // ~16 years old
    mockedGetUserById.mockResolvedValue(youngUser as any);
    mockedGetObservations.mockResolvedValue(SAMPLE_OBSERVATIONS as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    // Age 16 < 35 minimum, should skip
    expect(mockedCreateRecommendation).not.toHaveBeenCalled();
    expect(result.recommendations).toHaveLength(0);
  });

  it('skips guidelines when user is too old', async () => {
    const oldUser = { ...SAMPLE_USER, dateOfBirth: '1940-01-01' }; // ~86 years old
    mockedGetUserById.mockResolvedValue(oldUser as any);
    mockedGetObservations.mockResolvedValue(SAMPLE_OBSERVATIONS as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    // Age 86 > 70 maximum, should skip
    expect(mockedCreateRecommendation).not.toHaveBeenCalled();
    expect(result.recommendations).toHaveLength(0);
  });

  it('filters guidelines by sex', async () => {
    // Male user should not match female-only breast cancer screening
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue([]);
    mockedLoadGuidelines.mockResolvedValue([BREAST_CANCER_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(mockedCreateRecommendation).not.toHaveBeenCalled();
    expect(result.recommendations).toHaveLength(0);
  });

  it('matches female-only guidelines for female users', async () => {
    const femaleUser = { ...SAMPLE_USER, sex: 'female' };
    mockedGetUserById.mockResolvedValue(femaleUser as any);
    mockedGetObservations.mockResolvedValue([]);
    mockedLoadGuidelines.mockResolvedValue([BREAST_CANCER_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(mockedCreateRecommendation).toHaveBeenCalledTimes(1);
    expect(result.recommendations).toHaveLength(1);
  });

  it('creates risk signal when observation is out of reference range', async () => {
    // Glucose 105 > max 100 => out of range
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue(SAMPLE_OBSERVATIONS as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(mockedCreateRiskSignal).toHaveBeenCalledTimes(1);
    expect(mockedCreateRiskSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: SAMPLE_USER.id,
        factor: 'glucose',
        currentValue: 105,
        severity: 'watch',
      })
    );
    expect(result.riskSignals).toHaveLength(1);
  });

  it('does not create risk signal when observation is within range', async () => {
    const normalGlucose = [
      { ...SAMPLE_OBSERVATIONS[0], value: 90 }, // Within 70-100 range
    ];
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue(normalGlucose as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE]);

    await evaluateGuidelines(SAMPLE_USER.id);

    expect(mockedCreateRiskSignal).not.toHaveBeenCalled();
  });

  it('adds question for missing date of birth', async () => {
    const noDoB = { ...SAMPLE_USER, dateOfBirth: null };
    mockedGetUserById.mockResolvedValue(noDoB as any);
    mockedGetObservations.mockResolvedValue([]);
    mockedLoadGuidelines.mockResolvedValue([]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(result.questions).toContain('Date of birth is needed for age-based screening recommendations.');
  });

  it('adds question for missing sex', async () => {
    const noSex = { ...SAMPLE_USER, sex: null };
    mockedGetUserById.mockResolvedValue(noSex as any);
    mockedGetObservations.mockResolvedValue([]);
    mockedLoadGuidelines.mockResolvedValue([]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(result.questions).toContain('Biological sex helps personalize screening guidelines.');
  });

  it('adds question when no observations exist', async () => {
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue([]);
    mockedLoadGuidelines.mockResolvedValue([]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(result.questions).toContain(
      'No health data uploaded yet. Upload labs, vitals, or other health records to get personalized recommendations.'
    );
  });

  it('adds question for missing trigger data (e.g., no glucose data)', async () => {
    // User has no glucose observations, only BP
    const bpOnly = SAMPLE_OBSERVATIONS.filter((o) => o.category === 'vital');
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue(bpOnly as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    const glucoseQuestion = result.questions.find((q) => q.includes('glucose'));
    expect(glucoseQuestion).toBeDefined();
  });

  it('deduplicates questions and limits to 5', async () => {
    // Multiple guidelines will generate same "missing data" questions
    const manyGuidelines = Array.from({ length: 10 }, (_, i) => ({
      ...DIABETES_GUIDELINE,
      id: `guideline-${i}`,
      trigger: { category: 'lab', code: `unique-code-${i}` },
    }));

    const noSex = { ...SAMPLE_USER, sex: null, dateOfBirth: null };
    mockedGetUserById.mockResolvedValue(noSex as any);
    mockedGetObservations.mockResolvedValue([]);
    mockedLoadGuidelines.mockResolvedValue(manyGuidelines);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(result.questions.length).toBeLessThanOrEqual(5);
  });

  it('returns structured output with summary and disclaimer', async () => {
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue(SAMPLE_OBSERVATIONS as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE, BP_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.recommendations).toBeDefined();
    expect(result.riskSignals).toBeDefined();
    expect(result.questions).toBeDefined();
    expect(result.disclaimer).toContain('educational');
    expect(result.disclaimer).toContain('not medical diagnosis');
  });

  it('processes multiple guidelines in a single evaluation', async () => {
    mockedGetUserById.mockResolvedValue(SAMPLE_USER as any);
    mockedGetObservations.mockResolvedValue(SAMPLE_OBSERVATIONS as any);
    mockedLoadGuidelines.mockResolvedValue([DIABETES_GUIDELINE, BP_GUIDELINE]);

    const result = await evaluateGuidelines(SAMPLE_USER.id);

    // Both guidelines should match for a 40-year-old male
    expect(mockedCreateRecommendation).toHaveBeenCalledTimes(2);
    expect(result.recommendations).toHaveLength(2);

    // Both glucose (105 > 100) and BP (135 > 130) are out of range
    expect(mockedCreateRiskSignal).toHaveBeenCalledTimes(2);
    expect(result.riskSignals).toHaveLength(2);
  });
});
