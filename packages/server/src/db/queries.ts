import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { db, schema } from './index.js';

// ── Users ──

export async function createUser(data: typeof schema.users.$inferInsert) {
  const [user] = await db.insert(schema.users).values(data).returning();
  return user;
}

export async function getUserById(id: string) {
  return db.query.users.findFirst({ where: eq(schema.users.id, id) });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(schema.users.email, email) });
}

export async function updateUser(id: string, data: Partial<typeof schema.users.$inferInsert>) {
  const [user] = await db
    .update(schema.users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
    .returning();
  return user;
}

export async function deleteUser(id: string) {
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

// ── Observations ──

export async function createObservation(data: typeof schema.observations.$inferInsert) {
  const [obs] = await db.insert(schema.observations).values(data).returning();
  return obs;
}

export async function createObservations(data: (typeof schema.observations.$inferInsert)[]) {
  return db.insert(schema.observations).values(data).returning();
}

export async function getObservationsByUser(
  userId: string,
  opts?: { category?: string; from?: Date; to?: Date; limit?: number; offset?: number }
) {
  const conditions = [eq(schema.observations.userId, userId)];
  if (opts?.category) conditions.push(eq(schema.observations.category, opts.category));
  if (opts?.from) conditions.push(gte(schema.observations.timestamp, opts.from));
  if (opts?.to) conditions.push(lte(schema.observations.timestamp, opts.to));

  return db
    .select()
    .from(schema.observations)
    .where(and(...conditions))
    .orderBy(desc(schema.observations.timestamp))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0);
}

export async function countObservationsByUser(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.observations)
    .where(eq(schema.observations.userId, userId));
  return result.count;
}

// ── Recommendations ──

export async function createRecommendation(data: typeof schema.recommendations.$inferInsert) {
  const [rec] = await db.insert(schema.recommendations).values(data).returning();
  return rec;
}

export async function getRecommendationsByUser(userId: string) {
  return db
    .select()
    .from(schema.recommendations)
    .where(eq(schema.recommendations.userId, userId))
    .orderBy(desc(schema.recommendations.createdAt));
}

export async function dismissRecommendation(id: string, userId: string) {
  const [rec] = await db
    .update(schema.recommendations)
    .set({ dismissedAt: new Date() })
    .where(and(eq(schema.recommendations.id, id), eq(schema.recommendations.userId, userId)))
    .returning();
  return rec;
}

export async function clearRecommendationsByUser(userId: string) {
  await db.delete(schema.recommendations).where(eq(schema.recommendations.userId, userId));
}

// ── Risk Signals ──

export async function clearRiskSignalsByUser(userId: string) {
  await db.delete(schema.riskSignals).where(eq(schema.riskSignals.userId, userId));
}

export async function createRiskSignal(data: typeof schema.riskSignals.$inferInsert) {
  const [signal] = await db.insert(schema.riskSignals).values(data).returning();
  return signal;
}

export async function getRiskSignalsByUser(userId: string) {
  return db
    .select()
    .from(schema.riskSignals)
    .where(eq(schema.riskSignals.userId, userId))
    .orderBy(desc(schema.riskSignals.createdAt));
}

// ── Audit Log ──

export async function logAuditEvent(data: typeof schema.auditLog.$inferInsert) {
  await db.insert(schema.auditLog).values(data);
}

// ── Reminders ──

export async function createReminder(data: typeof schema.reminders.$inferInsert) {
  const [reminder] = await db.insert(schema.reminders).values(data).returning();
  return reminder;
}

export async function getPendingReminders(userId: string) {
  return db
    .select()
    .from(schema.reminders)
    .where(
      and(
        eq(schema.reminders.userId, userId),
        sql`${schema.reminders.completedAt} IS NULL`,
        lte(schema.reminders.dueAt, new Date())
      )
    )
    .orderBy(asc(schema.reminders.dueAt));
}

export async function completeReminder(id: string, userId: string) {
  const [reminder] = await db
    .update(schema.reminders)
    .set({ completedAt: new Date() })
    .where(and(eq(schema.reminders.id, id), eq(schema.reminders.userId, userId)))
    .returning();
  return reminder;
}

// ── Notifications ──

