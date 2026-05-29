import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const roiCalculationsTable = pgTable("roi_calculations", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  savingsUsd: numeric("savings_usd").notNull(),
  incidentsPrevented: integer("incidents_prevented").notNull(),
  automationCoverage: numeric("automation_coverage").notNull(),
  timeReductionHrs: numeric("time_reduction_hrs").notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoiCalculation = typeof roiCalculationsTable.$inferSelect;
export type InsertRoiCalculation = typeof roiCalculationsTable.$inferInsert;
