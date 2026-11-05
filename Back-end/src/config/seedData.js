// Données de base partagées par le seed et par la remise à zéro du mode démo
export const staff = [
	{ firstName: "Admin", lastName: "Garage", email: "admin@garage.local", role: "admin" },
	{ firstName: "Marc", lastName: "Dupont", email: "marc@garage.local", role: "mecano" },
	{ firstName: "Sophie", lastName: "Martin", email: "sophie@garage.local", role: "mecano" },
];

export const services = [
	{
		name: "Diagnostic général",
		category: "diagnostic",
		estimatedMinutes: 90,
		forUnknownProblem: true,
		description: "Vous ne savez pas d'où vient le problème : un mécanicien l'identifie et vous conseille",
	},
	{ name: "Diagnostic électronique", category: "diagnostic", estimatedMinutes: 60, description: "Lecture des codes défaut (valise Land Rover / SDD)" },
	{ name: "Vidange + filtres", category: "entretien", estimatedMinutes: 90 },
	{ name: "Révision complète", category: "entretien", estimatedMinutes: 240 },
	{ name: "Plaquettes et disques de frein", category: "freinage", estimatedMinutes: 120 },
	{ name: "Suspension pneumatique", category: "suspension", estimatedMinutes: 180, description: "Diagnostic et réparation (coussins, compresseur)" },
	{ name: "Boîte de vitesses / transfert", category: "transmission", estimatedMinutes: 300 },
	{ name: "Géométrie et pneus", category: "pneus", estimatedMinutes: 60 },
];
