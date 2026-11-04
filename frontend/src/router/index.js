import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useUiStore } from "@/stores/ui"

const router = createRouter({
  history: createWebHistory(),
  // Nouvelle page : on repart en haut. Retour arrière : position retrouvée. Ancres (#services) : défilement doux.
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 64, behavior: "smooth" }
    return { top: 0, behavior: "instant" }
  },
  routes: [
    { path: "/", name: "home", component: () => import("@/views/HomeView.vue") },
    // Espace client : mes véhicules et mes rendez-vous
    {
      path: "/client",
      name: "client",
      component: () => import("@/views/ClientDashboard.vue"),
      meta: { roles: ["client"] },
    },
    // Espace garage : planning, assignation des mécanos, temps estimés
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/views/AdminDashboard.vue"),
      meta: { roles: ["admin"] },
    },
    // Espace mécano : mes tâches assignées
    {
      path: "/mecano",
      name: "mecano",
      component: () => import("@/views/MechanicDashboard.vue"),
      meta: { roles: ["mecano"] },
    },
    // Les anciennes pages /login et /register sont devenues une fenêtre : on les redirige
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
})

export const homeFor = (role) => ({ client: "/client", admin: "/admin", mecano: "/mecano" })[role] || "/"

router.beforeEach((to) => {
  const auth = useAuthStore()
  const roles = to.meta.roles
  if (roles) {
    if (!auth.isLoggedIn) {
      useUiStore().openAuth("login")
      return { name: "home" }
    }
    if (!roles.includes(auth.role)) return homeFor(auth.role)
  }
})

export default router
