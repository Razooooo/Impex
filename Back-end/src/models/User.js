import mongoose from "mongoose";

export const ROLES = ["client", "mecano", "admin"];

const userSchema = new mongoose.Schema(
	{
		firstName: { type: String, required: [true, "Le prénom est obligatoire"], trim: true },
		lastName: { type: String, required: [true, "Le nom est obligatoire"], trim: true },
		email: {
			type: String,
			required: [true, "L'email est obligatoire"],
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: [true, "Le mot de passe est obligatoire"],
			minlength: [8, "Le mot de passe doit faire au moins 8 caractères"],
			select: false,
		},
		phone: { type: String, trim: true },
		// client = prend des rdv, mecano = réalise les tâches, admin = planifie et assigne
		role: { type: String, enum: ROLES, default: "client" },
		// Un compte désactivé ne peut plus se connecter, mais son historique est conservé.
		// Les comptes créés avant l'ajout de ce champ n'ont pas la valeur : on teste donc `active !== false`.
		active: { type: Boolean, default: true },
		// Les sessions ouvertes avant cette date sont refusées (changement ou réinitialisation du mot de passe)
		passwordChangedAt: { type: Date, select: false },
		// Réinitialisation du mot de passe : on ne stocke que l'empreinte du lien envoyé par email
		passwordResetToken: { type: String, select: false },
		passwordResetExpires: { type: Date, select: false },
		passwordResetRequestedAt: { type: Date, select: false },
	},
	{ timestamps: true },
);

export default mongoose.model("User", userSchema);
