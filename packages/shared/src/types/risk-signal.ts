import { z } from 'zod';

export const RiskSignalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  factor: z.string(),
  displayName: z.string(),
  currentValue: z.number(),
  unit: z.string(),
  referenceRangeMin: z.number().optional(),
  referenceRangeMax: z.number().optional(),
  referenceLabel: z.string().optional(), // e.g., "Normal: < 120 mmHg"
  guidelineSource: z.string(),
  guidelineId: z.string(),
  severity: z.enum(['info', 'watch', 'elevated']).default('info'),
  createdAt: z.string().datetime(),
});

export type RiskSignal = z.infer<typeof RiskSignalSchema>;
