<script setup>
import { computed, reactive, ref, watch } from "vue"
import { api } from "@/lib/api"
import BaseModal from "@/components/BaseModal.vue"

const props = defineProps({
  open: Boolean,
  // véhicule à modifier ; absent = ajout d'un nouveau véhicule
  vehicle: { type: Object, default: null },
})
const emit = defineEmits(["close", "saved"])

const empty = () => ({ model: "", year: "", plate: "", mileage: "", engine: "" })
const form = reactive(empty())
const models = ref([])
const error = ref("")
const loading = ref(false)
const isEdit = computed(() => !!props.vehicle)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    const v = props.vehicle
    Object.assign(form, v ? { model: v.model, year: v.year ?? "", plate: v.plate ?? "", mileage: v.mileage ?? "", engine: v.engine ?? "" } : empty())
    error.value = ""
    if (!models.value.length) {
      try {
        models.value = (await api("/vehicles/models")).models
      } catch (e) {
        error.value = e.message
      }
    }
  },
)

async function submit() {
  error.value = ""
  loading.value = true
  try {
    // Un champ vidé est envoyé à null pour être effacé côté serveur
    const body = {
      model: form.model,
      plate: form.plate,
      engine: form.engine,
      year: form.year === "" ? null : Number(form.year),
      mileage: form.mileage === "" ? null : Number(form.mileage),
    }
    const { vehicle } = isEdit.value
      ? await api(`/vehicles/${props.vehicle._id}`, { method: "PATCH", body })
      : await api("/vehicles", { method: "POST", body })
    emit("saved", vehicle)
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
    :title="isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule'"
    :subtitle="isEdit ? 'Gardez ces informations à jour pour préparer l\'intervention.' : 'Vous pourrez le choisir pour vos prochains rendez-vous.'"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <p v-if="error" role="alert" class="border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>

      <label class="block text-sm font-medium">
        Modèle
        <select v-model="form.model" required class="field mt-1.5">
          <option value="" disabled>Choisir un modèle</option>
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-medium">
          Année
          <input v-model="form.year" type="number" min="1948" :max="new Date().getFullYear() + 1" placeholder="2019" class="field mt-1.5" />
        </label>
        <label class="block text-sm font-medium">
          Immatriculation
          <input v-model="form.plate" placeholder="1234 TAA" class="field mt-1.5 uppercase" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-medium">
          Kilométrage
          <input v-model="form.mileage" type="number" min="0" placeholder="85000" class="field mt-1.5" />
        </label>
        <label class="block text-sm font-medium">
          Motorisation
          <input v-model="form.engine" placeholder="TD6 3.0 diesel" class="field mt-1.5" />
        </label>
      </div>

      <div class="flex items-center justify-end gap-4 pt-2">
        <button type="button" class="text-sm font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-accent" @click="emit('close')">
          Annuler
        </button>
        <button :disabled="loading" class="rounded-xl bg-accent px-6 py-3 font-semibold text-paper transition hover:bg-ink disabled:opacity-60">
          {{ loading ? "Un instant…" : isEdit ? "Enregistrer" : "Ajouter" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
