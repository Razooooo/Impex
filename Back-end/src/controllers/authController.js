import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { demoEmailFor, isDemo, isSharedDemoAccount } from "../utils/demo.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

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

const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const EMAIL = /^\S+@\S+\.\S+$/;

// Les sessions ouvertes avant cet instant sont refusées. Arrondi à la seconde car la date d'émission (iat)
// d'un token n'a pas de millisecondes : le token délivré juste après le changement doit rester valide.
const passwordChangedNow = () => new Date(Math.floor(Date.now() / 1000) * 1000);

// Inscription publique : toujours un compte "client" (les mécanos/admins sont créés par un admin)
export const register = async (req, res) => {
	const { firstName, lastName, email, password, phone } = req.body;

	if (!password || password.length < 8) {
		return fail(res, "Le mot de passe doit faire au moins 8 caractères.");
	}

	const hashed = await bcrypt.hash(password, 10);
	const user = await User.create({ firstName, lastName, email, phone, password: hashed, role: "client" });

	res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
};

export const login = async (req, res) => {
	const email = String(req.body.email ?? "").trim().toLowerCase();
	const password = typeof req.body.password === "string" ? req.body.password : "";
	const user = await User.findOne({ email }).select("+password");

	if (!user || !(await bcrypt.compare(password, user.password))) {
		return fail(res, "Email ou mot de passe incorrect.", 401);
	}
	// Testé après le mot de passe pour ne pas révéler l'existence d'un compte à quelqu'un qui ne le connaît pas
	if (user.active === false) {
		return fail(res, "Ce compte est désactivé. Contactez le garage.", 403);
	}

	res.json({ success: true, token: signToken(user), user: publicUser(user) });
};

// Mode démo : connexion en un clic avec le compte client, admin ou mécanicien de démonstration
export const demoLogin = async (req, res) => {
	if (!isDemo()) return res.status(404).json({ success: false, message: "Route introuvable." });
	const email = demoEmailFor(req.body.role);
	const user = email && (await User.findOne({ email }));
	if (!user) return fail(res, "Rôle de démonstration inconnu.");
	res.json({ success: true, token: signToken(user), user: publicUser(user) });
};

export const me = async (req, res) => {
	const user = await User.findById(req.user.id);
	if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
	res.json({ success: true, user: publicUser(user) });
};

// Modifier ses informations. Changer d'email demande le mot de passe actuel : c'est l'identifiant de connexion.
export const updateMe = async (req, res) => {
	const { firstName, lastName, phone, email, currentPassword } = req.body;
	const user = await User.findById(req.user.id).select("+password");
	if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

	const update = {};
	if (firstName !== undefined) update.firstName = String(firstName).trim();
	if (lastName !== undefined) update.lastName = String(lastName).trim();
	if (phone !== undefined) update.phone = String(phone).trim();

	if (email !== undefined) {
		const newEmail = String(email).trim().toLowerCase();
		if (!EMAIL.test(newEmail)) return fail(res, "Adresse email invalide.");
		if (newEmail !== user.email) {
			if (isSharedDemoAccount(user.email)) return fail(res, "L'adresse d'un compte de démonstration ne peut pas être modifiée.", 403);
			if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
				return fail(res, "Pour changer d'adresse email, saisissez votre mot de passe actuel.", 403);
			}
			update.email = newEmail;
		}
	}

	const updated = await User.findByIdAndUpdate(user._id, update, { new: true, runValidators: true });
	res.json({ success: true, user: publicUser(updated) });
};

// Changer son mot de passe. Les autres sessions ouvertes sont fermées ; celle-ci reçoit un nouveau token.
export const changePassword = async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	if (!newPassword || newPassword.length < 8) return fail(res, "Le nouveau mot de passe doit faire au moins 8 caractères.");

	const user = await User.findById(req.user.id).select("+password");
	if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
	if (isSharedDemoAccount(user.email)) return fail(res, "Le mot de passe d'un compte de démonstration ne peut pas être modifié.", 403);
	if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
		return fail(res, "Le mot de passe actuel est incorrect.", 403);
	}

	await User.updateOne({ _id: user._id }, { password: await bcrypt.hash(newPassword, 10), passwordChangedAt: passwordChangedNow() });
	res.json({ success: true, token: signToken(user), message: "Mot de passe modifié." });
};

// Demande de réinitialisation. La réponse est toujours la même, que l'adresse existe ou non,
// pour ne pas permettre de deviner quelles adresses ont un compte.
export const forgotPassword = async (req, res) => {
	const email = String(req.body.email ?? "").trim().toLowerCase();
	const generic = {
		success: true,
		message: "Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé.",
	};

	const user = await User.findOne({ email }).select("+passwordResetRequestedAt");
	if (!user || user.active === false || isSharedDemoAccount(user.email)) return res.json(generic);

	// Une demande par minute et par compte au maximum
	if (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < 60 * 1000) {
		return res.json(generic);
	}

	const token = crypto.randomBytes(32).toString("hex");
	await User.updateOne(
		{ _id: user._id },
		{
			passwordResetToken: sha256(token),
			passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
			passwordResetRequestedAt: new Date(),
		},
	);

	const link = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${token}`;
	try {
		await sendPasswordResetEmail(user, link);
	} catch (error) {
		console.error("Envoi de l'email de réinitialisation impossible :", error.message);
	}
	// En démo, aucun email ne part vraiment : le lien est renvoyé pour être affiché à l'écran
	res.json(isDemo() ? { ...generic, demoLink: link } : generic);
};

// Choisir un nouveau mot de passe avec le lien reçu par email (valable une heure, une seule fois)
export const resetPassword = async (req, res) => {
	const { token, password } = req.body;
	if (!token) return fail(res, "Ce lien est invalide ou a expiré.");
	if (!password || password.length < 8) return fail(res, "Le mot de passe doit faire au moins 8 caractères.");

	const user = await User.findOne({ passwordResetToken: sha256(String(token)), passwordResetExpires: { $gt: new Date() } });
	if (!user || user.active === false) return fail(res, "Ce lien est invalide ou a expiré. Refaites une demande.");

	await User.updateOne(
		{ _id: user._id },
		{
			password: await bcrypt.hash(password, 10),
			passwordChangedAt: passwordChangedNow(),
			$unset: { passwordResetToken: 1, passwordResetExpires: 1, passwordResetRequestedAt: 1 },
		},
	);
	res.json({ success: true, message: "Mot de passe modifié. Vous pouvez vous connecter." });
};
