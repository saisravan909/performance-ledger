export type FlakyLabel = "Stable" | "Watch" | "Noisy" | "Flaky" | "Untrusted";
export type FlakyConfidence = "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";

export interface FlakyRiskComponents {
  sameCommitFlipRate: number;
  metricVarianceScore: number;
  runnerNoiseScore: number;
  baselineDriftScore: number;
  nearThresholdFailureRate: number;
  rerunDisagreementRate: number;
}

export interface FlakyDetectionResult {
  flakyRiskScore: number;
  flakyLabel: FlakyLabel;
  confidence: FlakyConfidence;
  primaryCause: string;
  gateRecommendation: string;
  remediationRecommendation: string;
  riskComponents: FlakyRiskComponents;
  executiveSummary: string;
  developerNote: string;
}

function labelFromScore(score: number): FlakyLabel {
  if (score < 30) return "Stable";
  if (score < 50) return "Watch";
  if (score < 70) return "Noisy";
  if (score < 85) return "Flaky";
  return "Untrusted";
}

function confidenceFromLabel(label: FlakyLabel, runnerNoise: number): FlakyConfidence {
  if (label === "Stable") return "HIGH";
  if (label === "Watch") return runnerNoise > 0.4 ? "LOW" : "MODERATE";
  if (label === "Noisy") return "LOW";
  return "VERY_LOW";
}

function gateRecommendation(label: FlakyLabel, runnerNoise: number): string {
  switch (label) {
    case "Stable":
      return "Keep as hard gate — benchmark is reliable and can block releases";
    case "Watch":
      return runnerNoise > 0.4
        ? "Move to dedicated runner; increase sample size before gating"
        : "Keep as soft gate; require 2-of-3 passing runs before blocking";
    case "Noisy":
      return "Rerun on dedicated runner; do not block on single failure — require majority pass";
    case "Flaky":
      return "Quarantine from hard-blocking gates — treat as informational signal only";
    case "Untrusted":
      return "Remove from release pipeline entirely until baseline is rebuilt and validated";
  }
}

function remediationRecommendation(label: FlakyLabel, primaryCause: string): string {
  if (label === "Stable") {
    return "No action required. Continue regular benchmarking cadence.";
  }
  if (primaryCause.toLowerCase().includes("runner") || primaryCause.toLowerCase().includes("infrastructure")) {
    return "Migrate benchmark to a dedicated, isolated runner group. Re-establish baseline after 50 clean runs.";
  }
  if (primaryCause.toLowerCase().includes("cron") || primaryCause.toLowerCase().includes("interference")) {
    return "Schedule benchmark runs outside of maintenance windows. Pin runner to avoid shared-resource contention.";
  }
  if (primaryCause.toLowerCase().includes("cache") || primaryCause.toLowerCase().includes("expiry")) {
    return "Pre-warm cache state before benchmark run. Add a cache readiness probe to the test harness.";
  }
  if (primaryCause.toLowerCase().includes("external") || primaryCause.toLowerCase().includes("dependency")) {
    return "Introduce a synthetic stub for external dependencies in benchmark context. Re-run against stub to isolate service performance.";
  }
  if (primaryCause.toLowerCase().includes("baseline") || primaryCause.toLowerCase().includes("drift")) {
    return "Rebuild baseline from 100 consecutive clean runs on dedicated runner. Archive prior baseline as reference.";
  }
  if (primaryCause.toLowerCase().includes("connection pool") || primaryCause.toLowerCase().includes("load")) {
    return "Profile connection pool under benchmark load. Increase pool size or reduce benchmark concurrency to find saturation point.";
  }
  return "Increase sample count, migrate to dedicated runner, and rebuild baseline after root cause is identified.";
}

function executiveSummary(label: FlakyLabel, benchmark: string, serviceName: string): string {
  switch (label) {
    case "Stable":
      return `The ${benchmark} gate on ${serviceName} is reliable. Results are consistent across runs and the benchmark can be trusted to block releases when it fails.`;
    case "Watch":
      return `The ${benchmark} gate on ${serviceName} shows early signs of noise. It is still usable for release governance but requires monitoring to prevent false blocks.`;
    case "Noisy":
      return `The ${benchmark} gate on ${serviceName} produces inconsistent results. Single failures should not block releases — require majority-pass before acting on results.`;
    case "Flaky":
      return `The ${benchmark} gate on ${serviceName} cannot be trusted as a release blocker. It is producing results inconsistent with actual service behavior and is blocking valid releases.`;
    case "Untrusted":
      return `The ${benchmark} gate on ${serviceName} has lost measurement validity entirely. It must be removed from the release pipeline immediately to prevent governance failures.`;
  }
}

function developerNote(label: FlakyLabel, components: FlakyRiskComponents, primaryCause: string): string {
  const topDrivers: string[] = [];
  if (components.sameCommitFlipRate > 0.5) topDrivers.push(`flip rate ${Math.round(components.sameCommitFlipRate * 100)}% on same commit`);
  if (components.metricVarianceScore > 0.6) topDrivers.push(`high metric variance (CV ${Math.round(components.metricVarianceScore * 100)}%)`);
  if (components.runnerNoiseScore > 0.4) topDrivers.push(`runner noise score ${Math.round(components.runnerNoiseScore * 100)}`);
  if (components.baselineDriftScore > 0.5) topDrivers.push(`baseline drift ${Math.round(components.baselineDriftScore * 100)}%`);
  if (components.rerunDisagreementRate > 0.5) topDrivers.push(`rerun disagreement ${Math.round(components.rerunDisagreementRate * 100)}%`);

  if (topDrivers.length === 0) return `Benchmark is operating normally. Primary cause was: ${primaryCause}.`;
  return `Top contributors: ${topDrivers.slice(0, 3).join("; ")}. Root: ${primaryCause}.`;
}

