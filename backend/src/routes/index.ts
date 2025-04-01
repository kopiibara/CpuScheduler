import express from "express";
import { SchedulingController } from "../controllers/SchedulingController";

const router = express.Router();
const schedulingController = new SchedulingController();

// CPU Scheduling simulation endpoint
router.post("/simulate", schedulingController.simulate);

export default router;
