import Service from "../models/Service.js";
import { findNextAvailable, getDayAvailability } from "../utils/availability.js";

// Créneaux d'un jour pour une prestation : GET /availability?date=2026-11-06&serviceId=...
export const getAvailability = async (req, res) => {
	const { date, serviceId } = req.query;

	const service = await Service.findOne({ _id: serviceId, active: true });
	if (!service) return res.status(404).json({ success: false, message: "Service introuvable." });

	const day = await getDayAvailability(date, service.estimatedMinutes);
	if (!day) return res.status(400).json({ success: false, message: "Date invalide." });

	// Rien de libre ce jour-là : on propose directement la prochaine date possible
	const next = day.slots.some((s) => s.available) ? null : await findNextAvailable(date, service.estimatedMinutes);

	res.json({
		success: true,
		date,
		closed: day.closed,
		reason: day.reason,
		durationMinutes: service.estimatedMinutes,
		slots: day.slots,
		next,
	});
};