export function computeFlakyRisk(
  id: string,
  components: FlakyRiskComponents,
  primaryCause: string,
  benchmark: string,
  serviceName: string
): FlakyDetectionResult {
  const rawScore =
    0.25 * components.sameCommitFlipRate +
    0.20 * components.metricVarianceScore +
    0.20 * components.runnerNoiseScore +
    0.15 * components.baselineDriftScore +
    0.10 * components.nearThresholdFailureRate +
    0.10 * components.rerunDisagreementRate;

  const flakyRiskScore = Math.round(rawScore * 1000) / 10;
  const label = labelFromScore(flakyRiskScore);
  const confidence = confidenceFromLabel(label, components.runnerNoiseScore);
  const gate = gateRecommendation(label, components.runnerNoiseScore);
  const remediation = remediationRecommendation(label, primaryCause);
  const exec = executiveSummary(label, benchmark, serviceName);
  const devNote = developerNote(label, components, primaryCause);

  const roundedComponents: FlakyRiskComponents = {
    sameCommitFlipRate: Math.round(components.sameCommitFlipRate * 1000) / 10,
    metricVarianceScore: Math.round(components.metricVarianceScore * 1000) / 10,
    runnerNoiseScore: Math.round(components.runnerNoiseScore * 1000) / 10,
    baselineDriftScore: Math.round(components.baselineDriftScore * 1000) / 10,
    nearThresholdFailureRate: Math.round(components.nearThresholdFailureRate * 1000) / 10,
    rerunDisagreementRate: Math.round(components.rerunDisagreementRate * 1000) / 10,
  };

  return {
    flakyRiskScore,
    flakyLabel: label,
    confidence,
    primaryCause,
    gateRecommendation: gate,
    remediationRecommendation: remediation,
    executiveSummary: exec,
    developerNote: devNote,
    riskComponents: roundedComponents,
  };
}

export interface RawBenchmarkData {
  signalId: string;
  primaryCause: string;
  components: FlakyRiskComponents;
}

export const BENCHMARK_RAW_DATA: RawBenchmarkData[] = [
  {
    signalId: "flk-001",
    primaryCause: "External identity provider response time variance",
    components: {
      sameCommitFlipRate: 0.88,
      metricVarianceScore: 0.90,
      runnerNoiseScore: 0.20,
      baselineDriftScore: 0.85,
      nearThresholdFailureRate: 0.82,
      rerunDisagreementRate: 0.78,
    },
  },
  {
    signalId: "flk-002",
    primaryCause: "Connection pool exhaustion under simulated peak load",
    components: {
      sameCommitFlipRate: 0.55,
      metricVarianceScore: 0.72,
      runnerNoiseScore: 0.45,
      baselineDriftScore: 0.48,
      nearThresholdFailureRate: 0.52,
      rerunDisagreementRate: 0.58,
    },
  },
  {
    signalId: "flk-003",
    primaryCause: "Storage backend intermittency during multipart upload",
    components: {
      sameCommitFlipRate: 0.42,
      metricVarianceScore: 0.55,
      runnerNoiseScore: 0.38,
      baselineDriftScore: 0.32,
      nearThresholdFailureRate: 0.48,
      rerunDisagreementRate: 0.38,
    },
  },
  {
    signalId: "flk-004",
    primaryCause: "JVM cold-start warm-up artifact (resolved)",
    components: {
      sameCommitFlipRate: 0.18,
      metricVarianceScore: 0.22,
      runnerNoiseScore: 0.28,
      baselineDriftScore: 0.12,
      nearThresholdFailureRate: 0.15,
      rerunDisagreementRate: 0.10,
    },
  },
  {
    signalId: "flk-005",
    primaryCause: "Identity cache expiry timing collision with benchmark window",
    components: {
      sameCommitFlipRate: 0.88,
      metricVarianceScore: 0.90,
      runnerNoiseScore: 0.25,
      baselineDriftScore: 0.80,
      nearThresholdFailureRate: 0.75,
      rerunDisagreementRate: 0.80,
    },
  },
  {
    signalId: "flk-006",
    primaryCause: "Runner group infrastructure noise (confirmed, not service regression)",
    components: {
      sameCommitFlipRate: 0.25,
      metricVarianceScore: 0.30,
      runnerNoiseScore: 0.55,
      baselineDriftScore: 0.10,
      nearThresholdFailureRate: 0.12,
      rerunDisagreementRate: 0.20,
    },
  },
  {
    signalId: "flk-007",
    primaryCause: "Cron job interference causing latency drift on shared runner",
    components: {
      sameCommitFlipRate: 0.35,
      metricVarianceScore: 0.42,
      runnerNoiseScore: 0.38,
      baselineDriftScore: 0.45,
      nearThresholdFailureRate: 0.38,
      rerunDisagreementRate: 0.28,
    },
  },
];
