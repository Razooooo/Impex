import { Router } from "express";
import { isDemo } from "../utils/demo.js";
import { MIN_LEAD_MINUTES, OPENING_HOURS, SLOT_MINUTES, UTC_OFFSET_MINUTES } from "../config/garage.js";

const router = Router();

// Horaires et fuseau du garage : une seule source de vérité pour le front (calendrier)
router.get("/", (_req, res) => {
	res.json({
		success: true,
		openingHours: OPENING_HOURS,
		slotMinutes: SLOT_MINUTES,
		minLeadMinutes: MIN_LEAD_MINUTES,
		utcOffsetMinutes: UTC_OFFSET_MINUTES,
		demo: isDemo(),
	});
});

export default router;
