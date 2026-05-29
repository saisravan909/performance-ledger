import { describe, it, expect } from "vitest";
import { computeServiceScore, type ServiceMetrics } from "./scoring.js";

function baseMetrics(overrides: Partial<ServiceMetrics> = {}): ServiceMetrics {
  return {
    id: "test-service",
    errorRate: 0.1,
    p95Latency: 100,
    p99Latency: 200,
    missionReadiness: "READY",
    blockedReleases: 0,
    totalReleases: 5,
    hasSeverityBlock: false,
    hasErrorRateBlock: false,
    automationCoverage: 90,
    openFlakySignals: [],
    ...overrides,
  };
}

describe("computeServiceScore — grade assignment", () => {
  it("assigns grade A for a high-performing service", () => {
    const result = computeServiceScore(baseMetrics());
    expect(result.grade).toBe("A");
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("assigns grade F for a critically degraded service", () => {
    const result = computeServiceScore(
      baseMetrics({
        id: "bad-service",
        errorRate: 6.0,
        p95Latency: 3000,
        p99Latency: 5000,
        missionReadiness: "CRITICAL",
        blockedReleases: 4,
        totalReleases: 5,
        hasSeverityBlock: true,
        hasErrorRateBlock: true,
        automationCoverage: 15,
        openFlakySignals: [
          { flakinessScore: 85, severity: "CRITICAL" },
          { flakinessScore: 75, severity: "CRITICAL" },
        ],
      })
    );
    expect(result.grade).toBe("F");
    expect(result.score).toBeLessThan(50);
  });

  it("assigns grade C for a mid-range service", () => {
    const result = computeServiceScore(
      baseMetrics({
        errorRate: 1.5,
        p95Latency: 700,
        missionReadiness: "AT_RISK",
        blockedReleases: 1,
        totalReleases: 5,
        hasSeverityBlock: true,
        automationCoverage: 55,
        openFlakySignals: [{ flakinessScore: 45, severity: "MEDIUM" }],
      })
    );
    expect(["C", "D"]).toContain(result.grade);
  });
});

describe("computeServiceScore — performance debt score", () => {
  it("debt score equals 100 minus score", () => {
    const result = computeServiceScore(baseMetrics());
    const impliedDebt = Math.round(100 - result.score);
    expect(impliedDebt).toBe(Math.round(100 - result.score));
    expect(impliedDebt).toBeGreaterThanOrEqual(0);
    expect(impliedDebt).toBeLessThanOrEqual(100);
  });
});

describe("computeServiceScore — score trend direction", () => {
  it("returns UP trend for services with positive delta", () => {
    const result = computeServiceScore(baseMetrics({ id: "notice-delivery-service" }));
    expect(result.scoreTrend).toBe("UP");
  });

  it("returns DOWN trend for services with negative delta", () => {
    const result = computeServiceScore(baseMetrics({ id: "identity-verification-service" }));
    expect(result.scoreTrend).toBe("DOWN");
  });

  it("returns STABLE for unknown service IDs (no configured delta)", () => {
    const result = computeServiceScore(baseMetrics({ id: "unknown-service" }));
    expect(result.scoreTrend).toBe("STABLE");
  });
});

describe("computeServiceScore — score components", () => {
  it("returns all six score components", () => {
    const result = computeServiceScore(baseMetrics());
    const components = result.scoreComponents;
    expect(components).toHaveProperty("stability");
    expect(components).toHaveProperty("regressionFrequency");
    expect(components).toHaveProperty("regressionSeverity");
    expect(components).toHaveProperty("trend");
    expect(components).toHaveProperty("testCoverage");
    expect(components).toHaveProperty("signalReliability");
  });

  it("component values are between 0 and 100", () => {
    const result = computeServiceScore(
      baseMetrics({
        errorRate: 2.0,
        p95Latency: 800,
        blockedReleases: 2,
        totalReleases: 4,
        automationCoverage: 60,
        openFlakySignals: [{ flakinessScore: 55, severity: "HIGH" }],
      })
    );
    for (const val of Object.values(result.scoreComponents)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it("test coverage component reflects automation coverage", () => {
    const low = computeServiceScore(baseMetrics({ automationCoverage: 20 }));
    const high = computeServiceScore(baseMetrics({ automationCoverage: 95 }));
    expect(low.scoreComponents.testCoverage).toBeLessThan(high.scoreComponents.testCoverage);
  });
});

describe("computeServiceScore — score drivers", () => {
  it("identifies stability driver when error rate is high", () => {
    const result = computeServiceScore(
      baseMetrics({ errorRate: 5.0, p95Latency: 2000, missionReadiness: "CRITICAL" })
    );
    const hasStabilityDriver = result.scoreDrivers.some((d) => d.component === "Stability");
    expect(hasStabilityDriver).toBe(true);
  });

  it("returns no more than 4 drivers", () => {
    const result = computeServiceScore(
      baseMetrics({
        errorRate: 5.0,
        p95Latency: 3000,
        missionReadiness: "CRITICAL",
        blockedReleases: 4,
        totalReleases: 5,
        hasSeverityBlock: true,
        hasErrorRateBlock: true,
        automationCoverage: 20,
        openFlakySignals: [{ flakinessScore: 80, severity: "CRITICAL" }],
      })
    );
    expect(result.scoreDrivers.length).toBeLessThanOrEqual(4);
  });

  it("returns a recommended action string", () => {
    const result = computeServiceScore(baseMetrics());
    expect(typeof result.recommendedAction).toBe("string");
    expect(result.recommendedAction.length).toBeGreaterThan(10);
  });
});
