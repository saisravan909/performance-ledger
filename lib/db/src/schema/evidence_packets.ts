import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const evidencePacketsTable = pgTable("evidence_packets", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  releaseId: text("release_id").notNull(),
  releaseVersion: text("release_version").notNull(),
  commitSha: text("commit_sha").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  eventType: text("event_type").notNull(),
  decision: text("decision").notNull(),
  policyName: text("policy_name").notNull(),
  metricViolated: text("metric_violated"),
  metricUnit: text("metric_unit"),
  baselineValue: numeric("baseline_value"),
  observedValue: numeric("observed_value"),
  deltaPercent: numeric("delta_percent"),
  debtScoreAtRelease: numeric("debt_score_at_release").notNull(),
  passed: integer("passed").notNull(),
  failed: integer("failed").notNull(),
  blocked: integer("blocked").notNull(),
  confidence: text("confidence").notNull(),
  signalTrustScore: numeric("signal_trust_score").notNull(),
  flakyRiskLabel: text("flaky_risk_label"),
  estimatedEngineeringHoursSaved: numeric("estimated_engineering_hours_saved").notNull(),
  estimatedCloudWasteAvoided: numeric("estimated_cloud_waste_avoided").notNull(),
  ownerTeam: text("owner_team").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  auditHash: text("audit_hash").notNull(),
  notes: text("notes"),
  approvedBy: text("approved_by"),
});

export type EvidencePacket = typeof evidencePacketsTable.$inferSelect;
export type InsertEvidencePacket = typeof evidencePacketsTable.$inferInsert;
