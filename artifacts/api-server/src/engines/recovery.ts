export type RecoveryGrade = "A" | "B" | "C" | "D" | "F";
export type ContinuityRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RecoveryFactors {
  autoRestartConfigured: boolean;
  healthChecksAvailable: boolean;
  smokeTestsAvailable: boolean;
  dependencyChecksAvailable: boolean;
  cacheWarmupAvailable: boolean;
  avgRecoveryTimeMinutes: number;
  manualRecoveryRequired: boolean;
}

export interface RecoveryReadinessResult {
  score: number;
  grade: RecoveryGrade;
  riskLevel: ContinuityRiskLevel;
  deficits: string[];
  automationActions: string[];
}

export interface ContinuityRiskInput {
  totalRebootEvents: number;
  servicesImpacted: number;
  totalServices: number;
  manualRecoveryCount: number;
  failedHealthChecks: number;
  avgRecoveryTimeMinutes: number;
  repeatedIncidentServices: number;
  criticalTierServicesAffected: number;
}

export interface ContinuityRiskResult {
  score: number;
  level: ContinuityRiskLevel;
}

function gradeFromScore(score: number): RecoveryGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}

function riskFromScore(score: number): ContinuityRiskLevel {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

function riskLevelFromRiskScore(score: number): ContinuityRiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MODERATE";
  return "LOW";
}

function recoveryTimeScore(minutes: number): number {
  if (minutes <= 5) return 20;
  if (minutes <= 15) return 15;
  if (minutes <= 30) return 10;
  if (minutes <= 60) return 5;
  return 0;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function computeRecoveryReadiness(factors: RecoveryFactors): RecoveryReadinessResult {
  let automationScore = 0;
  const deficits: string[] = [];
  const automationActions: string[] = [];

  if (factors.autoRestartConfigured) {
    automationScore += 30;
  } else {
    deficits.push("Auto-restart is not configured.");
    automationActions.push("Configure Kubernetes restart policies with exponential back-off to eliminate manual restart dependency.");
  }

  if (factors.healthChecksAvailable) {
    automationScore += 25;
  } else {
    deficits.push("No health check endpoint is registered.");
    automationActions.push("Expose /healthz liveness and /readyz readiness endpoints and register with the load balancer.");
  }

  if (factors.smokeTestsAvailable) {
    automationScore += 20;
  } else {
    deficits.push("Post-reboot smoke tests are absent.");
    automationActions.push("Implement an automated smoke test suite that runs on startup completion before traffic is routed.");
  }

  if (factors.dependencyChecksAvailable) {
    automationScore += 10;
  } else {
    deficits.push("Downstream dependency health is not verified after restart.");
    automationActions.push("Add dependency readiness probe that blocks traffic until all upstream services are reachable.");
  }

  if (factors.cacheWarmupAvailable) {
    automationScore += 5;
  } else {
    deficits.push("Cache warmup is not automated.");
    automationActions.push("Automate cache pre-population on startup to restore peak throughput within SLO.");
  }

  const timeScore = recoveryTimeScore(factors.avgRecoveryTimeMinutes);
  if (timeScore < 20) {
    const bracket =
      factors.avgRecoveryTimeMinutes <= 15
        ? "under 15 minutes"
        : factors.avgRecoveryTimeMinutes <= 30
        ? "15–30 minutes"
        : factors.avgRecoveryTimeMinutes <= 60
        ? "30–60 minutes"
        : "over 60 minutes";
    deficits.push(`Average recovery time is ${bracket} — target threshold is under 5 minutes.`);
    automationActions.push("Instrument recovery runbooks with time-bounded automation to drive MTTR below 5 minutes.");
  }

  let rawScore = automationScore + timeScore;

  if (factors.manualRecoveryRequired) {
    rawScore = Math.max(0, rawScore - 20);
    deficits.push("Manual operator intervention is required for recovery — not acceptable during filing season.");
    automationActions.push("Build self-healing runbooks with PagerDuty auto-remediation to eliminate manual recovery steps.");
  }

  const score = Math.min(100, Math.max(0, rawScore));

  return {
    score,
    grade: gradeFromScore(score),
    riskLevel: riskFromScore(score),
    deficits,
    automationActions,
  };
}

export function computeContinuityRiskScore(input: ContinuityRiskInput): ContinuityRiskResult {
  const rebootFrequency = clamp((input.totalRebootEvents / Math.max(1, input.totalServices)) * 25, 0, 100);
  const manualRecoveryRate = clamp((input.manualRecoveryCount / Math.max(1, input.totalRebootEvents)) * 100, 0, 100);
  const failedCheckRate = clamp((input.failedHealthChecks / Math.max(1, input.totalRebootEvents)) * 100, 0, 100);
  const recoveryTimeRisk = clamp((input.avgRecoveryTimeMinutes / 60) * 100, 0, 100);
  const repeatedIncidentRate = clamp((input.repeatedIncidentServices / Math.max(1, input.servicesImpacted)) * 100, 0, 100);
  const criticalityExposure = clamp((input.criticalTierServicesAffected / Math.max(1, input.totalServices)) * 100, 0, 100);

  const raw =
    0.25 * rebootFrequency +
    0.20 * manualRecoveryRate +
    0.20 * failedCheckRate +
    0.15 * recoveryTimeRisk +
    0.10 * repeatedIncidentRate +
    0.10 * criticalityExposure;

  const score = Math.round(clamp(raw, 0, 100));

  return { score, level: riskLevelFromRiskScore(score) };
}
