import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const flakyDetectionsTable = pgTable("flaky_detections", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  benchmark: text("benchmark").notNull(),
  flakinessScore: numeric("flakiness_score").notNull(),
  flakyRiskScore: numeric("flaky_risk_score").notNull(),
  flakyLabel: text("flaky_label").notNull(),
  confidence: text("confidence").notNull(),
  primaryCause: text("primary_cause").notNull(),
  gateRecommendation: text("gate_recommendation").notNull(),
  remediationRecommendation: text("remediation_recommendation").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  developerNote: text("developer_note").notNull(),
  compSameCommitFlipRate: numeric("comp_same_commit_flip_rate").notNull(),
  compMetricVarianceScore: numeric("comp_metric_variance_score").notNull(),
  compRunnerNoiseScore: numeric("comp_runner_noise_score").notNull(),
  compBaselineDriftScore: numeric("comp_baseline_drift_score").notNull(),
  compNearThresholdFailureRate: numeric("comp_near_threshold_failure_rate").notNull(),
  compRerunDisagreementRate: numeric("comp_rerun_disagreement_rate").notNull(),
  status: text("status").notNull(),
  severity: text("severity").notNull(),
  affectedRuns: integer("affected_runs").notNull(),
  totalRuns: integer("total_runs").notNull(),
  description: text("description"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
});

export type FlakyDetection = typeof flakyDetectionsTable.$inferSelect;
export type InsertFlakyDetection = typeof flakyDetectionsTable.$inferInsert;
