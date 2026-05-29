import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const ciRunsTable = pgTable("ci_runs", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  version: text("version").notNull(),
  governanceStatus: text("governance_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  deployedAt: timestamp("deployed_at", { withTimezone: true }),
  blockReason: text("block_reason"),
  debtScoreAtRelease: numeric("debt_score_at_release").notNull(),
});

export type CiRun = typeof ciRunsTable.$inferSelect;
export type InsertCiRun = typeof ciRunsTable.$inferInsert;
