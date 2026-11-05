import { Router } from "express";
import { createStaff, listMechanics, listStaff, setStaffActive, updateStaff } from "../controllers/userController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect, restrictTo("admin"));
router.get("/mechanics", listMechanics);
router.get("/staff", listStaff);
router.post("/staff", createStaff);
router.patch("/staff/:id", updateStaff);
router.patch("/staff/:id/active", setStaffActive);

export default router;
