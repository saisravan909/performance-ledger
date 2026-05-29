import { computeRecoveryReadiness, computeContinuityRiskScore } from "../../engines/recovery.js";
import { generateEvidencePacket } from "../../engines/evidence.js";
import type { EvidencePacketInput } from "../../engines/evidence.js";

export interface RebootEvent {
  id: string;
  serviceId: string;
  serviceName: string;
  timestamp: string;
  rebootCause: string;
  recoveryType: "AUTO" | "MANUAL";
  recoveryTimeMinutes: number;
  healthCheckStatus: "PASSED" | "FAILED" | "PARTIAL";
  postRebootSmokePassed: boolean;
  affectedUsers: number;
  region: string;
}

export interface OperationalEvent {
  id: string;
  serviceId: string;
  serviceName: string;
  timestamp: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  durationMinutes: number;
  description: string;
  resolvedAutomatically: boolean;
}

export const RAW_REBOOT_EVENTS: RebootEvent[] = [
  {
    id: "rbt-001",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-02-18T02:14:00Z",
    rebootCause: "OOM_KILL",
    recoveryType: "MANUAL",
    recoveryTimeMinutes: 42,
    healthCheckStatus: "PARTIAL",
    postRebootSmokePassed: false,
    affectedUsers: 8900,
    region: "us-east-1",
  },
  {
    id: "rbt-002",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-02-20T03:45:00Z",
    rebootCause: "KERNEL_PANIC",
    recoveryType: "MANUAL",
    recoveryTimeMinutes: 78,
    healthCheckStatus: "FAILED",
    postRebootSmokePassed: false,
    affectedUsers: 1250,
    region: "us-east-1",
  },
  {
    id: "rbt-003",
    serviceId: "refund-status-api",
    serviceName: "refund-status-api",
    timestamp: "2026-02-21T01:30:00Z",
    rebootCause: "HEALTH_CHECK_FAILURE",
    recoveryType: "AUTO",
    recoveryTimeMinutes: 3,
    healthCheckStatus: "PASSED",
    postRebootSmokePassed: true,
    affectedUsers: 210,
    region: "us-east-1",
  },
  {
    id: "rbt-004",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-03-04T04:22:00Z",
    rebootCause: "DEPENDENCY_TIMEOUT",
    recoveryType: "MANUAL",
    recoveryTimeMinutes: 31,
    healthCheckStatus: "PARTIAL",
    postRebootSmokePassed: false,
    affectedUsers: 6400,
    region: "us-east-1",
  },
  {
    id: "rbt-005",
    serviceId: "document-upload-service",
    serviceName: "document-upload-service",
    timestamp: "2026-03-10T22:08:00Z",
    rebootCause: "DEPLOYMENT_ROLLBACK",
    recoveryType: "AUTO",
    recoveryTimeMinutes: 12,
    healthCheckStatus: "PASSED",
    postRebootSmokePassed: true,
    affectedUsers: 320,
    region: "us-west-2",
  },
  {
    id: "rbt-006",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-03-15T05:11:00Z",
    rebootCause: "OOM_KILL",
    recoveryType: "MANUAL",
    recoveryTimeMinutes: 55,
    healthCheckStatus: "FAILED",
    postRebootSmokePassed: false,
    affectedUsers: 1100,
    region: "us-east-1",
  },
  {
    id: "rbt-007",
    serviceId: "payment-plan-api",
    serviceName: "payment-plan-api",
    timestamp: "2026-03-22T18:44:00Z",
    rebootCause: "MANUAL_RESTART",
    recoveryType: "AUTO",
    recoveryTimeMinutes: 4,
    healthCheckStatus: "PASSED",
    postRebootSmokePassed: true,
    affectedUsers: 90,
    region: "us-east-1",
  },
  {
    id: "rbt-008",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-04-01T09:33:00Z",
    rebootCause: "OOM_KILL",
    recoveryType: "MANUAL",
    recoveryTimeMinutes: 38,
    healthCheckStatus: "PARTIAL",
    postRebootSmokePassed: false,
    affectedUsers: 9100,
    region: "us-east-1",
  },
  {
    id: "rbt-009",
    serviceId: "notice-delivery-service",
    serviceName: "notice-delivery-service",
    timestamp: "2026-04-12T14:55:00Z",
    rebootCause: "HEALTH_CHECK_FAILURE",
    recoveryType: "AUTO",
    recoveryTimeMinutes: 5,
    healthCheckStatus: "PASSED",
    postRebootSmokePassed: true,
    affectedUsers: 0,
    region: "us-east-2",
  },
  {
    id: "rbt-010",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-04-18T01:20:00Z",
    rebootCause: "DEPENDENCY_TIMEOUT",
    recoveryType: "MANUAL",
    recoveryTimeMinutes: 66,
    healthCheckStatus: "FAILED",
    postRebootSmokePassed: false,
    affectedUsers: 1400,
    region: "us-east-1",
  },
];

