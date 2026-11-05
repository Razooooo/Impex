import { defineStore } from "pinia"

// État de l'interface
export const useUiStore = defineStore("ui", {
  state: () => ({
    authMode: null, // fenêtre de connexion : 'login' | 'register' | 'forgot' | 'reset' | null
    authNotice: "", // message affiché en haut de la fenêtre (session expirée, mot de passe modifié…)
    resetToken: "", // jeton du lien « mot de passe oublié » reçu par email
    bookingRequested: false, // le tableau de bord client doit ouvrir le formulaire de rendez-vous
  }),
  actions: {
    openAuth(mode = "login", notice = "") {
      this.authMode = mode
      this.authNotice = notice
    },
    closeAuth() {
      this.authMode = null
      this.authNotice = ""
    },
  },
})
