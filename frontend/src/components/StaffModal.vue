<script setup>
import { reactive, ref, watch } from "vue"
import { api } from "@/lib/api"
import BaseModal from "@/components/BaseModal.vue"

// member : un membre existant à modifier ; absent = ajout d'un nouveau membre
const props = defineProps({ open: Boolean, member: { type: Object, default: null } })
const emit = defineEmits(["close", "saved"])

const blank = () => ({ firstName: "", lastName: "", email: "", phone: "", role: "mecano", password: "" })
const form = reactive(blank())
const error = ref("")
const loading = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, blank(), props.member ? { firstName: props.member.firstName, lastName: props.member.lastName, email: props.member.email, phone: props.member.phone ?? "", role: props.member.role } : {})
    error.value = ""
  },
)

async function submit() {
  error.value = ""
  loading.value = true
  try {
    const { user } = props.member
      ? await api(`/users/staff/${props.member._id}`, { method: "PATCH", body: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone } })
      : await api("/users/staff", { method: "POST", body: { ...form } })
    emit("saved", user)
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
    :title="member ? 'Modifier un membre' : 'Ajouter un membre'"
    :subtitle="member ? 'Son rôle et son mot de passe ne changent pas ici.' : 'Il pourra se connecter avec cet email et ce mot de passe provisoire.'" @close="emit('close')">
    <form id="staff-form" class="space-y-4" @submit.prevent="submit">
      <p v-if="error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>

      <div v-if="!member">
        <p class="text-sm font-medium">Rôle</p>
        <div class="mt-1.5 inline-flex rounded-full bg-ink/[0.07] p-1 text-sm font-semibold">
          <button
            v-for="r in [{ k: 'mecano', l: 'Mécanicien' }, { k: 'admin', l: 'Administrateur' }]"
            :key="r.k"
            type="button"
            class="rounded-full px-4 py-1.5 transition"
            :class="form.role === r.k ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'"
            @click="form.role = r.k"
          >
            {{ r.l }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-medium">
          Prénom
          <input v-model="form.firstName" required autocomplete="off" class="field mt-1.5" />
        </label>
        <label class="block text-sm font-medium">
          Nom
          <input v-model="form.lastName" required autocomplete="off" class="field mt-1.5" />
        </label>
      </div>
      <label class="block text-sm font-medium">
        Email
        <input v-model="form.email" type="email" required autocomplete="off" placeholder="prenom@garage.mg" class="field mt-1.5" />
      </label>
      <label class="block text-sm font-medium">
        Téléphone <span class="font-normal text-ink/45">(facultatif)</span>
        <input v-model="form.phone" type="tel" autocomplete="off" class="field mt-1.5" />
      </label>
      <label v-if="!member" class="block text-sm font-medium">
        Mot de passe provisoire
        <input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" placeholder="8 caractères minimum" class="field mt-1.5" />
      </label>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-4">
        <button type="button" class="text-sm font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-accent" @click="emit('close')">Annuler</button>
        <button form="staff-form" :disabled="loading" class="rounded-xl bg-accent px-6 py-3 font-semibold text-paper transition hover:bg-ink disabled:opacity-60">
          {{ loading ? "Un instant…" : member ? "Enregistrer" : "Ajouter" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
