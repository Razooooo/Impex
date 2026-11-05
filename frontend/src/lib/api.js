import axios from "axios"

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
})

// Ajoute le token JWT à chaque requête
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Remonte le message d'erreur du serveur dans error.message.
// Un 401 alors qu'on était connecté (session expirée, compte désactivé, mot de passe changé ailleurs) :
// on le signale à l'application, qui déconnecte et propose de se reconnecter.
http.interceptors.response.use(
  (res) => res,
  (error) => {
    error.message = error.response?.data?.message || "Erreur réseau"
    const isLoginRequest = error.config?.url === "/auth/login"
    if (error.response?.status === 401 && localStorage.getItem("token") && !isLoginRequest) {
      window.dispatchEvent(new CustomEvent("session-expired", { detail: error.message }))
    }
    return Promise.reject(error)
  },
)

// Même signature qu'avant : api("/auth/login", { method: "POST", body: {...} }) → données JSON
export async function api(path, { method = "GET", body } = {}) {
  const res = await http.request({ url: path, method, data: body })
  return res.data
}
