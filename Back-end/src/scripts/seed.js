import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { services, staff } from "../config/seedData.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { resetDemo } from "../utils/demo.js";

await connectDB();

if (process.argv.includes("--demo")) {
	// Remet la base dans l'état de la démo en ligne (efface rendez-vous, véhicules et comptes clients)
	await resetDemo();
	console.log("🌱 Base de démonstration réinitialisée.");
} else {
	// Comptes de démo : à changer avant toute mise en production
	const password = await bcrypt.hash(process.env.SEED_PASSWORD || "Password123!", 10);
	for (const u of staff) {
		await User.updateOne({ email: u.email }, { $setOnInsert: { ...u, password } }, { upsert: true });
	}
	for (const s of services) {
		await Service.updateOne({ name: s.name }, { $setOnInsert: s }, { upsert: true });
	}
	console.log("🌱 Seed terminé (admin@garage.local, marc@garage.local, sophie@garage.local).");
}
await mongoose.disconnect();
