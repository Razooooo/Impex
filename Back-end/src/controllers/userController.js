import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { summarizeAppointments } from "../utils/appointmentSummary.js";
import { isSharedDemoAccount } from "../utils/demo.js";

// Admin : mécaniciens en activité (pour l'assignation des tâches)
export const listMechanics = async (_req, res) => {
	const mechanics = await User.find({ role: "mecano", active: { $ne: false } }).sort({ lastName: 1 });
	res.json({ success: true, mechanics });
};

// Admin : tout le personnel du garage, actif ou non (mécaniciens et administrateurs)
export const listStaff = async (_req, res) => {
	const staff = await User.find({ role: { $in: ["mecano", "admin"] } }).sort({ role: 1, lastName: 1 });
	res.json({ success: true, staff });
};

// Admin : création d'un compte mécano ou admin
export const createStaff = async (req, res) => {
	const { firstName, lastName, email, password, phone, role } = req.body;

	if (!["mecano", "admin"].includes(role)) {
		return res.status(400).json({ success: false, message: "Le rôle doit être 'mecano' ou 'admin'." });
	}
	if (!password || password.length < 8) {
		return res
			.status(400)
			.json({ success: false, message: "Le mot de passe doit faire au moins 8 caractères." });
	}

	const created = await User.create({
		firstName,
		lastName,
		email,
		phone,
		role,
		password: await bcrypt.hash(password, 10),
	});
	// On relit le compte sans le mot de passe (même haché, il ne doit pas sortir de l'API)
	const user = await User.findById(created._id);
	res.status(201).json({ success: true, user });
};

// Admin : désactive ou réactive un membre. Un compte désactivé ne peut plus se connecter (sessions ouvertes
// comprises) et n'apparaît plus dans les créneaux ni dans les assignations, mais son historique est conservé.
export const setStaffActive = async (req, res) => {
	const { active } = req.body;
	const fail = (message) => res.status(400).json({ success: false, message });
	if (typeof active !== "boolean") return fail("Le champ « active » doit être vrai ou faux.");

	const user = await User.findOne({ _id: req.params.id, role: { $in: ["mecano", "admin"] } });
	if (!user) return res.status(404).json({ success: false, message: "Membre introuvable." });
	if (isSharedDemoAccount(user.email)) {
		return res.status(403).json({ success: false, message: "Les comptes de démonstration ne peuvent pas être désactivés." });
	}

	if (!active) {
		if (String(user._id) === req.user.id) return fail("Vous ne pouvez pas désactiver votre propre compte.");
		if (user.role === "admin" && user.active !== false) {
			const others = await User.countDocuments({ role: "admin", active: { $ne: false }, _id: { $ne: user._id } });
			if (!others) return fail("Il doit rester au moins un administrateur actif.");
		}
	}

	const updated = await User.findByIdAndUpdate(user._id, { active }, { new: true });

	// Interventions encore à faire pour un mécanicien désactivé : l'admin doit les réassigner
	const affected =
		!active && user.role === "mecano"
			? await summarizeAppointments({ assignedMechanic: user._id, status: { $in: ["confirmed", "in_progress"] } })
			: [];

	res.json({ success: true, user: updated, affected });
};

// Admin : modifie les informations d'un membre (nom, email, téléphone). Le rôle et le mot de passe ne changent pas ici :
// le membre change son mot de passe lui-même, ou passe par « mot de passe oublié ».
export const updateStaff = async (req, res) => {
	const user = await User.findOne({ _id: req.params.id, role: { $in: ["mecano", "admin"] } });
	if (!user) return res.status(404).json({ success: false, message: "Membre introuvable." });
	if (isSharedDemoAccount(user.email)) {
		return res.status(403).json({ success: false, message: "Les comptes de démonstration ne peuvent pas être modifiés." });
	}

	const { firstName, lastName, email, phone } = req.body;
	const update = {};
	if (firstName !== undefined) update.firstName = String(firstName).trim();
	if (lastName !== undefined) update.lastName = String(lastName).trim();
	if (phone !== undefined) update.phone = String(phone).trim();
	if (email !== undefined) update.email = String(email).trim().toLowerCase();

	const updated = await User.findByIdAndUpdate(user._id, update, { new: true, runValidators: true });
	res.json({ success: true, user: updated });
};
