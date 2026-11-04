import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Admin : liste des mécaniciens (pour l'assignation des tâches)
export const listMechanics = async (_req, res) => {
	const mechanics = await User.find({ role: "mecano" }).sort({ lastName: 1 });
	res.json({ success: true, mechanics });
};

// Admin : tout le personnel du garage (mécaniciens et administrateurs)
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
