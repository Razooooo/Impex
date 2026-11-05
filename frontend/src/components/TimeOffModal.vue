<script setup>
import { reactive, ref, watch } from "vue"
import { api } from "@/lib/api"
import { toDateInput } from "@/lib/format"
import BaseModal from "@/components/BaseModal.vue"

const props = defineProps({
  open: Boolean,
  mechanics: { type: Array, default: () => [] },
  // jour à présélectionner (celui affiché dans le calendrier)
  day: String,
})
const emit = defineEmits(["close", "saved"])

const today = toDateInput()
const blank = () => ({ scope: "mechanic", mechanicId: "", startDate: "", endDate: "", reason: "" })
const form = reactive(blank())
const error = ref("")
const loading = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const start = props.day && props.day >= today ? props.day : today
    Object.assign(form, blank(), { startDate: start, endDate: start, mechanicId: props.mechanics[0]?._id ?? "" })
    error.value = ""
  },
)

// La fin ne peut pas précéder le début
watch(
  () => form.startDate,
  (start) => {
    if (start && form.endDate < start) form.endDate = start
  },
)

async function submit() {
  error.value = ""
  if (!form.startDate || !form.endDate) return (error.value = "Choisissez les dates.")
  if (form.scope === "mechanic" && !form.mechanicId) return (error.value = "Choisissez un mécanicien.")

  loading.value = true
  try {
    const body = { scope: form.scope, startDate: form.startDate, endDate: form.endDate, reason: form.reason }
    if (form.scope === "mechanic") body.mechanicId = form.mechanicId
    emit("saved", await api("/timeoff", { method: "POST", body }))
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Absence ou fermeture"
    subtitle="Les clients ne pourront plus réserver sur ces jours, et les créneaux s'adaptent aussitôt."
    @close="emit('close')"
  >
    <form id="timeoff-form" class="space-y-4" novalidate @submit.prevent="submit">
      <div>
        <p class="text-sm font-medium">Qui est concerné ?</p>
        <div class="mt-1.5 inline-flex rounded-full bg-ink/[0.07] p-1 text-sm font-semibold">
          <button
            v-for="s in [{ k: 'mechanic', l: 'Un mécanicien' }, { k: 'garage', l: 'Tout le garage' }]"
            :key="s.k"
            type="button"
            class="rounded-full px-4 py-1.5 transition"
            :class="form.scope === s.k ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'"
            @click="form.scope = s.k"
          >
            {{ s.l }}
          </button>
        </div>
      </div>

      <label v-if="form.scope === 'mechanic'" class="block text-sm font-medium">
        Mécanicien
        <select v-model="form.mechanicId" class="field mt-1.5">
          <option v-for="m in mechanics" :key="m._id" :value="m._id">{{ m.firstName }} {{ m.lastName }}</option>
        </select>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-medium">
          Du
          <input v-model="form.startDate" type="date" :min="today" class="field mt-1.5 block" />
        </label>
        <label class="block text-sm font-medium">
          Au (inclus)
          <input v-model="form.endDate" type="date" :min="form.startDate || today" class="field mt-1.5 block" />
        </label>
      </div>

      <label class="block text-sm font-medium">
        Motif <span class="font-normal text-ink/45">(facultatif)</span>
        <input
          v-model="form.reason"
          maxlength="200"
          :placeholder="form.scope === 'garage' ? 'Jour férié, inventaire…' : 'Congés, formation…'"
          class="field mt-1.5"
        />
      </label>
      <p v-if="form.scope === 'garage'" class="text-xs text-ink/50">Le motif est affiché aux clients quand ils choisissent un de ces jours.</p>
    </form>

    <template #footer>
      <p v-if="error" role="alert" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>
      <div class="flex items-center justify-end gap-4">
        <button type="button" class="text-sm font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-accent" @click="emit('close')">Annuler</button>
        <button form="timeoff-form" :disabled="loading" class="rounded-xl bg-accent px-6 py-3 font-semibold text-paper transition hover:bg-ink disabled:opacity-60">
          {{ loading ? "Un instant…" : "Enregistrer" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
