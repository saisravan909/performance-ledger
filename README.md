# Performance Ledger & Continuity Ledger

**Two integrated governance platforms giving executive and engineering leadership a single authoritative view of whether services are healthy, stable, and operationally resilient — especially under peak load conditions like filing season.**

**Performance Ledger** is the engineering reliability platform. It scores every service across stability, test coverage, regression frequency, and benchmark signal quality — surfaces blocked releases and flaky signals producing false confidence, and generates SHA-256 auditable evidence packets for every performance gate decision.

**Continuity Ledger** is the operational resilience platform. It tracks every service restart event during filing season, scores the portfolio on recovery readiness and continuity risk, and shows leadership exactly how many services can recover automatically versus how many require manual operator intervention — before an incident forces that answer.

Together they replace scattered dashboards, manual status updates, and tribal knowledge with a structured, scored, and auditable system for managing engineering risk at the executive level.

---

## Overview

Modern engineering organizations generate enormous volumes of performance data: latency measurements, error rates, benchmark runs, CI pass/fail results, and server restart events. Performance Ledger aggregates this signal into a coherent governance model with seven first-class concepts:

| Concept | Description |
|---|---|
| **Health Score** | Composite 0–100 score per service, graded A–F |
| **Technical Debt Score** | Inverse of health score; quantifies governance backlog |
| **Mission Readiness** | Operational posture: READY / AT_RISK / DEGRADED / CRITICAL |
| **Flaky Signal Detection** | Statistical noise model that classifies benchmark gates as Stable → Untrusted |
| **Evidence Packets** | Immutable, SHA-256-hashed audit records for every release gate and reboot recovery evaluation |
| **ROI Tracking** | Quantified business value from automated governance (incident prevention, time saved) |
| **Recovery Readiness** | Filing-season continuity score based on automation coverage, health checks, and MTTR |

---

## Features

### Executive Dashboard
- Portfolio-level health, debt, blocked releases, and flaky signal counts
- **Filing Season Operational Continuity** row — four dedicated cards:
  - Filing Season Continuity Risk (ContinuityRiskScore 0–100, lower is better)
  - Recovery Readiness Score (portfolio average 0–100, higher is better)
  - Manual Recoveries Required (count of services needing operator intervention)
  - Failed Post-Reboot Checks (health checks returning FAILED or PARTIAL)
- 30-day portfolio debt trend chart
- Per-service Mission Readiness panel with grade badges and score trends

### Service Scorecard
- Full-fleet view with sortable, searchable table
- Composite health score with six weighted components:
  - Stability (25%) — error rate + P95 latency vs SLO
  - Regression Frequency (20%) — blocked release rate in rolling window
  - Regression Severity (20%) — critical gate failure type analysis
  - Trend (15%) — mission readiness trajectory
  - Test Coverage (10%) — automation coverage vs 80% target
  - Signal Reliability (10%) — open flaky benchmark penalty
- Grade assignment: A (≥90) · B (≥80) · C (≥65) · D (≥50) · F (<50)

### Service Detail
- Per-service 30-day latency, error rate, and debt history charts
- Recent release history with governance status
- Linked flaky signals and evidence packets

### Flaky Signal Detector
- Six-component risk model per benchmark gate:
  - Same-commit flip rate, metric variance, runner noise, baseline drift, near-threshold failure rate, rerun disagreement
- Labels: Stable / Watch / Noisy / Flaky / Untrusted
- Confidence levels: HIGH / MODERATE / LOW / VERY_LOW
- Executive summary, gate recommendation, and developer-level remediation path per signal

### ROI Summary
- Total and annualized savings from automated governance
- Per-service cost avoidance breakdown
- Incidents prevented and mean-time-to-recovery reduction metrics
- Cumulative savings trend chart

### Evidence Packets
- Full audit trail for every release gate evaluation and reboot recovery event
- SHA-256 audit hash (deterministic, tamper-evident)
- Signal trust score at gate evaluation time
- Metric violations with baseline/observed delta
- Filtering by decision (ALLOWED / BLOCKED / WARNED / OVERRIDDEN) and event type (Reboot Recovery)
- CSV and JSON export

### Operational Continuity Ledger
- Filing-season reboot and recovery governance for mission-critical services
- **Reboot & Recovery** KPI row — 6 cards: events, affected services, auto-recovered, manual recovery, avg MTTR, failed health checks
- **Operational Pressure Events** KPI row — 5 new event categories:
  - Queue Backlog Events — post-restart submission queue accumulation
  - DB Pool Pressure — connection pool exhaustion events
  - Cache Cold Starts — unwarmed cache states on restart
  - Autoscaling Lag — HPA delayed scale-out events
  - Dependency Timeouts — restarts triggered by upstream dependency failure
