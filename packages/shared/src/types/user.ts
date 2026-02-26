import { z } from 'zod';

export const SexSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Sex = z.infer<typeof SexSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(200),
  dateOfBirth: z.string().date().optional(),
  sex: SexSchema.optional(),
  ethnicity: z.string().max(100).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  consentDataProcessing: z.boolean().default(false),
  consentNotifications: z.boolean().default(false),
  settings: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const CreateUserSchema = UserProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;
