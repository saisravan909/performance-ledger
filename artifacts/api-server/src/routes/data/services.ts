import { computeServiceScore, buildMetrics } from "../../engines/scoring.js";
import { computeFlakyRisk, BENCHMARK_RAW_DATA } from "../../engines/flaky.js";
import { generateEvidencePacket, RAW_EVIDENCE_INPUTS } from "../../engines/evidence.js";
import { CONTINUITY_EVIDENCE_PACKETS } from "./continuity.js";

export const RAW_SERVICES = [
  {
    id: "refund-status-api",
    name: "refund-status-api",
    missionReadiness: "READY" as const,
    status: "HEALTHY" as const,
    tier: "TIER_1" as const,
    lastUpdated: "2026-05-28T06:00:00Z",
    p50Latency: 42,
    p95Latency: 118,
    p99Latency: 210,
    errorRate: 0.12,
    throughput: 3420,
    owner: "Platform Engineering",
    releaseCount: 14,
  },
  {
    id: "taxpayer-account-portal",
    name: "taxpayer-account-portal",
    missionReadiness: "AT_RISK" as const,
    status: "WARNING" as const,
    tier: "TIER_1" as const,
    lastUpdated: "2026-05-28T05:45:00Z",
    p50Latency: 210,
    p95Latency: 680,
    p99Latency: 1200,
    errorRate: 1.84,
    throughput: 8900,
    owner: "Citizen Services",
    releaseCount: 9,
  },
  {
    id: "identity-verification-service",
    name: "identity-verification-service",
    missionReadiness: "DEGRADED" as const,
    status: "CRITICAL" as const,
    tier: "TIER_1" as const,
    lastUpdated: "2026-05-28T04:30:00Z",
    p50Latency: 890,
    p95Latency: 2400,
    p99Latency: 4100,
    errorRate: 4.21,
    throughput: 1250,
    owner: "Identity & Access",
    releaseCount: 6,
  },
  {
    id: "payment-plan-api",
    name: "payment-plan-api",
    missionReadiness: "READY" as const,
    status: "HEALTHY" as const,
    tier: "TIER_2" as const,
    lastUpdated: "2026-05-28T07:00:00Z",
    p50Latency: 68,
    p95Latency: 190,
    p99Latency: 340,
    errorRate: 0.28,
    throughput: 2100,
    owner: "Payments Team",
    releaseCount: 18,
  },
  {
    id: "document-upload-service",
    name: "document-upload-service",
    missionReadiness: "AT_RISK" as const,
    status: "WARNING" as const,
    tier: "TIER_2" as const,
    lastUpdated: "2026-05-28T05:15:00Z",
    p50Latency: 320,
    p95Latency: 950,
    p99Latency: 1800,
    errorRate: 2.1,
    throughput: 540,
    owner: "Document Services",
    releaseCount: 7,
  },
  {
    id: "notice-delivery-service",
    name: "notice-delivery-service",
    missionReadiness: "READY" as const,
    status: "HEALTHY" as const,
    tier: "TIER_2" as const,
    lastUpdated: "2026-05-28T07:10:00Z",
    p50Latency: 31,
    p95Latency: 88,
    p99Latency: 145,
    errorRate: 0.05,
    throughput: 4800,
    owner: "Notification Platform",
    releaseCount: 22,
  },
];

