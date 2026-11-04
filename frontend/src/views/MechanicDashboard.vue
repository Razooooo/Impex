<script setup>
import { onMounted, ref } from "vue"
import { api } from "@/lib/api"

const tasks = ref([])
const error = ref("")

async function load() {
  try {
    tasks.value = (await api("/appointments")).appointments
  } catch (e) {
    error.value = e.message
  }
}

async function setStatus(task, status) {
  await api(`/appointments/${task._id}/status`, { method: "PATCH", body: { status } })
  await load()
}

onMounted(load)
</script>

<template>
  <h1 class="mb-4 text-2xl font-semibold">Mes tâches</h1>
  <p v-if="error" class="text-red-700">{{ error }}</p>
  <p v-else-if="!tasks.length" class="text-zinc-500">Aucune tâche assignée.</p>
  <ul class="space-y-2">
    <li v-for="t in tasks" :key="t._id" class="flex items-center justify-between rounded bg-white p-4 shadow">
      <span>
        <strong>{{ t.service.name }}</strong> – {{ t.vehicle.model }} ({{ t.vehicle.plate }}) –
        {{ new Date(t.scheduledAt).toLocaleString("fr-FR") }} – ~{{ t.estimatedMinutes }} min
        <span class="text-sm text-zinc-500">[{{ t.status }}]</span>
      </span>
      <span class="space-x-2">
        <button class="rounded bg-amber-500 px-2 py-1 text-white" @click="setStatus(t, 'in_progress')">Démarrer</button>
        <button class="rounded bg-brand px-2 py-1 text-white" @click="setStatus(t, 'done')">Terminer</button>
      </span>
    </li>
  </ul>
</template>
