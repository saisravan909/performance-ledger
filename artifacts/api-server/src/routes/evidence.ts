import { Router } from "express";
import { listEvidencePackets, getEvidencePacket } from "../db/repository.js";

const router = Router();

router.get("/evidence", async (_req, res) => {
  res.json(await listEvidencePackets());
});

router.get("/evidence/:id", async (req, res) => {
  const packet = await getEvidencePacket(req.params.id);
  if (!packet) {
    res.status(404).json({ error: "Evidence packet not found" });
    return;
  }
  res.json(packet);
});

export default router;
