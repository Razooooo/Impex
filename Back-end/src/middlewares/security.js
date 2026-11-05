import rateLimit from "express-rate-limit";

const limiter = (options) =>
	rateLimit({
		standardHeaders: "draft-7",
		legacyHeaders: false,
		handler: (_req, res) => res.status(429).json({ success: false, message: options.message }),
		...options,
	});

// Limite générale de l'API : très au-dessus d'un usage normal, elle arrête surtout les robots
export const apiLimiter = limiter({ windowMs: 60 * 1000, limit: 300, message: "Trop de requêtes. Réessayez dans une minute." });

// Connexion : seuls les échecs comptent, pour qu'un vrai client ne soit jamais bloqué par ses connexions réussies
export const loginLimiter = limiter({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	skipSuccessfulRequests: true,
	message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
});

// Création de compte et « mot de passe oublié » : évitent les créations en masse et l'envoi d'emails en rafale
export const accountLimiter = limiter({
	windowMs: 60 * 60 * 1000,
	limit: 20,
	message: "Trop de demandes depuis cette adresse. Réessayez plus tard.",
});

// Refuse les corps de requête qui contiennent des opérateurs MongoDB (clés en « $… » ou avec un point),
// par exemple { "email": { "$ne": null } } envoyé à la connexion pour contourner la recherche.
const hasOperator = (value) =>
	value !== null &&
	typeof value === "object" &&
	Object.entries(value).some(([key, v]) => key.startsWith("$") || key.includes(".") || hasOperator(v));

export const rejectOperators = (req, res, next) => {
	if (hasOperator(req.body) || hasOperator(req.query)) {
		return res.status(400).json({ success: false, message: "Requête invalide." });
	}
	next();
};

// En production, on refuse de démarrer avec un secret de signature faible ou resté à sa valeur d'exemple
const WEAK_SECRETS = ["change_me", "dev_secret_a_changer", "secret"];
export function checkJwtSecret() {
	const secret = process.env.JWT_SECRET;
	const weak = !secret || secret.length < 32 || WEAK_SECRETS.includes(secret);
	if (!weak) return;
	const message = "JWT_SECRET est absent, trop court (32 caractères minimum) ou resté à sa valeur d'exemple.";
	if (process.env.NODE_ENV === "production") {
		console.error(`❌ ${message} Générez-en un avec : node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
		process.exit(1);
	}
	console.warn(`⚠️  ${message} Acceptable en développement, interdit en production.`);
}
