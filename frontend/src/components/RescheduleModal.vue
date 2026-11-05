<script setup>
import { computed, ref, watch } from "vue"
import { api } from "@/lib/api"
import { formatDay, formatDuration, formatTime, toDateInput } from "@/lib/format"
import BaseModal from "@/components/BaseModal.vue"

const props = defineProps({
  open: Boolean,
  appointment: { type: Object, required: true },
})
const emit = defineEmits(["close", "saved"])

const today = toDateInput()
const date = ref("")
const slot = ref("")
const availability = ref(null) // { closed, reason, slots, next, durationMinutes }
const loading = ref(false)
const saving = ref(false)
const error = ref("")
let request = 0
let wantedSlot = ""

watch(
  () => props.open,
  (open) => {
    if (!open) return
    date.value = toDateInput(props.appointment.scheduledAt)
    slot.value = ""
    availability.value = null
    error.value = ""
    loadSlots()
  },
)

// L'API calcule les créneaux avec la durée de ce rendez-vous, sans compter sa propre place
async function loadSlots() {
  const current = ++request
  availability.value = null
  error.value = ""
  if (!date.value) return
  loading.value = true
  try {
    const data = await api(`/availability?date=${date.value}&appointmentId=${props.appointment._id}`)
    if (current !== request) return
    availability.value = data
    const wanted = data.slots.find((s) => s.start === wantedSlot && s.available)
    slot.value = wanted ? wanted.start : ""
  } catch (e) {
    if (current === request) error.value = e.message
  } finally {
    if (current === request) {
      loading.value = false
      wantedSlot = ""
    }
  }
}
watch(date, loadSlots)

const freeSlots = computed(() => availability.value?.slots.filter((s) => s.available) ?? [])
const unchanged = computed(() => slot.value && new Date(slot.value).getTime() === new Date(props.appointment.scheduledAt).getTime())

function goToNext() {
  wantedSlot = availability.value.next.start
  date.value = availability.value.next.date
}

async function submit() {
  error.value = ""
  if (!slot.value) return (error.value = "Choisissez une date et une heure.")
  saving.value = true
  try {
    const result = await api(`/appointments/${props.appointment._id}/reschedule`, { method: "PATCH", body: { scheduledAt: slot.value } })
    emit("saved", result)
  } catch (e) {
    error.value = e.message
    loadSlots() // le créneau a peut-être été pris entre-temps
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Reprogrammer le rendez-vous" :subtitle="`${appointment.service?.name} · ${appointment.customer?.firstName} ${appointment.customer?.lastName}`" @close="emit('close')">
    <div class="space-y-4">
      <p class="rounded-lg bg-ink/[0.04] px-3.5 py-2.5 text-sm text-ink/70">
        Actuellement : <span class="font-semibold text-ink">{{ formatDay(appointment.scheduledAt) }} à {{ formatTime(appointment.scheduledAt) }}</span>
        · {{ formatDuration(appointment.estimatedMinutes) }}
      </p>

      <label class="block text-sm font-medium">
        Nouvelle date
        <input v-model="date" type="date" :min="today" class="field mt-1.5 block sm:max-w-[14rem]" />
      </label>

      <div aria-live="polite">
        <p v-if="loading" class="text-sm text-ink/50">Chargement des créneaux…</p>
        <template v-else-if="availability">
          <div v-if="!freeSlots.length" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p class="text-sm font-medium text-amber-900">
              {{ availability.closed ? `Le garage est fermé ce jour-là${availability.reason ? ` (${availability.reason})` : ""}.` : "Plus aucun créneau libre ce jour-là." }}
            </p>
            <button v-if="availability.next" type="button" class="mt-2 text-sm font-semibold text-accent underline underline-offset-4 hover:text-ink" @click="goToNext">
              Prochain créneau disponible : {{ formatDay(availability.next.start) }} à {{ formatTime(availability.next.start) }}
            </button>
            <p v-else class="mt-1 text-sm text-amber-900/80">Aucune disponibilité dans les deux prochaines semaines.</p>
          </div>

          <template v-else>
            <p class="mb-2 text-sm font-medium">Nouvelle heure d'arrivée</p>
            <div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
              <button
                v-for="s in availability.slots"
                :key="s.start"
                type="button"
                :disabled="!s.available"
                :aria-pressed="slot === s.start"
                class="rounded-lg border py-2 text-sm font-medium transition"
                :class="
                  slot === s.start
                    ? 'border-accent bg-accent text-paper'
                    : s.available
                      ? 'border-ink/20 bg-white hover:border-accent hover:text-accent'
                      : 'cursor-not-allowed border-transparent bg-ink/[0.04] text-ink/30 line-through'
                "
                @click="slot = s.start"
              >
                {{ s.time }}
              </button>
            </div>
            <p class="mt-2 text-xs text-ink/50">
              Si le mécanicien assigné n'est pas libre à ce nouveau créneau, le rendez-vous repasse « en attente » pour que vous en choisissiez un autre.
            </p>
          </template>
        </template>
      </div>

      <p v-if="error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-4">
        <button type="button" class="text-sm font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-accent" @click="emit('close')">Annuler</button>
        <button
          :disabled="saving || !slot || unchanged"
          class="rounded-xl bg-accent px-6 py-3 font-semibold text-paper transition hover:bg-ink disabled:opacity-40"
          @click="submit"
        >
          {{ saving ? "Un instant…" : "Reprogrammer" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
