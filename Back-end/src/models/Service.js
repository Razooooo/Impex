import mongoose from "mongoose";

export const SERVICE_CATEGORIES = [
	"diagnostic",
	"entretien",
	"freinage",
	"suspension",
	"transmission",
	"electronique",
	"carrosserie",
	"pneus",
	"autre",
];

// Une prestation proposée par le garage, avec une durée estimée par défaut
const serviceSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, unique: true },
		description: { type: String, trim: true },
		category: { type: String, enum: SERVICE_CATEGORIES, default: "autre" },
		estimatedMinutes: { type: Number, required: true, min: 5 },
		active: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

export default mongoose.model("Service", serviceSchema);
