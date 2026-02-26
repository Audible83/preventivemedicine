import { getUserById, getObservationsByUser, getPendingReminders, createReminder } from '../db/queries.js';
import { loadGuidelines } from '../guidelines/loader.js';

export async function checkAndCreateReminders(userId: string) {
  const user = await getUserById(userId);
  if (!user) return [];

  const guidelines = await loadGuidelines();
  const newReminders: any[] = [];

  for (const guideline of guidelines) {
    // Check if user has recent data for this guideline's trigger
    const observations = await getObservationsByUser(userId, {
      category: guideline.trigger.category,
      limit: 1,
    });

    if (observations.length === 0) {
      // No data at all - remind to upload
      const reminder = await createReminder({
        userId,
        type: 'data_entry',
        message: `No ${guideline.trigger.category} data found. Consider uploading your recent ${guideline.trigger.category} records.`,
        dueAt: new Date(),
        guidelineId: guideline.id,
      });
      newReminders.push(reminder);
      continue;
    }

    // Check if last observation is older than 90 days
    const lastObs = observations[0];
    const daysSince = (Date.now() - new Date(lastObs.timestamp).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince > 90) {
      const reminder = await createReminder({
        userId,
        type: 'data_entry',
        message: `Your last ${lastObs.displayName} reading was ${Math.round(daysSince)} days ago. Consider updating your records.`,
        dueAt: new Date(),
        guidelineId: guideline.id,
      });
      newReminders.push(reminder);
    }
  }

  return newReminders;
}

export async function getRemindersForUser(userId: string) {
  return getPendingReminders(userId);
}