export const RELEASES = [
  { id: "rel-001", serviceId: "refund-status-api", serviceName: "refund-status-api", version: "v2.4.1", governanceStatus: "APPROVED" as const, createdAt: "2026-05-27T10:00:00Z", deployedAt: "2026-05-27T14:22:00Z", blockReason: null, debtScoreAtRelease: 28 },
  { id: "rel-002", serviceId: "taxpayer-account-portal", serviceName: "taxpayer-account-portal", version: "v1.9.3", governanceStatus: "BLOCKED" as const, createdAt: "2026-05-26T09:00:00Z", deployedAt: null, blockReason: "P95 latency exceeds 600ms SLO threshold", debtScoreAtRelease: 61 },
  { id: "rel-003", serviceId: "identity-verification-service", serviceName: "identity-verification-service", version: "v3.1.0", governanceStatus: "BLOCKED" as const, createdAt: "2026-05-25T08:00:00Z", deployedAt: null, blockReason: "Error rate 4.2% exceeds 1% threshold — pending remediation", debtScoreAtRelease: 74 },
  { id: "rel-004", serviceId: "payment-plan-api", serviceName: "payment-plan-api", version: "v4.0.2", governanceStatus: "APPROVED" as const, createdAt: "2026-05-27T11:00:00Z", deployedAt: "2026-05-27T15:10:00Z", blockReason: null, debtScoreAtRelease: 35 },
  { id: "rel-005", serviceId: "document-upload-service", serviceName: "document-upload-service", version: "v2.2.0", governanceStatus: "PENDING" as const, createdAt: "2026-05-28T07:00:00Z", deployedAt: null, blockReason: null, debtScoreAtRelease: 52 },
  { id: "rel-006", serviceId: "notice-delivery-service", serviceName: "notice-delivery-service", version: "v5.1.4", governanceStatus: "APPROVED" as const, createdAt: "2026-05-28T06:30:00Z", deployedAt: "2026-05-28T09:00:00Z", blockReason: null, debtScoreAtRelease: 19 },
  { id: "rel-007", serviceId: "refund-status-api", serviceName: "refund-status-api", version: "v2.4.0", governanceStatus: "APPROVED" as const, createdAt: "2026-05-20T10:00:00Z", deployedAt: "2026-05-20T13:00:00Z", blockReason: null, debtScoreAtRelease: 31 },
  { id: "rel-008", serviceId: "payment-plan-api", serviceName: "payment-plan-api", version: "v3.9.8", governanceStatus: "BYPASSED" as const, createdAt: "2026-05-15T10:00:00Z", deployedAt: "2026-05-15T10:45:00Z", blockReason: null, debtScoreAtRelease: 38 },
  { id: "rel-009", serviceId: "notice-delivery-service", serviceName: "notice-delivery-service", version: "v5.1.3", governanceStatus: "APPROVED" as const, createdAt: "2026-05-22T08:00:00Z", deployedAt: "2026-05-22T10:00:00Z", blockReason: null, debtScoreAtRelease: 20 },
  { id: "rel-010", serviceId: "taxpayer-account-portal", serviceName: "taxpayer-account-portal", version: "v1.9.2", governanceStatus: "APPROVED" as const, createdAt: "2026-05-10T10:00:00Z", deployedAt: "2026-05-10T14:00:00Z", blockReason: null, debtScoreAtRelease: 55 },
];

const RAW_FLAKY_SIGNALS = [
  { id: "flk-001", serviceId: "identity-verification-service", serviceName: "identity-verification-service", benchmark: "p99-latency-gate", detectedAt: "2026-05-26T12:00:00Z", status: "OPEN" as const, description: "P99 latency exceeds 4000ms on 41% of benchmark runs due to external ID provider variability", affectedRuns: 41, totalRuns: 100 },
  { id: "flk-002", serviceId: "taxpayer-account-portal", serviceName: "taxpayer-account-portal", benchmark: "throughput-under-load", detectedAt: "2026-05-25T09:00:00Z", status: "INVESTIGATING" as const, description: "Throughput drops >30% under simulated peak load — possible connection pool exhaustion", affectedRuns: 29, totalRuns: 50 },
  { id: "flk-003", serviceId: "document-upload-service", serviceName: "document-upload-service", benchmark: "error-rate-gate", detectedAt: "2026-05-24T14:00:00Z", status: "OPEN" as const, description: "Intermittent 503 errors from storage backend during multipart upload tests", affectedRuns: 22, totalRuns: 50 },
  { id: "flk-004", serviceId: "refund-status-api", serviceName: "refund-status-api", benchmark: "p95-latency-gate", detectedAt: "2026-05-20T10:00:00Z", status: "RESOLVED" as const, description: "Resolved — JVM warm-up artifact in cold-start benchmark runs", affectedRuns: 9, totalRuns: 50 },
  { id: "flk-005", serviceId: "identity-verification-service", serviceName: "identity-verification-service", benchmark: "error-rate-gate", detectedAt: "2026-05-27T08:00:00Z", status: "OPEN" as const, description: "Error rate gate fails intermittently when identity cache expires mid-test run", affectedRuns: 36, totalRuns: 51 },
  { id: "flk-006", serviceId: "payment-plan-api", serviceName: "payment-plan-api", benchmark: "concurrent-request-gate", detectedAt: "2026-05-18T11:00:00Z", status: "SUPPRESSED" as const, description: "Suppressed — test infrastructure noise, not service regression", affectedRuns: 14, totalRuns: 52 },
  { id: "flk-007", serviceId: "taxpayer-account-portal", serviceName: "taxpayer-account-portal", benchmark: "p50-baseline", detectedAt: "2026-05-28T03:00:00Z", status: "OPEN" as const, description: "P50 latency drifts above 200ms baseline on evening runs — possible cron job interference", affectedRuns: 17, totalRuns: 50 },
];