- Detailed event panels for each operational pressure category with severity, duration, and resolution type
- 10-event reboot timeline with cause classification (OOM Kill, Kernel Panic, Dependency Timeout, etc.)
- Recovery type tracking: AUTO vs MANUAL, with MTTR per event
- Post-reboot health check outcome (PASSED / PARTIAL / FAILED)
- Per-service Recovery Readiness Score (0–100) and ContinuityRiskScore (0–100)
- Portfolio continuity risk level: LOW / MODERATE / HIGH / CRITICAL
- Recommended automation actions ranked by remediation impact
- Service continuity detail grid: six coverage flags per service
- **Continuity Evidence Packets** table — all reboot recovery audit records with decision badges, metric violations, signal trust scores, and audit hashes
- **Continuity Risk Explanation** — narrative summary that adapts to the current risk level, with primary driver, most exposed service, target level, and action count

---

## Architecture

```
performance-ledger/
├── artifacts/
│   ├── api-server/                  # Express + TypeScript API (port 8080)
│   │   ├── src/
│   │   │   ├── engines/
│   │   │   │   ├── scoring.ts       # Health score + grade computation
│   │   │   │   ├── flaky.ts         # Flaky risk model
│   │   │   │   ├── evidence.ts      # SHA-256 audit packet generation
│   │   │   │   └── recovery.ts      # RecoveryReadinessScore + ContinuityRiskScore engines
│   │   │   ├── routes/
│   │   │   │   ├── data/
│   │   │   │   │   ├── services.ts      # Core synthetic data + scoring pipeline
│   │   │   │   │   └── continuity.ts   # Reboot events, readiness profiles, secondary events
│   │   │   │   ├── continuity.ts        # GET /api/continuity
│   │   │   │   └── ...                  # dashboard, services, roi, flaky, evidence
│   │   │   └── db/                  # DB-first repository with synthetic fallback
│   └── performance-ledger/          # React + Vite + Tailwind frontend
│       └── src/
│           ├── pages/
│           │   ├── Dashboard.tsx        # Executive dashboard with 4-card continuity row
│           │   ├── ServicesList.tsx
│           │   ├── ServiceDetail.tsx
│           │   ├── RoiSummary.tsx
│           │   ├── FlakySignals.tsx
│           │   ├── EvidencePackets.tsx
│           │   └── Continuity.tsx       # Operational Continuity Ledger (all sections)
│           ├── components/              # Shadcn/ui component library
│           └── lib/
│               ├── utils.ts             # Color utilities + formatters
│               ├── export.ts            # CSV / JSON download helpers
│               └── continuity-api.ts   # Custom TanStack Query hook + full type definitions
├── lib/
│   ├── api-client-react/    # Generated React Query hooks (Orval)
│   ├── api-spec/            # OpenAPI 3.0 specification
│   ├── api-zod/             # Generated Zod schemas + TypeScript types
│   └── db/                  # Drizzle ORM schema + PostgreSQL connection
└── scripts/                 # Workspace utilities
```

**Data flow:**
1. API server routes call the DB-first repository (or compute directly from synthetic data)
2. Repository queries PostgreSQL via Drizzle ORM; falls back to seeded synthetic data if `DATABASE_URL` is unset
3. Synthetic data passes through the same scoring, flaky, evidence, and recovery engines as live data
4. Frontend calls the API through generated React Query hooks (`@workspace/api-client-react`) for all core endpoints and a custom `useGetContinuitySummary` hook for the continuity module

**Tech stack:**

| Layer | Technology |
|---|---|
| API | Express 5, TypeScript, Pino logging |
| Frontend | React 19, Vite, Tailwind CSS v4, Shadcn/ui |
| Data fetching | TanStack Query v5 + Orval-generated hooks |
| Database | PostgreSQL + Drizzle ORM |
| API contract | OpenAPI 3.0 → Orval codegen |
| Testing | Vitest (38 engine unit tests) |
| Build | esbuild (API), Vite (frontend) |
| Package manager | pnpm workspaces |

---

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (optional — app falls back to demo data without it)

### Install

