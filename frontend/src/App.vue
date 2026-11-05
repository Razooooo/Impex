<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from "vue"
import { useRoute, useRouter, RouterLink, RouterView } from "vue-router"
import { LogOut } from "lucide-vue-next"
import { useAuthStore } from "@/stores/auth"
import { useUiStore } from "@/stores/ui"
import { homeFor } from "@/router"
import AuthModal from "@/components/AuthModal.vue"

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

// La page d'accueil et le lien de réinitialisation partagent la mise en page « vitrine »
const isHome = computed(() => ["home", "reset"].includes(route.name))

function logout() {
  auth.logout()
  router.push("/")
}

// Lien « mot de passe oublié » ouvert depuis l'email : on ouvre la fenêtre avec le jeton de l'adresse
watch(
  () => route.fullPath,
  () => {
    if (route.name === "reset") {
      ui.resetToken = String(route.query.token ?? "")
      ui.openAuth("reset")
    }
  },
  { immediate: true },
)
// En fermant la fenêtre, on retire le jeton de l'adresse
watch(
  () => ui.authMode,
  (mode) => {
    if (mode === null && route.name === "reset") router.replace("/")
  },
)

// Session expirée, compte désactivé ou mot de passe changé ailleurs : on déconnecte et on propose de se reconnecter
function onSessionExpired(event) {
  auth.logout()
  ui.openAuth("login", event.detail || "Votre session a expiré. Reconnectez-vous.")
  if (route.meta.roles) router.push("/")
}
onMounted(() => window.addEventListener("session-expired", onSessionExpired))
onBeforeUnmount(() => window.removeEventListener("session-expired", onSessionExpired))
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-50 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <nav class="mx-auto flex items-center justify-between py-4" :class="isHome ? 'max-w-6xl px-5' : 'max-w-[1600px] px-6 lg:px-10'">
        <RouterLink to="/" class="text-xl font-extrabold tracking-wide">IMPEX</RouterLink>
        <div class="flex items-center gap-3 text-sm font-medium sm:gap-6">
          <template v-if="isHome">
            <a href="#services" class="hidden hover:text-accent sm:inline">Services</a>
            <a href="#modeles" class="hidden hover:text-accent sm:inline">Modèles</a>
            <a href="#contact" class="hidden hover:text-accent sm:inline">Contact</a>
          </template>
          <template v-if="auth.isLoggedIn">
            <RouterLink :to="homeFor(auth.role)" class="hover:text-accent">Mon espace</RouterLink>
            <RouterLink
              to="/compte"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper transition hover:bg-accent"
              :class="route.name === 'account' ? 'ring-2 ring-accent ring-offset-2 ring-offset-paper' : ''"
              title="Mon compte"
              aria-label="Mon compte"
            >
              {{ auth.initials }}
            </RouterLink>
            <button class="rounded-lg border border-ink/80 px-3 py-2 transition hover:bg-ink hover:text-paper sm:px-4" aria-label="Déconnexion" @click="logout">
              <LogOut :size="16" class="sm:hidden" />
              <span class="hidden sm:inline">Déconnexion</span>
            </button>
          </template>
          <template v-else>
            <button class="hover:text-accent" @click="ui.openAuth()">Connexion</button>
            <button class="rounded-lg bg-ink px-4 py-2 text-paper transition hover:bg-accent" @click="ui.openAuth()">Rendez-vous</button>
          </template>
        </div>
      </nav>
    </header>

    <RouterView v-if="isHome" />
    <main v-else class="mx-auto max-w-[1600px] px-6 py-10 lg:px-10">
      <RouterView />
    </main>

    <AuthModal />
  </div>
</template>
