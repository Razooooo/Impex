import Vehicle from "../models/Vehicle.js";

export const listMyVehicles = async (req, res) => {
	const vehicles = await Vehicle.find({ owner: req.user.id }).sort({ createdAt: -1 });
	res.json({ success: true, vehicles });
};

export const createVehicle = async (req, res) => {
	const { model, year, plate, vin, engine, mileage } = req.body;
	const vehicle = await Vehicle.create({ owner: req.user.id, model, year, plate, vin, engine, mileage });
	res.status(201).json({ success: true, vehicle });
};

export const deleteVehicle = async (req, res) => {
	const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
	if (!vehicle) return res.status(404).json({ success: false, message: "Véhicule introuvable." });
	res.json({ success: true });
};
