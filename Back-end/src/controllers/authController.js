import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (user) =>
	jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (user) => ({
	id: user._id,
	firstName: user.firstName,
	lastName: user.lastName,
	email: user.email,
	phone: user.phone,
	role: user.role,
});

// Inscription publique : toujours un compte "client" (les mécanos/admins sont créés par un admin)
export const register = async (req, res) => {
	const { firstName, lastName, email, password, phone } = req.body;

	if (!password || password.length < 8) {
		return res
			.status(400)
			.json({ success: false, message: "Le mot de passe doit faire au moins 8 caractères." });
	}

	const hashed = await bcrypt.hash(password, 10);
	const user = await User.create({ firstName, lastName, email, phone, password: hashed, role: "client" });

	res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
};

export const login = async (req, res) => {
	const { email, password } = req.body;
	const user = await User.findOne({ email }).select("+password");

	if (!user || !(await bcrypt.compare(password ?? "", user.password))) {
		return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect." });
	}

	res.json({ success: true, token: signToken(user), user: publicUser(user) });
};

export const me = async (req, res) => {
	const user = await User.findById(req.user.id);
	if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
	res.json({ success: true, user: publicUser(user) });
};
