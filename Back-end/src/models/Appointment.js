import mongoose from "mongoose";

export const APPOINTMENT_STATUSES = ["pending", "confirmed", "in_progress", "done", "cancelled"];

const appointmentSchema = new mongoose.Schema(
	{
		customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
		service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
		scheduledAt: { type: Date, required: [true, "La date du rendez-vous est obligatoire"], index: true },
		status: { type: String, enum: APPOINTMENT_STATUSES, default: "pending", index: true },
		// Description du problème par le client
		customerNotes: { type: String, trim: true, maxlength: [1000, "La description est trop longue (1000 caractères maximum)"] },
		// Renseignés par l'admin
		assignedMechanic: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
		estimatedMinutes: { type: Number, min: 5 }, // par défaut : durée du service
		// Renseigné par le mécano
		mechanicNotes: { type: String, trim: true },
	},
	{ timestamps: true },
);

export default mongoose.model("Appointment", appointmentSchema);
