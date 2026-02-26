# Preventive Medicine Valet — Programming Plan

## Current State

The repo contains only `CLAUDE.md` and `GEMINI.md` — two instruction files defining the project vision, safety rules, architecture, and conventions. No code exists yet.

---

## Technology Stack (from GEMINI.md + CLAUDE.md)

| Layer          | Choice                              | Rationale                                                |
|----------------|--------------------------------------|----------------------------------------------------------|
| Frontend       | React + TypeScript + Vanilla CSS     | Clean, accessible, "medical-grade" UI                    |
| Backend        | Node.js + TypeScript + Express       | Shared language with frontend, fast iteration            |
| Relational DB  | PostgreSQL                           | User profiles, settings, discrete clinical records       |
| Time-Series DB | TimescaleDB (Postgres extension)     | High-frequency sensor data; avoids a second DB engine    |
| Data Standard  | HL7 FHIR-aligned internal models     | Future interoperability with EHR/wearable ecosystems     |
| Testing        | Vitest (unit/integration) + Playwright (E2E) | Modern, fast, TypeScript-native                   |
| Monorepo       | pnpm workspaces                      | Single repo, shared types between frontend and backend   |

---

## Phase 0 — Project Scaffolding

**Goal:** Runnable skeleton with CI, linting, and folder structure.

### Tasks

1. **Initialize git repo and pnpm workspace**
   - `pnpm init` at root
   - `pnpm-workspace.yaml` with `packages: ["packages/*"]`

2. **Create package structure**
   ```
   preventivemedicine/
   ├── CLAUDE.md
   ├── GEMINI.md
   ├── PLAN.md
   ├── pnpm-workspace.yaml
   ├── package.json
   ├── tsconfig.base.json
   ├── .gitignore
   ├── .env.example
   ├── packages/
   │   ├── shared/            # Shared types, constants, disclaimer text
   │   │   ├── src/
   │   │   │   ├── types/     # FHIR-aligned data models
   │   │   │   ├── constants/ # Disclaimer text, safety strings
   │   │   │   └── index.ts
   │   │   ├── package.json
   │   │   └── tsconfig.json
   │   ├── server/            # Express API
   │   │   ├── src/
   │   │   │   ├── routes/
   │   │   │   ├── services/
   │   │   │   ├── middleware/
   │   │   │   ├── db/
   │   │   │   ├── ingestion/
   │   │   │   ├── guidelines/
   │   │   │   ├── nudge/
   │   │   │   └── index.ts
   │   │   ├── package.json
   │   │   └── tsconfig.json
   │   └── web/               # React frontend
   │       ├── src/
   │       │   ├── components/
   │       │   ├── pages/
   │       │   ├── hooks/
   │       │   ├── services/
   │       │   └── main.tsx
   │       ├── index.html
   │       ├── vite.config.ts
   │       ├── package.json
   │       └── tsconfig.json
   ├── data/
   │   └── guidelines/        # Versioned guideline rule files (JSON/YAML)
   └── tests/
       ├── fixtures/          # Gold-standard test data
       └── e2e/               # Playwright end-to-end tests
   ```

3. **Shared TypeScript config** (`tsconfig.base.json`) with strict mode.

4. **ESLint + Prettier** configuration at root.

5. **`.gitignore`** — node_modules, dist, .env, coverage, etc.

6. **`.env.example`** — DATABASE_URL, PORT, etc.

7. **Initial git commit and push.**

---

## Phase 1 — Shared Types & Data Models

**Goal:** Define the core data types that every other module depends on. Align with FHIR where practical.

### Tasks

1. **User profile type** — demographics (age, sex, ethnicity), settings, consent flags.
2. **Observation type** (FHIR-aligned) — a single data point (lab, vital, metric) with:
   - `id`, `userId`, `category` (lab | vital | activity | sleep | nutrition | survey)
   - `code` (LOINC or internal), `value`, `unit`, `timestamp`
   - `source` (manual | csv | sensor:<name>), `confidence`, `rawReference`
3. **Timeline type** — ordered collection of Observations for a user.
4. **Recommendation type** — text, category, guidelineSource, citations, severity.
5. **RiskSignal type** — factor name, current value, reference range, guidelineSource.
6. **Disclaimer constant** — single source of truth for the mandatory disclaimer string.
7. **Unit conversion lookup** — mg/dL ↔ mmol/L, lbs ↔ kg, etc.

### Tests
- Type validation with Zod schemas.
- Unit conversion round-trip tests.

---

## Phase 2 — Database & Persistence

**Goal:** PostgreSQL schema, migrations, and data access layer.

### Tasks

