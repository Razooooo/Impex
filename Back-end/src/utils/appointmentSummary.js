import Appointment from "../models/Appointment.js";

// Résumé léger de rendez-vous, pour prévenir l'admin de ceux qu'un changement (absence, fermeture,
// désactivation d'un mécanicien) met en difficulté.
export async function summarizeAppointments(filter) {
	const appointments = await Appointment.find(filter)
		.sort({ scheduledAt: 1 })
		.populate("customer", "firstName lastName")
		.populate("service", "name")
		.populate("vehicle", "model")
		.populate("assignedMechanic", "firstName lastName");

	return appointments.map((a) => ({
		_id: a._id,
		scheduledAt: a.scheduledAt,
		status: a.status,
		service: a.service?.name,
		vehicle: a.vehicle?.model,
		customer: a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : "",
		mechanic: a.assignedMechanic ? `${a.assignedMechanic.firstName} ${a.assignedMechanic.lastName}` : null,
	}));
}
