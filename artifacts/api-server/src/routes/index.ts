import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import servicesRouter from "./services.js";
import dashboardRouter from "./dashboard.js";
import roiRouter from "./roi.js";
import flakyRouter from "./flaky.js";
import evidenceRouter from "./evidence.js";
import continuityRouter from "./continuity.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(dashboardRouter);
router.use(roiRouter);
router.use(flakyRouter);
router.use(evidenceRouter);
router.use(continuityRouter);

export default router;
