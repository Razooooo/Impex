import { openingHours } from "@/data/garage"

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

// "Jeudi 5 novembre" (majuscule au premier mot seulement)
export function formatDay(date) {
  const s = new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })

// "2026-11-04" en heure locale (toISOString donnerait la date UTC)
export function toDateInput(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

// Créneaux de 30 min pour un jour donné ("2026-11-05"), vide si le garage est fermé.
// Les créneaux déjà passés ne sont pas proposés.
export function slotsFor(dateStr) {
  if (!dateStr) return []
  const day = new Date(`${dateStr}T00:00`).getDay()
  const hours = openingHours[day]
  if (!hours) return []

  const slots = []
  for (let t = hours[0]; t < hours[1]; t += 0.5) {
    const hh = String(Math.floor(t)).padStart(2, "0")
    const mm = t % 1 ? "30" : "00"
    const time = `${hh}:${mm}`
    if (new Date(`${dateStr}T${time}`) > new Date()) slots.push(time)
  }
  return slots
}
