import TimeOff from "../models/TimeOff.js";
import User from "../models/User.js";
import { summarizeAppointments } from "../utils/appointmentSummary.js";
import { parseDate, rangeMs, toGarageDate } from "../utils/garageTime.js";

const MAX_DAYS = 366;

// Admin : absences et fermetures en cours ou à venir (?from=2026-11-01 pour inclure aussi des périodes plus anciennes)
export const listTimeOff = async (req, res) => {
	const from = parseDate(req.query.from) ? req.query.from : toGarageDate(new Date());
	const timeOffs = await TimeOff.find({ endDate: { $gte: from } })
		.sort({ startDate: 1 })
		.populate("mechanic", "firstName lastName");
	res.json({ success: true, timeOffs });
};

// Rendez-vous déjà pris sur la période et que l'absence ou la fermeture met en difficulté
async function findAffected({ scope, mechanic, startDate, endDate }) {
	const [start, end] = rangeMs(startDate, endDate);
	const filter = {
		scheduledAt: { $gte: new Date(start), $lt: new Date(end) },
		// Fermeture : toutes les demandes ; absence : seulement ce que le mécanicien devait faire
		status: { $in: scope === "garage" ? ["pending", "confirmed", "in_progress"] : ["confirmed", "in_progress"] },
		...(scope === "mechanic" ? { assignedMechanic: mechanic } : {}),
	};
	return summarizeAppointments(filter);
}

// Admin : déclare une fermeture du garage ou l'absence d'un mécanicien
export const createTimeOff = async (req, res) => {
	const { scope, mechanicId, startDate, endDate, reason } = req.body;
	const fail = (message) => res.status(400).json({ success: false, message });

	if (!["garage", "mechanic"].includes(scope)) return fail("Le type doit être « garage » ou « mechanic ».");
	if (!parseDate(startDate) || !parseDate(endDate)) return fail("Dates invalides.");
	if (endDate < startDate) return fail("La date de fin ne peut pas précéder la date de début.");
	if (endDate < toGarageDate(new Date())) return fail("Cette période est déjà passée.");

	const [start, end] = rangeMs(startDate, endDate);
	if ((end - start) / 86400000 > MAX_DAYS) return fail("La période ne peut pas dépasser un an.");

	let mechanic;
	if (scope === "mechanic") {
		mechanic = await User.findOne({ _id: mechanicId, role: "mecano" });
		if (!mechanic) return res.status(404).json({ success: false, message: "Mécanicien introuvable." });
	}

	const created = await TimeOff.create({ scope, mechanic: mechanic?._id, startDate, endDate, reason });
	const timeOff = await created.populate("mechanic", "firstName lastName");
	const affected = await findAffected({ scope, mechanic: mechanic?._id, startDate, endDate });

	res.status(201).json({ success: true, timeOff, affected });
};

export const deleteTimeOff = async (req, res) => {
	const timeOff = await TimeOff.findByIdAndDelete(req.params.id);
	if (!timeOff) return res.status(404).json({ success: false, message: "Introuvable." });
	res.json({ success: true });
};
