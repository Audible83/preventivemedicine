import { z } from 'zod';

export const GuidelineTriggerSchema = z.object({
  category: z.string(),
  code: z.string().optional(),
});

export const GuidelineAppliesTo = z.object({
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  sex: z.array(z.string()).optional(),
});

export const GuidelineSchema = z.object({
  id: z.string(),
  source: z.string(),
  version: z.string().optional(),
  appliesTo: GuidelineAppliesTo,
  trigger: GuidelineTriggerSchema,
  recommendation: z.string(),
  riskFactors: z.array(z.string()).default([]),
  citation: z.string().optional(),
  referenceRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      unit: z.string(),
      label: z.string(),
    })
    .nullable()
    .optional(),
});

export type Guideline = z.infer<typeof GuidelineSchema>;
