<script setup>
import { onMounted, ref } from "vue"
import { api } from "@/lib/api"

const appointments = ref([])
const error = ref("")

onMounted(async () => {
  try {
    appointments.value = (await api("/appointments")).appointments
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <h1 class="mb-4 text-2xl font-semibold">Mes rendez-vous</h1>
  <p v-if="error" class="text-red-700">{{ error }}</p>
  <p v-else-if="!appointments.length" class="text-zinc-500">Aucun rendez-vous pour le moment.</p>
  <ul class="space-y-2">
    <li v-for="a in appointments" :key="a._id" class="rounded bg-white p-4 shadow">
      <strong>{{ a.service.name }}</strong> – {{ a.vehicle.model }} –
      {{ new Date(a.scheduledAt).toLocaleString("fr-FR") }} <span class="text-sm text-zinc-500">({{ a.status }})</span>
    </li>
  </ul>
  <!-- TODO : formulaire de prise de rdv (véhicule, service, date) + gestion des véhicules -->
</template>
