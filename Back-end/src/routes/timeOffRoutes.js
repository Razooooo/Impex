import { Router } from "express";
import { createTimeOff, deleteTimeOff, listTimeOff } from "../controllers/timeOffController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect, restrictTo("admin"));
router.get("/", listTimeOff);
router.post("/", createTimeOff);
router.delete("/:id", deleteTimeOff);

export default router;