```bash
git clone https://github.com/your-org/performance-ledger.git
cd performance-ledger
pnpm install
```

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```bash
# Required — API server
DATABASE_URL=postgresql://user:password@localhost:5432/performance_ledger

# Set automatically by the workspace runner
PORT=8080
BASE_PATH=/
```

If `DATABASE_URL` is not set, the app runs entirely on seeded demo data. All features including the Continuity Ledger work in this mode.

### Database Setup (optional)

```bash
# Push the Drizzle schema to your PostgreSQL instance
pnpm --filter @workspace/db run push

# Seed with 35 rows of demo data across 6 tables
pnpm --filter @workspace/db run seed
```

### Run

```bash
# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (reads PORT from environment)
pnpm --filter @workspace/performance-ledger run dev
```

Open [http://localhost:PORT](http://localhost:PORT) in your browser.

### Run Tests

```bash
pnpm --filter @workspace/api-server run test
```

Runs 38 unit tests covering the scoring engine, flaky risk model, and evidence packet generation.

---

## Demo Data

When no database is connected, Performance Ledger ships with six pre-configured demo services representing a realistic mix of performance postures:

| Service | Tier | Status | Grade | Mission Readiness | Recovery Readiness |
|---|---|---|---|---|---|
| refund-status-api | TIER_1 | HEALTHY | A | READY | 100 / A |
| taxpayer-account-portal | TIER_1 | WARNING | F | AT_RISK | 10 / F |
| identity-verification-service | TIER_1 | CRITICAL | F | DEGRADED | 0 / F |
| payment-plan-api | TIER_2 | HEALTHY | A | READY | 90 / A |
| document-upload-service | TIER_2 | WARNING | C | AT_RISK | 66 / C |
| notice-delivery-service | TIER_2 | HEALTHY | A | READY | 90 / A |

Demo data includes:
- **10** filing-season reboot events across 5 services
- **4** queue backlog events (2 CRITICAL)
- **3** database pool pressure events (repeated exhaustion on identity-verification-service)
- **4** cache cold start events (3 unwarmed, 1 automated warmup)
- **3** autoscaling lag events (1 CRITICAL — no HPA configured)
- **7** flaky benchmark signals
- **18** evidence packets (8 release gate + 10 reboot recovery)
- **6** ROI calculations
- **10** CI run records

All scores are computed live through the same engines used in production — no hardcoded output values.

---

## API Endpoints

Base URL: `http://localhost:8080/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | API health check |
| `GET` | `/services` | List all services with health scores |
| `GET` | `/services/:id` | Service detail with trend charts and linked records |
| `GET` | `/releases` | All CI run records |
| `GET` | `/dashboard/summary` | Portfolio-level KPI aggregates |
| `GET` | `/dashboard/debt-trend` | 30-day portfolio debt trend time series |
| `GET` | `/dashboard/mission-readiness` | Per-service readiness posture |
| `GET` | `/roi/summary` | Portfolio ROI KPIs and savings trend |
| `GET` | `/roi/breakdown` | Per-service savings breakdown |
| `GET` | `/flaky/signals` | All benchmark flaky signals |
| `GET` | `/flaky/summary` | Flaky signal aggregate statistics |
| `GET` | `/evidence` | All evidence packets (release gate + reboot recovery) |
| `GET` | `/evidence/:id` | Single evidence packet by ID |
| `GET` | `/continuity` | Full continuity summary — reboot events, readiness scores, operational pressure events, automation recommendations, evidence packets |

All responses are JSON. The full OpenAPI 3.0 specification is at `lib/api-spec/openapi.yaml`.

### `/continuity` response shape

```jsonc
{
  "filingSeasonContinuityRisk": "HIGH",       // LOW | MODERATE | HIGH | CRITICAL
  "continuityRiskScore": 51,                  // 0–100, higher = more risk
  "recoveryReadinessScore": 65,               // 0–100, higher = better prepared
  "totalRebootEvents": 10,
  "servicesImpacted": 5,
  "autoRecoveredServices": 3,
  "manualRecoveryRequired": 2,
  "averageRecoveryTimeMinutes": 33.4,
  "failedPostRebootChecks": 6,
  "queueBacklogEvents": 4,
  "databasePoolPressureEvents": 3,
  "cacheColdStartEvents": 4,
  "autoscalingLagEvents": 3,
  "dependencyTimeoutEvents": 2,
  "continuityTimeline": [ /* RebootEvent[] */ ],
  "queueBacklogDetail": [ /* OperationalEvent[] */ ],
  "databasePoolDetail": [ /* OperationalEvent[] */ ],
  "cacheColdStartDetail": [ /* OperationalEvent[] */ ],
  "autoscalingLagDetail": [ /* OperationalEvent[] */ ],
  "affectedServices": [ /* ServiceReadiness[] */ ],
  "automationRecommendations": [ /* string[] */ ],
  "continuityEvidencePackets": [ /* EvidencePacket[] */ ]
}
```

---

## Scoring Models

### Health Score

Composite 0–100, weighted sum of six components:

```
score = 0.25 × stability
      + 0.20 × regression_frequency
      + 0.20 × regression_severity
      + 0.15 × trend
      + 0.10 × test_coverage
      + 0.10 × signal_reliability
```

Grade thresholds: **A** ≥ 90 · **B** ≥ 80 · **C** ≥ 65 · **D** ≥ 50 · **F** < 50

### Flaky Risk Score

Weighted sum of six benchmark signal components (each 0.0–1.0 input → 0–100 output):

```
risk = 0.30 × same_commit_flip_rate
     + 0.20 × metric_variance
     + 0.15 × runner_noise
     + 0.15 × baseline_drift
     + 0.10 × near_threshold_failure_rate
     + 0.10 × rerun_disagreement
```

Label thresholds: **Stable** < 30 · **Watch** 30–50 · **Noisy** 50–70 · **Flaky** 70–85 · **Untrusted** ≥ 85

### Recovery Readiness Score

Composite 0–100 based on automation coverage and operational capability. **Higher = better prepared.**

```
score = automation_coverage + recovery_speed_score − manual_recovery_penalty

automation_coverage (max 90):
  auto_restart_configured    → +30
  health_checks_available    → +25
  smoke_tests_available      → +20
  dependency_checks          → +10
  cache_warmup               → +5

recovery_speed_score (max 20):
  mttr ≤ 5 min               → +20
  mttr ≤ 15 min              → +15
  mttr ≤ 30 min              → +10
  mttr ≤ 60 min              → +5
  mttr > 60 min              →   0

manual_recovery_penalty:
  manual recovery required   → −20
```

Grade thresholds: **A** ≥ 90 · **B** ≥ 75 · **C** ≥ 55 · **D** ≥ 35 · **F** < 35

Risk level: **LOW** ≥ 80 · **MODERATE** ≥ 60 · **HIGH** ≥ 40 · **CRITICAL** < 40

### Continuity Risk Score

Composite 0–100 measuring portfolio-level incident exposure. **Higher = more risk** (inverse of Recovery Readiness).

```
risk = 0.25 × reboot_frequency_score     (reboots per service × 25, capped at 100)
     + 0.20 × manual_recovery_rate       (manual events / total reboots × 100)
     + 0.20 × failed_health_check_rate   (failed checks / total reboots × 100)
     + 0.15 × recovery_time_risk         (avg MTTR / 60 min × 100, capped at 100)
     + 0.10 × repeated_incident_rate     (services with >1 reboot / impacted services × 100)
     + 0.10 × criticality_exposure       (Tier 1 services affected / total services × 100)
```

Risk level: **LOW** < 25 · **MODERATE** 25–50 · **HIGH** 50–75 · **CRITICAL** ≥ 75

---

## Roadmap

- [x] Operational Continuity Ledger — filing-season reboot and recovery governance
- [x] ContinuityRiskScore engine — separate portfolio risk score distinct from Recovery Readiness
- [x] Operational pressure event categories — queue backlog, DB pool, cache cold start, autoscaling lag
- [ ] Webhook ingestion for CI/CD events (GitHub Actions, Jenkins, CircleCI)
- [ ] Prometheus/Grafana adapter for live latency and error rate ingestion
- [ ] JUnit/xUnit test result ingestion pipeline
- [ ] Service catalog YAML importer
- [ ] Real-time score updates via Server-Sent Events
- [ ] Policy-as-code: configurable gate thresholds per service tier
- [ ] SAML/OIDC authentication
- [ ] Slack and PagerDuty alert integrations
- [ ] Historical score trend storage in PostgreSQL
- [ ] Multi-tenant workspace support
- [ ] CLI tool for local gate evaluation

---

## Screenshots

<!-- Add screenshots here after deploying -->

| Dashboard | Continuity Ledger |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Continuity](docs/screenshots/continuity.png) |

| Flaky Signals | Evidence Packets |
|---|---|
| ![Flaky](docs/screenshots/flaky.png) | ![Evidence](docs/screenshots/evidence.png) |

---

## License

MIT
