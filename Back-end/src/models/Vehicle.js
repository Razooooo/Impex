import mongoose from "mongoose";

export const LAND_ROVER_MODELS = [
	"Defender",
	"Discovery",
	"Discovery Sport",
	"Range Rover",
	"Range Rover Sport",
	"Range Rover Velar",
	"Range Rover Evoque",
	"Freelander",
	"Series (classique)",
	"Autre",
];

const vehicleSchema = new mongoose.Schema(
	{
		owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		model: { type: String, enum: LAND_ROVER_MODELS, required: [true, "Le modèle est obligatoire"] },
		year: { type: Number, min: 1948, max: new Date().getFullYear() + 1 },
		plate: { type: String, trim: true, uppercase: true },
		vin: { type: String, trim: true, uppercase: true },
		engine: { type: String, trim: true }, // Ex: "TD6 3.0 diesel"
		mileage: { type: Number, min: 0 },
	},
	{ timestamps: true },
);

export default mongoose.model("Vehicle", vehicleSchema);
