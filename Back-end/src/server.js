import "dotenv/config"; // Charge le .env dès le démarrage
import app from "./app.js";
import connectDB from "./config/db.js";
import { checkJwtSecret } from "./middlewares/security.js";
import { ensureDemoFresh, isDemo } from "./utils/demo.js";

checkJwtSecret();

const PORT = process.env.PORT || 3000;

// On connecte d'abord la base, et seulement si ça réussit on lance le serveur
connectDB().then(async () => {
	if (isDemo()) {
		await ensureDemoFresh();
		setInterval(() => ensureDemoFresh().catch((e) => console.error("Remise à zéro de la démo impossible :", e.message)), 60 * 60 * 1000).unref();
	}
	app.listen(PORT, () => {
		console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
	});
});
