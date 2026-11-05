import mongoose from "mongoose";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Fermeture du garage (jour férié, inventaire…) ou absence d'un mécanicien (congés, formation…).
// Les dates sont des journées entières au format "2026-11-06", à l'heure du garage, bornes comprises :
// elles se comparent comme du texte.
const timeOffSchema = new mongoose.Schema(
	{
		scope: { type: String, enum: ["garage", "mechanic"], required: true },
		mechanic: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // obligatoire si scope = mechanic
		startDate: { type: String, required: true, match: DATE },
		endDate: { type: String, required: true, match: DATE },
		reason: { type: String, trim: true, maxlength: 200 },
	},
	{ timestamps: true },
);

timeOffSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model("TimeOff", timeOffSchema);
