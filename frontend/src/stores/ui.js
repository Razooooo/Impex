import { defineStore } from "pinia"

// État de l'interface
export const useUiStore = defineStore("ui", {
  state: () => ({
    authMode: null, // fenêtre de connexion / inscription : 'login' | 'register' | null
    bookingRequested: false, // le tableau de bord client doit ouvrir le formulaire de rendez-vous
  }),
  actions: {
    openAuth(mode = "login") {
      this.authMode = mode
    },
    closeAuth() {
      this.authMode = null
    },
  },
})
