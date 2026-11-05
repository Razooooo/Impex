// Calculs sur des dates "AAAA-MM-JJ" (jours du calendrier), indépendants du fuseau du navigateur.

const parse = (str) => {
  const [y, m, d] = str.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(str, n) {
  const date = parse(str)
  date.setUTCDate(date.getUTCDate() + n)
  return date.toISOString().slice(0, 10)
}

// 0 = dimanche … 6 = samedi
export const dowOf = (str) => parse(str).getUTCDay()

// Le lundi de la semaine qui contient ce jour
export const mondayOf = (str) => addDays(str, -((dowOf(str) + 6) % 7))

export const labelDay = (str, options) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...options }).format(parse(str))

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// "10 nov." ou "du 10 au 14 nov." selon la période
export function labelRange(start, end) {
  if (start === end) return labelDay(start, { day: "numeric", month: "short" })
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  return sameMonth
    ? `du ${labelDay(start, { day: "numeric" })} au ${labelDay(end, { day: "numeric", month: "short" })}`
    : `du ${labelDay(start, { day: "numeric", month: "short" })} au ${labelDay(end, { day: "numeric", month: "short" })}`
}
