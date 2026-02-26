import { loadGuidelines } from './loader.js';
import { getUserById, getObservationsByUser, createRecommendation, createRiskSignal, clearRecommendationsByUser, clearRiskSignalsByUser } from '../db/queries.js';
import { DISCLAIMER } from '@pm-valet/shared';
import { filterSafetyOutput } from './safety-filter.js';

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export async function evaluateGuidelines(userId: string) {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const guidelines = await loadGuidelines();
  const observations = await getObservationsByUser(userId, { limit: 500 });

  const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
  const sex = user.sex;

  // Clear previous evaluations for idempotency
  await clearRecommendationsByUser(userId);
  await clearRiskSignalsByUser(userId);

  const matchedRecommendations: any[] = [];
  const matchedRiskSignals: any[] = [];
  const questions: string[] = [];

  // Check what data is missing
  if (!age) questions.push('Date of birth is needed for age-based screening recommendations.');
  if (!sex) questions.push('Biological sex helps personalize screening guidelines.');
  if (observations.length === 0) questions.push('No health data uploaded yet. Upload labs, vitals, or other health records to get personalized recommendations.');

  for (const guideline of guidelines) {
    // Check age eligibility
    if (age !== null) {
      if (guideline.appliesTo.ageMin && age < guideline.appliesTo.ageMin) continue;
      if (guideline.appliesTo.ageMax && age > guideline.appliesTo.ageMax) continue;
    }

    // Check sex eligibility
    if (guideline.appliesTo.sex && sex) {
      if (!guideline.appliesTo.sex.includes(sex)) continue;
    }

    // Check if we have relevant observations for risk signals
    const relevantObs = observations.filter(
      (obs) => obs.category === guideline.trigger.category &&
        (!guideline.trigger.code || obs.code === guideline.trigger.code)
    );

    // Add recommendation
    const safeText = filterSafetyOutput(guideline.recommendation);
    const rec = await createRecommendation({
      userId,
      text: safeText,
      category: guideline.trigger.category,
      guidelineSource: guideline.source,
      guidelineId: guideline.id,
      citations: guideline.citation ? [guideline.citation] : [],
      priority: 'medium',
    });
    matchedRecommendations.push(rec);

    // Check for risk signals from observations
    if (relevantObs.length > 0 && guideline.referenceRange) {
      const latestObs = relevantObs[0]; // Already sorted by timestamp desc
      const isOutOfRange =
        (guideline.referenceRange.min !== undefined && latestObs.value < guideline.referenceRange.min) ||
        (guideline.referenceRange.max !== undefined && latestObs.value > guideline.referenceRange.max);

      if (isOutOfRange) {
        const signal = await createRiskSignal({
          userId,
          factor: guideline.trigger.code || guideline.trigger.category,
          displayName: latestObs.displayName,
          currentValue: latestObs.value,
          unit: latestObs.unit,
          referenceRangeMin: guideline.referenceRange.min,
          referenceRangeMax: guideline.referenceRange.max,
          referenceLabel: guideline.referenceRange.label,
          guidelineSource: guideline.source,
          guidelineId: guideline.id,
          severity: 'watch',
        });
        matchedRiskSignals.push(signal);
      }
    }

    // Note missing data for this guideline
    if (relevantObs.length === 0 && guideline.trigger.code) {
      questions.push(
        `No ${guideline.trigger.code} data found. Uploading this information would help evaluate ${guideline.source} guidelines.`
      );
    }
  }

  // Deduplicate questions
  const uniqueQuestions = [...new Set(questions)].slice(0, 5);

  // Build structured output
  const summary = [
    `Evaluated ${guidelines.length} preventive guidelines for your profile.`,
    `Found ${matchedRecommendations.length} applicable recommendations.`,
    matchedRiskSignals.length > 0
      ? `Identified ${matchedRiskSignals.length} values outside reference ranges for discussion with a clinician.`
      : 'No values outside reference ranges detected.',
  ];

  return {
    summary,
    recommendations: matchedRecommendations,
    riskSignals: matchedRiskSignals,
    questions: uniqueQuestions,
    disclaimer: DISCLAIMER,
  };
}