export const QUEUE_BACKLOG_EVENTS: OperationalEvent[] = [
  {
    id: "qb-001",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-02-18T02:56:00Z",
    severity: "CRITICAL",
    durationMinutes: 28,
    description: "Return submission queue backed up to 14,200 items following OOM kill restart. Cold-start processing rate insufficient to clear backlog within SLO.",
    resolvedAutomatically: false,
  },
  {
    id: "qb-002",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-02-20T05:03:00Z",
    severity: "HIGH",
    durationMinutes: 41,
    description: "Identity verification queue accumulated 3,800 pending requests during kernel panic recovery. Operator manually scaled consumers to clear.",
    resolvedAutomatically: false,
  },
  {
    id: "qb-003",
    serviceId: "document-upload-service",
    serviceName: "document-upload-service",
    timestamp: "2026-03-10T22:30:00Z",
    severity: "MODERATE",
    durationMinutes: 9,
    description: "Upload processing queue reached 870 items post-rollback restart. Auto-scaled consumers resolved within SLO.",
    resolvedAutomatically: true,
  },
  {
    id: "qb-004",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-04-01T10:11:00Z",
    severity: "CRITICAL",
    durationMinutes: 33,
    description: "Repeat OOM kill event caused second queue surge of 11,600 items. No automated consumer scaling policy in place.",
    resolvedAutomatically: false,
  },
];

export const DB_POOL_PRESSURE_EVENTS: OperationalEvent[] = [
  {
    id: "dp-001",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-02-18T02:18:00Z",
    severity: "HIGH",
    durationMinutes: 14,
    description: "Database connection pool exhausted on restart. 200-connection pool saturated by 847 queued requests during cold-start window.",
    resolvedAutomatically: false,
  },
  {
    id: "dp-002",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-03-15T05:15:00Z",
    severity: "CRITICAL",
    durationMinutes: 22,
    description: "Connection pool exhaustion caused cascading 503 errors across all downstream verification endpoints. No pool reservation policy configured.",
    resolvedAutomatically: false,
  },
  {
    id: "dp-003",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-04-18T01:25:00Z",
    severity: "HIGH",
    durationMinutes: 18,
    description: "Third pool exhaustion event for this service in the filing season. Persistent configuration gap despite prior incidents.",
    resolvedAutomatically: false,
  },
];

export const CACHE_COLD_START_EVENTS: OperationalEvent[] = [
  {
    id: "cs-001",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-02-18T02:14:00Z",
    severity: "HIGH",
    durationMinutes: 19,
    description: "Redis session cache cleared on restart. 100% cache miss rate for 19 minutes caused 4x latency spike to 2,800ms P95 during peak filing hours.",
    resolvedAutomatically: false,
  },
  {
    id: "cs-002",
    serviceId: "refund-status-api",
    serviceName: "refund-status-api",
    timestamp: "2026-02-21T01:30:00Z",
    severity: "LOW",
    durationMinutes: 2,
    description: "Cache warmup script executed automatically on restart. Status cache populated from PostgreSQL within 2 minutes. No SLO impact.",
    resolvedAutomatically: true,
  },
  {
    id: "cs-003",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-03-15T05:11:00Z",
    severity: "HIGH",
    durationMinutes: 31,
    description: "No cache warmup procedure configured. Document template and rule caches rebuilt lazily over 31-minute window causing degraded verification throughput.",
    resolvedAutomatically: false,
  },
  {
    id: "cs-004",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-04-01T09:33:00Z",
    severity: "HIGH",
    durationMinutes: 22,
    description: "Repeat cold-start degradation following third OOM kill event. No corrective warmup automation deployed after prior incidents.",
    resolvedAutomatically: false,
  },
];

