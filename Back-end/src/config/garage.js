// Fuseau du garage : Antananarivo = UTC+3, sans heure d'été. Modifiable avec GARAGE_UTC_OFFSET_MINUTES.
export const UTC_OFFSET_MINUTES = Number(process.env.GARAGE_UTC_OFFSET_MINUTES ?? 180);

// Horaires d'ouverture par jour (0 = dimanche) : [ouverture, fermeture] en heures décimales (17.5 = 17h30).
// Un jour absent = garage fermé.
export const OPENING_HOURS = {
	1: [8, 17.5],
	2: [8, 17.5],
	3: [8, 17.5],
	4: [8, 17.5],
	5: [8, 17.5],
	6: [8, 12],
};

// Pas entre deux heures de rendez-vous proposées
export const SLOT_MINUTES = 30;

// Délai minimum entre maintenant et un rendez-vous, pour laisser au garage le temps de s'organiser
export const MIN_LEAD_MINUTES = 60;