export async function createNotification(data: typeof schema.notifications.$inferInsert) {
  const [notification] = await db.insert(schema.notifications).values(data).returning();
  return notification;
}

export async function getUnreadNotifications(userId: string) {
  return db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.read, false)
      )
    )
    .orderBy(desc(schema.notifications.createdAt));
}

export async function markNotificationRead(id: string, userId: string) {
  const [notification] = await db
    .update(schema.notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, userId)))
    .returning();
  return notification;
}

export async function getNotificationsByUser(userId: string, opts?: { limit?: number; offset?: number }) {
  return db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

// ── Integration Connections ──

export async function createIntegrationConnection(data: typeof schema.integrationConnections.$inferInsert) {
  const [conn] = await db.insert(schema.integrationConnections).values(data).returning();
  return conn;
}

export async function getIntegrationConnections(userId: string) {
  return db
    .select()
    .from(schema.integrationConnections)
    .where(eq(schema.integrationConnections.userId, userId))
    .orderBy(desc(schema.integrationConnections.createdAt));
}

export async function getIntegrationConnection(userId: string, integrationId: string) {
  return db.query.integrationConnections.findFirst({
    where: and(
      eq(schema.integrationConnections.userId, userId),
      eq(schema.integrationConnections.integrationId, integrationId)
    ),
  });
}

export async function updateIntegrationConnection(
  id: string,
  userId: string,
  data: Partial<typeof schema.integrationConnections.$inferInsert>
) {
  const [conn] = await db
    .update(schema.integrationConnections)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.integrationConnections.id, id), eq(schema.integrationConnections.userId, userId)))
    .returning();
  return conn;
}

export async function deleteIntegrationConnection(id: string, userId: string) {
  await db
    .delete(schema.integrationConnections)
    .where(and(eq(schema.integrationConnections.id, id), eq(schema.integrationConnections.userId, userId)));
}

// ── Webhook Keys ──

export async function createWebhookKey(data: typeof schema.webhookKeys.$inferInsert) {
  const [key] = await db.insert(schema.webhookKeys).values(data).returning();
  return key;
}

export async function getWebhookKeysByUser(userId: string) {
  return db
    .select()
    .from(schema.webhookKeys)
    .where(eq(schema.webhookKeys.userId, userId));
}

export async function getUserByWebhookKey(apiKey: string) {
  return db.query.webhookKeys.findFirst({
    where: and(eq(schema.webhookKeys.apiKey, apiKey), eq(schema.webhookKeys.active, true)),
  });
}

// ── Data Export & Deletion ──

export async function exportAllUserData(userId: string) {
  const user = await getUserById(userId);
  const observationsList = await getObservationsByUser(userId, { limit: 10000 });
  const recommendationsList = await getRecommendationsByUser(userId);
  const riskSignalsList = await getRiskSignalsByUser(userId);
  const remindersList = await db
    .select()
    .from(schema.reminders)
    .where(eq(schema.reminders.userId, userId));
  const notificationsList = await getNotificationsByUser(userId, { limit: 10000 });
  const integrationsList = await getIntegrationConnections(userId);
  const webhookKeysList = await getWebhookKeysByUser(userId);

  return {
    exportDate: new Date().toISOString(),
    user,
    observations: observationsList,
    recommendations: recommendationsList,
    riskSignals: riskSignalsList,
    reminders: remindersList,
    notifications: notificationsList,
    integrations: integrationsList,
    webhookKeys: webhookKeysList,
  };
}

export async function deleteAllUserData(userId: string) {
  await db.delete(schema.integrationConnections).where(eq(schema.integrationConnections.userId, userId));
  await db.delete(schema.webhookKeys).where(eq(schema.webhookKeys.userId, userId));
  await db.delete(schema.observations).where(eq(schema.observations.userId, userId));
  await db.delete(schema.recommendations).where(eq(schema.recommendations.userId, userId));
  await db.delete(schema.riskSignals).where(eq(schema.riskSignals.userId, userId));
  await db.delete(schema.reminders).where(eq(schema.reminders.userId, userId));
  await db.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
  await db.delete(schema.auditLog).where(eq(schema.auditLog.userId, userId));
  await db.delete(schema.users).where(eq(schema.users.id, userId));
}
