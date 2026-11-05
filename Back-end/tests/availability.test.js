import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import Appointment from "../src/models/Appointment.js";
import Service from "../src/models/Service.js";
import TimeOff from "../src/models/TimeOff.js";
import User from "../src/models/User.js";
import Vehicle from "../src/models/Vehicle.js";
import { getDayAvailability, isSlotAvailable } from "../src/utils/availability.js";
import { addDays, parseDate, toGarageDate } from "../src/utils/garageTime.js";
import { connect, disconnect, futureDate, reset, slotAt } from "./helpers.js";

const MONDAY = futureDate(1);
const SUNDAY = futureDate(0);
const SATURDAY = futureDate(6);

let customer, vehicle, service;
let seq = 0;
const mechanic = (extra = {}) =>
	User.create({ firstName: "Méca", lastName: `N${++seq}`, email: `m${seq}@t.local`, password: "x".repeat(20), role: "mecano", ...extra });
const appointment = (date, hours, extra = {}) =>
	Appointment.create({ customer: customer._id, vehicle: vehicle._id, service: service._id, scheduledAt: slotAt(date, hours), estimatedMinutes: 60, ...extra });
const slots = async (date, duration = 60, excludeId) => (await getDayAvailability(date, duration, excludeId)).slots;
const free = (list, time) => list.find((s) => s.time === time).available;

before(connect);
after(disconnect);
beforeEach(async () => {
	await reset();
	customer = await User.create({ firstName: "C", lastName: "C", email: "c@t.local", password: "x".repeat(20) });
	vehicle = await Vehicle.create({ owner: customer._id, model: "Defender" });
	service = await Service.create({ name: "Vidange", estimatedMinutes: 60 });
});

describe("garageTime", () => {
	it("refuse les dates qui n'existent pas", () => {
		assert.equal(parseDate("2026-02-30"), null);
		assert.equal(parseDate("26-02-03"), null);
		assert.equal(parseDate("pas une date"), null);
	});
	it("passe correctement d'un mois à l'autre", () => {
		assert.equal(addDays("2026-01-31", 1), "2026-02-01");
		assert.equal(addDays("2026-12-31", 1), "2027-01-01");
	});
	it("convertit en date du garage (UTC+3)", () => {
		assert.equal(toGarageDate(new Date("2026-11-05T22:00:00Z")), "2026-11-06");
		assert.equal(toGarageDate(new Date("2026-11-05T20:59:00Z")), "2026-11-05");
	});
});

describe("jours et horaires", () => {
	it("dimanche : fermé", async () => {
		await mechanic();
		const day = await getDayAvailability(SUNDAY, 60);
		assert.equal(day.closed, true);
		assert.deepEqual(day.slots, []);
	});
	it("date invalide : null", async () => {
		assert.equal(await getDayAvailability("2026-13-45", 60), null);
	});
	it("semaine : l'intervention doit finir avant 17h30", async () => {
		await mechanic();
		const s = await slots(MONDAY, 60);
		assert.equal(s.length, 19); // 08:00 à 17:00, toutes les 30 minutes
		assert.equal(free(s, "08:00"), true);
		assert.equal(free(s, "16:30"), true);
		assert.equal(free(s, "17:00"), false);
	});
	it("samedi : fermeture à 12h", async () => {
		await mechanic();
		const s = await slots(SATURDAY, 60);
		assert.equal(free(s, "11:00"), true);
		assert.equal(free(s, "11:30"), false);
		assert.equal((await slots(SATURDAY, 180)).filter((x) => x.available).length, 3); // 08:00, 08:30, 09:00
	});
	it("une longue prestation ne rentre pas en fin de journée", async () => {
		await mechanic();
		const s = await slots(MONDAY, 240);
		assert.equal(free(s, "13:30"), true);
		assert.equal(free(s, "14:00"), false);
	});
	it("fermeture du garage : jour fermé avec la raison", async () => {
		await mechanic();
		await TimeOff.create({ scope: "garage", startDate: MONDAY, endDate: MONDAY, reason: "Inventaire" });
		const day = await getDayAvailability(MONDAY, 60);
		assert.equal(day.closed, true);
		assert.equal(day.reason, "Inventaire");
	});
	it("une fermeture de plusieurs jours couvre aussi les bornes", async () => {
		await mechanic();
		await TimeOff.create({ scope: "garage", startDate: MONDAY, endDate: addDays(MONDAY, 2) });
		for (const d of [MONDAY, addDays(MONDAY, 1), addDays(MONDAY, 2)]) assert.equal((await getDayAvailability(d, 60)).closed, true);
		assert.equal((await getDayAvailability(addDays(MONDAY, 3), 60)).closed, false);
	});
	it("le délai minimum est respecté aujourd'hui", async () => {
		await mechanic();
		const day = await getDayAvailability(toGarageDate(new Date()), 30);
		if (day.closed) return; // dimanche ou jour fermé : rien à vérifier
		for (const s of day.slots) {
			if (new Date(s.start).getTime() < Date.now() + 60 * 60000) assert.equal(s.available, false, `${s.time} est trop proche`);
		}
	});
});

