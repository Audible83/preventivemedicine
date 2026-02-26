import { z } from 'zod';

export const RecommendationCategorySchema = z.enum([
  'screening',
  'lifestyle',
  'nutrition',
  'activity',
  'sleep',
  'mental_health',
  'immunization',
  'general',
]);
export type RecommendationCategory = z.infer<typeof RecommendationCategorySchema>;

export const RecommendationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  text: z.string(),
  category: RecommendationCategorySchema,
  guidelineSource: z.string(),
  guidelineId: z.string(),
  citations: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  createdAt: z.string().datetime(),
  dismissedAt: z.string().datetime().nullable().default(null),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
