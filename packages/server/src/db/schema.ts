import { pgTable, uuid, text, timestamp, real, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  dateOfBirth: text('date_of_birth'),
  sex: text('sex'),
  ethnicity: text('ethnicity'),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  consentDataProcessing: boolean('consent_data_processing').default(false),
  consentNotifications: boolean('consent_notifications').default(false),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const observations = pgTable('observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: text('category').notNull(),
  code: text('code').notNull(),
  displayName: text('display_name').notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  source: text('source').notNull(),
  confidence: real('confidence').default(1.0),
  rawReference: text('raw_reference'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCatTsIdx: index('obs_user_cat_ts_idx').on(table.userId, table.category, table.timestamp),
  userTsIdx: index('obs_user_ts_idx').on(table.userId, table.timestamp),
}));

export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  category: text('category').notNull(),
  guidelineSource: text('guideline_source').notNull(),
  guidelineId: text('guideline_id').notNull(),
  citations: jsonb('citations').default([]),
  priority: text('priority').default('medium'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  dismissedAt: timestamp('dismissed_at'),
});

export const riskSignals = pgTable('risk_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  factor: text('factor').notNull(),
  displayName: text('display_name').notNull(),
  currentValue: real('current_value').notNull(),
  unit: text('unit').notNull(),
  referenceRangeMin: real('reference_range_min'),
  referenceRangeMax: real('reference_range_max'),
  referenceLabel: text('reference_label'),
  guidelineSource: text('guideline_source').notNull(),
  guidelineId: text('guideline_id').notNull(),
  severity: text('severity').default('info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  dueAt: timestamp('due_at').notNull(),
  completedAt: timestamp('completed_at'),
  guidelineId: text('guideline_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull().default('in_app'), // in_app | email | push
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false).notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userReadIdx: index('notif_user_read_idx').on(table.userId, table.read),
}));
