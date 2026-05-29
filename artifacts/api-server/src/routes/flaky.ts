import { Router } from "express";
import { listFlakySignals, getFlakySignalSummaryDb } from "../db/repository.js";

const router = Router();

router.get("/flaky/signals", async (_req, res) => {
  res.json(await listFlakySignals());
});

router.get("/flaky/summary", async (_req, res) => {
  res.json(await getFlakySignalSummaryDb());
});

export default router;
