import { pgTable, text, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const servicesTable = pgTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tier: text("tier").notNull(),
  status: text("status").notNull(),
  missionReadiness: text("mission_readiness").notNull(),
  owner: text("owner").notNull(),
  releaseCount: integer("release_count").notNull().default(0),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
  p50Latency: numeric("p50_latency").notNull(),
  p95Latency: numeric("p95_latency").notNull(),
  p99Latency: numeric("p99_latency").notNull(),
  errorRate: numeric("error_rate").notNull(),
  throughput: integer("throughput").notNull(),
  score: numeric("score").notNull(),
  healthScore: integer("health_score").notNull(),
  debtScore: integer("debt_score").notNull(),
  grade: text("grade").notNull(),
  scoreDelta: numeric("score_delta"),
  scoreTrend: text("score_trend"),
  recommendedAction: text("recommended_action"),
  compStability: numeric("comp_stability"),
  compRegressionFrequency: numeric("comp_regression_frequency"),
  compRegressionSeverity: numeric("comp_regression_severity"),
  compTrend: numeric("comp_trend"),
  compTestCoverage: numeric("comp_test_coverage"),
  compSignalReliability: numeric("comp_signal_reliability"),
  scoreDrivers: jsonb("score_drivers").$type<string[]>(),
});

export type Service = typeof servicesTable.$inferSelect;
export type InsertService = typeof servicesTable.$inferInsert;
