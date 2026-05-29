import { Router } from "express";
import { getRoiBreakdownDb, getRoiSummary } from "../db/repository.js";

const router = Router();

router.get("/roi/summary", (_req, res) => {
  res.json(getRoiSummary());
});

router.get("/roi/breakdown", async (_req, res) => {
  res.json(await getRoiBreakdownDb());
});

export default router;