1. **Choose ORM/query builder** — Drizzle ORM (TypeScript-native, migration support).
2. **Schema: `users` table** — id, email (hashed/encrypted), profile JSON, created_at, updated_at.
3. **Schema: `observations` table** — id, user_id (FK), category, code, value, unit, timestamp, source, confidence, raw_reference, created_at.
   - Index on (user_id, category, timestamp) for timeline queries.
4. **Schema: `recommendations` table** — id, user_id, text, guideline_source, created_at, dismissed_at.
5. **Schema: `risk_signals` table** — id, user_id, factor, value, reference_range, guideline_source, created_at.
6. **TimescaleDB hypertable** on `observations` for time-series queries (if high-frequency sensor data is present).
7. **Migration system** — Drizzle Kit for versioned, non-destructive migrations.
8. **Data access functions** — CRUD for each entity, plus timeline query (date range, category filter).
9. **Data export endpoint** — dump all user data as JSON (GDPR/data-sovereignty).
10. **Data deletion endpoint** — hard-delete all user data.

### Tests
- Migration up/down round-trips.
- CRUD integration tests against a test database.

---

## Phase 3 — Ingestion Engine

**Goal:** Import user health data from multiple formats, normalize it, and store it.

### Tasks

1. **CSV parser** — detect columns, map to Observation schema, handle common lab report formats.
2. **PDF parser** — extract text via `pdf-parse`, apply regex patterns for common lab formats.
3. **OCR pipeline** — Tesseract.js for image uploads of lab reports.
4. **Manual entry API** — POST endpoint for single observations.
5. **Survey ingestion** — structured questionnaire responses → observations.
6. **Normalization layer:**
   - Unit standardization (use shared conversion lookup).
   - Timezone normalization to UTC.
   - Identifier deduplication (detect duplicate uploads).
7. **Provenance recording** — every imported data point stores its source, import timestamp, and confidence.
8. **Validation** — reject malformed data, return clear error messages.

### Tests
- Unit tests for CSV/PDF parsing with fixture files.
- Normalization round-trip tests.
- Duplicate detection tests.

---

## Phase 4 — Guideline Engine

**Goal:** Deterministic, testable logic that maps user data to preventive recommendations.

### Tasks

1. **Guideline data format** — JSON files in `data/guidelines/` with structure:
   ```json
   {
     "id": "uspstf-colorectal-screening",
     "source": "USPSTF 2021",
     "applies_to": { "age_min": 45, "age_max": 75 },
     "trigger": { "category": "screening", "code": "colorectal" },
     "recommendation": "Adults aged 45-75 should discuss colorectal cancer screening options with a clinician.",
     "citation": "https://www.uspreventiveservicestaskforce.org/..."
   }
   ```
2. **Rule evaluator** — given a user profile + observations, find matching guidelines and produce Recommendations.
3. **Risk signal detector** — compare observation values against reference ranges, flag outliers.
4. **Output formatter** — produce the structured output format from CLAUDE.md:
   - Summary (2-4 bullets)
   - Preventive Recommendations (3-7 bullets)
   - Risk Screening Signals (3-6 bullets)
   - Questions / Missing Data (3-5 bullets)
   - Disclaimer (always appended)
5. **Safety filter** — scan output for disallowed patterns (diagnostic language, treatment prescriptions). Block and rewrite if found.
6. **Initial guideline set** — seed `data/guidelines/` with 10-15 USPSTF/AHA guidelines covering:
   - Blood pressure screening
   - Cholesterol screening
   - Colorectal cancer screening
   - Diabetes screening
   - BMI / weight management
   - Physical activity
   - Tobacco / alcohol use
   - Immunization reminders (age-based)
   - Sleep hygiene
   - Mental health screening (PHQ-2 style)

### Tests
- Gold-standard fixtures: sample user profiles + observations → expected recommendations.
- Safety filter tests: ensure disallowed phrases are caught.
- 100% disclaimer adherence in output tests.

---

## Phase 5 — Longitudinal Timeline & Trends

**Goal:** Consolidated health timeline with trend detection.

### Tasks

