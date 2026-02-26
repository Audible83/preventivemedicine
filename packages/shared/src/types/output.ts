import { z } from 'zod';

export const StructuredOutputSchema = z.object({
  summary: z.array(z.string()).min(2).max(4),
  recommendations: z.array(z.string()).min(3).max(7),
  riskSignals: z.array(z.string()).max(6).default([]),
  questions: z.array(z.string()).min(3).max(5),
  disclaimer: z.string(),
});

export type StructuredOutput = z.infer<typeof StructuredOutputSchema>;
