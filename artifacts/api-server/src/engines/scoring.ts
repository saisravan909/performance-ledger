export type Grade = "A" | "B" | "C" | "D" | "F";
export type Trend = "UP" | "DOWN" | "STABLE";
export type DriverImpact = "LOW" | "MEDIUM" | "HIGH";

export interface ScoreComponents {
  stability: number;
  regressionFrequency: number;
  regressionSeverity: number;
  trend: number;
  testCoverage: number;
  signalReliability: number;
}

export interface ScoreDriver {
  component: string;
  label: string;
  impact: DriverImpact;
  detail: string;
}

export interface ScoringResult {
  score: number;
  grade: Grade;
  scoreDelta: number;
  scoreTrend: Trend;
  scoreComponents: ScoreComponents;
  scoreDrivers: ScoreDriver[];
  recommendedAction: string;
}

export interface ServiceMetrics {
  id: string;
  errorRate: number;
  p95Latency: number;
  p99Latency: number;
  missionReadiness: "READY" | "AT_RISK" | "DEGRADED" | "CRITICAL";
  blockedReleases: number;
  totalReleases: number;
  hasSeverityBlock: boolean;
  hasErrorRateBlock: boolean;
  automationCoverage: number;
  openFlakySignals: Array<{ flakinessScore: number; severity: string }>;
}

function gradeFromScore(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

function trendFromDelta(delta: number): Trend {
  if (delta > 1) return "UP";
  if (delta < -1) return "DOWN";
  return "STABLE";
}

function computeStability(errorRate: number, p95ms: number): number {
  let errorScore: number;
  if (errorRate < 0.25) errorScore = 1.0;
  else if (errorRate < 0.5) errorScore = 0.9;
  else if (errorRate < 1.0) errorScore = 0.75;
  else if (errorRate < 2.0) errorScore = 0.55;
  else if (errorRate < 4.0) errorScore = 0.35;
  else errorScore = 0.12;

  let latencyScore: number;
  if (p95ms < 150) latencyScore = 1.0;
  else if (p95ms < 300) latencyScore = 0.85;
  else if (p95ms < 600) latencyScore = 0.65;
  else if (p95ms < 1200) latencyScore = 0.42;
  else if (p95ms < 2500) latencyScore = 0.22;
  else latencyScore = 0.08;

  return (errorScore * 0.6 + latencyScore * 0.4);
}

function computeRegressionFrequency(blockedReleases: number, totalReleases: number): number {
  if (totalReleases === 0) return 0.5;
  const blockRate = blockedReleases / totalReleases;
  if (blockRate === 0) return 1.0;
  if (blockRate <= 0.1) return 0.85;
  if (blockRate <= 0.2) return 0.65;
  if (blockRate <= 0.4) return 0.40;
  return 0.15;
}

function computeRegressionSeverity(blockedReleases: number, hasSeverityBlock: boolean, hasErrorRateBlock: boolean): number {
  if (blockedReleases === 0) return 1.0;
  if (hasErrorRateBlock && hasSeverityBlock) return 0.18;
  if (hasErrorRateBlock || hasSeverityBlock) return 0.45;
  return 0.70;
}

function computeTrend(readiness: string): number {
  switch (readiness) {
    case "READY": return 0.92;
    case "AT_RISK": return 0.62;
    case "DEGRADED": return 0.35;
    case "CRITICAL": return 0.12;
    default: return 0.5;
  }
}

function computeTestCoverage(automationCoverage: number): number {
  return automationCoverage / 100;
}

function computeSignalReliability(signals: Array<{ flakinessScore: number; severity: string }>): number {
  const open = signals.filter((s) => s.severity !== "SUPPRESSED" && s.severity !== "RESOLVED");
  if (open.length === 0) return 1.0;
  const avgFlakiness = open.reduce((sum, s) => sum + s.flakinessScore, 0) / open.length;
  const criticalPenalty = open.filter((s) => s.severity === "CRITICAL").length * 0.12;
  const base = 1 - avgFlakiness / 100;
  return Math.max(0.05, base - criticalPenalty);
}

function identifyDrivers(components: ScoreComponents, metrics: ServiceMetrics): ScoreDriver[] {
  const drivers: ScoreDriver[] = [];

  if (components.stability < 0.6) {
    const impact: DriverImpact = components.stability < 0.35 ? "HIGH" : "MEDIUM";
    drivers.push({
      component: "Stability",
      label: "Latency or error rate instability",
      impact,
      detail: `P95 latency ${metrics.p95Latency}ms; error rate ${metrics.errorRate.toFixed(2)}% — both above SLO thresholds`,
    });
  }

  if (components.regressionFrequency < 0.7) {
    drivers.push({
      component: "Regression Frequency",
      label: `${metrics.blockedReleases} blocked release${metrics.blockedReleases !== 1 ? "s" : ""} in window`,
      impact: components.regressionFrequency < 0.45 ? "HIGH" : "MEDIUM",
      detail: "Release gate failures indicate recurring regressions not caught pre-deploy",
    });
  }

  if (components.regressionSeverity < 0.6) {
    drivers.push({
      component: "Regression Severity",
      label: "Critical regression gates failed",
      impact: "HIGH",
      detail: metrics.hasErrorRateBlock
        ? "Error rate regression exceeded acceptable threshold — high user impact"
        : "Latency regression exceeded SLO — degraded user experience",
    });
  }

  if (components.trend < 0.6) {
    drivers.push({
      component: "Trend",
      label: "Score trending downward",
      impact: components.trend < 0.35 ? "HIGH" : "MEDIUM",
      detail: `Mission readiness is ${metrics.missionReadiness.replace("_", " ").toLowerCase()} — trajectory requires intervention`,
    });
  }

  if (components.signalReliability < 0.6) {
    const openCount = metrics.openFlakySignals.length;
    drivers.push({
      component: "Signal Reliability",
      label: `${openCount} open flaky benchmark signal${openCount !== 1 ? "s" : ""}`,
      impact: metrics.openFlakySignals.some((s) => s.severity === "CRITICAL") ? "HIGH" : "MEDIUM",
      detail: "Benchmark noise reduces confidence in gate results and blocks accurate debt measurement",
    });
  }

  if (components.testCoverage < 0.65) {
    drivers.push({
      component: "Test Coverage",
      label: "Automation coverage below target",
      impact: components.testCoverage < 0.5 ? "HIGH" : "LOW",
      detail: `${Math.round(components.testCoverage * 100)}% automation coverage — target is 80%`,
    });
  }

  return drivers.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.impact] - order[b.impact];
  }).slice(0, 4);
}