function severityFromLabel(label: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  switch (label) {
    case "Untrusted": return "CRITICAL";
    case "Flaky": return "CRITICAL";
    case "Noisy": return "HIGH";
    case "Watch": return "MEDIUM";
    default: return "LOW";
  }
}

export const FLAKY_SIGNALS = RAW_FLAKY_SIGNALS.map((raw) => {
  const rawData = BENCHMARK_RAW_DATA.find((d) => d.signalId === raw.id);
  const components = rawData?.components ?? {
    sameCommitFlipRate: 0,
    metricVarianceScore: 0,
    runnerNoiseScore: 0,
    baselineDriftScore: 0,
    nearThresholdFailureRate: 0,
    rerunDisagreementRate: 0,
  };
  const cause = rawData?.primaryCause ?? "Insufficient benchmark data";
  const detection = computeFlakyRisk(raw.id, components, cause, raw.benchmark, raw.serviceName);
  return {
    ...raw,
    flakinessScore: detection.flakyRiskScore,
    severity: severityFromLabel(detection.flakyLabel),
    ...detection,
  };
});

export const EVIDENCE_PACKETS = [
  ...RAW_EVIDENCE_INPUTS.map(generateEvidencePacket),
  ...CONTINUITY_EVIDENCE_PACKETS,
];

function scoredService(raw: typeof RAW_SERVICES[number]) {
  const metrics = buildMetrics(raw, RELEASES, FLAKY_SIGNALS);
  const scoring = computeServiceScore(metrics);
  return {
    ...raw,
    debtScore: Math.round(100 - scoring.score),
    healthScore: Math.round(scoring.score),
    ...scoring,
  };
}

export const SERVICES = RAW_SERVICES.map(scoredService);

function makeTrend(base: number, points: number, volatility = 0.12, direction = 0): Array<{ date: string; value: number; label: string | null }> {
  const now = new Date("2026-05-28");
  const result = [];
  let current = base;
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const noise = (Math.random() - 0.5) * 2 * volatility * base;
    const drift = direction * base * 0.005;
    current = Math.max(0, current + noise + drift);
    result.push({
      date: d.toISOString().split("T")[0],
      value: Math.round(current * 10) / 10,
      label: null,
    });
  }
  return result;
}

export function getServiceDetail(id: string) {
  const svc = SERVICES.find((s) => s.id === id);
  if (!svc) return null;

  return {
    ...svc,
    latencyTrend: makeTrend(svc.p95Latency, 30, 0.1),
    errorRateTrend: makeTrend(svc.errorRate, 30, 0.15),
    debtHistory: makeTrend(svc.debtScore, 30, 0.08, -0.2),
    recentReleases: RELEASES.filter((r) => r.serviceId === id).slice(0, 5),
    flakySignals: FLAKY_SIGNALS.filter((f) => f.serviceId === id),
    evidencePackets: EVIDENCE_PACKETS.filter((e) => e.serviceId === id).slice(0, 5),
  };
}

