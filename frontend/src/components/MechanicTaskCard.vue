<script setup>
import { computed, ref, watch } from "vue"
import { api } from "@/lib/api"
import { formatDuration, formatTime, statusMeta } from "@/lib/format"

const props = defineProps({ appointment: { type: Object, required: true } })
const emit = defineEmits(["changed"])

const STEPS = [
  { key: "pending", label: "Demandé" },
  { key: "confirmed", label: "Confirmé" },
  { key: "in_progress", label: "En cours" },
  { key: "done", label: "Terminé" },
]

const a = computed(() => props.appointment)
const notes = ref(a.value.mechanicNotes ?? "")
const busy = ref(false)
const error = ref("")

watch(
  () => props.appointment.mechanicNotes,
  (v) => (notes.value = v ?? ""),
)

const dirty = computed(() => notes.value.trim() !== (a.value.mechanicNotes ?? ""))
const stepIndex = computed(() => STEPS.findIndex((s) => s.key === a.value.status))
const overdue = computed(() => {
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  return a.value.status === "confirmed" && new Date(a.value.scheduledAt) < startOfToday
})
const when = computed(() =>
  new Date(a.value.scheduledAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }).replace(".", ""),
)
const km = (n) => `${Number(n).toLocaleString("fr-FR")} km`

async function run(task, message) {
  error.value = ""
  busy.value = true
  try {
    await task()
    emit("changed", message)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

const saveNotes = () =>
  api(`/appointments/${a.value._id}/notes`, { method: "PATCH", body: { mechanicNotes: notes.value } })
const setStatus = (status) => api(`/appointments/${a.value._id}/status`, { method: "PATCH", body: { status } })

const onSaveNotes = () => run(saveNotes, "Note enregistrée.")
// Une note en cours de saisie est enregistrée avant de changer le statut, pour ne rien perdre
const start = () => run(async () => { if (dirty.value) await saveNotes(); await setStatus("in_progress") }, "Intervention démarrée.")
const finish = () => run(async () => { if (dirty.value) await saveNotes(); await setStatus("done") }, "Intervention terminée, bravo !")
</script>

<template>
  <li class="overflow-hidden rounded-2xl border bg-white shadow-sm" :class="a.status === 'in_progress' ? 'border-accent ring-1 ring-accent' : 'border-ink/10'">
    <div class="flex gap-4 p-5">
      <div class="w-20 flex-none self-start rounded-xl bg-ink px-1 py-3 text-center text-paper">
        <p class="text-[11px] uppercase tracking-wide text-paper/65">{{ when }}</p>
        <p class="mt-0.5 text-2xl font-bold leading-none">{{ formatTime(a.scheduledAt) }}</p>
        <p class="mt-1.5 text-[11px] text-paper/65">{{ formatDuration(a.estimatedMinutes) }}</p>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <h3 class="text-lg font-semibold">{{ a.service?.name }}</h3>
          <span class="flex gap-1.5">
            <span v-if="overdue" class="rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-800">En retard</span>
            <span class="rounded-full px-3 py-0.5 text-xs font-semibold" :class="statusMeta[a.status].cls">{{ statusMeta[a.status].label }}</span>
          </span>
        </div>

        <!-- Véhicule -->
        <div class="mt-3 rounded-xl bg-ink/[0.04] p-3.5">
          <p class="font-semibold">{{ a.vehicle?.model ?? "Véhicule supprimé" }} <span class="font-normal text-ink/60">{{ a.vehicle?.year }}</span></p>
          <p class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink/65">
            <span v-if="a.vehicle?.plate">Immat. {{ a.vehicle.plate }}</span>
            <span v-if="a.vehicle?.engine">{{ a.vehicle.engine }}</span>
            <span v-if="a.vehicle?.mileage != null">{{ km(a.vehicle.mileage) }}</span>
          </p>
          <p class="mt-1.5 text-xs text-ink/50">Client : {{ a.customer?.firstName }} {{ a.customer?.lastName }}</p>
        </div>

        <!-- Ce que le client a signalé : l'information la plus utile pour diagnostiquer -->
        <div v-if="a.customerNotes" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-900">Signalé par le client</p>
          <p class="mt-1 text-sm text-ink/80">{{ a.customerNotes }}</p>
        </div>
      </div>
    </div>

    <!-- Note et actions -->
    <div class="border-t border-ink/10 bg-ink/[0.02] p-4 sm:px-5">
      <label class="block text-sm font-medium">
        Note sur l'intervention
        <textarea v-model="notes" rows="2" maxlength="1000" placeholder="Ce que vous avez constaté, pièces changées, conseils pour le client…" class="field mt-1.5 resize-none"></textarea>
      </label>
      <p class="mt-1 text-xs text-ink/50">Cette note est visible par le client dans son espace.</p>

      <p v-if="error" role="alert" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          class="rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
          :class="dirty ? 'bg-ink text-paper hover:bg-accent' : 'text-ink/50'"
          :disabled="busy || !dirty"
          @click="onSaveNotes"
        >
          Enregistrer la note
        </button>

        <button
          v-if="a.status === 'confirmed'"
          class="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink disabled:opacity-40"
          :disabled="busy"
          @click="start"
        >
          Démarrer l'intervention
        </button>
        <button
          v-else-if="a.status === 'in_progress'"
          class="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink disabled:opacity-40"
          :disabled="busy"
          @click="finish"
        >
          Marquer comme terminé
        </button>
      </div>
    </div>

    <div class="border-t border-ink/10 px-5 py-3">
      <ol class="grid grid-cols-4 gap-1.5">
        <li v-for="(s, i) in STEPS" :key="s.key">
          <span class="block h-1.5 rounded-full" :class="i <= stepIndex ? 'bg-accent' : 'bg-ink/10'"></span>
          <span class="mt-1.5 block text-[11px]" :class="i === stepIndex ? 'font-semibold text-ink' : 'text-ink/40'">{{ s.label }}</span>
        </li>
      </ol>
    </div>
  </li>
</template>
