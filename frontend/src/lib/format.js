export const statusMeta = {
  pending: { label: "En attente", cls: "bg-amber-100 text-amber-900" },
  confirmed: { label: "Confirmé", cls: "bg-accent text-paper" },
  in_progress: { label: "En cours", cls: "bg-ink text-paper" },
  done: { label: "Terminé", cls: "bg-ink/10 text-ink/70" },
  cancelled: { label: "Annulé", cls: "bg-red-100 text-red-800" },
}

export const categoryLabels = {
  diagnostic: "Diagnostic",
  entretien: "Entretien",
  freinage: "Freinage",
  suspension: "Suspension",
  transmission: "Transmission",
  electronique: "Électronique",
  carrosserie: "Carrosserie",
  pneus: "Pneus",
  autre: "Autre",
}

// 90 -> "1 h 30", 45 -> "45 min"
export function formatDuration(minutes) {
  if (!minutes) return ""
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`
}

// Toutes les dates et heures s'affichent à l'heure du garage (Antananarivo), quel que soit le fuseau du navigateur :
// un rendez-vous « à 9h » doit s'afficher 9h pour tout le monde. À garder identique à Back-end/src/config/garage.js.
export const GARAGE_TZ = "Indian/Antananarivo"
const fmt = (date, options) => new Intl.DateTimeFormat("fr-FR", { timeZone: GARAGE_TZ, ...options }).format(new Date(date))

// "Jeudi 5 novembre" (majuscule au premier mot seulement)
export function formatDay(date) {
  const s = fmt(date, { weekday: "long", day: "numeric", month: "long" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const formatTime = (date) => fmt(date, { hour: "2-digit", minute: "2-digit" })

// "mer. 5 nov." et "5 nov."
export const formatShortDay = (date) => fmt(date, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")
export const formatDayMonth = (date) => fmt(date, { day: "numeric", month: "short" })
export const dayOfMonth = (date) => Number(fmt(date, { day: "numeric" }))
export const monthShort = (date) => fmt(date, { month: "short" }).replace(".", "")

// "2026-11-04" : la date du jour (ou de `date`) à l'heure du garage. Se compare directement comme du texte.
export const toDateInput = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: GARAGE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date))
