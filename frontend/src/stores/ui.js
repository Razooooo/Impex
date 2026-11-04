import { defineStore } from "pinia"

// État de l'interface : la fenêtre de connexion / inscription ('login' | 'register' | null)
export const useUiStore = defineStore("ui", {
  state: () => ({ authMode: null }),
  actions: {
    openAuth(mode = "login") {
      this.authMode = mode
    },
    closeAuth() {
      this.authMode = null
    },
  },
})
