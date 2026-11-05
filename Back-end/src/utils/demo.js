import bcrypt from "bcryptjs";
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
	const [defender, sport] = await Vehicle.create([
		{ owner: client._id, model: "Defender", year: 2021, plate: "1234 TAB", engine: "D250 3.0 diesel", mileage: 48200 },
		{ owner: client._id, model: "Range Rover Sport", year: 2018, plate: "5678 TBC", engine: "SDV6 3.0 diesel", mileage: 96500 },
	]);

	const base = { customer: client._id };
	const make = (vehicle, service, date, hours, extra) =>
		({ ...base, vehicle: vehicle._id, service: svc[service]._id, scheduledAt: when(date, hours), estimatedMinutes: svc[service].estimatedMinutes, ...extra });

	await Appointment.create([
		make(sport, "Vidange + filtres", workday(-4), 9, {
			status: "done",
			assignedMechanic: marc._id,
			mechanicNotes: "Huile et filtres remplacés. Plaquettes avant à surveiller d'ici 10 000 km.",
		}),
		make(defender, "Géométrie et pneus", workday(-1), 14, { status: "cancelled", customerNotes: "Pneus à changer avant la saison des pluies." }),
		make(defender, "Plaquettes et disques de frein", toGarageDate(new Date()), 8, {
			status: "in_progress",
			assignedMechanic: marc._id,
			customerNotes: "Bruit au freinage à basse vitesse.",
			mechanicNotes: "Disques avant à remplacer, pièces en commande.",
		}),
		make(sport, "Suspension pneumatique", workday(2), 10, {
			status: "confirmed",
			assignedMechanic: sophie._id,
			customerNotes: "La voiture s'affaisse à l'arrière après quelques heures à l'arrêt.",
		}),
		make(defender, "Diagnostic général", workday(4), 14, {
			status: "pending",
			customerNotes: "Symptômes : voyant moteur allumé, perte de puissance. Depuis une semaine, surtout à froid.",
		}),
	]);

	await TimeOff.create([
		{ scope: "garage", startDate: workday(9), endDate: workday(9), reason: "Jour férié (exemple)" },
		{ scope: "mechanic", mechanic: sophie._id, startDate: workday(6), endDate: workday(7), reason: "Congés (exemple)" },
	]);
}

// La démo repart de zéro au plus une fois par jour : on se base sur la date de création du compte client de démo
export async function ensureDemoFresh() {
	const demo = await User.findOne({ email: DEMO_CLIENT.email }).select("createdAt");
	if (!demo || Date.now() - demo.createdAt.getTime() > DAY) {
		await resetDemo();
		console.log("🌱 Données de démonstration réinitialisées.");
	}
}
