import Appointment from "../models/Appointment.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import { APPOINTMENT_STATUSES } from "../models/Appointment.js";

const populate = [
	{ path: "customer", select: "firstName lastName email phone" },
	{ path: "vehicle", select: "model year plate engine mileage" },
	{ path: "service", select: "name category estimatedMinutes" },
	{ path: "assignedMechanic", select: "firstName lastName" },
];

// Client : prend un rendez-vous
export const createAppointment = async (req, res) => {
	const { vehicleId, serviceId, scheduledAt, customerNotes } = req.body;

	const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: req.user.id });
	if (!vehicle) return res.status(404).json({ success: false, message: "Véhicule introuvable." });

	const service = await Service.findOne({ _id: serviceId, active: true });
	if (!service) return res.status(404).json({ success: false, message: "Service introuvable." });

	if (!scheduledAt || new Date(scheduledAt) < new Date()) {
		return res.status(400).json({ success: false, message: "La date doit être dans le futur." });
	}

	const appointment = await Appointment.create({
		customer: req.user.id,
		vehicle: vehicle._id,
		service: service._id,
		scheduledAt,
		customerNotes,
		estimatedMinutes: service.estimatedMinutes,
	});
	res.status(201).json({ success: true, appointment });
};

// Client : ses rdv — Mécano : ses tâches assignées — Admin : tout (filtrable par ?status=)
export const listAppointments = async (req, res) => {
	const filter = {};
	if (req.user.role === "client") filter.customer = req.user.id;
	if (req.user.role === "mecano") filter.assignedMechanic = req.user.id;
	if (req.query.status) filter.status = req.query.status;

	const appointments = await Appointment.find(filter).sort({ scheduledAt: 1 }).populate(populate);
	res.json({ success: true, appointments });
};

// Cherche une intervention déjà confirmée ou en cours du mécanicien qui chevauche [start, start + minutes]
async function findConflict(mechanicId, start, minutes, excludeId) {
	const end = new Date(start.getTime() + minutes * 60000);
	const candidates = await Appointment.find({
		assignedMechanic: mechanicId,
		_id: { $ne: excludeId },
		status: { $in: ["confirmed", "in_progress"] },
		scheduledAt: { $lt: end, $gte: new Date(start.getTime() - 24 * 3600 * 1000) },
	}).populate("service", "name");
	return candidates.find((c) => c.scheduledAt.getTime() + (c.estimatedMinutes || 0) * 60000 > start.getTime());
}

// Admin : assigne (ou réassigne) un mécano et ajuste le temps estimé.
// Un rendez-vous en attente passe à « confirmé » dès qu'un mécano lui est assigné.
export const assignAppointment = async (req, res) => {
	const { mechanicId, estimatedMinutes } = req.body;

	const appointment = await Appointment.findById(req.params.id);
	if (!appointment) return res.status(404).json({ success: false, message: "Rendez-vous introuvable." });
	if (["done", "cancelled"].includes(appointment.status)) {
		return res.status(400).json({ success: false, message: "Ce rendez-vous est terminé ou annulé." });
	}

	const minutes = estimatedMinutes ? Number(estimatedMinutes) : appointment.estimatedMinutes;
	if (!Number.isFinite(minutes) || minutes < 5) {
		return res.status(400).json({ success: false, message: "La durée estimée doit être d'au moins 5 minutes." });
	}

	const targetId = mechanicId || appointment.assignedMechanic;
	if (targetId) {
		const mechanic = await User.findOne({ _id: targetId, role: "mecano" });
		if (!mechanic) return res.status(404).json({ success: false, message: "Mécanicien introuvable." });

		const conflict = await findConflict(mechanic._id, appointment.scheduledAt, minutes, appointment._id);
		if (conflict) {
			return res.status(409).json({
				success: false,
				message: `${mechanic.firstName} ${mechanic.lastName} a déjà une intervention sur ce créneau (${conflict.service?.name}). Choisissez un autre mécanicien ou ajustez la durée.`,
			});
		}
		if (mechanicId) {
			appointment.assignedMechanic = mechanic._id;
			if (appointment.status === "pending") appointment.status = "confirmed";
		}
	}

	appointment.estimatedMinutes = minutes;
	await appointment.save();
	res.json({ success: true, appointment: await appointment.populate(populate) });
};

// Admin : tout changement — Mécano : seulement ses tâches — Client : annulation de son rdv
export const updateStatus = async (req, res) => {
	const { status, mechanicNotes } = req.body;
	if (!APPOINTMENT_STATUSES.includes(status)) {
		return res.status(400).json({ success: false, message: "Statut invalide." });
	}

	const appointment = await Appointment.findById(req.params.id);
	if (!appointment) return res.status(404).json({ success: false, message: "Rendez-vous introuvable." });

	const { role, id } = req.user;
	const allowed =
		role === "admin" ||
		(role === "mecano" && String(appointment.assignedMechanic) === id) ||
		(role === "client" && String(appointment.customer) === id && status === "cancelled");
	if (!allowed) return res.status(403).json({ success: false, message: "Action non autorisée." });

	if (role === "client" && ["in_progress", "done", "cancelled"].includes(appointment.status)) {
		return res
			.status(400)
			.json({ success: false, message: "Ce rendez-vous ne peut plus être annulé. Contactez le garage." });
	}

	if (status === "in_progress" && !appointment.assignedMechanic) {
		return res.status(400).json({ success: false, message: "Assignez d'abord un mécanicien à ce rendez-vous." });
	}

	appointment.status = status;
	if (mechanicNotes !== undefined && role !== "client") appointment.mechanicNotes = mechanicNotes;
	await appointment.save();

	res.json({ success: true, appointment: await appointment.populate(populate) });
};
