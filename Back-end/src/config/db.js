import mongoose from "mongoose";

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("📦 MongoDB connecté avec succès !");
	} catch (error) {
		console.error("❌ Erreur de connexion à MongoDB :", error.message);
		// Inutile de lancer le serveur sans base de données
		process.exit(1);
	}
};

export default connectDB;
