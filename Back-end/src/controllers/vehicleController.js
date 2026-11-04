import Appointment from "../models/Appointment.js";
import Vehicle, { LAND_ROVER_MODELS } from "../models/Vehicle.js";

// Liste des modèles acceptés (évite de la dupliquer côté front)
export const listModels = (_req, res) => {
	res.json({ success: true, models: LAND_ROVER_MODELS });
};

export const listMyVehicles = async (req, res) => {
	const vehicles = await Vehicle.find({ owner: req.user.id }).sort({ createdAt: -1 });
	res.json({ success: true, vehicles });
};

export const createVehicle = async (req, res) => {
	const { model, year, plate, vin, engine, mileage } = req.body;
	const vehicle = await Vehicle.create({ owner: req.user.id, model, year, plate, vin, engine, mileage });
	res.status(201).json({ success: true, vehicle });
};

export const updateVehicle = async (req, res) => {
	const { model, year, plate, vin, engine, mileage } = req.body;
	const vehicle = await Vehicle.findOneAndUpdate(
		{ _id: req.params.id, owner: req.user.id },
		{ model, year, plate, vin, engine, mileage },
		{ new: true, runValidators: true },
	);
	if (!vehicle) return res.status(404).json({ success: false, message: "Véhicule introuvable." });
	res.json({ success: true, vehicle });
};

export const deleteVehicle = async (req, res) => {
	const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user.id });
	if (!vehicle) return res.status(404).json({ success: false, message: "Véhicule introuvable." });

	const hasActiveAppointment = await Appointment.exists({
		vehicle: vehicle._id,
		status: { $in: ["pending", "confirmed", "in_progress"] },
	});
	if (hasActiveAppointment) {
		return res
			.status(409)
			.json({ success: false, message: "Ce véhicule a un rendez-vous en cours ou à venir. Annulez-le d'abord." });
	}

	await vehicle.deleteOne();
	res.json({ success: true });
};
