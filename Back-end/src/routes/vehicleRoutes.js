import { Router } from "express";
import { createVehicle, deleteVehicle, listMyVehicles } from "../controllers/vehicleController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect, restrictTo("client"));
router.get("/", listMyVehicles);
router.post("/", createVehicle);
router.delete("/:id", deleteVehicle);

export default router;
