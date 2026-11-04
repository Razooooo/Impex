export const notFound = (req, res) => {
	res.status(404).json({ success: false, message: `Route introuvable : ${req.method} ${req.originalUrl}` });
};

// Express 5 transmet automatiquement les erreurs des handlers async ici
export const errorHandler = (err, _req, res, _next) => {
	if (err.name === "ValidationError") {
		const message = Object.values(err.errors).map((e) => e.message).join(", ");
		return res.status(400).json({ success: false, message });
	}
	if (err.name === "CastError") {
		return res.status(400).json({ success: false, message: "Identifiant invalide." });
	}
	if (err.code === 11000) {
		return res.status(409).json({ success: false, message: "Cette valeur existe déjà." });
	}
	console.error(err);
	res.status(500).json({ success: false, message: "Erreur interne du serveur." });
};
