import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import app from "../src/app.js";
import Appointment from "../src/models/Appointment.js";
import Service from "../src/models/Service.js";
import TimeOff from "../src/models/TimeOff.js";
import User from "../src/models/User.js";
import Vehicle from "../src/models/Vehicle.js";
import { connect, disconnect, futureDate, reset, slotAt, tokenFor } from "./helpers.js";

const MONDAY = futureDate(1);
const TUESDAY = futureDate(2);
const SUNDAY = futureDate(0);

let server, base;
let admin, client, meca, other, vehicle, service;
let seq = 0;
const user = (role, extra = {}) =>
	User.create({ firstName: role, lastName: `T${++seq}`, email: `${role}${seq}@t.local`, password: "x".repeat(20), role, ...extra });

const call = async (method, path, token, body) => {
	const res = await fetch(base + path, {
		method,
		headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
		body: body ? JSON.stringify(body) : undefined,
	});
	return { status: res.status, headers: res.headers, body: await res.json().catch(() => ({})) };
};
const appointment = (date, hours, extra = {}) =>
	Appointment.create({ customer: client._id, vehicle: vehicle._id, service: service._id, scheduledAt: slotAt(date, hours), estimatedMinutes: 60, ...extra });

before(async () => {
	await connect();
	server = app.listen(0);
	base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
	server.close();
	await disconnect();
});
beforeEach(async () => {
	await reset();
	admin = await user("admin");
	client = await user("client");
	meca = await user("mecano");
	other = await user("mecano");
	vehicle = await Vehicle.create({ owner: client._id, model: "Defender" });
	service = await Service.create({ name: "Vidange", estimatedMinutes: 60 });
});

describe("reprogrammer un rendez-vous", () => {
	const reschedule = (id, date, hours, token = tokenFor(admin)) =>
		call("PATCH", `/appointments/${id}/reschedule`, token, { scheduledAt: slotAt(date, hours).toISOString() });

	it("déplace un rendez-vous en attente sur un créneau libre", async () => {
		const a = await appointment(MONDAY, 10);
		const res = await reschedule(a._id, TUESDAY, 14);
		assert.equal(res.status, 200);
		assert.equal(new Date(res.body.appointment.scheduledAt).getTime(), slotAt(TUESDAY, 14).getTime());
		assert.equal((await Appointment.findById(a._id)).status, "pending");
	});

	it("garde le mécanicien assigné quand il est libre", async () => {
		const a = await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: meca._id });
		const res = await reschedule(a._id, TUESDAY, 9);
		assert.equal(res.status, 200);
		assert.equal(res.body.released, null);
		const saved = await Appointment.findById(a._id);
		assert.equal(saved.status, "confirmed");
		assert.equal(String(saved.assignedMechanic), String(meca._id));
	});

	it("retire le mécanicien absent à la nouvelle date et repasse en attente", async () => {
		const a = await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: meca._id });
		await TimeOff.create({ scope: "mechanic", mechanic: meca._id, startDate: TUESDAY, endDate: TUESDAY });
		const res = await reschedule(a._id, TUESDAY, 9);
		assert.equal(res.status, 200);
		assert.match(res.body.released, /mecano/);
		const saved = await Appointment.findById(a._id);
		assert.equal(saved.status, "pending");
		assert.equal(saved.assignedMechanic, undefined);
	});

	it("retire le mécanicien déjà pris à la nouvelle heure", async () => {
		const a = await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: meca._id });
		await appointment(TUESDAY, 9, { status: "confirmed", assignedMechanic: meca._id });
		const res = await reschedule(a._id, TUESDAY, 9.5);
		assert.equal(res.status, 200);
		assert.ok(res.body.released);
	});

	it("refuse un jour de fermeture, un dimanche et un créneau complet", async () => {
		const a = await appointment(MONDAY, 10);
		await TimeOff.create({ scope: "garage", startDate: TUESDAY, endDate: TUESDAY, reason: "Férié" });
		assert.equal((await reschedule(a._id, TUESDAY, 10)).status, 409);
		assert.equal((await reschedule(a._id, SUNDAY, 10)).status, 409);

		// Les deux mécaniciens sont pris mercredi à 10h
		const wednesday = futureDate(3);
		await appointment(wednesday, 10, { status: "confirmed", assignedMechanic: meca._id });
		await appointment(wednesday, 10, { status: "confirmed", assignedMechanic: other._id });
		assert.equal((await reschedule(a._id, wednesday, 10)).status, 409);
	});

	it("refuse le passé, la même date et un rendez-vous déjà commencé", async () => {
		const a = await appointment(MONDAY, 10);
		const past = await call("PATCH", `/appointments/${a._id}/reschedule`, tokenFor(admin), { scheduledAt: new Date(Date.now() - 86400000).toISOString() });
		assert.equal(past.status, 400);
		assert.equal((await reschedule(a._id, MONDAY, 10)).status, 400);

		const started = await appointment(MONDAY, 14, { status: "in_progress", assignedMechanic: meca._id });
		assert.equal((await reschedule(started._id, TUESDAY, 10)).status, 400);
		const cancelled = await appointment(MONDAY, 15, { status: "cancelled" });
		assert.equal((await reschedule(cancelled._id, TUESDAY, 10)).status, 400);
	});

	it("un rendez-vous peut être décalé de quelques minutes sur lui-même (sa place n'est pas comptée deux fois)", async () => {
		const a = await appointment(MONDAY, 10, { status: "confirmed", assignedMechanic: meca._id });
		await user("mecano"); // sans cela, un seul mécanicien : tout serait déjà pris par ce rendez-vous
		const res = await reschedule(a._id, MONDAY, 10.5);
		assert.equal(res.status, 200);
	});

	it("réservé à l'administrateur", async () => {
		const a = await appointment(MONDAY, 10);
		assert.equal((await reschedule(a._id, TUESDAY, 10, tokenFor(client))).status, 403);
		assert.equal((await reschedule(a._id, TUESDAY, 10, tokenFor(meca))).status, 403);
		assert.equal((await reschedule(a._id, TUESDAY, 10, null)).status, 401);
	});

	it("identifiant inconnu : 404", async () => {
		assert.equal((await reschedule("64b000000000000000000000", TUESDAY, 10)).status, 404);
	});
});

