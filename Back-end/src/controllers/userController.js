import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Admin : liste des mécaniciens (pour l'assignation des tâches)
export const listMechanics = async (_req, res) => {
	const mechanics = await User.find({ role: "mecano" }).sort({ lastName: 1 });
	res.json({ success: true, mechanics });
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

	const user = await User.create({
		firstName,
		lastName,
		email,
		phone,
		role,
		password: await bcrypt.hash(password, 10),
	});
	res.status(201).json({ success: true, user });
};
