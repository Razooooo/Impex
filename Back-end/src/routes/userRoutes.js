import { Router } from "express";
import { createStaff, listMechanics } from "../controllers/userController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect, restrictTo("admin"));
router.get("/mechanics", listMechanics);
router.post("/staff", createStaff);

export default router;
