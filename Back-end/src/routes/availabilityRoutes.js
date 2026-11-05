import { Router } from "express";
import { getAvailability } from "../controllers/availabilityController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", protect, restrictTo("client", "admin"), getAvailability);

export default router;
