import { Router } from "express";
import {
	assignAppointment,
	createAppointment,
	listAppointments,
	updateStatus,
} from "../controllers/appointmentController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/", listAppointments);
router.post("/", restrictTo("client"), createAppointment);
router.patch("/:id/assign", restrictTo("admin"), assignAppointment);
router.patch("/:id/status", updateStatus);

export default router;