describe("mécaniciens et rendez-vous", () => {
	it("sans mécanicien : aucun créneau", async () => {
		assert.equal((await slots(MONDAY)).some((s) => s.available), false);
	});
	it("un mécanicien pris bloque les créneaux qui chevauchent", async () => {
		const m = await mechanic();
		await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: m._id });
		const s = await slots(MONDAY, 60);
		assert.equal(free(s, "09:00"), true); // finit à 10:00 pile
		assert.equal(free(s, "09:30"), false);
		assert.equal(free(s, "10:00"), false);
		assert.equal(free(s, "10:30"), false);
		assert.equal(free(s, "11:00"), true);
	});
	it("avec deux mécaniciens, un seul pris laisse le créneau libre", async () => {
		const a = await mechanic();
		await mechanic();
		await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: a._id });
		assert.equal(free(await slots(MONDAY), "10:00"), true);
	});
	it("les deux pris : créneau indisponible", async () => {
		const a = await mechanic();
		const b = await mechanic();
		await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: a._id });
		await appointment(MONDAY, 10, { status: "in_progress", assignedMechanic: b._id });
		assert.equal(free(await slots(MONDAY), "10:00"), false);
	});
	it("une demande en attente sans mécanicien occupe déjà une place", async () => {
		await mechanic();
		await appointment(MONDAY, 10); // en attente, non assignée
		assert.equal(free(await slots(MONDAY), "10:00"), false);
	});
	it("des demandes en attente ne dépassent jamais le nombre de mécaniciens", async () => {
		await mechanic();
		await mechanic();
		await appointment(MONDAY, 10);
		assert.equal(free(await slots(MONDAY), "10:00"), true); // 2 mécaniciens, 1 demande
		await appointment(MONDAY, 10);
		assert.equal(free(await slots(MONDAY), "10:00"), false);
	});
	it("les rendez-vous annulés ou terminés ne bloquent rien", async () => {
		const m = await mechanic();
		await appointment(MONDAY, 10, { status: "cancelled", assignedMechanic: m._id });
		await appointment(MONDAY, 10, { status: "done", assignedMechanic: m._id });
		assert.equal(free(await slots(MONDAY), "10:00"), true);
	});
	it("un mécanicien absent ne compte pas", async () => {
		const m = await mechanic();
		await TimeOff.create({ scope: "mechanic", mechanic: m._id, startDate: MONDAY, endDate: MONDAY });
		assert.equal((await slots(MONDAY)).some((s) => s.available), false);
		assert.equal((await slots(addDays(MONDAY, 1))).some((s) => s.available), true);
	});
	it("un mécanicien désactivé ne compte pas", async () => {
		await mechanic({ active: false });
		assert.equal((await slots(MONDAY)).some((s) => s.available), false);
	});
	it("le rendez-vous d'un mécanicien absent est à réassigner : il occupe une place", async () => {
		const absent = await mechanic();
		await mechanic();
		await TimeOff.create({ scope: "mechanic", mechanic: absent._id, startDate: MONDAY, endDate: MONDAY });
		await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: absent._id });
		assert.equal(free(await slots(MONDAY), "10:00"), false);
	});
	it("en excluant un rendez-vous, sa propre place est libre", async () => {
		const m = await mechanic();
		const a = await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: m._id });
		assert.equal(free(await slots(MONDAY), "10:00"), false);
		assert.equal(free(await slots(MONDAY, 60, a._id), "10:00"), true);
	});
});

describe("isSlotAvailable", () => {
	it("accepte un créneau proposé", async () => {
		await mechanic();
		assert.equal(await isSlotAvailable(slotAt(MONDAY, 9), 60), true);
	});
	it("refuse une heure qui n'a jamais été proposée", async () => {
		await mechanic();
		assert.equal(await isSlotAvailable(slotAt(MONDAY, 9.25), 60), false);
	});
	it("refuse un jour fermé et un créneau pris", async () => {
		const m = await mechanic();
		assert.equal(await isSlotAvailable(slotAt(SUNDAY, 9), 60), false);
		await appointment(MONDAY, 9, { status: "confirmed", assignedMechanic: m._id });
		assert.equal(await isSlotAvailable(slotAt(MONDAY, 9), 60), false);
	});
});
