import { defineStore } from "pinia"
import { api } from "@/lib/api"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user") || "null"),
    token: localStorage.getItem("token"),
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    role: (s) => s.user?.role,
    initials: (s) => `${s.user?.firstName?.[0] ?? ""}${s.user?.lastName?.[0] ?? ""}`.toUpperCase(),
  },
  actions: {
    setSession({ token, user }) {
      this.token = token
      this.user = user
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
    },
    async login(email, password) {
      this.setSession(await api("/auth/login", { method: "POST", body: { email, password } }))
    },
    async register(payload) {
      this.setSession(await api("/auth/register", { method: "POST", body: payload }))
    },
    // Modifie le prénom, le nom, le téléphone et/ou l'email (le changement d'email exige le mot de passe actuel)
    async updateProfile(payload) {
      const { user } = await api("/auth/me", { method: "PATCH", body: payload })
      this.setSession({ token: this.token, user })
    },
    // Le serveur ferme les autres sessions et renvoie un nouveau token pour celle-ci
    async changePassword(currentPassword, newPassword) {
      const { token } = await api("/auth/password", { method: "PATCH", body: { currentPassword, newPassword } })
      this.setSession({ token, user: this.user })
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    },
  },
})
