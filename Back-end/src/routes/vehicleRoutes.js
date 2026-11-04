import { Router } from "express";
import {
	createVehicle,
	deleteVehicle,
	listModels,
	listMyVehicles,
	updateVehicle,
} from "../controllers/vehicleController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect, restrictTo("client"));
router.get("/models", listModels);
router.get("/", listMyVehicles);
router.post("/", createVehicle);
router.patch("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

export default router;
