<script setup>
import { computed, ref, watch } from "vue"
import { Mail, Phone } from "lucide-vue-next"
import { api } from "@/lib/api"
import { dayOfMonth, formatDay, formatDuration, formatTime, monthShort, statusMeta, toDateInput } from "@/lib/format"

const props = defineProps({
  appointment: { type: Object, required: true },
  mechanics: { type: Array, default: () => [] },
  // tous les rendez-vous, pour indiquer la charge de chaque mécanicien ce jour-là
  all: { type: Array, default: () => [] },
  // absences et fermetures déclarées, pour signaler les mécaniciens indisponibles
  timeOffs: { type: Array, default: () => [] },
})
const emit = defineEmits(["changed"])

const STEPS = [
  { key: "pending", label: "Demandé" },
  { key: "confirmed", label: "Confirmé" },
  { key: "in_progress", label: "En cours" },
  { key: "done", label: "Terminé" },
]

const a = computed(() => props.appointment)
const mechanicId = ref(a.value.assignedMechanic?._id ?? "")
const minutes = ref(a.value.estimatedMinutes)
const busy = ref(false)
const error = ref("")
const confirmingCancel = ref(false)

// Si le rendez-vous est rechargé (après une action), on resynchronise les champs
watch(
  () => props.appointment,
  (v) => {
    mechanicId.value = v.assignedMechanic?._id ?? ""
    minutes.value = v.estimatedMinutes
  },
)

const isPending = computed(() => a.value.status === "pending")
const canManage = computed(() => ["pending", "confirmed"].includes(a.value.status))
const stepIndex = computed(() => STEPS.findIndex((s) => s.key === a.value.status))
const changed = computed(
  () => mechanicId.value !== (a.value.assignedMechanic?._id ?? "") || Number(minutes.value) !== a.value.estimatedMinutes,
)

// Absence du mécanicien (ou fermeture du garage) le jour du rendez-vous
const day = computed(() => toDateInput(a.value.scheduledAt))
const offFor = (m) =>
  props.timeOffs.find((t) => t.startDate <= day.value && t.endDate >= day.value && (t.scope === "garage" || t.mechanic?._id === m._id))
const closure = computed(() => props.timeOffs.find((t) => t.scope === "garage" && t.startDate <= day.value && t.endDate >= day.value))
// Le mécanicien assigné est absent : il faut réassigner ce rendez-vous
const assignedOff = computed(() => (canManage.value && a.value.assignedMechanic && !closure.value ? offFor(a.value.assignedMechanic) : null))

// « Marc Dupont · 2 ce jour-là » aide à répartir le travail ; « absent ce jour-là » désactive le choix
function workload(m) {
  if (offFor(m)) return `${m.firstName} ${m.lastName} · absent ce jour-là`
  const sameDay = toDateInput(new Date(a.value.scheduledAt))
  const n = props.all.filter(
    (x) =>
      x._id !== a.value._id &&
      x.assignedMechanic?._id === m._id &&
      ["confirmed", "in_progress"].includes(x.status) &&
      toDateInput(new Date(x.scheduledAt)) === sameDay,
  ).length
  return n ? `${m.firstName} ${m.lastName} · ${n} ce jour-là` : `${m.firstName} ${m.lastName} · libre`
}

async function run(request, doneMessage) {
  error.value = ""
  busy.value = true
  try {
    await request()
    emit("changed", doneMessage)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
    confirmingCancel.value = false
  }
}

const saveAssignment = () =>
  run(
    () => api(`/appointments/${a.value._id}/assign`, { method: "PATCH", body: { mechanicId: mechanicId.value, estimatedMinutes: Number(minutes.value) } }),
    isPending.value ? "Rendez-vous confirmé et assigné." : "Modifications enregistrées.",
  )

const setStatus = (status, message) =>
  run(() => api(`/appointments/${a.value._id}/status`, { method: "PATCH", body: { status } }), message)

function cancel() {
  if (!confirmingCancel.value) return (confirmingCancel.value = true)
  setStatus("cancelled", "Rendez-vous annulé.")
}
</script>

