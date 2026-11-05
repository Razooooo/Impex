import { Router } from "express";
import {
	changePassword,
	forgotPassword,
	login,
	me,
	register,
	resetPassword,
	updateMe,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, me);
router.patch("/me", protect, updateMe);
router.patch("/password", protect, changePassword);

export default router;
