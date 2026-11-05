import Appointment from "../models/Appointment.js";
import Service from "../models/Service.js";
import { findNextAvailable, getDayAvailability } from "../utils/availability.js";

// Créneaux d'un jour : GET /availability?date=2026-11-06&serviceId=...
// L'admin peut passer ?appointmentId=... à la place du service, pour reprogrammer un rendez-vous existant :
// on utilise alors sa durée, et sa propre place n'est pas comptée comme occupée.
export const getAvailability = async (req, res) => {
	const { date, serviceId, appointmentId } = req.query;

	let minutes;
	let excludeId = null;
	if (appointmentId && req.user.role === "admin") {
		const appointment = await Appointment.findById(appointmentId);
		if (!appointment) return res.status(404).json({ success: false, message: "Rendez-vous introuvable." });
		minutes = appointment.estimatedMinutes || 60;
		excludeId = appointment._id;
	} else {
		const service = await Service.findOne({ _id: serviceId, active: true });
		if (!service) return res.status(404).json({ success: false, message: "Service introuvable." });
		minutes = service.estimatedMinutes;
	}

	const day = await getDayAvailability(date, minutes, excludeId);
	if (!day) return res.status(400).json({ success: false, message: "Date invalide." });

	// Rien de libre ce jour-là : on propose directement la prochaine date possible
	const next = day.slots.some((s) => s.available) ? null : await findNextAvailable(date, minutes);

	res.json({
		success: true,
		date,
		closed: day.closed,
		reason: day.reason,
		durationMinutes: minutes,
		slots: day.slots,
		next,
	});
};
