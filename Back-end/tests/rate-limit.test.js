import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import app from "../src/app.js";
import { connect, disconnect, reset } from "./helpers.js";

// Fichier à part : les compteurs de limitation sont en mémoire et propres au processus de test
let server, base;
before(async () => {
	await connect();
	await reset();
	server = app.listen(0);
	base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
	server.close();
	await disconnect();
});

const login = (email) =>
	fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "mauvais" }) });

describe("limitation des essais de connexion", () => {
	it("bloque après 10 échecs et explique pourquoi", async () => {
		for (let i = 0; i < 10; i++) assert.equal((await login("quelquun@t.local")).status, 401);
		const blocked = await login("quelquun@t.local");
		assert.equal(blocked.status, 429);
		assert.match((await blocked.json()).message, /Trop de tentatives/);
	});
});