export function getDashboardSummary() {
  const scores = SERVICES.map((s) => s.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
  return {
    totalServices: SERVICES.length,
    avgDebtScore: Math.round(100 - avgScore),
    avgHealthScore: Math.round(avgScore),
    avgScore,
    criticalServices: SERVICES.filter((s) => s.status === "CRITICAL").length,
    atRiskServices: SERVICES.filter((s) => s.missionReadiness === "AT_RISK" || s.missionReadiness === "DEGRADED").length,
    readyServices: SERVICES.filter((s) => s.missionReadiness === "READY").length,
    totalReleases: RELEASES.length,
    blockedReleases: RELEASES.filter((r) => r.governanceStatus === "BLOCKED").length,
    totalFlakySignals: FLAKY_SIGNALS.filter((f) => f.status === "OPEN" || f.status === "INVESTIGATING").length,
    portfolioMissionReadiness: "AT_RISK" as const,
    debtScoreChange: -4.2,
    healthScoreChange: 2.1,
    scoreChange: 2.1,
  };
}

export function getDebtTrend() {
  const now = new Date("2026-05-28");
  const result = [];
  let val = 48;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    val = Math.max(20, val + (Math.random() - 0.52) * 3);
    result.push({ date: d.toISOString().split("T")[0], value: Math.round(val * 10) / 10, label: null });
  }
  return result;
}

export function getMissionReadiness() {
  return SERVICES.map((s) => ({
    serviceId: s.id,
    serviceName: s.name,
    readiness: s.missionReadiness,
    score: s.score,
    grade: s.grade,
    trend: s.scoreTrend,
  }));
}

export function getRoiSummary() {
  const savingsTrend = [];
  const now = new Date("2026-05-28");
  let cumulative = 0;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    cumulative += 18000 + Math.random() * 12000;
    savingsTrend.push({ date: d.toISOString().split("T")[0].slice(0, 7), value: Math.round(cumulative), label: null });
  }
  return {
    totalSavingsUsd: 124800,
    incidentsPrevented: 23,
    deploymentTimeReductionPct: 38,
    automationCoverageScore: 74,
    mttrReductionPct: 52,
    annualizedSavingsUsd: 249600,
    savingsTrend,
  };
}

export function getRoiBreakdown() {
  return [
    { serviceId: "refund-status-api", serviceName: "refund-status-api", savingsUsd: 32400, incidentsPrevented: 5, automationCoverage: 88, timeReductionHrs: 42 },
    { serviceId: "taxpayer-account-portal", serviceName: "taxpayer-account-portal", savingsUsd: 18600, incidentsPrevented: 4, automationCoverage: 61, timeReductionHrs: 28 },
    { serviceId: "identity-verification-service", serviceName: "identity-verification-service", savingsUsd: 9200, incidentsPrevented: 2, automationCoverage: 38, timeReductionHrs: 14 },
    { serviceId: "payment-plan-api", serviceName: "payment-plan-api", savingsUsd: 28900, incidentsPrevented: 6, automationCoverage: 82, timeReductionHrs: 38 },
    { serviceId: "document-upload-service", serviceName: "document-upload-service", savingsUsd: 14700, incidentsPrevented: 3, automationCoverage: 55, timeReductionHrs: 19 },
    { serviceId: "notice-delivery-service", serviceName: "notice-delivery-service", savingsUsd: 21000, incidentsPrevented: 3, automationCoverage: 94, timeReductionHrs: 31 },
  ];
}

export function getFlakySignalSummary() {
  const open = FLAKY_SIGNALS.filter((f) => f.status === "OPEN" || f.status === "INVESTIGATING");
  const critical = FLAKY_SIGNALS.filter((f) => f.severity === "CRITICAL");
  const avgFlakiness = Math.round(FLAKY_SIGNALS.reduce((a, f) => a + f.flakinessScore, 0) / FLAKY_SIGNALS.length);
  return {
    totalSignals: FLAKY_SIGNALS.length,
    openSignals: open.length,
    criticalSignals: critical.length,
    avgFlakinessScore: avgFlakiness,
    mostAffectedService: "identity-verification-service",
  };
}
