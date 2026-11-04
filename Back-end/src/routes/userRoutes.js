import { Router } from "express";
import { createStaff, listMechanics, listStaff } from "../controllers/userController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect, restrictTo("admin"));
router.get("/mechanics", listMechanics);
router.get("/staff", listStaff);
router.post("/staff", createStaff);

export default router;
