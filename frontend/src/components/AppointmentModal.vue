<script setup>
import { computed, reactive, ref, watch } from "vue"
import { Check, CircleHelp } from "lucide-vue-next"
import { api } from "@/lib/api"
import { categoryMeta, categoryOrder, symptoms } from "@/lib/categories"
import { formatDuration, slotsFor, toDateInput } from "@/lib/format"
import BaseModal from "@/components/BaseModal.vue"

const props = defineProps({
  open: Boolean,
  vehicles: { type: Array, default: () => [] },
  // véhicule à présélectionner (ex. juste après son ajout)
  preselectVehicle: String,
})
const emit = defineEmits(["close", "saved", "add-vehicle"])

const UNKNOWN = "unknown"
const blank = () => ({ vehicleId: "", choice: "", serviceId: "", symptoms: [], date: "", time: "", notes: "" })
const form = reactive(blank())
const services = ref([])
const error = ref("")
const loading = ref(false)
const today = toDateInput()

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    Object.assign(form, blank(), { vehicleId: props.preselectVehicle || props.vehicles[0]?._id || "" })
    error.value = ""
    if (!services.value.length) {
      try {
        services.value = (await api("/services")).services
      } catch (e) {
        error.value = e.message
      }
    }
  },
)

// Si un véhicule vient d'être ajouté pendant que la fenêtre est ouverte
watch(
  () => props.preselectVehicle,
  (id) => {
    if (id) form.vehicleId = id
  },
)

// Prestation « je ne sais pas » + zones qui ont au moins une prestation
const unknownService = computed(() => services.value.find((s) => s.forUnknownProblem))
const zones = computed(() => {
  const groups = {}
  for (const s of services.value.filter((s) => !s.forUnknownProblem)) (groups[s.category] ??= []).push(s)
  return categoryOrder.filter((key) => groups[key]).map((key) => ({ key, ...categoryMeta[key], items: groups[key] }))
})
const currentZone = computed(() => zones.value.find((z) => z.key === form.choice))
const isUnknown = computed(() => form.choice === UNKNOWN)
const selectedService = computed(() =>
  isUnknown.value ? unknownService.value : services.value.find((s) => s._id === form.serviceId),
)

function choose(key) {
  form.choice = key
  const zone = zones.value.find((z) => z.key === key)
  form.serviceId = zone?.items.length === 1 ? zone.items[0]._id : ""
}

function toggleSymptom(s) {
  const i = form.symptoms.indexOf(s)
  if (i === -1) form.symptoms.push(s)
  else form.symptoms.splice(i, 1)
}

const slots = computed(() => slotsFor(form.date))
const closedDay = computed(() => form.date && !slots.value.length)
// Quand on change de jour, on retire l'heure si elle n'existe plus
watch(slots, (list) => {
  if (!list.includes(form.time)) form.time = ""
})

