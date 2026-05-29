import { useQuery } from "@tanstack/react-query";

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

export interface ServiceReadiness {
  serviceId: string;
  serviceName: string;
  tier: string;
  owner: string;
  factors: {
    autoRestartConfigured: boolean;
    healthChecksAvailable: boolean;
    smokeTestsAvailable: boolean;
    dependencyChecksAvailable: boolean;
    cacheWarmupAvailable: boolean;
    avgRecoveryTimeMinutes: number;
    manualRecoveryRequired: boolean;
  };
  readiness: {
    score: number;
    grade: string;
    riskLevel: string;
    deficits: string[];
    automationActions: string[];
  };
}

export interface EvidencePacket {
  id: string;
  serviceId: string;
  serviceName: string;
  generatedAt: string;
  eventType: string;
  decision: string;
  policyName: string;
  auditHash: string;
  signalTrustScore: number;
  confidence: string;
  metricViolated: string | null;
  baselineValue: number | null;
  observedValue: number | null;
  metricUnit: string | null;
  recommendedAction: string;
  notes: string;
  ownerTeam: string;
}

export interface ContinuitySummary {
  // Spec-aligned fields
  filingSeasonContinuityRisk: string;
  continuityRiskScore: number;
  recoveryReadinessScore: number;
  totalRebootEvents: number;
  servicesImpacted: number;
  autoRecoveredServices: number;
  manualRecoveryRequired: number;
  averageRecoveryTimeMinutes: number;
  failedPostRebootChecks: number;
  queueBacklogEvents: number;
  databasePoolPressureEvents: number;
  cacheColdStartEvents: number;
  autoscalingLagEvents: number;
  dependencyTimeoutEvents: number;
  continuityTimeline: RebootEvent[];
  queueBacklogDetail: OperationalEvent[];
  databasePoolDetail: OperationalEvent[];
  cacheColdStartDetail: OperationalEvent[];
  autoscalingLagDetail: OperationalEvent[];
  affectedServices: ServiceReadiness[];
  automationRecommendations: string[];
  continuityEvidencePackets: EvidencePacket[];
  // Legacy aliases
  continuityRiskLevel: string;
  avgRecoveryTimeMinutes: number;
  failedPostRebootHealthChecks: number;
  servicesRequiringManualRecovery: number;
  servicesAutoRecovered: number;
  affectedServicesCount: number;
  rebootEventTimeline: RebootEvent[];
  serviceReadiness: ServiceReadiness[];
  recommendedAutomationActions: string[];
}

export function useGetContinuitySummary() {
  return useQuery<ContinuitySummary>({
    queryKey: ["continuity"],
    queryFn: async () => {
      const res = await fetch("/api/continuity");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<ContinuitySummary>;
    },
  });
}
