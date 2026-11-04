import Service from "../models/Service.js";

export const listServices = async (_req, res) => {
	const services = await Service.find({ active: true }).sort({ category: 1, name: 1 });
	res.json({ success: true, services });
};

export const createService = async (req, res) => {
	const { name, description, category, estimatedMinutes } = req.body;
	const service = await Service.create({ name, description, category, estimatedMinutes });
	res.status(201).json({ success: true, service });
};

export const updateService = async (req, res) => {
	const { name, description, category, estimatedMinutes, active } = req.body;
	const service = await Service.findByIdAndUpdate(
		req.params.id,
		{ name, description, category, estimatedMinutes, active },
		{ new: true, runValidators: true },
	);
	if (!service) return res.status(404).json({ success: false, message: "Service introuvable." });
	res.json({ success: true, service });
};