export const AUTOSCALING_LAG_EVENTS: OperationalEvent[] = [
  {
    id: "al-001",
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    timestamp: "2026-02-18T02:14:00Z",
    severity: "HIGH",
    durationMinutes: 11,
    description: "HPA scale-out triggered 11 minutes after restart due to CPU metric lag. Traffic throttled during scale-out window. Pre-warmed replicas policy absent.",
    resolvedAutomatically: true,
  },
  {
    id: "al-002",
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    timestamp: "2026-02-20T03:45:00Z",
    severity: "CRITICAL",
    durationMinutes: 24,
    description: "Autoscaler did not trigger during manual recovery due to missing HPA configuration. All traffic served by single pod at degraded capacity.",
    resolvedAutomatically: false,
  },
  {
    id: "al-003",
    serviceId: "document-upload-service",
    serviceName: "document-upload-service",
    timestamp: "2026-03-10T22:08:00Z",
    severity: "LOW",
    durationMinutes: 4,
    description: "Minor scaling lag following rollback restart. HPA responded within 4 minutes; no material SLO impact recorded.",
    resolvedAutomatically: true,
  },
];

const RAW_SERVICE_RECOVERY = [
  {
    serviceId: "refund-status-api",
    serviceName: "refund-status-api",
    tier: "TIER_1",
    owner: "Platform Engineering",
    factors: {
      autoRestartConfigured: true,
      healthChecksAvailable: true,
      smokeTestsAvailable: true,
      dependencyChecksAvailable: true,
      cacheWarmupAvailable: true,
      avgRecoveryTimeMinutes: 3,
      manualRecoveryRequired: false,
    },
  },
  {
    serviceId: "taxpayer-account-portal",
    serviceName: "taxpayer-account-portal",
    tier: "TIER_1",
    owner: "Citizen Services",
    factors: {
      autoRestartConfigured: false,
      healthChecksAvailable: true,
      smokeTestsAvailable: false,
      dependencyChecksAvailable: false,
      cacheWarmupAvailable: false,
      avgRecoveryTimeMinutes: 37,
      manualRecoveryRequired: true,
    },
  },
  {
    serviceId: "identity-verification-service",
    serviceName: "identity-verification-service",
    tier: "TIER_1",
    owner: "Identity & Access",
    factors: {
      autoRestartConfigured: false,
      healthChecksAvailable: false,
      smokeTestsAvailable: false,
      dependencyChecksAvailable: false,
      cacheWarmupAvailable: false,
      avgRecoveryTimeMinutes: 66,
      manualRecoveryRequired: true,
    },
  },
  {
    serviceId: "payment-plan-api",
    serviceName: "payment-plan-api",
    tier: "TIER_2",
    owner: "Payments Team",
    factors: {
      autoRestartConfigured: true,
      healthChecksAvailable: true,
      smokeTestsAvailable: true,
      dependencyChecksAvailable: true,
      cacheWarmupAvailable: false,
      avgRecoveryTimeMinutes: 4,
      manualRecoveryRequired: false,
    },
  },
  {
    serviceId: "document-upload-service",
    serviceName: "document-upload-service",
    tier: "TIER_2",
    owner: "Document Services",
    factors: {
      autoRestartConfigured: true,
      healthChecksAvailable: true,
      smokeTestsAvailable: false,
      dependencyChecksAvailable: true,
      cacheWarmupAvailable: false,
      avgRecoveryTimeMinutes: 12,
      manualRecoveryRequired: false,
    },
  },
  {
    serviceId: "notice-delivery-service",
    serviceName: "notice-delivery-service",
    tier: "TIER_2",
    owner: "Notifications",
    factors: {
      autoRestartConfigured: true,
      healthChecksAvailable: true,
      smokeTestsAvailable: true,
      dependencyChecksAvailable: false,
      cacheWarmupAvailable: true,
      avgRecoveryTimeMinutes: 5,
      manualRecoveryRequired: false,
    },
  },
];

export const SERVICE_RECOVERY_READINESS = RAW_SERVICE_RECOVERY.map((svc) => ({
  serviceId: svc.serviceId,
  serviceName: svc.serviceName,
  tier: svc.tier,
  owner: svc.owner,
  factors: svc.factors,
  readiness: computeRecoveryReadiness(svc.factors),
}));

