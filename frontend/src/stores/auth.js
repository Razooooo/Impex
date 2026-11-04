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
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    },
  },
})