function buildRecommendation(score: number, drivers: ScoreDriver[], metrics: ServiceMetrics): string {
  if (score >= 90) return "Service is operating within all SLOs. Continue regular benchmarking cadence and maintain automation coverage above 80%.";
  if (score >= 80) return "Minor stability drift detected. Review latency SLO margins and close any open flaky signals before next release.";

  const topDriver = drivers[0];
  if (!topDriver) return "Review benchmark baselines and ensure automation coverage meets the 80% target.";

  if (topDriver.component === "Stability") {
    if (metrics.errorRate > 2) {
      return `Error rate at ${metrics.errorRate.toFixed(2)}% is the primary driver. Triage error sources, implement circuit-breaking if upstream dependent, and set a recovery gate before unblocking releases.`;
    }
    return `P95 latency at ${metrics.p95Latency}ms exceeds the 500ms SLO. Profile hot paths, retune benchmark baseline, and validate under realistic concurrency before next release attempt.`;
  }

  if (topDriver.component === "Signal Reliability") {
    return "Retune flaky benchmark gates to eliminate noise. Suppressed signals must be investigated — do not allow CRITICAL signals to age past 48 hours without resolution or escalation.";
  }

  if (topDriver.component === "Regression Frequency") {
    return `${metrics.blockedReleases} releases blocked in the current window. Shift-left performance gates to the PR level to catch regressions before they reach the release pipeline.`;
  }

  return "Stabilize error rate and latency SLOs first, then address benchmark flakiness. Prioritize automation coverage expansion to improve signal confidence.";
}

