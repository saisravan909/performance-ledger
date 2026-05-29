import { describe, it, expect } from "vitest";
import { generateEvidencePacket, type EvidencePacketInput } from "./evidence.js";

function baseInput(overrides: Partial<EvidencePacketInput> = {}): EvidencePacketInput {
  return {
    id: "evp-test",
    serviceId: "refund-status-api",
    serviceName: "refund-status-api",
    releaseId: "rel-001",
    releaseVersion: "v1.0.0",
    commitSha: "abc123def456",
    generatedAt: "2026-05-28T10:00:00Z",
    eventType: "RELEASE_GATE_EVALUATION",
    decision: "ALLOWED",
    policyName: "performance-governance-v2",
    metricViolated: null,
    metricUnit: null,
    baselineValue: null,
    observedValue: null,
    debtScoreAtRelease: 20,
    passed: 24,
    failed: 0,
    blocked: 0,
    confidence: "HIGH",
    signalTrustScore: 92,
    flakyRiskLabel: "Stable",
    estimatedEngineeringHoursSaved: 4.0,
    estimatedCloudWasteAvoided: 300,
    ownerTeam: "Platform Engineering",
    recommendedAction: "Approved for deployment.",
    notes: null,
    approvedBy: "K. Nakamura",
    ...overrides,
  };
}

describe("generateEvidencePacket — audit hash", () => {
  it("generates a 40-character hex audit hash", () => {
    const packet = generateEvidencePacket(baseInput());
    expect(packet.auditHash).toMatch(/^[0-9a-f]{40}$/);
  });

  it("produces the same hash for identical inputs (deterministic)", () => {
    const input = baseInput();
    const p1 = generateEvidencePacket(input);
    const p2 = generateEvidencePacket(input);
    expect(p1.auditHash).toBe(p2.auditHash);
  });

  it("produces a different hash when any field changes", () => {
    const p1 = generateEvidencePacket(baseInput({ decision: "ALLOWED" }));
    const p2 = generateEvidencePacket(baseInput({ decision: "BLOCKED" }));
    expect(p1.auditHash).not.toBe(p2.auditHash);
  });

  it("hash changes when debtScore changes (tamper detection)", () => {
    const p1 = generateEvidencePacket(baseInput({ debtScoreAtRelease: 20 }));
    const p2 = generateEvidencePacket(baseInput({ debtScoreAtRelease: 80 }));
    expect(p1.auditHash).not.toBe(p2.auditHash);
  });

  it("hash changes when commit SHA changes", () => {
    const p1 = generateEvidencePacket(baseInput({ commitSha: "abc123" }));
    const p2 = generateEvidencePacket(baseInput({ commitSha: "def456" }));
    expect(p1.auditHash).not.toBe(p2.auditHash);
  });
});

describe("generateEvidencePacket — delta percent calculation", () => {
  it("returns null delta when no metric violated", () => {
    const packet = generateEvidencePacket(baseInput());
    expect(packet.deltaPercent).toBeNull();
  });

  it("calculates delta percent correctly for latency regression", () => {
    const packet = generateEvidencePacket(
      baseInput({
        decision: "BLOCKED",
        metricViolated: "p95_latency_ms",
        metricUnit: "ms",
        baselineValue: 380,
        observedValue: 680,
      })
    );
    expect(packet.deltaPercent).not.toBeNull();
    expect(packet.deltaPercent!).toBeCloseTo(78.9, 0);
  });

  it("handles negative delta (improvement) correctly", () => {
    const packet = generateEvidencePacket(
      baseInput({
        baselineValue: 500,
        observedValue: 400,
        metricViolated: "p95_latency_ms",
        metricUnit: "ms",
      })
    );
    expect(packet.deltaPercent).toBeLessThan(0);
    expect(packet.deltaPercent).toBeCloseTo(-20, 0);
  });

  it("returns null delta when baseline is zero (avoid division by zero)", () => {
    const packet = generateEvidencePacket(
      baseInput({
        baselineValue: 0,
        observedValue: 500,
        metricViolated: "error_rate_percent",
        metricUnit: "%",
      })
    );
    expect(packet.deltaPercent).toBeNull();
  });
});

describe("generateEvidencePacket — status derivation", () => {
  it("ALLOWED decision maps to PASSED status", () => {
    const packet = generateEvidencePacket(baseInput({ decision: "ALLOWED" }));
    expect(packet.status).toBe("PASSED");
  });

  it("BLOCKED decision maps to BLOCKED status", () => {
    const packet = generateEvidencePacket(
      baseInput({ decision: "BLOCKED", metricViolated: "p95_latency_ms", metricUnit: "ms", baselineValue: 300, observedValue: 700 })
    );
    expect(packet.status).toBe("BLOCKED");
  });

  it("WARNED decision maps to PENDING status", () => {
    const packet = generateEvidencePacket(
      baseInput({ decision: "WARNED", metricViolated: "error_rate_percent", metricUnit: "%", baselineValue: 0.5, observedValue: 1.2 })
    );
    expect(packet.status).toBe("PENDING");
  });

  it("OVERRIDDEN decision maps to PASSED status", () => {
    const packet = generateEvidencePacket(baseInput({ decision: "OVERRIDDEN" }));
    expect(packet.status).toBe("PASSED");
  });
});

describe("generateEvidencePacket — output completeness", () => {
  it("preserves all input fields in the output", () => {
    const input = baseInput();
    const packet = generateEvidencePacket(input);
    expect(packet.id).toBe(input.id);
    expect(packet.serviceId).toBe(input.serviceId);
    expect(packet.releaseVersion).toBe(input.releaseVersion);
    expect(packet.commitSha).toBe(input.commitSha);
    expect(packet.decision).toBe(input.decision);
    expect(packet.signalTrustScore).toBe(input.signalTrustScore);
    expect(packet.ownerTeam).toBe(input.ownerTeam);
  });

  it("adds deltaPercent, auditHash, and status fields", () => {
    const packet = generateEvidencePacket(baseInput());
    expect(packet).toHaveProperty("deltaPercent");
    expect(packet).toHaveProperty("auditHash");
    expect(packet).toHaveProperty("status");
  });
});