async function submit() {
  error.value = ""
  if (!form.choice) return (error.value = "Choisissez ce dont vous avez besoin, ou « Je ne sais pas ».")
  if (!selectedService.value) return (error.value = "Choisissez une prestation dans la liste.")
  if (isUnknown.value && !form.symptoms.length && !form.notes.trim()) {
    return (error.value = "Indiquez au moins un symptôme ou quelques mots, pour aider le mécanicien.")
  }
  if (!form.time) return (error.value = "Choisissez une date et une heure.")

  const notes = [form.symptoms.length ? `Symptômes : ${form.symptoms.join(", ")}.` : "", form.notes.trim()].filter(Boolean).join(" ")

  loading.value = true
  try {
    await api("/appointments", {
      method: "POST",
      body: {
        vehicleId: form.vehicleId,
        serviceId: selectedService.value._id,
        scheduledAt: new Date(`${form.date}T${form.time}`).toISOString(),
        customerNotes: notes,
      },
    })
    emit("saved")
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const tile = (active) =>
  active ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-ink/15 bg-white/70 hover:border-ink/40"
</script>

<template>
  <BaseModal :open="open" wide title="Nouveau rendez-vous" subtitle="Le garage confirmera votre créneau et vous assignera un mécanicien." @close="emit('close')">
    <!-- Pas encore de véhicule -->
    <div v-if="!vehicles.length" class="rounded-xl border border-ink/15 bg-white/70 p-5">
      <p class="font-semibold">Ajoutez d'abord votre véhicule</p>
      <p class="mt-1 text-sm text-ink/65">Nous avons besoin du modèle pour préparer l'intervention.</p>
      <button class="mt-4 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent" @click="emit('add-vehicle')">
        Ajouter un véhicule
      </button>
    </div>

    <form v-else id="appointment-form" class="space-y-5" novalidate @submit.prevent="submit">
      <!-- 1. Véhicule -->
      <label class="block text-sm font-medium">
        Véhicule
        <select v-model="form.vehicleId" required class="field mt-1.5">
          <option v-for="v in vehicles" :key="v._id" :value="v._id">
            {{ v.model }}{{ v.plate ? ` · ${v.plate}` : "" }}{{ v.year ? ` (${v.year})` : "" }}
          </option>
        </select>
        <button type="button" class="mt-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline" @click="emit('add-vehicle')">
          + Ajouter un autre véhicule
        </button>
      </label>

      <!-- 2. Besoin -->
      <fieldset>
        <legend class="text-sm font-medium">De quoi avez-vous besoin ?</legend>

        <button
          v-if="unknownService"
          type="button"
          :aria-pressed="isUnknown"
          class="mt-2 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition"
          :class="isUnknown ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-accent/40 bg-accent/[0.06] hover:bg-accent/10'"
          @click="choose(UNKNOWN)"
        >
          <span class="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent text-paper"><CircleHelp :size="22" /></span>
          <span class="flex-1">
            <span class="block font-semibold">Je ne sais pas, j'ai un problème</span>
            <span class="block text-sm text-ink/65">Décrivez ce que vous remarquez, un mécanicien trouvera la cause.</span>
          </span>
          <Check v-if="isUnknown" :size="20" class="flex-none text-accent" />
        </button>

        <p class="mb-2 mt-3.5 text-xs font-semibold uppercase tracking-wide text-ink/45">Ou choisissez une zone</p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            v-for="z in zones"
            :key="z.key"
            type="button"
            :aria-pressed="form.choice === z.key"
            class="flex items-center gap-3 rounded-xl border p-2.5 text-left transition"
            :class="tile(form.choice === z.key)"
            @click="choose(z.key)"
          >
            <span
              class="flex h-9 w-9 flex-none items-center justify-center rounded-lg transition"
              :class="form.choice === z.key ? 'bg-accent text-paper' : 'bg-ink/[0.06] text-ink/70'"
            >
              <component :is="z.icon" :size="19" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-tight">{{ z.label }}</span>
              <span class="mt-0.5 hidden text-[11px] leading-snug text-ink/55 sm:block">{{ z.hint }}</span>
            </span>
          </button>
        </div>
      </fieldset>

      <!-- Je ne sais pas : symptômes -->
      <section v-if="isUnknown" class="rounded-xl bg-accent/[0.06] p-4">
        <p class="text-sm font-medium">Qu'observez-vous ? <span class="font-normal text-ink/55">(plusieurs choix possibles)</span></p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="s in symptoms"
            :key="s"
            type="button"
            :aria-pressed="form.symptoms.includes(s)"
            class="rounded-full border px-3.5 py-1.5 text-sm transition"
            :class="form.symptoms.includes(s) ? 'border-accent bg-accent text-paper' : 'border-ink/20 bg-white/80 hover:border-ink/50'"
            @click="toggleSymptom(s)"
          >
            {{ s }}
          </button>
        </div>
        <p class="mt-3 text-xs text-ink/55">
          Diagnostic général, durée prévue : {{ formatDuration(unknownService.estimatedMinutes) }}. Le garage vous indiquera ensuite la suite à donner.
        </p>
      </section>

      <!-- Zone choisie : prestations -->
      <section v-else-if="currentZone" class="rounded-xl bg-ink/[0.04] p-4">
        <p class="text-sm font-medium">{{ currentZone.label }} : quelle prestation ?</p>
        <div class="mt-3 space-y-2">
          <label v-for="s in currentZone.items" :key="s._id" class="block cursor-pointer">
            <input v-model="form.serviceId" type="radio" name="service" :value="s._id" class="peer sr-only" />
            <span
              class="flex items-start justify-between gap-4 rounded-lg border border-ink/15 bg-white p-3.5 transition hover:border-ink/40 peer-checked:border-accent peer-checked:ring-1 peer-checked:ring-accent peer-focus-visible:ring-2"
            >
              <span>
                <span class="block text-sm font-semibold">{{ s.name }}</span>
                <span v-if="s.description" class="mt-0.5 block text-xs text-ink/60">{{ s.description }}</span>
              </span>
              <span class="flex-none rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-xs font-medium text-ink/65">{{ formatDuration(s.estimatedMinutes) }}</span>
            </span>
          </label>
        </div>
      </section>

      <!-- 3. Date et heure -->
      <div>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-sm font-medium">
            Date
            <input v-model="form.date" type="date" required :min="today" class="field mt-1.5" />
          </label>
          <label class="block text-sm font-medium">
            Heure
            <select v-model="form.time" required :disabled="!slots.length" class="field mt-1.5 disabled:opacity-50">
              <option value="" disabled>{{ form.date ? (slots.length ? "Choisir" : "—") : "Choisir une date" }}</option>
              <option v-for="t in slots" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
        </div>
        <p v-if="closedDay" class="mt-2 text-xs text-red-800">Le garage n'est pas disponible ce jour-là (ou plus de créneau aujourd'hui). Choisissez une autre date.</p>
      </div>

      <!-- 4. Précisions -->
      <label class="block text-sm font-medium">
        {{ isUnknown ? "Autres précisions" : "Décrivez le problème" }} <span class="font-normal text-ink/45">(facultatif)</span>
        <textarea
          v-model="form.notes"
          rows="3"
          :placeholder="isUnknown ? 'Depuis quand ? Dans quelles conditions (à froid, en roulant, en freinant) ?' : 'Bruit au freinage, voyant moteur allumé…'"
          class="field mt-1.5 resize-none"
        ></textarea>
      </label>

    </form>

    <!-- Pied toujours visible : erreur éventuelle, récapitulatif et boutons -->
    <template v-if="vehicles.length" #footer>
      <p v-if="error" role="alert" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm">
          <template v-if="selectedService">
            <span class="font-semibold">{{ selectedService.name }}</span>
            <span class="text-ink/60"> · {{ formatDuration(selectedService.estimatedMinutes) }}</span>
          </template>
          <span v-else class="text-ink/45">Aucune prestation choisie</span>
        </p>
        <div class="flex items-center gap-4">
          <button type="button" class="text-sm font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-accent" @click="emit('close')">
            Annuler
          </button>
          <button form="appointment-form" :disabled="loading" class="rounded-xl bg-accent px-6 py-3 font-semibold text-paper transition hover:bg-ink disabled:opacity-60">
            {{ loading ? "Un instant…" : "Demander ce rendez-vous" }}
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>
