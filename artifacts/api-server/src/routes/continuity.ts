import { Router } from "express";
import { getContinuitySummary } from "./data/continuity.js";

const router = Router();

router.get("/continuity", (_req, res) => {
  res.json(getContinuitySummary());
});

export default router;
