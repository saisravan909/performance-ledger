import { Router } from "express";
import { getDashboardSummaryDb, getDebtTrend, getMissionReadiness } from "../db/repository.js";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  res.json(await getDashboardSummaryDb());
});

router.get("/dashboard/debt-trend", (_req, res) => {
  res.json(getDebtTrend());
});

router.get("/dashboard/mission-readiness", (_req, res) => {
  res.json(getMissionReadiness());
});

export default router;
