import { Router } from "express";
import { listServices, getServiceDetail, listReleases } from "../db/repository.js";

const router = Router();

router.get("/services", async (_req, res) => {
  res.json(await listServices());
});

router.get("/services/:id", async (req, res) => {
  const detail = await getServiceDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(detail);
});

router.get("/releases", async (_req, res) => {
  res.json(await listReleases());
});

export default router;
