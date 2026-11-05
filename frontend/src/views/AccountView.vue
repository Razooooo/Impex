<script setup>
import { computed, reactive, ref } from "vue"
import { RouterLink } from "vue-router"
import { ArrowLeft } from "lucide-vue-next"
import { homeFor } from "@/router"
import { useAuthStore } from "@/stores/auth"

const auth = useAuthStore()

const roleLabel = { client: "Client", mecano: "Mécanicien", admin: "Administrateur" }

// ---- Informations ----
const info = reactive({ firstName: auth.user.firstName, lastName: auth.user.lastName, phone: auth.user.phone ?? "", email: auth.user.email, currentPassword: "" })
const emailChanged = computed(() => info.email.trim().toLowerCase() !== auth.user.email)
const infoDirty = computed(
  () =>
    info.firstName.trim() !== auth.user.firstName ||
    info.lastName.trim() !== auth.user.lastName ||
    info.phone.trim() !== (auth.user.phone ?? "") ||
    emailChanged.value,
)
const infoLoading = ref(false)
const infoError = ref("")

async function saveInfo() {
  infoError.value = ""
  infoLoading.value = true
  try {
    const payload = { firstName: info.firstName, lastName: info.lastName, phone: info.phone }
    if (emailChanged.value) Object.assign(payload, { email: info.email, currentPassword: info.currentPassword })
    await auth.updateProfile(payload)
    Object.assign(info, { firstName: auth.user.firstName, lastName: auth.user.lastName, phone: auth.user.phone ?? "", email: auth.user.email, currentPassword: "" })
    flash("Vos informations sont à jour.")
  } catch (e) {
    infoError.value = e.message
  } finally {
    infoLoading.value = false
  }
}

// ---- Mot de passe ----
const pwd = reactive({ current: "", next: "", confirm: "" })
const pwdLoading = ref(false)
const pwdError = ref("")

async function savePassword() {
  pwdError.value = ""
  if (pwd.next !== pwd.confirm) return (pwdError.value = "Les deux nouveaux mots de passe ne correspondent pas.")
  pwdLoading.value = true
  try {
    await auth.changePassword(pwd.current, pwd.next)
    Object.assign(pwd, { current: "", next: "", confirm: "" })
    flash("Mot de passe modifié. Vos autres appareils ont été déconnectés.")
  } catch (e) {
    pwdError.value = e.message
  } finally {
    pwdLoading.value = false
  }
}

const notice = ref("")
let timer
function flash(message) {
  notice.value = message
  clearTimeout(timer)
  timer = setTimeout(() => (notice.value = ""), 6000)
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <RouterLink :to="homeFor(auth.role)" class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 transition hover:text-ink">
      <ArrowLeft :size="16" /> Retour à mon espace
    </RouterLink>

    <h1 class="mt-4 text-4xl font-bold tracking-[-0.03em]">Mon compte</h1>
    <p class="mt-1 text-ink/65">Vos informations personnelles et votre mot de passe.</p>

    <p v-if="notice" role="status" class="mt-6 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">{{ notice }}</p>

    <div class="mt-8 grid gap-6 lg:grid-cols-12">
      <!-- Identité -->
      <aside class="self-start rounded-2xl bg-ink p-7 text-paper lg:col-span-4">
        <span class="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-xl font-bold text-ink">{{ auth.initials }}</span>
        <p class="mt-5 text-2xl font-bold tracking-tight">{{ auth.user.firstName }} {{ auth.user.lastName }}</p>
        <p class="mt-1 break-all text-sm text-paper/65">{{ auth.user.email }}</p>
        <span class="mt-5 inline-block rounded-full bg-paper/15 px-3 py-1 text-xs font-semibold">{{ roleLabel[auth.user.role] }}</span>
      </aside>

      <div class="space-y-6 lg:col-span-8">
        <!-- Informations -->
        <form class="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-7" @submit.prevent="saveInfo">
          <h2 class="text-lg font-bold tracking-tight">Mes informations</h2>

          <p v-if="infoError" role="alert" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ infoError }}</p>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="block text-sm font-medium">
              Prénom
              <input v-model="info.firstName" required autocomplete="given-name" class="field mt-1.5" />
            </label>
            <label class="block text-sm font-medium">
              Nom
              <input v-model="info.lastName" required autocomplete="family-name" class="field mt-1.5" />
            </label>
            <label class="block text-sm font-medium">
              Téléphone
              <input v-model="info.phone" type="tel" autocomplete="tel" placeholder="+261 34 00 000 00" class="field mt-1.5" />
            </label>
            <label class="block text-sm font-medium">
              Email
              <input v-model="info.email" type="email" required autocomplete="email" class="field mt-1.5" />
            </label>
          </div>

          <!-- L'email est l'identifiant de connexion : on confirme avec le mot de passe -->
          <label v-if="emailChanged" class="mt-4 block text-sm font-medium">
            Mot de passe actuel
            <span class="font-normal text-ink/55"> : nécessaire pour changer d'adresse email</span>
            <input v-model="info.currentPassword" type="password" required autocomplete="current-password" class="field mt-1.5 block sm:max-w-sm" />
          </label>

          <div class="mt-6 flex justify-end">
            <button
              :disabled="infoLoading || !infoDirty"
              class="rounded-xl bg-accent px-6 py-3 font-semibold text-paper transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {{ infoLoading ? "Un instant…" : "Enregistrer" }}
            </button>
          </div>
        </form>

        <!-- Mot de passe -->
        <form class="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-7" @submit.prevent="savePassword">
          <h2 class="text-lg font-bold tracking-tight">Mot de passe</h2>
          <p class="mt-1 text-sm text-ink/60">En le changeant, vos autres appareils seront déconnectés.</p>

          <p v-if="pwdError" role="alert" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ pwdError }}</p>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="block text-sm font-medium sm:col-span-2">
              Mot de passe actuel
              <input v-model="pwd.current" type="password" required autocomplete="current-password" class="field mt-1.5 block sm:max-w-sm" />
            </label>
            <label class="block text-sm font-medium">
              Nouveau mot de passe
              <input v-model="pwd.next" type="password" required minlength="8" autocomplete="new-password" placeholder="8 caractères minimum" class="field mt-1.5" />
            </label>
            <label class="block text-sm font-medium">
              Confirmez
              <input v-model="pwd.confirm" type="password" required minlength="8" autocomplete="new-password" class="field mt-1.5" />
            </label>
          </div>

          <div class="mt-6 flex justify-end">
            <button :disabled="pwdLoading" class="rounded-xl bg-ink px-6 py-3 font-semibold text-paper transition hover:bg-accent disabled:opacity-50">
              {{ pwdLoading ? "Un instant…" : "Changer le mot de passe" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
