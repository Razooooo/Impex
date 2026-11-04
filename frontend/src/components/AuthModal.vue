<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { ArrowRight, X } from "lucide-vue-next"
import { useUiStore } from "@/stores/ui"
import { useAuthStore } from "@/stores/auth"
import { homeFor } from "@/router"

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()

const isOpen = computed(() => ui.authMode !== null)
const isLogin = computed(() => ui.authMode === "login")

const form = reactive({ firstName: "", lastName: "", email: "", phone: "", password: "" })
const error = ref("")
const loading = ref(false)
const panel = ref(null)

const focusFirst = () => nextTick(() => panel.value?.querySelector("input")?.focus())

watch(isOpen, (open) => {
  if (open) focusFirst()
  else Object.assign(form, { firstName: "", lastName: "", email: "", phone: "", password: "" })
})
watch(
  () => ui.authMode,
  () => {
    error.value = ""
    focusFirst()
  },
)

const onKey = (e) => {
  if (e.key === "Escape" && isOpen.value) ui.closeAuth()
}
onMounted(() => window.addEventListener("keydown", onKey))
onBeforeUnmount(() => window.removeEventListener("keydown", onKey))

async function submit() {
  error.value = ""
  loading.value = true
  try {
    if (isLogin.value) await auth.login(form.email, form.password)
    else await auth.register({ ...form })
    form.password = ""
    ui.closeAuth()
    router.push(homeFor(auth.role))
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const field =
  "w-full border border-ink/25 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-ink/35 focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent"
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" :duration="350">
      <!-- overscroll-contain : le défilement ne se transmet pas au site derrière la fenêtre -->
      <div v-if="isOpen" class="fixed inset-0 z-[100] overflow-y-auto overscroll-contain">
        <div class="modal-backdrop absolute inset-0" @click="ui.closeAuth()"></div>

        <div class="relative flex min-h-full items-center justify-center p-4">
          <div
            ref="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            class="modal-panel relative grid w-full max-w-4xl overflow-hidden bg-paper shadow-2xl md:grid-cols-[5fr_6fr]"
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

              <h2 id="auth-title" class="text-3xl font-bold tracking-tight">
                {{ isLogin ? "Bon retour" : "Créer un compte" }}
              </h2>
              <p class="mt-1.5 text-sm text-ink/60">
                {{ isLogin ? "Connectez-vous pour gérer vos rendez-vous." : "Quelques informations suffisent pour réserver." }}
              </p>

              <form class="mt-7 space-y-4" @submit.prevent="submit">
                <p v-if="error" role="alert" class="border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {{ error }}
                </p>

                <div v-if="!isLogin" class="grid grid-cols-2 gap-3">
                  <label class="block text-sm font-medium">
                    Prénom
                    <input v-model="form.firstName" required autocomplete="given-name" :class="[field, 'mt-1.5']" />
                  </label>
                  <label class="block text-sm font-medium">
                    Nom
                    <input v-model="form.lastName" required autocomplete="family-name" :class="[field, 'mt-1.5']" />
                  </label>
                </div>

                <label class="block text-sm font-medium">
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

                <label v-if="!isLogin" class="block text-sm font-medium">
                  Téléphone <span class="font-normal text-ink/45">(facultatif)</span>
                  <input v-model="form.phone" type="tel" autocomplete="tel" placeholder="+261 34 00 000 00" :class="[field, 'mt-1.5']" />
                </label>

                <label class="block text-sm font-medium">
                  Mot de passe
                  <input
                    v-model="form.password"
                    type="password"
                    required
                    :minlength="isLogin ? undefined : 8"
                    :autocomplete="isLogin ? 'current-password' : 'new-password'"
                    :placeholder="isLogin ? '' : '8 caractères minimum'"
                    :class="[field, 'mt-1.5']"
                  />
                </label>

                <button
                  :disabled="loading"
                  class="group mt-2 flex w-full items-center justify-center gap-2 bg-accent px-6 py-3.5 font-semibold text-paper transition hover:bg-ink disabled:opacity-60"
                >
                  {{ loading ? "Un instant…" : isLogin ? "Se connecter" : "Créer mon compte" }}
                  <ArrowRight v-if="!loading" :size="18" class="transition group-hover:translate-x-1" />
                </button>
              </form>

              <p class="mt-6 text-sm text-ink/65">
                {{ isLogin ? "Pas encore de compte ?" : "Déjà un compte ?" }}
                <button
                  type="button"
                  class="font-semibold text-accent underline-offset-4 hover:underline"
                  @click="ui.openAuth(isLogin ? 'register' : 'login')"
                >
                  {{ isLogin ? "Créer un compte" : "Se connecter" }}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
