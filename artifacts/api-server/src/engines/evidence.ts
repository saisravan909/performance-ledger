import { createHash } from "crypto";

export type EvidenceDecision = "BLOCKED" | "ALLOWED" | "WARNED" | "OVERRIDDEN";
export type EvidenceEventType =
  | "RELEASE_GATE_EVALUATION"
  | "AUTOMATED_BLOCK"
  | "POLICY_OVERRIDE"
  | "MANUAL_APPROVAL"
  | "REBOOT_RECOVERY_AUDIT";
export type EvidenceConfidence = "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";
export type EvidenceStatus = "PASSED" | "FAILED" | "PENDING" | "BLOCKED";

export interface EvidencePacketInput {
  id: string;
  serviceId: string;
  serviceName: string;
  releaseId: string;
  releaseVersion: string;
  commitSha: string;
  generatedAt: string;
  eventType: EvidenceEventType;
  decision: EvidenceDecision;
  policyName: string;
  metricViolated: string | null;
  metricUnit: string | null;
  baselineValue: number | null;
  observedValue: number | null;
  debtScoreAtRelease: number;
  passed: number;
  failed: number;
  blocked: number;
  confidence: EvidenceConfidence;
  signalTrustScore: number;
  flakyRiskLabel: string | null;
  estimatedEngineeringHoursSaved: number;
  estimatedCloudWasteAvoided: number;
  ownerTeam: string;
  recommendedAction: string;
  notes: string | null;
  approvedBy: string | null;
}

export interface GeneratedEvidencePacket extends EvidencePacketInput {
  deltaPercent: number | null;
  auditHash: string;
  status: EvidenceStatus;
}

function statusFromDecision(decision: EvidenceDecision): EvidenceStatus {
  switch (decision) {
    case "ALLOWED":   return "PASSED";
    case "BLOCKED":   return "BLOCKED";
    case "WARNED":    return "PENDING";
    case "OVERRIDDEN": return "PASSED";
  }
}

function computeDeltaPercent(
  baseline: number | null,
  observed: number | null
): number | null {
  if (baseline === null || observed === null || baseline === 0) return null;
  return Math.round(((observed - baseline) / baseline) * 1000) / 10;
}

