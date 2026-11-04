import "dotenv/config"; // Charge le .env dès le démarrage
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3000;

// On connecte d'abord la base, et seulement si ça réussit on lance le serveur
connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
	});
});