<template>
  <li class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
    <div class="flex gap-4 p-5">
      <div class="w-16 flex-none self-start rounded-xl bg-ink py-3 text-center text-paper" :class="a.status === 'cancelled' ? 'opacity-40' : ''">
        <p class="text-3xl font-bold leading-none">{{ dayOfMonth(a.scheduledAt) }}</p>
        <p class="mt-1 text-xs uppercase tracking-wide text-paper/65">{{ monthShort(a.scheduledAt) }}</p>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <h3 class="text-lg font-semibold" :class="a.status === 'cancelled' ? 'text-ink/50 line-through' : ''">{{ a.service?.name }}</h3>
          <span class="rounded-full px-3 py-0.5 text-xs font-semibold" :class="statusMeta[a.status].cls">{{ statusMeta[a.status].label }}</span>
        </div>
        <p class="mt-0.5 text-sm text-ink/65">{{ formatDay(a.scheduledAt) }} à {{ formatTime(a.scheduledAt) }} · {{ formatDuration(a.estimatedMinutes) }}</p>

        <div class="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p>
            <span class="block text-xs text-ink/45">Client</span>
            <span class="font-medium">{{ a.customer?.firstName }} {{ a.customer?.lastName }}</span>
          </p>
          <p>
            <span class="block text-xs text-ink/45">Véhicule</span>
            <span class="font-medium">{{ a.vehicle?.model ?? "Supprimé" }}</span>
            <span class="ml-1.5 text-ink/60">{{ [a.vehicle?.year, a.vehicle?.plate].filter(Boolean).join(" · ") }}</span>
          </p>
        </div>
        <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55">
          <a v-if="a.customer?.phone" :href="`tel:${a.customer.phone}`" class="inline-flex items-center gap-1 hover:text-ink"><Phone :size="12" />{{ a.customer.phone }}</a>
          <a v-if="a.customer?.email" :href="`mailto:${a.customer.email}`" class="inline-flex items-center gap-1 hover:text-ink"><Mail :size="12" />{{ a.customer.email }}</a>
        </p>

        <p v-if="a.customerNotes" class="mt-3 rounded-lg bg-ink/[0.04] px-3 py-2 text-sm italic text-ink/65">« {{ a.customerNotes }} »</p>
        <p v-if="a.mechanicNotes" class="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-ink/80"><span class="font-semibold">Note du mécanicien :</span> {{ a.mechanicNotes }}</p>
        <p v-if="!canManage && a.assignedMechanic" class="mt-3 text-sm text-ink/60">Mécanicien : <span class="font-medium text-ink">{{ a.assignedMechanic.firstName }} {{ a.assignedMechanic.lastName }}</span></p>
      </div>
    </div>

    <!-- Gestion : assigner, ajuster la durée, démarrer, annuler -->
    <div v-if="canManage || a.status === 'in_progress'" class="border-t border-ink/10 bg-ink/[0.02] p-4 sm:px-5">
      <template v-if="canManage">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide" :class="isPending ? 'text-amber-800' : 'text-ink/45'">
          {{ isPending ? "À traiter : assignez un mécanicien pour confirmer" : "Gestion du rendez-vous" }}
        </p>
        <p v-if="closure" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Le garage est fermé ce jour-là{{ closure.reason ? ` (${closure.reason})` : "" }}. Ce rendez-vous ne peut pas avoir lieu : refusez-le ou annulez-le.
        </p>
        <p v-else-if="assignedOff" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {{ a.assignedMechanic.firstName }} est absent ce jour-là{{ assignedOff.reason ? ` (${assignedOff.reason})` : "" }} : réassignez ce rendez-vous à un autre mécanicien.
        </p>
        <div class="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <label class="block text-sm font-medium">
            Mécanicien
            <select v-model="mechanicId" class="field mt-1.5">
              <option value="" disabled>Choisir un mécanicien</option>
              <option v-for="m in mechanics" :key="m._id" :value="m._id" :disabled="!!offFor(m)">{{ workload(m) }}</option>
            </select>
          </label>
          <label class="block text-sm font-medium">
            Durée (min)
            <input v-model="minutes" type="number" min="15" step="15" class="field mt-1.5" />
          </label>
        </div>
      </template>

      <p v-if="error" role="alert" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          v-if="canManage"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
          :class="confirmingCancel ? 'bg-red-100 text-red-800' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'"
          :disabled="busy"
          @click="cancel"
          @blur="confirmingCancel = false"
        >
          {{ confirmingCancel ? "Confirmer l'annulation" : isPending ? "Refuser" : "Annuler" }}
        </button>
        <span v-else></span>

        <div class="flex flex-wrap items-center gap-2">
          <template v-if="canManage">
            <button
              class="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="busy || !mechanicId || (!isPending && !changed)"
              @click="saveAssignment"
            >
              {{ isPending ? "Confirmer et assigner" : "Enregistrer" }}
            </button>
            <button
              v-if="!isPending"
              class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent disabled:opacity-40"
              :disabled="busy || changed"
              :title="changed ? 'Enregistrez d\'abord vos modifications' : ''"
              @click="setStatus('in_progress', 'Intervention démarrée.')"
            >
              Démarrer
            </button>
          </template>
          <button
            v-else
            class="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink disabled:opacity-40"
            :disabled="busy"
            @click="setStatus('done', 'Intervention terminée.')"
          >
            Marquer comme terminé
          </button>
        </div>
      </div>
    </div>

    <!-- Progression -->
    <div v-if="a.status !== 'cancelled'" class="border-t border-ink/10 px-5 py-3">
      <ol class="grid grid-cols-4 gap-1.5">
        <li v-for="(s, i) in STEPS" :key="s.key">
          <span class="block h-1.5 rounded-full" :class="i <= stepIndex ? 'bg-accent' : 'bg-ink/10'"></span>
          <span class="mt-1.5 block text-[11px]" :class="i === stepIndex ? 'font-semibold text-ink' : 'text-ink/40'">{{ s.label }}</span>
        </li>
      </ol>
    </div>
  </li>
</template>
