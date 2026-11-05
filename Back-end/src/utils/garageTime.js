import { UTC_OFFSET_MINUTES } from "../config/garage.js";

const MIN = 60 * 1000;

// "2026-11-06" -> { y, mo, d, dow } ou null si la date n'existe pas
export function parseDate(str) {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str));
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const date = new Date(Date.UTC(y, mo - 1, d));
	if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
	return { y, mo, d, dow: date.getUTCDay() };
}

// Instant réel (en ms) correspondant à « ce jour-là, à telle heure (décimale), à l'heure du garage »
export const at = (p, hours) => Date.UTC(p.y, p.mo - 1, p.d) + hours * 60 * MIN - UTC_OFFSET_MINUTES * MIN;

// Date du jour dans le fuseau du garage, au format "2026-11-06"
export const toGarageDate = (date) => new Date(date.getTime() + UTC_OFFSET_MINUTES * MIN).toISOString().slice(0, 10);

export function addDays(str, n) {
	const p = parseDate(str);
	return new Date(Date.UTC(p.y, p.mo - 1, p.d + n)).toISOString().slice(0, 10);
}

// Les instants [début, fin[ qui couvrent les jours startDate à endDate inclus, à l'heure du garage
export function rangeMs(startDate, endDate) {
	return [at(parseDate(startDate), 0), at(parseDate(endDate), 24)];
}
