import { describe, it, expect } from "vitest";
import { computeFlakyRisk, type FlakyRiskComponents } from "./flaky.js";

function baseComponents(overrides: Partial<FlakyRiskComponents> = {}): FlakyRiskComponents {
  return {
    sameCommitFlipRate: 0.1,
    metricVarianceScore: 0.1,
    runnerNoiseScore: 0.1,
    baselineDriftScore: 0.05,
    nearThresholdFailureRate: 0.05,
    rerunDisagreementRate: 0.05,
    ...overrides,
  };
}

describe("computeFlakyRisk — label assignment", () => {
  it("labels a clean benchmark as Stable", () => {
    const result = computeFlakyRisk(
      "test-id",
      baseComponents(),
      "JVM warm-up artifact resolved",
      "p95-latency-gate",
      "refund-status-api"
    );
    expect(result.flakyLabel).toBe("Stable");
    expect(result.flakyRiskScore).toBeLessThan(30);
  });

  it("labels a moderately noisy benchmark as Watch", () => {
    const result = computeFlakyRisk(
      "test-id",
      baseComponents({
        sameCommitFlipRate: 0.4,
        metricVarianceScore: 0.35,
        runnerNoiseScore: 0.3,
        baselineDriftScore: 0.3,
        nearThresholdFailureRate: 0.25,
        rerunDisagreementRate: 0.3,
      }),
      "Runner scheduling interference",
      "throughput-gate",
      "payment-plan-api"
    );
    expect(["Watch", "Noisy"]).toContain(result.flakyLabel);
  });

  it("labels a highly flaky benchmark as Flaky", () => {
    const result = computeFlakyRisk(
      "test-id",
      baseComponents({
        sameCommitFlipRate: 0.88,
        metricVarianceScore: 0.90,
        runnerNoiseScore: 0.20,
        baselineDriftScore: 0.85,
        nearThresholdFailureRate: 0.82,
        rerunDisagreementRate: 0.78,
      }),
      "External identity provider response time variance",
      "p99-latency-gate",
      "identity-verification-service"
    );
    expect(["Flaky", "Untrusted"]).toContain(result.flakyLabel);
    expect(result.flakyRiskScore).toBeGreaterThanOrEqual(70);
  });

  it("labels a fully untrusted benchmark as Untrusted", () => {
    const result = computeFlakyRisk(
      "test-id",
      baseComponents({
        sameCommitFlipRate: 1.0,
        metricVarianceScore: 1.0,
        runnerNoiseScore: 1.0,
        baselineDriftScore: 1.0,
        nearThresholdFailureRate: 1.0,
        rerunDisagreementRate: 1.0,
      }),
      "Complete baseline invalidation",
      "error-rate-gate",
      "taxpayer-account-portal"
    );
    expect(result.flakyLabel).toBe("Untrusted");
    expect(result.flakyRiskScore).toBeGreaterThanOrEqual(85);
  });
});

describe("computeFlakyRisk — risk score formula", () => {
  it("computes risk score as weighted sum (0–100 range)", () => {
    const result = computeFlakyRisk(
      "test-id",
      baseComponents({
        sameCommitFlipRate: 0.5,
        metricVarianceScore: 0.5,
        runnerNoiseScore: 0.5,
        baselineDriftScore: 0.5,
        nearThresholdFailureRate: 0.5,
        rerunDisagreementRate: 0.5,
      }),
      "Balanced test",
      "p95-latency-gate",
      "test-service"
    );
    expect(result.flakyRiskScore).toBeGreaterThan(0);
    expect(result.flakyRiskScore).toBeLessThanOrEqual(100);
    expect(result.flakyRiskScore).toBeCloseTo(50, 0);
  });

  it("risk score increases with noisier components", () => {
    const low = computeFlakyRisk("a", baseComponents(), "clean", "gate", "svc");
    const high = computeFlakyRisk(
      "b",
      baseComponents({
        sameCommitFlipRate: 0.9,
        metricVarianceScore: 0.9,
        runnerNoiseScore: 0.9,
      }),
      "noisy",
      "gate",
      "svc"
    );
    expect(high.flakyRiskScore).toBeGreaterThan(low.flakyRiskScore);
  });
});

describe("computeFlakyRisk — confidence levels", () => {
  it("returns HIGH confidence for Stable benchmarks", () => {
    const result = computeFlakyRisk("t", baseComponents(), "stable", "gate", "svc");
    expect(result.confidence).toBe("HIGH");
  });

  it("returns VERY_LOW confidence for Flaky/Untrusted benchmarks", () => {
    const result = computeFlakyRisk(
      "t",
      baseComponents({
        sameCommitFlipRate: 0.9,
        metricVarianceScore: 0.9,
        runnerNoiseScore: 0.85,
        baselineDriftScore: 0.9,
        nearThresholdFailureRate: 0.85,
        rerunDisagreementRate: 0.9,
      }),
      "total chaos",
      "gate",
      "svc"
    );
    expect(result.confidence).toBe("VERY_LOW");
  });
});

describe("computeFlakyRisk — output completeness", () => {
  it("returns all required fields", () => {
    const result = computeFlakyRisk("id", baseComponents(), "cause", "gate", "svc");
    expect(result).toHaveProperty("flakyRiskScore");
    expect(result).toHaveProperty("flakyLabel");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("primaryCause");
    expect(result).toHaveProperty("gateRecommendation");
    expect(result).toHaveProperty("remediationRecommendation");
    expect(result).toHaveProperty("executiveSummary");
    expect(result).toHaveProperty("developerNote");
    expect(result).toHaveProperty("riskComponents");
  });

  it("rounds risk components to one decimal place", () => {
    const result = computeFlakyRisk(
      "id",
      baseComponents({ sameCommitFlipRate: 0.333333 }),
      "cause",
      "gate",
      "svc"
    );
    const str = String(result.riskComponents.sameCommitFlipRate);
    const decimals = str.includes(".") ? str.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(1);
  });
});
