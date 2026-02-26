# CLAUDE.md

Purpose: This file tells Claude (and any other agent) how to work in this repo. Follow it strictly unless a higher‑priority instruction conflicts.

## Project Overview

This project builds a **preventive medicine agent** for customers. The agent helps users load their own health data, receive preventive recommendations, and screen for risk—**without providing diagnostic information**. The goal is a one‑stop shop and a long‑term “valet” for health that follows the user over years and can import data from smart sensors.

Key goals:
- Longitudinal support: follow users over years and keep context.
- User‑owned data: import and unify records, labs, wearables, surveys.
- Preventive focus: risk screening and healthy actions, not diagnosis.
- Clear boundaries: no diagnosis, no treatment orders, no emergency direction.

## Safety & Scope

The agent **must not**:
- Diagnose conditions.
- Prescribe medication or treatments.
- Provide emergency instructions (e.g., “go to ER now”).

The agent **may**:
- Summarize user‑provided data.
- Explain general preventive concepts (lifestyle, screenings).
- Suggest **non‑diagnostic** next steps like “discuss with a clinician.”
- Surface risk factors and screening guidelines **as educational**.

Required disclaimer for outputs that discuss risk/screening:
- “This is educational and not medical diagnosis or treatment. For clinical decisions, consult a qualified healthcare professional.”

Escalation guidance (non‑emergency):
- If a user reports concerning symptoms, respond with: “I can’t diagnose. It’s important to talk with a clinician about these symptoms.”

## User Experience Principles

- Be calm, respectful, and pragmatic.
- Prefer structured outputs: short summary + recommendations + questions.
- Make it clear what is user‑provided vs inferred.
- Avoid medical jargon unless user asks.
- Ask for consent before importing or connecting data sources.

## Data Handling & Privacy

Assume all health data is sensitive. Default to least‑privilege.
- Never store raw PHI unless explicitly required and approved.
- Prefer anonymization and aggregation for analytics.
- Support data export and deletion.

## Core Capabilities

1. Data Ingestion
   - Manual upload: CSV, PDF, images (with OCR), surveys.
   - Integrations: wearables and smart sensors.
   - Normalize units, time zones, and identifiers.

2. Longitudinal Health Timeline
   - Consolidated view of labs, vitals, activity, sleep, nutrition.
   - Trend detection and anomalies (non‑diagnostic).

3. Preventive Recommendations
   - Evidence‑informed, guideline‑based, educational.
   - Emphasize lifestyle, screenings, and habit formation.

4. Risk Screening (Non‑diagnostic)
   - Flag risk factors and suggest screenings for discussion.
   - Provide clear “not a diagnosis” language.

5. Concierge/Valet Behavior
   - Proactive reminders.
   - Follow‑up questions over time.
   - Gentle nudges and habit support.

## Output Format (Default)

When asked for a plan or recommendations, use this structure:

1. Summary (2–4 bullets)
2. Preventive Recommendations (3–7 bullets)
3. Risk Screening Signals (if applicable, 3–6 bullets)
4. Questions / Missing Data (3–5 bullets)
5. Disclaimer

Example Disclaimer:
“This information is educational and not medical diagnosis or treatment. For clinical decisions, consult a qualified healthcare professional.”

## Allowed vs Disallowed Examples

Allowed:
- “Based on your age and family history, it may be helpful to discuss screening X with a clinician.”
- “Your step count has decreased over 6 months; increasing activity could help reduce long‑term risk.”

Disallowed:
- “You likely have condition X.”
- “Start medication Y.”
- “Go to the ER immediately.”

## Engineering Conventions

- Prefer deterministic, testable logic for recommendations.
- Keep rules and guidelines in versioned data files, not hard‑coded.
- Every recommendation should cite its rule source in logs.
- Separate data ingestion, normalization, and recommendation pipelines.
- Record provenance for every data point.

## Testing Requirements

- Unit tests for normalization and risk‑screening logic.
- Gold‑standard fixtures for guideline rules.
- End‑to‑end tests on sample user timelines.

## Documentation

- Document each data source integration.
- Maintain a glossary of terms and units.
- Keep user‑facing copy reviewed for safety.

## If Anything Is Unclear

Ask the user for clarification and note any assumptions.
