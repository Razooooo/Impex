import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import Appointment from "../src/models/Appointment.js";
import Service from "../src/models/Service.js";
import TimeOff from "../src/models/TimeOff.js";
import User from "../src/models/User.js";
import Vehicle from "../src/models/Vehicle.js";
import { ensureDemoFresh, resetDemo } from "../src/utils/demo.js";
import { connect, disconnect, reset } from "./helpers.js";

let server, base;
const call = async (method, path, token, body) => {
	const res = await fetch(base + path, {
		method,
		headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
		body: body ? JSON.stringify(body) : undefined,
	});
	return { status: res.status, body: await res.json().catch(() => ({})) };
};

before(async () => {
	await connect();
	server = app.listen(0);
	base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
	delete process.env.DEMO_MODE;
	server.close();
	await disconnect();
});
beforeEach(async () => {
	process.env.DEMO_MODE = "true";
	await reset();
	await resetDemo();
});

describe("remise à zéro de la démo", () => {
	it("crée l'équipe, le client de démo, des véhicules, des rendez-vous de chaque statut et des absences", async () => {
		assert.equal(await User.countDocuments({ role: "mecano" }), 2);
		assert.equal(await User.countDocuments({ role: "admin" }), 1);
		assert.equal(await Vehicle.countDocuments(), 2);
		const statuses = (await Appointment.find()).map((a) => a.status).sort();
		assert.deepEqual(statuses, ["cancelled", "confirmed", "done", "in_progress", "pending"]);
		assert.equal(await TimeOff.countDocuments(), 2);
		assert.ok((await Service.countDocuments()) >= 8);
	});

	it("efface ce que les visiteurs ont créé et restaure l'équipe", async () => {
		const visitor = await User.create({ firstName: "V", lastName: "V", email: "visiteur@t.local", password: "x".repeat(20) });
		await Vehicle.create({ owner: visitor._id, model: "Defender" });
		await Service.create({ name: "Service ajouté", estimatedMinutes: 30 });
		await User.updateOne({ email: "admin@garage.local" }, { password: await bcrypt.hash("pirate12345", 10), active: false });

		await resetDemo();

		assert.equal(await User.findOne({ email: "visiteur@t.local" }), null);
		assert.equal(await Vehicle.countDocuments(), 2);
		assert.equal(await Service.findOne({ name: "Service ajouté" }), null);
		const admin = await User.findOne({ email: "admin@garage.local" }).select("+password");
		assert.equal(admin.active, true);
		assert.equal(await bcrypt.compare("Password123!", admin.password), true);
	});

	it("ne repart de zéro qu'une fois par jour", async () => {
		const marker = await Service.create({ name: "Marqueur", estimatedMinutes: 30 });
		await ensureDemoFresh();
		assert.ok(await Service.findById(marker._id), "données récentes : rien n'est effacé");

			await mongoose.connection.collection("meta").updateOne({ _id: "demoReset" }, { $set: { at: new Date(Date.now() - 25 * 3600 * 1000) } });
		await ensureDemoFresh();
		assert.equal(await Service.findById(marker._id), null);
	});
});

describe("API en mode démo", () => {
	it("connexion rapide pour chaque rôle", async () => {
		for (const role of ["client", "admin", "mecano"]) {
			const res = await call("POST", "/auth/demo", null, { role });
			assert.equal(res.status, 200);
			assert.equal(res.body.user.role, role);
			assert.ok(res.body.token);
		}
		assert.equal((await call("POST", "/auth/demo", null, { role: "pirate" })).status, 400);
	});

	it("la connexion rapide n'existe pas hors démo", async () => {
		process.env.DEMO_MODE = "false";
		assert.equal((await call("POST", "/auth/demo", null, { role: "admin" })).status, 404);
		assert.equal((await call("GET", "/garage")).body.demo, false);
	});

	it("annonce le mode démo au front", async () => {
		assert.equal((await call("GET", "/garage")).body.demo, true);
	});

	it("les comptes partagés ne changent ni de mot de passe, ni d'adresse, ni d'état", async () => {
		const { body } = await call("POST", "/auth/demo", null, { role: "admin" });
		const token = body.token;
		assert.equal((await call("PATCH", "/auth/password", token, { currentPassword: "Password123!", newPassword: "Nouveau12345" })).status, 403);
		assert.equal((await call("PATCH", "/auth/me", token, { email: "autre@t.local", currentPassword: "Password123!" })).status, 403);
		const marc = await User.findOne({ email: "marc@garage.local" });
		assert.equal((await call("PATCH", `/users/staff/${marc._id}/active`, token, { active: false })).status, 403);
		assert.equal((await call("PATCH", `/users/staff/${marc._id}`, token, { firstName: "X" })).status, 403);
		assert.equal((await call("PATCH", "/auth/me", token, { firstName: "Admin" })).status, 200);
	});

	it("« mot de passe oublié » renvoie le lien pour un compte visiteur, pas pour un compte partagé", async () => {
		const visitor = await call("POST", "/auth/register", null, { firstName: "V", lastName: "V", email: "visiteur@t.local", password: "Motdepasse1" });
		assert.equal(visitor.status, 201);

		const own = await call("POST", "/auth/forgot-password", null, { email: "visiteur@t.local" });
		assert.match(own.body.demoLink, /reset-password\?token=/);

		const shared = await call("POST", "/auth/forgot-password", null, { email: "admin@garage.local" });
		assert.equal(shared.body.demoLink, undefined);

		const reset = await call("POST", "/auth/reset-password", null, { token: own.body.demoLink.split("token=")[1], password: "NouveauMdp12" });
		assert.equal(reset.status, 200);
		assert.equal((await call("POST", "/auth/login", null, { email: "visiteur@t.local", password: "NouveauMdp12" })).status, 200);
	});

	it("hors démo, le lien n'est jamais renvoyé", async () => {
		await call("POST", "/auth/register", null, { firstName: "V", lastName: "V", email: "visiteur@t.local", password: "Motdepasse1" });
		process.env.DEMO_MODE = "false";
		const res = await call("POST", "/auth/forgot-password", null, { email: "visiteur@t.local" });
		assert.equal(res.status, 200);
		assert.equal(res.body.demoLink, undefined);
	});
});
