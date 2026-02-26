import { z } from 'zod';

export const ObservationCategorySchema = z.enum([
  'lab',
  'vital',
  'activity',
  'sleep',
  'nutrition',
  'survey',
  'screening',
]);
export type ObservationCategory = z.infer<typeof ObservationCategorySchema>;

export const DataSourceSchema = z.enum([
  'manual',
  'csv',
  'pdf',
  'ocr',
  'sensor:fitbit',
  'sensor:garmin',
  'sensor:apple_health',
  'sensor:google_fit',
  'sensor:withings',
  'sensor:generic',
]);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const ObservationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  category: ObservationCategorySchema,
  code: z.string().min(1).max(100),       // LOINC or internal code
  displayName: z.string().max(200),
  value: z.number(),
  unit: z.string().max(50),
  timestamp: z.string().datetime(),
  source: DataSourceSchema,
  confidence: z.number().min(0).max(1).default(1.0),
  rawReference: z.string().optional(),      // original value before normalization
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export type Observation = z.infer<typeof ObservationSchema>;

export const CreateObservationSchema = ObservationSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateObservation = z.infer<typeof CreateObservationSchema>;
