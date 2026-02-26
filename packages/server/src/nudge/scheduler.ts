import { getUserById, getObservationsByUser, getPendingReminders, createReminder, createNotification } from '../db/queries.js';
import { loadGuidelines } from '../guidelines/loader.js';
import type { Guideline } from '@pm-valet/shared';

/**
 * Generate personalized follow-up questions based on user profile
 * and guideline evaluation gaps.
 */
export function generateFollowUpQuestions(
  user: { dateOfBirth?: string | null; sex?: string | null; heightCm?: number | null; weightKg?: number | null },
  guidelines: Guideline[],
  observationCategories: Set<string>
): string[] {
  const questions: string[] = [];

  // Profile completeness questions
  if (!user.dateOfBirth) {
    questions.push('What is your date of birth? Age-based screening recommendations require this information.');
  }
  if (!user.sex) {
    questions.push('What is your biological sex? Some screening guidelines are sex-specific.');
  }
  if (!user.heightCm || !user.weightKg) {
    questions.push('What are your current height and weight? These help assess BMI-related risk factors.');
  }

  // Data gap questions based on guidelines the user qualifies for
  for (const guideline of guidelines) {
    if (!observationCategories.has(guideline.trigger.category)) {
      questions.push(
        `Do you have recent ${guideline.trigger.category} data? Uploading it would help evaluate ${guideline.source} guidelines.`
      );
    }
  }

  // Lifestyle questions (always relevant for preventive care)
  if (!observationCategories.has('activity')) {
    questions.push('How would you describe your current physical activity level? Tracking activity helps with preventive recommendations.');
  }
  if (!observationCategories.has('nutrition')) {
    questions.push('Would you like to start tracking nutritional data? Diet plays a key role in preventive health.');
  }

  // Deduplicate and limit
  return [...new Set(questions)].slice(0, 5);
}

/**
 * Check user data against guidelines and create reminders for stale
 * or missing data. Also creates in-app notifications for each new reminder.
 */
export async function checkAndCreateReminders(userId: string) {
  const user = await getUserById(userId);
  if (!user) return { reminders: [], followUpQuestions: [] };

  const guidelines = await loadGuidelines();
  const newReminders: any[] = [];
  const observationCategories = new Set<string>();

  for (const guideline of guidelines) {
    // Check if user has recent data for this guideline's trigger
    const observations = await getObservationsByUser(userId, {
      category: guideline.trigger.category,
      limit: 1,
    });

    if (observations.length > 0) {
      observationCategories.add(guideline.trigger.category);
    }

    if (observations.length === 0) {
      // No data at all - remind to upload
      const message = `No ${guideline.trigger.category} data found. Consider uploading your recent ${guideline.trigger.category} records.`;
      const reminder = await createReminder({
        userId,
        type: 'data_entry',
        message,
        dueAt: new Date(),
        guidelineId: guideline.id,
      });
      newReminders.push(reminder);

      // Create an in-app notification for this reminder
      await createNotification({
        userId,
        type: 'in_app',
        title: 'Missing Health Data',
        message,
      });

      continue;
    }

    // Check if last observation is older than 90 days
    const lastObs = observations[0];
    const daysSince = (Date.now() - new Date(lastObs.timestamp).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince > 90) {
      const message = `Your last ${lastObs.displayName} reading was ${Math.round(daysSince)} days ago. Consider updating your records.`;
      const reminder = await createReminder({
        userId,
        type: 'data_entry',
        message,
        dueAt: new Date(),
        guidelineId: guideline.id,
      });
      newReminders.push(reminder);

      // Create an in-app notification for this reminder
      await createNotification({
        userId,
        type: 'in_app',
        title: 'Data Update Reminder',
        message,
      });
    }
  }

  // Generate follow-up questions based on profile and data gaps
  const followUpQuestions = generateFollowUpQuestions(user, guidelines, observationCategories);

  return { reminders: newReminders, followUpQuestions };
}

export async function getRemindersForUser(userId: string) {
  return getPendingReminders(userId);
}

// ── Scheduled Job ──

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start a periodic scheduler that runs checkAndCreateReminders
 * for a set of active user IDs. Accepts a function that returns
 * the list of user IDs to process.
 *
 * @param getActiveUserIds - async function returning user IDs to check
 * @param intervalMs - how often to run, defaults to 24 hours
 */
export function startScheduler(
  getActiveUserIds: () => Promise<string[]>,
  intervalMs: number = 24 * 60 * 60 * 1000
): void {
  if (schedulerInterval) {
    console.warn('Scheduler already running. Call stopScheduler() first.');
    return;
  }

  console.log(`Nudge scheduler started (interval: ${intervalMs / 1000}s)`);

  const tick = async () => {
    try {
      const userIds = await getActiveUserIds();
      console.log(`Scheduler tick: checking ${userIds.length} users`);
      for (const userId of userIds) {
        try {
          await checkAndCreateReminders(userId);
        } catch (err) {
          console.error(`Scheduler error for user ${userId}:`, err);
        }
      }
    } catch (err) {
      console.error('Scheduler tick error:', err);
    }
  };

  // Run immediately on start, then on interval
  tick();
  schedulerInterval = setInterval(tick, intervalMs);
}

/**
 * Stop the periodic scheduler.
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Nudge scheduler stopped');
  }
}
