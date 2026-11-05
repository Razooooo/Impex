import { MIN_LEAD_MINUTES, OPENING_HOURS, SLOT_MINUTES, UTC_OFFSET_MINUTES } from "../config/garage.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";

const MIN = 60 * 1000;
const ACTIVE_STATUSES = ["pending", "confirmed", "in_progress"];

// "2026-11-06" -> { y, mo, d, dow } ou null si la date n'existe pas
function parseDate(str) {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str));
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const date = new Date(Date.UTC(y, mo - 1, d));
	if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
	return { y, mo, d, dow: date.getUTCDay() };
}

// Instant réel (en ms) correspondant à « ce jour-là, à telle heure, au Madagascar »
const at = (p, hours) => Date.UTC(p.y, p.mo - 1, p.d) + hours * 60 * MIN - UTC_OFFSET_MINUTES * MIN;

// Date du jour dans le fuseau du garage, au format "2026-11-06"
export const toGarageDate = (date) => new Date(date.getTime() + UTC_OFFSET_MINUTES * MIN).toISOString().slice(0, 10);

const addDays = (str, n) => {
	const p = parseDate(str);
	return new Date(Date.UTC(p.y, p.mo - 1, p.d + n)).toISOString().slice(0, 10);
};

const label = (hours) => {
	const mins = Math.round(hours * 60);
	return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
};

/**
 * Créneaux d'une journée pour une prestation de `duration` minutes.
 * Un créneau est disponible si :
 *  - l'intervention se termine avant la fermeture, et le créneau n'est pas déjà passé (délai minimum compris) ;
 *  - il reste au moins un mécanicien libre, en comptant aussi les demandes encore en attente
 *    (elles n'ont pas de mécanicien mais en occuperont un), pour éviter de promettre plus que ce que le garage peut faire.
 * Retourne null si la date est invalide.
 */
export async function getDayAvailability(dateStr, duration, excludeId = null) {
	const p = parseDate(dateStr);
	if (!p) return null;

	const hours = OPENING_HOURS[p.dow];
	if (!hours) return { closed: true, slots: [] };

	const openMs = at(p, hours[0]);
	const closeMs = at(p, hours[1]);

	const mechanicIds = (await User.find({ role: "mecano" }).select("_id")).map((m) => String(m._id));
	const appointments = await Appointment.find({
		status: { $in: ACTIVE_STATUSES },
		scheduledAt: { $lt: new Date(closeMs), $gte: new Date(openMs - 24 * 60 * MIN) },
		...(excludeId ? { _id: { $ne: excludeId } } : {}),
	}).select("scheduledAt estimatedMinutes assignedMechanic");

	const busy = appointments
		.map((a) => ({
			start: a.scheduledAt.getTime(),
			end: a.scheduledAt.getTime() + (a.estimatedMinutes || 60) * MIN,
			mechanic: a.assignedMechanic ? String(a.assignedMechanic) : null,
		}))
		.filter((a) => a.end > openMs);

	const earliest = Date.now() + MIN_LEAD_MINUTES * MIN;
	const slots = [];
	for (let t = hours[0]; t < hours[1]; t += SLOT_MINUTES / 60) {
		const start = at(p, t);
		const end = start + duration * MIN;

		let available = end <= closeMs && start >= earliest;
		if (available) {
			const overlapping = busy.filter((a) => a.start < end && a.end > start);
			const busyMechanics = new Set(overlapping.filter((a) => a.mechanic && mechanicIds.includes(a.mechanic)).map((a) => a.mechanic));
			const unassigned = overlapping.filter((a) => !a.mechanic).length;
			available = mechanicIds.length - busyMechanics.size - unassigned >= 1;
		}
		slots.push({ time: label(t), start: new Date(start).toISOString(), available });
	}
	return { closed: false, slots };
}

// Premier créneau libre dans les `days` jours qui suivent `fromDateStr`, ou null
export async function findNextAvailable(fromDateStr, duration, days = 14) {
	for (let i = 1; i <= days; i++) {
		const date = addDays(fromDateStr, i);
		const day = await getDayAvailability(date, duration);
		const slot = day?.slots.find((s) => s.available);
		if (slot) return { date, time: slot.time, start: slot.start };
	}
	return null;
}

// Vérifie qu'un créneau précis (instant de début) est réservable pour cette durée
export async function isSlotAvailable(startDate, duration, excludeId = null) {
	const day = await getDayAvailability(toGarageDate(startDate), duration, excludeId);
	const slot = day?.slots.find((s) => new Date(s.start).getTime() === startDate.getTime());
	return Boolean(slot?.available);
}
