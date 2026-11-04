<script setup>
import { computed } from "vue"
import { useRoute, useRouter, RouterLink, RouterView } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useUiStore } from "@/stores/ui"
import { homeFor } from "@/router"
import AuthModal from "@/components/AuthModal.vue"

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
const isHome = computed(() => route.name === "home")

function logout() {
  auth.logout()
  router.push("/")
}
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-50 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <nav class="mx-auto flex items-center justify-between py-4" :class="isHome ? 'max-w-6xl px-5' : 'max-w-[1600px] px-6 lg:px-10'">
        <RouterLink to="/" class="text-xl font-extrabold tracking-wide">IMPEX</RouterLink>
        <div class="flex items-center gap-5 text-sm font-medium sm:gap-7">
          <template v-if="isHome">
            <a href="#services" class="hidden hover:text-accent sm:inline">Services</a>
            <a href="#modeles" class="hidden hover:text-accent sm:inline">Modèles</a>
            <a href="#contact" class="hidden hover:text-accent sm:inline">Contact</a>
          </template>
          <template v-if="auth.isLoggedIn">
            <RouterLink :to="homeFor(auth.role)" class="hover:text-accent">Mon espace</RouterLink>
            <button class="rounded-lg border border-ink/80 px-4 py-2 transition hover:bg-ink hover:text-paper" @click="logout">Déconnexion</button>
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
