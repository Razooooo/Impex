// Où garder la session ?
// - Site de démonstration : dans l'onglet (sessionStorage). Elle disparaît quand on le ferme.
// - Sinon : dans le navigateur (localStorage). On reste connecté d'une visite à l'autre.
// Chaque accès est protégé : le stockage peut être bloqué (navigation privée, réglages du navigateur).
const safe = (fn, fallback) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const readSession = (key) => safe(() => sessionStorage.getItem(key) ?? localStorage.getItem(key), null)

// La session actuelle est-elle dans l'onglet seulement ?
export const isTemporarySession = () => safe(() => sessionStorage.getItem("token") !== null, false)

export function writeSession(token, user, temporary) {
  const [keep, drop] = temporary ? [sessionStorage, localStorage] : [localStorage, sessionStorage]
  safe(() => {
    drop.removeItem("token")
    drop.removeItem("user")
    keep.setItem("token", token)
    keep.setItem("user", JSON.stringify(user))
  })
}

export function clearSession() {
  for (const storage of [sessionStorage, localStorage]) {
    safe(() => {
      storage.removeItem("token")
      storage.removeItem("user")
    })
  }
}