const DEBT_BY_SERVICE: Record<string, number> = {
  "refund-status-api": 2.4,
  "taxpayer-account-portal": 54.8,
  "identity-verification-service": 74.4,
  "payment-plan-api": 6.0,
  "document-upload-service": 38.2,
  "notice-delivery-service": 8.8,
};

const OWNER_BY_SERVICE: Record<string, string> = {
  "refund-status-api": "Platform Engineering",
  "taxpayer-account-portal": "Citizen Services",
  "identity-verification-service": "Identity & Access",
  "payment-plan-api": "Payments Team",
  "document-upload-service": "Document Services",
  "notice-delivery-service": "Notifications",
};

const REBOOT_EVIDENCE_INPUTS: EvidencePacketInput[] = RAW_REBOOT_EVENTS.map((ev, idx) => {
  const isManual = ev.recoveryType === "MANUAL";
  const healthFailed = ev.healthCheckStatus === "FAILED";
  const decision = isManual ? "BLOCKED" as const : ev.healthCheckStatus === "PARTIAL" ? "WARNED" as const : "ALLOWED" as const;
  return {
    id: `ev-reboot-${String(idx + 1).padStart(3, "0")}`,
    serviceId: ev.serviceId,
    serviceName: ev.serviceName,
    releaseId: ev.id,
    releaseVersion: "REBOOT",
    commitSha: "n/a",
    generatedAt: ev.timestamp,
    eventType: "REBOOT_RECOVERY_AUDIT" as const,
    decision,
    policyName: "Filing Season Continuity Policy",
    metricViolated: ev.recoveryTimeMinutes > 5 ? "recovery_time_minutes" : null,
    metricUnit: ev.recoveryTimeMinutes > 5 ? "minutes" : null,
    baselineValue: ev.recoveryTimeMinutes > 5 ? 5 : null,
    observedValue: ev.recoveryTimeMinutes > 5 ? ev.recoveryTimeMinutes : null,
    debtScoreAtRelease: DEBT_BY_SERVICE[ev.serviceId] ?? 0,
    passed: ev.postRebootSmokePassed ? 1 : 0,
    failed: healthFailed ? 1 : 0,
    blocked: isManual ? 1 : 0,
    confidence: isManual ? "LOW" as const : "HIGH" as const,
    signalTrustScore: isManual ? 42 : ev.healthCheckStatus === "PARTIAL" ? 61 : 88,
    flakyRiskLabel: null,
    estimatedEngineeringHoursSaved: isManual ? 0 : 4,
    estimatedCloudWasteAvoided: isManual ? 0 : 1200,
    ownerTeam: OWNER_BY_SERVICE[ev.serviceId] ?? "Unknown",
    recommendedAction: isManual
      ? "Automate restart and post-boot health verification to eliminate manual recovery dependency."
      : "Continue monitoring. Validate smoke test coverage to maintain automated recovery posture.",
    notes: `Reboot cause: ${ev.rebootCause}. Region: ${ev.region}. Affected users: ${ev.affectedUsers}.`,
    approvedBy: isManual ? null : "Automated Gate",
  };
});

export const CONTINUITY_EVIDENCE_PACKETS = REBOOT_EVIDENCE_INPUTS.map(generateEvidencePacket);

