import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { addDays, at, parseDate, toGarageDate } from "../src/utils/garageTime.js";

// Les tests utilisent leur propre base, vidée avant chaque test : jamais celle de l'application.
process.env.JWT_SECRET = "secret-de-test-secret-de-test-secret-de-test";
const baseUri = process.env.MONGO_URI || "mongodb://localhost:27017/garage_landrover";
export const TEST_URI = baseUri.replace(/\/[^/?]*(\?|$)/, "/garage_landrover_test$1");

export async function connect() {
	if (!TEST_URI.includes("garage_landrover_test")) throw new Error("Base de test invalide");
	await mongoose.connect(TEST_URI);
}
export const disconnect = () => mongoose.disconnect();

export async function reset() {
	await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

// Prochaine date (texte « 2026-11-23 ») tombant tel jour de la semaine (0 = dimanche), au moins 8 jours plus tard
export function futureDate(dow) {
	let date = addDays(toGarageDate(new Date()), 8);
	while (parseDate(date).dow !== dow) date = addDays(date, 1);
	return date;
}

// Instant de début « ce jour-là, à telle heure (décimale), à l'heure du garage »
export const slotAt = (dateStr, hours) => new Date(at(parseDate(dateStr), hours));

export const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