describe("modifier un membre de l'équipe", () => {
	it("met à jour le nom, l'email et le téléphone", async () => {
		const res = await call("PATCH", `/users/staff/${meca._id}`, tokenFor(admin), { firstName: "  Marc ", lastName: "Rabe", email: "MARC@garage.local", phone: "034 00 000 00" });
		assert.equal(res.status, 200);
		const saved = await User.findById(meca._id);
		assert.equal(saved.firstName, "Marc");
		assert.equal(saved.email, "marc@garage.local");
		assert.equal(saved.phone, "034 00 000 00");
		assert.equal(saved.role, "mecano");
	});

	it("ignore une tentative de changer le rôle ou le mot de passe", async () => {
		await call("PATCH", `/users/staff/${meca._id}`, tokenFor(admin), { role: "admin", password: "pirate12345" });
		const saved = await User.findById(meca._id).select("+password");
		assert.equal(saved.role, "mecano");
		assert.equal(saved.password, "x".repeat(20));
	});

	it("refuse un email déjà utilisé, un email invalide et un nom vide", async () => {
		assert.equal((await call("PATCH", `/users/staff/${meca._id}`, tokenFor(admin), { email: other.email })).status, 409);
		assert.equal((await call("PATCH", `/users/staff/${meca._id}`, tokenFor(admin), { email: "pas-un-email" })).status, 400);
		assert.equal((await call("PATCH", `/users/staff/${meca._id}`, tokenFor(admin), { firstName: "" })).status, 400);
	});

	it("ne touche pas aux clients et reste réservé à l'administrateur", async () => {
		assert.equal((await call("PATCH", `/users/staff/${client._id}`, tokenFor(admin), { firstName: "X" })).status, 404);
		assert.equal((await call("PATCH", `/users/staff/${meca._id}`, tokenFor(meca), { firstName: "X" })).status, 403);
	});
});

describe("sécurité", () => {
	it("envoie les en-têtes de sécurité", async () => {
		const res = await call("GET", "/health");
		assert.equal(res.headers.get("x-content-type-options"), "nosniff");
		assert.equal(res.headers.get("x-powered-by"), null);
	});

	it("refuse les opérateurs MongoDB dans le corps de la requête", async () => {
		assert.equal((await call("POST", "/auth/login", null, { email: { $ne: null }, password: { $ne: null } })).status, 400);
		assert.equal((await call("POST", "/auth/login", null, { email: { "a.b": 1 } })).status, 400);
	});

	it("refuse un JSON mal formé sans erreur 500", async () => {
		const res = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{pas du json" });
		assert.equal(res.status, 400);
	});

	it("la connexion refuse un mot de passe qui n'est pas du texte", async () => {
		await User.updateOne({ _id: client._id }, { password: await bcrypt.hash("Motdepasse1", 10) });
		assert.equal((await call("POST", "/auth/login", null, { email: client.email, password: ["Motdepasse1"] })).status, 401);
		assert.equal((await call("POST", "/auth/login", null, { email: client.email, password: "Motdepasse1" })).status, 200);
	});

	it("refuse un jeton signé avec un autre secret", async () => {
		const forged = (await import("jsonwebtoken")).default.sign({ id: admin._id, role: "admin" }, "un-autre-secret");
		assert.equal((await call("GET", "/appointments", forged)).status, 401);
	});

	it("un corps trop gros est refusé", async () => {
		const res = await call("POST", "/auth/register", null, { firstName: "a".repeat(200_000) });
		assert.equal(res.status, 413);
	});

	it("limite la description à 1000 caractères", async () => {
		await user("mecano");
		const res = await call("POST", "/appointments", tokenFor(client), {
			vehicleId: String(vehicle._id),
			serviceId: String(service._id),
			scheduledAt: slotAt(MONDAY, 9).toISOString(),
			customerNotes: "x".repeat(1001),
		});
		assert.equal(res.status, 400);
	});
});