function computeAuditHash(input: EvidencePacketInput): string {
  const payload = [
    input.id,
    input.serviceId,
    input.releaseId,
    input.releaseVersion,
    input.commitSha,
    input.decision,
    input.generatedAt,
    input.policyName,
    String(input.debtScoreAtRelease),
    String(input.passed),
    String(input.failed),
    String(input.blocked),
    input.metricViolated ?? "",
    String(input.observedValue ?? ""),
    String(input.baselineValue ?? ""),
    input.confidence,
    String(input.signalTrustScore),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").substring(0, 40);
}

export function generateEvidencePacket(input: EvidencePacketInput): GeneratedEvidencePacket {
  return {
    ...input,
    deltaPercent: computeDeltaPercent(input.baselineValue, input.observedValue),
    auditHash: computeAuditHash(input),
    status: statusFromDecision(input.decision),
  };
}

export const RAW_EVIDENCE_INPUTS: EvidencePacketInput[] = [
  {
    id: "evp-001",
    serviceId: "refund-status-api",
    serviceName: "refund-status-api",
    releaseId: "rel-001",
    releaseVersion: "v2.3.1",
    commitSha: "a3f8c1d4e9b2",
    generatedAt: "2026-05-27T13:00:00Z",
    eventType: "RELEASE_GATE_EVALUATION",
    decision: "ALLOWED",
    policyName: "performance-governance-v2",
    metricViolated: null,
    metricUnit: null,
    baselineValue: null,
    observedValue: null,
    debtScoreAtRelease: 28,
    passed: 24,
    failed: 0,
    blocked: 0,
    confidence: "HIGH",
    signalTrustScore: 92,
    flakyRiskLabel: "Stable",
    estimatedEngineeringHoursSaved: 4.5,
    estimatedCloudWasteAvoided: 320,
    ownerTeam: "Financial Services Platform",
    recommendedAction: "Approved for production deployment. No remediation required.",
    notes: "All gates passed. P95 within SLO. Throughput stable across 24 benchmark runs.",
    approvedBy: "K. Nakamura",
  },
  {
    id: "evp-002",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    releaseId: "rel-002",
    releaseVersion: "v1.9.3",
    commitSha: "b7d2e9f1c4a8",
    generatedAt: "2026-05-26T10:00:00Z",
    eventType: "AUTOMATED_BLOCK",
    decision: "BLOCKED",
    policyName: "performance-governance-v2",
    metricViolated: "p95_latency_ms",
    metricUnit: "ms",
    baselineValue: 380,
    observedValue: 680,
    debtScoreAtRelease: 61,
    passed: 18,
    failed: 4,
    blocked: 2,
    confidence: "LOW",
    signalTrustScore: 45,
    flakyRiskLabel: "Noisy",
    estimatedEngineeringHoursSaved: 12.0,
    estimatedCloudWasteAvoided: 1840,
    ownerTeam: "Citizen Services",
    recommendedAction: "Resolve P95 latency regression before reattempting release. Isolate throughput benchmark to dedicated runner.",
    notes: "P95 latency 680ms exceeds 500ms SLO. Signal is Noisy — rerun on dedicated runner recommended before treating as definitive.",
    approvedBy: null,
  },
  {
    id: "evp-003",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    releaseId: "rel-003",
    releaseVersion: "v4.1.0",
    commitSha: "c9a4b2e7f015",
    generatedAt: "2026-05-25T09:00:00Z",
    eventType: "AUTOMATED_BLOCK",
    decision: "BLOCKED",
    policyName: "identity-security-governance-v1",
    metricViolated: "error_rate_percent",
    metricUnit: "%",
    baselineValue: 0.5,
    observedValue: 3.2,
    debtScoreAtRelease: 74,
    passed: 12,
    failed: 8,
    blocked: 4,
    confidence: "VERY_LOW",
    signalTrustScore: 28,
    flakyRiskLabel: "Flaky",
    estimatedEngineeringHoursSaved: 24.0,
    estimatedCloudWasteAvoided: 5200,
    ownerTeam: "Identity & Access",
    recommendedAction: "Quarantine error-rate gate from release blocking. Investigate cache expiry collision. Rebuild baseline after 50 clean runs.",
    notes: "Error rate gate is Flaky (risk score 72.5). Gate cannot be trusted as a release blocker. Escalated to Identity & Access team. Production hold in effect.",
    approvedBy: null,
  },
  {
    id: "evp-004",
    serviceId: "payment-plan-api",
    serviceName: "payment-plan-api",
    releaseId: "rel-004",
    releaseVersion: "v3.0.2",
    commitSha: "d1f5c8a3b2e7",
    generatedAt: "2026-05-27T14:00:00Z",
    eventType: "RELEASE_GATE_EVALUATION",
    decision: "ALLOWED",
    policyName: "performance-governance-v2",
    metricViolated: null,
    metricUnit: null,
    baselineValue: null,
    observedValue: null,
    debtScoreAtRelease: 35,
    passed: 22,
    failed: 0,
    blocked: 0,
    confidence: "HIGH",
    signalTrustScore: 89,
    flakyRiskLabel: "Stable",
    estimatedEngineeringHoursSaved: 3.0,
    estimatedCloudWasteAvoided: 280,
    ownerTeam: "Revenue Operations",
    recommendedAction: "Approved for production deployment. Monitor throughput for first 30 minutes post-deploy.",
    notes: "Clean run. Throughput improved 12% over baseline. Concurrent request gate passed at 99.7% success rate.",
    approvedBy: "M. Okafor",
  },
  {
    id: "evp-005",
    serviceId: "document-upload-service",
    serviceName: "document-upload-service",
    releaseId: "rel-005",
    releaseVersion: "v2.7.4",
    commitSha: "e4b3c1f8d9a2",
    generatedAt: "2026-05-28T07:30:00Z",
    eventType: "RELEASE_GATE_EVALUATION",
    decision: "WARNED",
    policyName: "performance-governance-v2",
    metricViolated: "error_rate_percent",
    metricUnit: "%",
    baselineValue: 0.8,
    observedValue: 1.4,
    debtScoreAtRelease: 52,
    passed: 16,
    failed: 2,
    blocked: 1,
    confidence: "MODERATE",
    signalTrustScore: 67,
    flakyRiskLabel: "Watch",
    estimatedEngineeringHoursSaved: 8.0,
    estimatedCloudWasteAvoided: 960,
    ownerTeam: "Document Management",
    recommendedAction: "Hold release pending storage backend patch verification. Rerun error-rate gate before promoting.",
    notes: "Awaiting rerun of error-rate gate after storage backend patch. Signal is on Watch — intermittent 503s may resolve with infrastructure fix.",
    approvedBy: null,
  },
  {
    id: "evp-006",
    serviceId: "notice-delivery-service",
    serviceName: "notice-delivery-service",
    releaseId: "rel-006",
    releaseVersion: "v5.1.3",
    commitSha: "f2a7d9b1c3e8",
    generatedAt: "2026-05-28T08:00:00Z",
    eventType: "RELEASE_GATE_EVALUATION",
    decision: "ALLOWED",
    policyName: "performance-governance-v2",
    metricViolated: null,
    metricUnit: null,
    baselineValue: null,
    observedValue: null,
    debtScoreAtRelease: 19,
    passed: 26,
    failed: 0,
    blocked: 0,
    confidence: "HIGH",
    signalTrustScore: 96,
    flakyRiskLabel: "Stable",
    estimatedEngineeringHoursSaved: 2.5,
    estimatedCloudWasteAvoided: 210,
    ownerTeam: "Notification Services",
    recommendedAction: "Approved for production deployment. Service is performing at highest governance tier.",
    notes: "Excellent. All latency and throughput SLOs met with margin. Debt score improved from 24 to 19 since last release.",
    approvedBy: "R. Patel",
  },
];
