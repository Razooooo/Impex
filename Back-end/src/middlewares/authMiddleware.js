import jwt from "jsonwebtoken";

// Vérifie le token JWT et place { id, role } dans req.user
export const protect = (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ success: false, message: "Accès non autorisé. Token manquant." });
	}

	try {
		req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
		next();
	} catch {
		return res.status(401).json({ success: false, message: "Token invalide ou expiré." });
	}
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
