import { Router } from "express";
import { createService, listServices, updateService } from "../controllers/serviceController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", listServices);
router.post("/", protect, restrictTo("admin"), createService);
router.patch("/:id", protect, restrictTo("admin"), updateService);

export default router;
