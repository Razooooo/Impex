import Appointment from "../models/Appointment.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import { APPOINTMENT_STATUSES } from "../models/Appointment.js";
import { findUnavailability, isSlotAvailable } from "../utils/availability.js";
import { toGarageDate } from "../utils/garageTime.js";

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

	const start = new Date(scheduledAt);
	if (!scheduledAt || Number.isNaN(start.getTime()) || start < new Date()) {
		return res.status(400).json({ success: false, message: "La date doit être dans le futur." });
	}

	// On revérifie côté serveur : le créneau a pu être pris entre-temps, ou l'heure envoyée n'a jamais été proposée
	if (!(await isSlotAvailable(start, service.estimatedMinutes))) {
		return res.status(409).json({
			success: false,
			message: "Ce créneau n'est plus disponible. Choisissez une autre heure.",
		});
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

	// Un mécanicien a besoin du nom du client, pas de ses coordonnées
	const fields = req.user.role === "mecano" ? populate.map((p) => (p.path === "customer" ? { ...p, select: "firstName lastName" } : p)) : populate;
	const appointments = await Appointment.find(filter).sort({ scheduledAt: 1 }).populate(fields);
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
		// Un nouveau mécanicien doit être en activité ; pour garder celui déjà assigné (ex. changer la durée), pas de contrôle
		const mechanic = await User.findOne({ _id: targetId, role: "mecano", ...(mechanicId ? { active: { $ne: false } } : {}) });
		if (!mechanic) return res.status(404).json({ success: false, message: "Mécanicien introuvable." });

		const off = await findUnavailability(mechanic._id, toGarageDate(appointment.scheduledAt));
		if (off) {
			const why = off.reason ? ` (${off.reason})` : "";
			return res.status(409).json({
				success: false,
				message:
					off.type === "garage"
						? `Le garage est fermé ce jour-là${why}.`
						: `${mechanic.firstName} ${mechanic.lastName} est absent ce jour-là${why}. Choisissez un autre mécanicien.`,
			});
		}

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

// Admin : change la date d'un rendez-vous (en attente ou confirmé) sans l'annuler.
// Le nouveau créneau doit être réellement disponible. Si le mécanicien assigné n'est pas libre à la nouvelle date
// (absent, ou déjà pris), le rendez-vous lui est retiré et repasse « en attente » : l'admin choisira un autre mécanicien.
export const rescheduleAppointment = async (req, res) => {
	const appointment = await Appointment.findById(req.params.id);
	if (!appointment) return res.status(404).json({ success: false, message: "Rendez-vous introuvable." });
	if (!["pending", "confirmed"].includes(appointment.status)) {
		return res.status(400).json({ success: false, message: "Seul un rendez-vous en attente ou confirmé peut être reprogrammé." });
	}

	const start = new Date(req.body.scheduledAt);
	if (!req.body.scheduledAt || Number.isNaN(start.getTime()) || start < new Date()) {
		return res.status(400).json({ success: false, message: "La nouvelle date doit être dans le futur." });
	}
	if (start.getTime() === appointment.scheduledAt.getTime()) {
		return res.status(400).json({ success: false, message: "Choisissez une date différente de l'actuelle." });
	}

	const minutes = appointment.estimatedMinutes || 60;
	if (!(await isSlotAvailable(start, minutes, appointment._id))) {
		return res.status(409).json({ success: false, message: "Ce créneau n'est pas disponible. Choisissez une autre heure." });
	}

	let released = null;
	if (appointment.assignedMechanic) {
		const mechanic = await User.findById(appointment.assignedMechanic);
		const unavailable =
			!mechanic ||
			mechanic.active === false ||
			(await findUnavailability(mechanic._id, toGarageDate(start))) ||
			(await findConflict(mechanic._id, start, minutes, appointment._id));
		if (unavailable) {
			released = mechanic ? `${mechanic.firstName} ${mechanic.lastName}` : "Le mécanicien";
			appointment.assignedMechanic = undefined;
			appointment.status = "pending";
		}
	}

	appointment.scheduledAt = start;
	await appointment.save();
	res.json({ success: true, released, appointment: await appointment.populate(populate) });
};

// Admin ou mécano assigné : note sur l'intervention (visible par le client)
export const updateNotes = async (req, res) => {
	const notes = String(req.body.mechanicNotes ?? "").trim();
	if (notes.length > 1000) {
		return res.status(400).json({ success: false, message: "La note est trop longue (1000 caractères maximum)." });
	}

	const appointment = await Appointment.findById(req.params.id);
	if (!appointment) return res.status(404).json({ success: false, message: "Rendez-vous introuvable." });

	const { role, id } = req.user;
	if (role === "mecano" && String(appointment.assignedMechanic) !== id) {
		return res.status(403).json({ success: false, message: "Action non autorisée." });
	}

	appointment.mechanicNotes = notes;
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

	// Un mécanicien fait avancer son intervention (confirmé → en cours → terminé), rien d'autre
	if (role === "mecano") {
		const next = { confirmed: "in_progress", in_progress: "done" };
		if (next[appointment.status] !== status) {
			return res.status(400).json({ success: false, message: "Ce changement de statut n'est pas autorisé." });
		}
	}

	if (status === "in_progress" && !appointment.assignedMechanic) {
		return res.status(400).json({ success: false, message: "Assignez d'abord un mécanicien à ce rendez-vous." });
	}

	appointment.status = status;
	if (mechanicNotes !== undefined && role !== "client") appointment.mechanicNotes = mechanicNotes;
	await appointment.save();

	res.json({ success: true, appointment: await appointment.populate(populate) });
};
