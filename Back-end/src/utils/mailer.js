import nodemailer from "nodemailer";

let transport;

// Serveur SMTP configuré par variables d'environnement (voir le README). Sans SMTP_HOST, aucun email n'est envoyé :
// le lien est simplement affiché dans la console du serveur, ce qui suffit pour développer sans boîte mail.
function getTransport() {
	if (!process.env.SMTP_HOST) return null;
	transport ??= nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: process.env.SMTP_SECURE === "true",
		auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
	});
	return transport;
}

const from = () => process.env.MAIL_FROM || "IMPEX <no-reply@impex.mg>";

export async function sendPasswordResetEmail(user, link) {
	const subject = "IMPEX – Réinitialisation de votre mot de passe";
	const text = [
		`Bonjour ${user.firstName},`,
		"",
		"Vous avez demandé à réinitialiser votre mot de passe. Ouvrez ce lien pour en choisir un nouveau (valable 1 heure) :",
		link,
		"",
		"Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe reste inchangé.",
		"",
		"IMPEX",
	].join("\n");
	const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#14130f">
  <p style="font-size:20px;font-weight:800;letter-spacing:2px">IMPEX</p>
  <p>Bonjour ${user.firstName},</p>
  <p>Vous avez demandé à réinitialiser votre mot de passe. Le lien ci-dessous est valable <strong>1 heure</strong>.</p>
  <p style="margin:28px 0"><a href="${link}" style="background:#005a2b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Choisir un nouveau mot de passe</a></p>
  <p style="font-size:13px;color:#555">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${link}</p>
  <p style="font-size:13px;color:#555">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
</div>`;

	const t = getTransport();
	if (!t) {
		console.log(`✉️  [SMTP non configuré] Lien de réinitialisation pour ${user.email} : ${link}`);
		return;
	}
	await t.sendMail({ from: from(), to: user.email, subject, text, html });
}