const SERVICE_AUTOMATION_COVERAGE: Record<string, number> = {
  "refund-status-api": 88,
  "taxpayer-account-portal": 61,
  "identity-verification-service": 38,
  "payment-plan-api": 82,
  "document-upload-service": 55,
  "notice-delivery-service": 94,
};

const SCORE_DELTAS: Record<string, number> = {
  "refund-status-api": 2.1,
  "taxpayer-account-portal": -5.3,
  "identity-verification-service": -8.9,
  "payment-plan-api": 1.4,
  "document-upload-service": -3.2,
  "notice-delivery-service": 3.8,
};

export function computeServiceScore(metrics: ServiceMetrics): ScoringResult {
  const components: ScoreComponents = {
    stability: computeStability(metrics.errorRate, metrics.p95Latency),
    regressionFrequency: computeRegressionFrequency(metrics.blockedReleases, metrics.totalReleases),
    regressionSeverity: computeRegressionSeverity(metrics.blockedReleases, metrics.hasSeverityBlock, metrics.hasErrorRateBlock),
    trend: computeTrend(metrics.missionReadiness),
    testCoverage: computeTestCoverage(metrics.automationCoverage),
    signalReliability: computeSignalReliability(metrics.openFlakySignals),
  };

  const rawScore =
    0.25 * components.stability +
    0.20 * components.regressionFrequency +
    0.20 * components.regressionSeverity +
    0.15 * components.trend +
    0.10 * components.testCoverage +
    0.10 * components.signalReliability;

  const score = Math.round(rawScore * 1000) / 10;
  const grade = gradeFromScore(score);
  const scoreDelta = SCORE_DELTAS[metrics.id] ?? 0;
  const scoreTrend = trendFromDelta(scoreDelta);
  const drivers = identifyDrivers(components, metrics);
  const recommendedAction = buildRecommendation(score, drivers, metrics);

  const roundedComponents: ScoreComponents = {
    stability: Math.round(components.stability * 1000) / 10,
    regressionFrequency: Math.round(components.regressionFrequency * 1000) / 10,
    regressionSeverity: Math.round(components.regressionSeverity * 1000) / 10,
    trend: Math.round(components.trend * 1000) / 10,
    testCoverage: Math.round(components.testCoverage * 1000) / 10,
    signalReliability: Math.round(components.signalReliability * 1000) / 10,
  };

  return { score, grade, scoreDelta, scoreTrend, scoreComponents: roundedComponents, scoreDrivers: drivers, recommendedAction };
}

export function buildMetrics(
  svc: { id: string; errorRate: number; p95Latency: number; p99Latency: number; missionReadiness: string },
  releases: Array<{ serviceId: string; governanceStatus: string; blockReason: string | null }>,
  flakySignals: Array<{ serviceId: string; flakinessScore: number; severity: string; status: string }>
): ServiceMetrics {
  const svcReleases = releases.filter((r) => r.serviceId === svc.id);
  const blockedReleases = svcReleases.filter((r) => r.governanceStatus === "BLOCKED");

  const hasErrorRateBlock = blockedReleases.some(
    (r) => r.blockReason?.toLowerCase().includes("error rate") || r.blockReason?.toLowerCase().includes("error")
  );
  const hasSeverityBlock = blockedReleases.some(
    (r) => r.blockReason?.toLowerCase().includes("latency") || r.blockReason?.toLowerCase().includes("slo")
  );

  const openSignals = flakySignals
    .filter((f) => f.serviceId === svc.id && f.status !== "RESOLVED" && f.status !== "SUPPRESSED")
    .map((f) => ({ flakinessScore: f.flakinessScore, severity: f.severity }));

  return {
    id: svc.id,
    errorRate: svc.errorRate,
    p95Latency: svc.p95Latency,
    p99Latency: svc.p99Latency,
    missionReadiness: svc.missionReadiness as ServiceMetrics["missionReadiness"],
    blockedReleases: blockedReleases.length,
    totalReleases: svcReleases.length,
    hasErrorRateBlock,
    hasSeverityBlock,
    automationCoverage: SERVICE_AUTOMATION_COVERAGE[svc.id] ?? 50,
    openFlakySignals: openSignals,
  };
}
