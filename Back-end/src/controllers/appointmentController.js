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

// Admin : assigne un mécano et ajuste le temps estimé
export const assignAppointment = async (req, res) => {
	const { mechanicId, estimatedMinutes } = req.body;

	const update = {};
	if (mechanicId) {
		const mechanic = await User.findOne({ _id: mechanicId, role: "mecano" });
		if (!mechanic) return res.status(404).json({ success: false, message: "Mécanicien introuvable." });
		update.assignedMechanic = mechanic._id;
		update.status = "confirmed";
	}
	if (estimatedMinutes) update.estimatedMinutes = estimatedMinutes;

	const appointment = await Appointment.findByIdAndUpdate(req.params.id, update, {
		new: true,
		runValidators: true,
	}).populate(populate);
	if (!appointment) return res.status(404).json({ success: false, message: "Rendez-vous introuvable." });
	res.json({ success: true, appointment });
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

	appointment.status = status;
	if (mechanicNotes !== undefined && role !== "client") appointment.mechanicNotes = mechanicNotes;
	await appointment.save();

	res.json({ success: true, appointment: await appointment.populate(populate) });
};
