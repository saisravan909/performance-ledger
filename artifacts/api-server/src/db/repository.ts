import { getDb, servicesTable, ciRunsTable, flakyDetectionsTable, roiCalculationsTable, evidencePacketsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { type ScoreDriver } from "../engines/scoring.js";
import {
  SERVICES,
  RELEASES,
  FLAKY_SIGNALS,
  EVIDENCE_PACKETS,
  getFlakySignalSummary,
  getRoiBreakdown,
  getRoiSummary,
  getDashboardSummary,
  getDebtTrend,
  getMissionReadiness,
  getServiceDetail as syntheticServiceDetail,
} from "../routes/data/services.js";

function n(v: string | null | undefined): number {
  return v != null ? parseFloat(v) : 0;
}

function mapService(row: typeof servicesTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    status: row.status,
    missionReadiness: row.missionReadiness,
    owner: row.owner,
    releaseCount: row.releaseCount,
    lastUpdated: row.lastUpdated instanceof Date ? row.lastUpdated.toISOString() : row.lastUpdated,
    p50Latency: n(row.p50Latency),
    p95Latency: n(row.p95Latency),
    p99Latency: n(row.p99Latency),
    errorRate: n(row.errorRate),
    throughput: row.throughput,
    score: n(row.score),
    healthScore: row.healthScore,
    debtScore: row.debtScore,
    grade: row.grade,
    scoreDelta: n(row.scoreDelta),
    scoreTrend: row.scoreTrend,
    recommendedAction: row.recommendedAction,
    scoreComponents: {
      stability: n(row.compStability),
      regressionFrequency: n(row.compRegressionFrequency),
      regressionSeverity: n(row.compRegressionSeverity),
      trend: n(row.compTrend),
      testCoverage: n(row.compTestCoverage),
      signalReliability: n(row.compSignalReliability),
    },
    scoreDrivers: (row.scoreDrivers as unknown as ScoreDriver[]) ?? [],
  };
}

function mapRelease(row: typeof ciRunsTable.$inferSelect) {
  return {
    id: row.id,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    version: row.version,
    governanceStatus: row.governanceStatus,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    deployedAt: row.deployedAt instanceof Date ? row.deployedAt.toISOString() : (row.deployedAt ?? null),
    blockReason: row.blockReason ?? null,
    debtScoreAtRelease: n(row.debtScoreAtRelease),
  };
}

function mapFlakyDetection(row: typeof flakyDetectionsTable.$inferSelect) {
  return {
    id: row.id,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    benchmark: row.benchmark,
    flakinessScore: n(row.flakinessScore),
    flakyRiskScore: n(row.flakyRiskScore),
    flakyLabel: row.flakyLabel,
    confidence: row.confidence,
    primaryCause: row.primaryCause,
    gateRecommendation: row.gateRecommendation,
    remediationRecommendation: row.remediationRecommendation,
    executiveSummary: row.executiveSummary,
    developerNote: row.developerNote,
    riskComponents: {
      sameCommitFlipRate: n(row.compSameCommitFlipRate),
      metricVarianceScore: n(row.compMetricVarianceScore),
      runnerNoiseScore: n(row.compRunnerNoiseScore),
      baselineDriftScore: n(row.compBaselineDriftScore),
      nearThresholdFailureRate: n(row.compNearThresholdFailureRate),
      rerunDisagreementRate: n(row.compRerunDisagreementRate),
    },
    status: row.status,
    severity: row.severity,
    affectedRuns: row.affectedRuns,
    totalRuns: row.totalRuns,
    description: row.description ?? null,
    detectedAt: row.detectedAt instanceof Date ? row.detectedAt.toISOString() : row.detectedAt,
  };
}

function mapEvidencePacket(row: typeof evidencePacketsTable.$inferSelect) {
  return {
    id: row.id,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    releaseId: row.releaseId,
    releaseVersion: row.releaseVersion,
    commitSha: row.commitSha,
    generatedAt: row.generatedAt instanceof Date ? row.generatedAt.toISOString() : row.generatedAt,
    status: row.status,
    eventType: row.eventType,
    decision: row.decision,
    policyName: row.policyName,
    metricViolated: row.metricViolated ?? null,
    metricUnit: row.metricUnit ?? null,
    baselineValue: row.baselineValue != null ? n(row.baselineValue) : null,
    observedValue: row.observedValue != null ? n(row.observedValue) : null,
    deltaPercent: row.deltaPercent != null ? n(row.deltaPercent) : null,
    debtScoreAtRelease: n(row.debtScoreAtRelease),
    passed: row.passed,
    failed: row.failed,
    blocked: row.blocked,
    confidence: row.confidence,
    signalTrustScore: n(row.signalTrustScore),
    flakyRiskLabel: row.flakyRiskLabel ?? null,
    estimatedEngineeringHoursSaved: n(row.estimatedEngineeringHoursSaved),
    estimatedCloudWasteAvoided: n(row.estimatedCloudWasteAvoided),
    ownerTeam: row.ownerTeam,
    recommendedAction: row.recommendedAction,
    auditHash: row.auditHash,
    notes: row.notes ?? null,
    approvedBy: row.approvedBy ?? null,
  };
}