export function getContinuitySummary() {
  const totalRebootEvents = RAW_REBOOT_EVENTS.length;
  const affectedServiceIds = new Set(RAW_REBOOT_EVENTS.map((e) => e.serviceId));
  const servicesImpacted = affectedServiceIds.size;

  const autoEvents = RAW_REBOOT_EVENTS.filter((e) => e.recoveryType === "AUTO");
  const manualEvents = RAW_REBOOT_EVENTS.filter((e) => e.recoveryType === "MANUAL");
  const autoRecoveredServices = new Set(autoEvents.map((e) => e.serviceId)).size;
  const manualRecoveryCount = manualEvents.length;
  const servicesRequiringManualRecovery = new Set(manualEvents.map((e) => e.serviceId)).size;

  const averageRecoveryTimeMinutes =
    Math.round(
      (RAW_REBOOT_EVENTS.reduce((a, e) => a + e.recoveryTimeMinutes, 0) / totalRebootEvents) * 10,
    ) / 10;

  const failedPostRebootChecks = RAW_REBOOT_EVENTS.filter(
    (e) => e.healthCheckStatus === "FAILED" || e.healthCheckStatus === "PARTIAL",
  ).length;

  const dependencyTimeoutEvents = RAW_REBOOT_EVENTS.filter(
    (e) => e.rebootCause === "DEPENDENCY_TIMEOUT",
  ).length;

  const queueBacklogEvents = QUEUE_BACKLOG_EVENTS.length;
  const databasePoolPressureEvents = DB_POOL_PRESSURE_EVENTS.length;
  const cacheColdStartEvents = CACHE_COLD_START_EVENTS.length;
  const autoscalingLagEvents = AUTOSCALING_LAG_EVENTS.length;

  const avgReadiness =
    SERVICE_RECOVERY_READINESS.reduce((a, s) => a + s.readiness.score, 0) /
    SERVICE_RECOVERY_READINESS.length;
  const recoveryReadinessScore = Math.round(avgReadiness);

  const serviceRebootCounts: Record<string, number> = {};
  for (const ev of RAW_REBOOT_EVENTS) {
    serviceRebootCounts[ev.serviceId] = (serviceRebootCounts[ev.serviceId] ?? 0) + 1;
  }
  const repeatedIncidentServices = Object.values(serviceRebootCounts).filter((c) => c > 1).length;
  const criticalTierServicesAffected = RAW_SERVICE_RECOVERY.filter(
    (s) => s.tier === "TIER_1" && affectedServiceIds.has(s.serviceId),
  ).length;

  const continuityRisk = computeContinuityRiskScore({
    totalRebootEvents,
    servicesImpacted,
    totalServices: RAW_SERVICE_RECOVERY.length,
    manualRecoveryCount,
    failedHealthChecks: failedPostRebootChecks,
    avgRecoveryTimeMinutes: averageRecoveryTimeMinutes,
    repeatedIncidentServices,
    criticalTierServicesAffected,
  });

  const filingSeasonContinuityRisk = continuityRisk.level;
  const continuityRiskScore = continuityRisk.score;

  const allActions = SERVICE_RECOVERY_READINESS.flatMap((s) => s.readiness.automationActions);
  const seen = new Set<string>();
  const automationRecommendations: string[] = [];
  for (const a of allActions) {
    if (!seen.has(a)) {
      seen.add(a);
      automationRecommendations.push(a);
    }
    if (automationRecommendations.length >= 6) break;
  }

  return {
    filingSeasonContinuityRisk,
    continuityRiskScore,
    recoveryReadinessScore,
    totalRebootEvents,
    servicesImpacted,
    autoRecoveredServices,
    manualRecoveryRequired: servicesRequiringManualRecovery,
    averageRecoveryTimeMinutes,
    failedPostRebootChecks,
    queueBacklogEvents,
    databasePoolPressureEvents,
    cacheColdStartEvents,
    autoscalingLagEvents,
    dependencyTimeoutEvents,
    continuityTimeline: RAW_REBOOT_EVENTS,
    queueBacklogDetail: QUEUE_BACKLOG_EVENTS,
    databasePoolDetail: DB_POOL_PRESSURE_EVENTS,
    cacheColdStartDetail: CACHE_COLD_START_EVENTS,
    autoscalingLagDetail: AUTOSCALING_LAG_EVENTS,
    affectedServices: SERVICE_RECOVERY_READINESS,
    automationRecommendations,
    continuityEvidencePackets: CONTINUITY_EVIDENCE_PACKETS,
    // Legacy aliases — preserved for backward compatibility
    continuityRiskLevel: filingSeasonContinuityRisk,
    avgRecoveryTimeMinutes: averageRecoveryTimeMinutes,
    failedPostRebootHealthChecks: failedPostRebootChecks,
    servicesRequiringManualRecovery,
    servicesAutoRecovered: autoRecoveredServices,
    affectedServicesCount: servicesImpacted,
    rebootEventTimeline: RAW_REBOOT_EVENTS,
    serviceReadiness: SERVICE_RECOVERY_READINESS,
    recommendedAutomationActions: automationRecommendations,
  };
}