1. **Timeline API** — `GET /api/timeline?userId=&from=&to=&categories=`
2. **Trend detection service:**
   - Moving average over configurable windows (7d, 30d, 90d, 6mo).
   - Slope detection (improving, stable, declining).
   - Anomaly flagging (value outside 2 SD of user's personal baseline).
3. **Timeline summary generator** — produce natural-language summaries of trends.
4. **Comparison view** — show current period vs previous period.

### Tests
- Trend detection on synthetic time-series data.
- Edge cases: sparse data, single data point, large gaps.

---

## Phase 6 — Nudge / Valet Service

**Goal:** Proactive reminders, follow-ups, and habit support.

### Tasks

1. **Reminder scheduler** — cron-based or job-queue (e.g., BullMQ) for:
   - Screening due dates (based on guideline engine).
   - Data entry prompts ("You haven't logged blood pressure in 30 days").
   - Habit streak tracking.
2. **Follow-up question generator** — after a recommendation, schedule a check-in.
3. **Notification delivery** — in-app notifications initially; email as a stretch goal.
4. **User preferences** — notification frequency, quiet hours, opt-out per category.

### Tests
- Scheduler logic unit tests.
- Follow-up timing tests.

---

## Phase 7 — Frontend (React)

**Goal:** Clean, accessible UI for all core features.

### Pages & Components

1. **Dashboard** — summary cards (latest vitals, upcoming screenings, active recommendations).
2. **Timeline view** — interactive chart (Recharts or Chart.js) with category filters.
3. **Data upload** — drag-and-drop for CSV/PDF/image, manual entry form.
4. **Recommendations page** — structured output with expandable detail + citations.
5. **Profile / Settings** — demographics, notification preferences, data export/delete.
6. **Disclaimer banner** — persistent or contextual, always visible on recommendation screens.

### UX Standards (from GEMINI.md)
- Clean, professional, calm aesthetic.
- High contrast, adjustable text sizes.
- Transparency: show *why* each recommendation is made.
- No gamification.

### Tests
- Component unit tests with React Testing Library.
- Playwright E2E tests for critical flows (upload → timeline → recommendations).

---

## Phase 8 — Authentication & Security

**Goal:** Secure user accounts, protect PHI.

### Tasks

1. **Auth system** — JWT-based with refresh tokens, or session-based with `express-session`.
2. **Password hashing** — bcrypt or argon2.
3. **HTTPS enforcement** in production.
4. **Rate limiting** — `express-rate-limit` on API endpoints.
5. **Input sanitization** — prevent XSS, SQL injection (Drizzle parameterizes by default).
6. **PHI isolation** — encrypted at rest (Postgres TDE or application-level encryption for sensitive fields).
7. **Audit log** — record data access events.

### Tests
- Auth flow tests (register, login, token refresh, logout).
- Authorization tests (user A cannot access user B's data).

---

## Phase 9 — Wearable / Sensor Integrations (Stretch)

**Goal:** Connect to external data sources.

### Tasks

1. **Integration framework** — adapter pattern: each integration implements a common interface.
2. **Apple Health / Google Fit** — via export file upload initially.
3. **Fitbit / Garmin / Withings** — OAuth2 webhook integrations.
4. **Smart sensor webhooks** — generic webhook receiver for custom devices.
5. **Consent flow** — explicit user approval before connecting each source.

---

## Phase 10 — Deployment & CI/CD

### Tasks

1. **Docker Compose** — Postgres + TimescaleDB + API + Web.
2. **CI pipeline** (GitHub Actions):
   - Lint, type-check, unit tests on every PR.
   - E2E tests on merge to main.
   - Safety compliance check (disclaimer presence in outputs).
3. **Environment configs** — dev, staging, production.
4. **Monitoring** — health check endpoints, error tracking (Sentry).

---

## Implementation Priority (Recommended Order)

| Priority | Phase | Rationale |
|----------|-------|-----------|
| 1        | Phase 0 — Scaffolding | Nothing works without the skeleton |
| 2        | Phase 1 — Shared Types | Every module depends on these |
| 3        | Phase 2 — Database | Persistence is required for all features |
| 4        | Phase 3 — Ingestion | Users need to load data before anything useful happens |
| 5        | Phase 4 — Guideline Engine | Core value proposition |
| 6        | Phase 7 — Frontend (basic) | Users need to interact with the system |
| 7        | Phase 5 — Timeline & Trends | Builds on ingested data |
| 8        | Phase 8 — Auth & Security | Required before any deployment |
| 9        | Phase 6 — Nudge Service | Adds long-term engagement value |
| 10       | Phase 10 — Deployment | Ship it |
| 11       | Phase 9 — Wearable Integrations | Stretch goal |

---

## Key Files to Create First

```
GUIDELINES.md              — Document guideline sources and research
data/guidelines/*.json     — Versioned guideline rule files
packages/shared/src/types/ — Core data models
packages/server/src/       — API and business logic
packages/web/src/           — React frontend
tests/fixtures/            — Gold-standard test data
```

---

## Open Questions (Require User Input)

1. **Auth provider** — Self-hosted auth (JWT) vs third-party (Auth0, Clerk)?
2. **Hosting target** — Self-hosted VPS, AWS, Vercel + managed DB?
3. **Initial wearable targets** — Which devices/platforms to prioritize?
4. **User onboarding** — Questionnaire-first or data-upload-first?
5. **Multi-user** — Is this single-user initially or multi-tenant from day one?
6. **AI/LLM integration** — Should the "agent" layer use an LLM for natural-language interaction, or is it purely rule-based for now?

---

*This plan is a living document. Update it as decisions are made and phases are completed.*