async function withFallback<T>(dbQuery: () => Promise<T>, fallback: T): Promise<T> {
  const db = getDb();
  if (!db) return fallback;
  try {
    return await dbQuery();
  } catch {
    return fallback;
  }
}

export async function listServices() {
  return withFallback(async () => {
    const db = getDb()!;
    const rows = await db.select().from(servicesTable);
    return rows.map(mapService);
  }, SERVICES);
}

export async function getServiceDetail(id: string) {
  return withFallback(async () => {
    const db = getDb()!;
    const [svc] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
    if (!svc) return null;
    const releases = await db.select().from(ciRunsTable).where(eq(ciRunsTable.serviceId, id));
    const flaky = await db.select().from(flakyDetectionsTable).where(eq(flakyDetectionsTable.serviceId, id));
    const evidence = await db.select().from(evidencePacketsTable).where(eq(evidencePacketsTable.serviceId, id));
    const synthetic = syntheticServiceDetail(id);
    return {
      ...mapService(svc),
      latencyTrend: synthetic?.latencyTrend ?? [],
      errorRateTrend: synthetic?.errorRateTrend ?? [],
      debtHistory: synthetic?.debtHistory ?? [],
      recentReleases: releases.map(mapRelease).slice(0, 5),
      flakySignals: flaky.map(mapFlakyDetection),
      evidencePackets: evidence.map(mapEvidencePacket).slice(0, 5),
    };
  }, syntheticServiceDetail(id));
}

export async function listReleases() {
  return withFallback(async () => {
    const db = getDb()!;
    const rows = await db.select().from(ciRunsTable);
    return rows.map(mapRelease);
  }, RELEASES);
}

export async function listFlakySignals() {
  return withFallback(async () => {
    const db = getDb()!;
    const rows = await db.select().from(flakyDetectionsTable);
    return rows.map(mapFlakyDetection);
  }, FLAKY_SIGNALS);
}

export async function getFlakySignalSummaryDb() {
  const signals = await listFlakySignals();
  const open = signals.filter((f) => f.status === "OPEN" || f.status === "INVESTIGATING");
  const critical = signals.filter((f) => f.severity === "CRITICAL");
  const avgFlakiness = Math.round(signals.reduce((a, f) => a + f.flakinessScore, 0) / signals.length);
  return {
    totalSignals: signals.length,
    openSignals: open.length,
    criticalSignals: critical.length,
    avgFlakinessScore: avgFlakiness,
    mostAffectedService: "identity-verification-service",
  };
}

export async function listEvidencePackets() {
  return withFallback(async () => {
    const db = getDb()!;
    const rows = await db.select().from(evidencePacketsTable);
    return rows.map(mapEvidencePacket);
  }, EVIDENCE_PACKETS);
}

export async function getEvidencePacket(id: string) {
  return withFallback(async () => {
    const db = getDb()!;
    const [row] = await db.select().from(evidencePacketsTable).where(eq(evidencePacketsTable.id, id));
    return row ? mapEvidencePacket(row) : null;
  }, EVIDENCE_PACKETS.find((e) => e.id === id) ?? null);
}

export async function getRoiBreakdownDb() {
  return withFallback(async () => {
    const db = getDb()!;
    const rows = await db.select().from(roiCalculationsTable);
    return rows.map((r) => ({
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      savingsUsd: n(r.savingsUsd),
      incidentsPrevented: r.incidentsPrevented,
      automationCoverage: n(r.automationCoverage),
      timeReductionHrs: n(r.timeReductionHrs),
    }));
  }, getRoiBreakdown());
}

export async function getDashboardSummaryDb() {
  const services = await listServices();
  const releases = await listReleases();
  const flaky = await listFlakySignals();
  const scores = services.map((s) => s.score);
  const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  return {
    totalServices: services.length,
    avgDebtScore: Math.round(100 - avgScore),
    avgHealthScore: Math.round(avgScore),
    avgScore,
    criticalServices: services.filter((s) => s.status === "CRITICAL").length,
    atRiskServices: services.filter((s) => s.missionReadiness === "AT_RISK" || s.missionReadiness === "DEGRADED").length,
    readyServices: services.filter((s) => s.missionReadiness === "READY").length,
    totalReleases: releases.length,
    blockedReleases: releases.filter((r) => r.governanceStatus === "BLOCKED").length,
    totalFlakySignals: flaky.filter((f) => f.status === "OPEN" || f.status === "INVESTIGATING").length,
    portfolioMissionReadiness: "AT_RISK" as const,
    debtScoreChange: -4.2,
    healthScoreChange: 2.1,
    scoreChange: 2.1,
  };
}

export { getRoiSummary, getDebtTrend, getMissionReadiness };
