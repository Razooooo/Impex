import jwt from "jsonwebtoken";
import User from "../models/User.js";

const unauthorized = (res, message) => res.status(401).json({ success: false, message });

// Vérifie le token JWT puis le compte en base : placé dans req.user, { id, role } vient de la base,
// pas du token, donc un compte désactivé, supprimé ou dont le mot de passe a changé est refusé aussitôt.
export const protect = async (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return unauthorized(res, "Accès non autorisé. Token manquant.");
	}

	let decoded;
	try {
		decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
	} catch {
		return unauthorized(res, "Token invalide ou expiré.");
	}

	const user = await User.findById(decoded.id).select("role active passwordChangedAt");
	if (!user) return unauthorized(res, "Compte introuvable.");
	if (user.active === false) return unauthorized(res, "Ce compte est désactivé.");
	if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
		return unauthorized(res, "Session expirée : le mot de passe a changé. Reconnectez-vous.");
	}

	req.user = { id: String(user._id), role: user.role };
	next();
};

// À placer après protect : restrictTo("admin"), restrictTo("admin", "mecano")...
export const restrictTo =
	(...roles) =>
	(req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return res.status(403).json({ success: false, message: "Accès interdit pour ce rôle." });
		}
		next();
	};
