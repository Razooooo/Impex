import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { services, staff } from "../config/seedData.js";
import Appointment from "../models/Appointment.js";
import Service from "../models/Service.js";
import TimeOff from "../models/TimeOff.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import { addDays, at, parseDate, toGarageDate } from "./garageTime.js";

// Mode démo (site de portfolio) : DEMO_MODE=true. Connexion rapide, lien « mot de passe oublié » affiché à l'écran,
// comptes de démonstration protégés, et base remise à zéro chaque jour.
export const isDemo = () => process.env.DEMO_MODE === "true";

export const DEMO_CLIENT = { firstName: "Camille", lastName: "Rakoto", email: "demo@garage.local", phone: "034 00 000 00", role: "client" };
const ROLE_ACCOUNTS = { client: DEMO_CLIENT.email, admin: "admin@garage.local", mecano: "marc@garage.local" };
export const demoEmailFor = (role) => ROLE_ACCOUNTS[role];

// Ces comptes sont partagés par tous les visiteurs : leur mot de passe, leur adresse et leur état ne se modifient pas
const SHARED = [DEMO_CLIENT.email, ...staff.map((s) => s.email)];
export const isSharedDemoAccount = (email) => isDemo() && SHARED.includes(String(email).toLowerCase());

const DAY = 24 * 60 * 60 * 1000;

const markReset = () => mongoose.connection.collection("meta").updateOne({ _id: "demoReset" }, { $set: { at: new Date() } }, { upsert: true });

// Date (« 2026-11-23 ») du n-ième jour ouvré (lundi à vendredi) après aujourd'hui, n négatif = avant
function workday(n) {
	let date = toGarageDate(new Date());
	const step = n < 0 ? -1 : 1;
	for (let left = Math.abs(n); left > 0; ) {
		date = addDays(date, step);
		const dow = parseDate(date).dow;
		if (dow !== 0 && dow !== 6) left--;
	}
	return date;
}
const when = (date, hours) => new Date(at(parseDate(date), hours));

export async function resetDemo() {
	await markReset();
	const password = await bcrypt.hash(process.env.DEMO_PASSWORD || process.env.SEED_PASSWORD || "Password123!", 10);

	await Promise.all([Appointment.deleteMany({}), Vehicle.deleteMany({}), TimeOff.deleteMany({})]);
	// Tous les comptes sauf l'équipe : le compte client de démo est recréé, ce qui date la dernière remise à zéro
	await User.deleteMany({ email: { $nin: staff.map((s) => s.email) } });
	await Service.deleteMany({ name: { $nin: services.map((s) => s.name) } });

	for (const u of [...staff, DEMO_CLIENT]) {
		await User.updateOne(
			{ email: u.email },
			{
				$set: { ...u, password, active: true },
				$unset: { passwordChangedAt: 1, passwordResetToken: 1, passwordResetExpires: 1, passwordResetRequestedAt: 1 },
			},
			{ upsert: true },
		);
	}
	for (const s of services) await Service.updateOne({ name: s.name }, { $set: { ...s, active: true } }, { upsert: true });

	const [client, marc, sophie] = await Promise.all(["demo@garage.local", "marc@garage.local", "sophie@garage.local"].map((e) => User.findOne({ email: e })));
	const svc = Object.fromEntries((await Service.find()).map((s) => [s.name, s]));
	// Jeu d'exemple volontairement réduit : un véhicule et un rendez-vous, pour que la démo reste lisible
	const defender = await Vehicle.create({ owner: client._id, model: "Defender", year: 2021, plate: "1234 TAB", engine: "D250 3.0 diesel", mileage: 48200 });

	await Appointment.create({
		customer: client._id,
		vehicle: defender._id,
		service: svc["Plaquettes et disques de frein"]._id,
		scheduledAt: when(workday(2), 10),
		estimatedMinutes: svc["Plaquettes et disques de frein"].estimatedMinutes,
		status: "confirmed",
		assignedMechanic: marc._id,
		customerNotes: "Bruit au freinage à basse vitesse.",
	});

	await TimeOff.create([
		{ scope: "garage", startDate: workday(9), endDate: workday(9), reason: "Jour férié (exemple)" },
		{ scope: "mechanic", mechanic: sophie._id, startDate: workday(6), endDate: workday(7), reason: "Congés (exemple)" },
	]);
}

// La démo repart de zéro au plus une fois par jour. La date de la dernière remise à zéro est gardée en base :
// plusieurs instances de l'API (hébergement serverless) peuvent appeler cette fonction en même temps,
// une seule "réserve" la remise à zéro (mise à jour atomique), les autres passent leur tour.
export async function ensureDemoFresh() {
	const meta = mongoose.connection.collection("meta");
	const cutoff = new Date(Date.now() - DAY);
	try {
		const claim = await meta.updateOne({ _id: "demoReset", at: { $lt: cutoff } }, { $set: { at: new Date() } }, { upsert: true });
		if (!claim.upsertedCount && !claim.modifiedCount) return;
	} catch (error) {
		if (error.code === 11000) return; // la remise à zéro est récente (ou déjà réservée par une autre instance)
		throw error;
	}
	await resetDemo();
	console.log("🌱 Données de démonstration réinitialisées.");
}
