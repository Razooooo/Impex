<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { ArrowRight, MailCheck, X } from "lucide-vue-next"
import { api } from "@/lib/api"
import { useUiStore } from "@/stores/ui"
import { useAuthStore } from "@/stores/auth"
import { homeFor } from "@/router"

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()

const mode = computed(() => ui.authMode)
const isOpen = computed(() => mode.value !== null)
const isLogin = computed(() => mode.value === "login")
const isRegister = computed(() => mode.value === "register")
const isForgot = computed(() => mode.value === "forgot")
const isReset = computed(() => mode.value === "reset")

const blank = () => ({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" })
const form = reactive(blank())
const error = ref("")
const loading = ref(false)
const sent = ref(false) // « mot de passe oublié » : la demande a été envoyée
const panel = ref(null)

const focusFirst = () => nextTick(() => panel.value?.querySelector("input")?.focus())

watch(isOpen, (open) => {
  if (open) focusFirst()
  else {
    Object.assign(form, blank())
    sent.value = false
  }
})
// On garde l'email saisi quand on passe de la connexion à « mot de passe oublié »
watch(mode, () => {
  error.value = ""
  sent.value = false
  Object.assign(form, { password: "", confirm: "" })
  focusFirst()
})

const onKey = (e) => {
  if (e.key === "Escape" && isOpen.value) ui.closeAuth()
}
onMounted(() => window.addEventListener("keydown", onKey))
onBeforeUnmount(() => window.removeEventListener("keydown", onKey))

const texts = computed(
  () =>
    ({
      login: { title: "Bon retour", sub: "Connectez-vous pour gérer vos rendez-vous.", button: "Se connecter" },
      register: { title: "Créer un compte", sub: "Quelques informations suffisent pour réserver.", button: "Créer mon compte" },
      forgot: { title: "Mot de passe oublié", sub: "Saisissez votre email : nous vous envoyons un lien pour en choisir un nouveau.", button: "Envoyer le lien" },
      reset: { title: "Nouveau mot de passe", sub: "Choisissez un mot de passe d'au moins 8 caractères.", button: "Enregistrer" },
    })[mode.value ?? "login"],
)

async function submit() {
  error.value = ""

  if (isReset.value) {
    if (form.password !== form.confirm) return (error.value = "Les deux mots de passe ne correspondent pas.")
    if (!ui.resetToken) return (error.value = "Ce lien est invalide. Refaites une demande de réinitialisation.")
  }

  loading.value = true
  try {
    if (isLogin.value) {
      await auth.login(form.email, form.password)
      form.password = ""
      ui.closeAuth()
      router.push(homeFor(auth.role))
    } else if (isRegister.value) {
      await auth.register({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password })
      form.password = ""
      ui.closeAuth()
      router.push(homeFor(auth.role))
    } else if (isForgot.value) {
      await api("/auth/forgot-password", { method: "POST", body: { email: form.email } })
      sent.value = true
    } else {
      await api("/auth/reset-password", { method: "POST", body: { token: ui.resetToken, password: form.password } })
      ui.resetToken = ""
      ui.openAuth("login", "Mot de passe modifié. Vous pouvez vous connecter.")
      if (router.currentRoute.value.name === "reset") router.replace("/")
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const field =
  "w-full rounded-lg border border-ink/20 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-ink/35 focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent"
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" :duration="350">
      <!-- overscroll-contain : le défilement ne se transmet pas au site derrière la fenêtre -->
      <div v-if="isOpen" class="fixed inset-0 z-[100] overflow-y-auto overscroll-contain">
        <div class="modal-backdrop fixed inset-0" @click="ui.closeAuth()"></div>

        <div class="relative flex min-h-full items-center justify-center p-4">
          <div
            ref="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            class="modal-panel relative grid w-full max-w-4xl overflow-hidden rounded-2xl bg-paper shadow-2xl md:grid-cols-[5fr_6fr]"
          >
            <!-- Image -->
            <div class="relative hidden md:block">
              <img
                src="/images/hero-range-rover-sport.jpg"
                alt=""
                class="absolute inset-0 h-full w-full object-cover object-[72%_center]"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-8 text-paper">
                <p class="text-2xl font-extrabold tracking-wide">IMPEX</p>
                <p class="mt-2 max-w-[16rem] text-sm leading-relaxed text-paper/80">
                  Réservez l'entretien ou la réparation de votre Land Rover en quelques minutes.
                </p>
              </div>
            </div>

            <!-- Formulaire -->
            <div class="p-7 sm:p-10">
              <button
                class="absolute right-4 top-4 p-1.5 text-ink/50 transition hover:text-ink"
                aria-label="Fermer"
                @click="ui.closeAuth()"
              >
                <X :size="22" />
              </button>

              <h2 id="auth-title" class="text-3xl font-bold tracking-tight">{{ texts.title }}</h2>
              <p class="mt-1.5 text-sm text-ink/60">{{ texts.sub }}</p>

              <p v-if="ui.authNotice" role="status" class="mt-5 rounded-lg bg-accent/10 px-3.5 py-2.5 text-sm font-medium text-accent">
                {{ ui.authNotice }}
              </p>

              <!-- « Mot de passe oublié » : demande envoyée -->
              <div v-if="isForgot && sent" class="mt-7 rounded-xl border border-accent/30 bg-accent/[0.06] p-5">
                <MailCheck :size="26" class="text-accent" />
                <p class="mt-3 font-semibold">Vérifiez votre boîte mail</p>
                <p class="mt-1 text-sm text-ink/65">
                  Si un compte existe pour <span class="font-medium text-ink">{{ form.email }}</span>, un email avec un lien
                  valable une heure vient d'être envoyé. Pensez à regarder dans vos courriers indésirables.
                </p>
              </div>

              <form v-else class="mt-7 space-y-4" @submit.prevent="submit">
                <p v-if="error" role="alert" class="border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {{ error }}
                </p>

                <div v-if="isRegister" class="grid grid-cols-2 gap-3">
                  <label class="block text-sm font-medium">
                    Prénom
                    <input v-model="form.firstName" required autocomplete="given-name" :class="[field, 'mt-1.5']" />
                  </label>
                  <label class="block text-sm font-medium">
                    Nom
                    <input v-model="form.lastName" required autocomplete="family-name" :class="[field, 'mt-1.5']" />
                  </label>
                </div>

                <label v-if="!isReset" class="block text-sm font-medium">
                  Email
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    autocomplete="email"
                    placeholder="vous@exemple.com"
                    :class="[field, 'mt-1.5']"
                  />
                </label>

                <label v-if="isRegister" class="block text-sm font-medium">
                  Téléphone <span class="font-normal text-ink/45">(facultatif)</span>
                  <input v-model="form.phone" type="tel" autocomplete="tel" placeholder="+261 34 00 000 00" :class="[field, 'mt-1.5']" />
                </label>

                <div v-if="!isForgot">
                  <div class="flex items-baseline justify-between">
                    <label for="auth-password" class="text-sm font-medium">{{ isReset ? "Nouveau mot de passe" : "Mot de passe" }}</label>
                    <button
                      v-if="isLogin"
                      type="button"
                      class="text-xs font-semibold text-accent underline-offset-4 hover:underline"
                      @click="ui.openAuth('forgot')"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input
                    id="auth-password"
                    v-model="form.password"
                    type="password"
                    required
                    :minlength="isLogin ? undefined : 8"
                    :autocomplete="isLogin ? 'current-password' : 'new-password'"
                    :placeholder="isLogin ? '' : '8 caractères minimum'"
                    :class="[field, 'mt-1.5']"
                  />
                </div>

                <label v-if="isReset" class="block text-sm font-medium">
                  Confirmez le mot de passe
                  <input v-model="form.confirm" type="password" required minlength="8" autocomplete="new-password" :class="[field, 'mt-1.5']" />
                </label>

                <button
                  :disabled="loading"
                  class="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-semibold text-paper transition hover:bg-ink disabled:opacity-60"
                >
                  {{ loading ? "Un instant…" : texts.button }}
                  <ArrowRight v-if="!loading" :size="18" class="transition group-hover:translate-x-1" />
                </button>
              </form>

              <p class="mt-6 text-sm text-ink/65">
                <template v-if="isLogin || isRegister">
                  {{ isLogin ? "Pas encore de compte ?" : "Déjà un compte ?" }}
                  <button
                    type="button"
                    class="font-semibold text-accent underline-offset-4 hover:underline"
                    @click="ui.openAuth(isLogin ? 'register' : 'login')"
                  >
                    {{ isLogin ? "Créer un compte" : "Se connecter" }}
                  </button>
                </template>
                <button v-else type="button" class="font-semibold text-accent underline-offset-4 hover:underline" @click="ui.openAuth('login')">
                  Retour à la connexion
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
