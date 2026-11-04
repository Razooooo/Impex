<script setup>
import { onMounted, ref } from "vue"
import { api } from "@/lib/api"

const appointments = ref([])
const mechanics = ref([])
const error = ref("")

async function load() {
  try {
    ;[appointments.value, mechanics.value] = await Promise.all([
      api("/appointments").then((r) => r.appointments),
      api("/users/mechanics").then((r) => r.mechanics),
    ])
  } catch (e) {
    error.value = e.message
  }
}

async function assign(appointment, mechanicId) {
  await api(`/appointments/${appointment._id}/assign`, {
    method: "PATCH",
    body: { mechanicId, estimatedMinutes: appointment.estimatedMinutes },
  })
  await load()
}

onMounted(load)
</script>

<template>
  <h1 class="mb-4 text-2xl font-semibold">Planning du garage</h1>
  <p v-if="error" class="text-red-700">{{ error }}</p>
  <table class="w-full overflow-hidden rounded bg-white text-left text-sm shadow">
    <thead class="bg-zinc-100">
      <tr>
        <th class="p-2">Date</th>
        <th class="p-2">Client</th>
        <th class="p-2">Véhicule</th>
        <th class="p-2">Service</th>
        <th class="p-2">Durée est. (min)</th>
        <th class="p-2">Mécano</th>
        <th class="p-2">Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="a in appointments" :key="a._id" class="border-t">
        <td class="p-2">{{ new Date(a.scheduledAt).toLocaleString("fr-FR") }}</td>
        <td class="p-2">{{ a.customer.firstName }} {{ a.customer.lastName }}</td>
        <td class="p-2">{{ a.vehicle.model }}</td>
        <td class="p-2">{{ a.service.name }}</td>
        <td class="p-2"><input v-model.number="a.estimatedMinutes" type="number" min="5" class="w-20 rounded border p-1" /></td>
        <td class="p-2">
          <select
            :value="a.assignedMechanic?._id || ''"
            class="rounded border p-1"
            @change="assign(a, $event.target.value)"
          >
            <option value="" disabled>Assigner…</option>
            <option v-for="m in mechanics" :key="m._id" :value="m._id">{{ m.firstName }} {{ m.lastName }}</option>
          </select>
        </td>
        <td class="p-2">{{ a.status }}</td>
      </tr>
    </tbody>
  </table>
</template>
