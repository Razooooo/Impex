<script setup>
import { computed, reactive, ref, watch } from "vue"
import { api } from "@/lib/api"
import { categoryMeta, categoryOrder } from "@/lib/categories"
import BaseModal from "@/components/BaseModal.vue"

const props = defineProps({
  open: Boolean,
  // service à modifier ; absent = nouveau service
  service: { type: Object, default: null },
})
const emit = defineEmits(["close", "saved"])

const blank = () => ({ name: "", category: "entretien", estimatedMinutes: 60, description: "" })
const form = reactive(blank())
const error = ref("")
const loading = ref(false)
const isEdit = computed(() => !!props.service)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const s = props.service
    Object.assign(form, s ? { name: s.name, category: s.category, estimatedMinutes: s.estimatedMinutes, description: s.description ?? "" } : blank())
    error.value = ""
  },
)

async function submit() {
  error.value = ""
  loading.value = true
  try {
    const body = { ...form, estimatedMinutes: Number(form.estimatedMinutes) }
    const { service } = isEdit.value
      ? await api(`/services/${props.service._id}`, { method: "PATCH", body })
      : await api("/services", { method: "POST", body })
    emit("saved", service)
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
    :title="isEdit ? 'Modifier le service' : 'Ajouter un service'"
    subtitle="La durée sert de durée estimée par défaut pour les rendez-vous."
    @close="emit('close')"
  >
    <form id="service-form" class="space-y-4" @submit.prevent="submit">
      <p v-if="error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>

      <label class="block text-sm font-medium">
        Nom
        <input v-model="form.name" required placeholder="Vidange + filtres" class="field mt-1.5" />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-medium">
          Zone
          <select v-model="form.category" class="field mt-1.5">
            <option v-for="k in categoryOrder" :key="k" :value="k">{{ categoryMeta[k].label }}</option>
          </select>
        </label>
        <label class="block text-sm font-medium">
          Durée (minutes)
          <input v-model="form.estimatedMinutes" type="number" required min="15" step="15" class="field mt-1.5" />
        </label>
      </div>

      <label class="block text-sm font-medium">
        Description <span class="font-normal text-ink/45">(facultatif)</span>
        <textarea v-model="form.description" rows="3" placeholder="Ce que comprend la prestation" class="field mt-1.5 resize-none"></textarea>
      </label>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-4">
        <button type="button" class="text-sm font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-accent" @click="emit('close')">Annuler</button>
        <button form="service-form" :disabled="loading" class="rounded-xl bg-accent px-6 py-3 font-semibold text-paper transition hover:bg-ink disabled:opacity-60">
          {{ loading ? "Un instant…" : isEdit ? "Enregistrer" : "Ajouter" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
