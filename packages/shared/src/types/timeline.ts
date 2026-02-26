import { z } from 'zod';
import type { Observation } from './observation.js';

export const TimelineQuerySchema = z.object({
  userId: z.string().uuid(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  categories: z.array(z.string()).optional(),
  codes: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export type TimelineQuery = z.infer<typeof TimelineQuerySchema>;

export interface TimelineEntry {
  observation: Observation;
  trend?: 'improving' | 'stable' | 'declining';
  anomaly?: boolean;
}

export interface Timeline {
  userId: string;
  entries: TimelineEntry[];
  totalCount: number;
  from?: string;
  to?: string;
}
