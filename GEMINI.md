# GEMINI.md - Preventive Medicine Valet

This document serves as the primary mandate for the Preventive Medicine Agent project. It defines the project's architectural soul, ethical boundaries, and technical standards. All development must align with these principles.

## Project Vision
The **Preventive Medicine Valet** is a lifelong health companion. It acts as a digital "maid" or "valet" for a user's health data—organizing, tracking, and alerting—without ever crossing the line into clinical diagnosis. It bridges the gap between raw sensor data and actionable preventive lifestyle choices.

## Core Mandates & Ethical Guardrails

### 1. The Non-Diagnostic Boundary (CRITICAL)
*   **No Diagnosis:** Never state that a user "has" a condition. Use phrases like "Your data indicates signals often associated with..." or "You may wish to discuss [Topic] with a clinician."
*   **No Treatment:** Never prescribe or recommend specific medications or clinical treatments. Focus on lifestyle, habit formation, and adherence to established screening guidelines.
*   **The Disclaimer:** Every user-facing recommendation or risk summary **MUST** conclude with the mandatory disclaimer:
    > "This is educational and not medical diagnosis or treatment. For clinical decisions, consult a qualified healthcare professional."
*   **Emergency Redirection:** If data suggests acute distress, the agent must provide immediate redirection to professional services without attempting to analyze the severity.

### 2. Data Sovereignty & Provenance
*   **Provenance First:** Every data point (lab result, step count, sleep hour) must have a recorded source, timestamp, and confidence level.
*   **Longitudinal Integrity:** Data must be stored in a way that supports multi-decade tracking. Schema migrations must never lose historical context.
*   **Privacy by Design:** PHI must be isolated. The agent operates on normalized, anonymized representations where possible.

## Technical Architecture

### 1. Stack Recommendations
*   **Frontend:** React (TypeScript) with Vanilla CSS for a clean, "medical-grade" aesthetic (high legibility, calm color palette).
*   **Backend:** Node.js (TypeScript) / Express.
*   **Database:**
    *   **Relational (PostgreSQL):** For user profiles, settings, and discrete clinical records.
    *   **Time-Series (InfluxDB or TimescaleDB):** For high-frequency sensor data (heart rate, steps).
*   **Data Standard:** Align internal data models with **HL7 FHIR** where practical to ensure future interoperability.

### 2. Core Modules
*   **Ingestion Engine:** Pipelines for CSV/PDF (OCR), Webhook-based sensor imports, and manual entry.
*   **Normalization Layer:** Standardizing units (e.g., mg/dL vs mmol/L) and time zones.
*   **Guideline Engine:** A deterministic logic layer that maps user data against established preventive guidelines (e.g., USPSTF).
*   **Valet/Nudge Service:** A proactive notification system for habit tracking and screening reminders.

## Development Workflow

### 1. Research & Strategy
*   Before implementing any recommendation logic, research the corresponding clinical guideline (e.g., AHA, USPSTF).
*   Document the source of the logic in the code comments and the `GUIDELINES.md` file (to be created).

### 2. Execution & Validation
*   **Surgical Changes:** Modify one pipeline or module at a time.
*   **Validation:** Every change to the "Guideline Engine" requires a new test case with "gold-standard" sample data to ensure no regression in risk flagging.
*   **Security Scans:** Regularly check for exposed PII patterns in logs or temporary files.

## Visual & UX Standards
*   **Aesthetic:** "Clean, Professional, Calm." Avoid "gamification" that feels trivial.
*   **Transparency:** Always show the user *why* a recommendation is being made (e.g., "Based on your 3-month trend of decreasing sleep...").
*   **Accessibility:** High contrast ratios and adjustable text sizes for long-term use as users age.

## Success Metrics
*   **Data Coverage:** Percentage of user-provided data successfully normalized.
*   **Retention:** User engagement over months/years (the "longitudinal" goal).
*   **Safety Compliance:** 100% adherence to the non-diagnostic disclaimer mandate in automated tests.
