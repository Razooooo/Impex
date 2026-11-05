// Point d'entrée pour Vercel : l'API Express tourne comme une fonction serverless.
// En local (Docker), c'est toujours src/server.js qui est utilisé.
import mongoose from "mongoose";
import app from "../src/app.js";
import { checkJwtSecret } from "../src/middlewares/security.js";
import { ensureDemoFresh, isDemo } from "../src/utils/demo.js";

checkJwtSecret();

// La connexion est gardée d'une requête à l'autre tant que l'instance reste en vie
let connecting;
const connect = () => {
	connecting ??= mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 }).catch((error) => {
		connecting = undefined;
		throw error;
	});
	return connecting;
};

// Pas de tâche de fond en serverless : on vérifie la remise à zéro de la démo au plus toutes les 30 minutes
let lastDemoCheck = 0;

export default async function handler(req, res) {
	try {
		await connect();
		if (isDemo() && Date.now() - lastDemoCheck > 30 * 60 * 1000) {
			lastDemoCheck = Date.now();
			await ensureDemoFresh();
		}
	} catch (error) {
		console.error("Base de données indisponible :", error.message);
		return res.status(503).json({ success: false, message: "Base de données indisponible. Réessayez dans un instant." });
	}
	return app(req, res);
}
