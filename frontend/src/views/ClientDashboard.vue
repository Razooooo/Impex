<script setup>
import { computed, onMounted, ref } from "vue"
import { CalendarClock, Car, CircleCheck, Pencil, Plus, Trash2 } from "lucide-vue-next"
import { api } from "@/lib/api"
import { formatDay, formatDuration, formatTime, statusMeta } from "@/lib/format"
import { modelImages } from "@/data/garage"
import { useAuthStore } from "@/stores/auth"
import { useUiStore } from "@/stores/ui"
import AppointmentModal from "@/components/AppointmentModal.vue"
import VehicleModal from "@/components/VehicleModal.vue"

const auth = useAuthStore()
const ui = useUiStore()

const appointments = ref([])
const vehicles = ref([])
const loading = ref(true)
const error = ref("")
const notice = ref("")

const showAppointment = ref(false)
const showVehicle = ref(false)
const editingVehicle = ref(null)
const newVehicleId = ref("")
const confirmingId = ref(null) // élément en attente de confirmation (annulation / suppression)
const tab = ref("upcoming")

const ACTIVE = ["pending", "confirmed", "in_progress"]
// Étapes affichées sous chaque rendez-vous
const STEPS = [
  { key: "pending", label: "Demandé" },
  { key: "confirmed", label: "Confirmé" },
  { key: "in_progress", label: "En cours" },
  { key: "done", label: "Terminé" },
]

const byDate = (dir) => (a, b) => dir * (new Date(a.scheduledAt) - new Date(b.scheduledAt))
const upcoming = computed(() => appointments.value.filter((a) => ACTIVE.includes(a.status)).sort(byDate(1)))
const history = computed(() => appointments.value.filter((a) => !ACTIVE.includes(a.status)).sort(byDate(-1)))
const doneCount = computed(() => appointments.value.filter((a) => a.status === "done").length)
const next = computed(() => upcoming.value[0])
const shown = computed(() => (tab.value === "upcoming" ? upcoming.value : history.value))

async function load() {
  try {
    const [a, v] = await Promise.all([api("/appointments"), api("/vehicles")])
    appointments.value = a.appointments
    vehicles.value = v.vehicles
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  await load()
  // Arrivée depuis la page d'accueil via « Prendre rendez-vous » : on ouvre directement le formulaire
  if (ui.bookingRequested) {
    ui.bookingRequested = false
    openAppointment()
  }
})

function flash(message) {
  notice.value = message
  setTimeout(() => (notice.value = ""), 6000)
}

function openAppointment(vehicleId = "") {
  newVehicleId.value = vehicleId
  showAppointment.value = true
}

function openVehicle(vehicle = null) {
  editingVehicle.value = vehicle
  showVehicle.value = true
}

async function onAppointmentSaved() {
  showAppointment.value = false
  await load()
  flash("Demande envoyée. Le garage va confirmer votre créneau et vous assigner un mécanicien.")
}

async function onVehicleSaved(vehicle) {
  const wasEdit = !!editingVehicle.value
  showVehicle.value = false
  await load()
  if (wasEdit) flash("Véhicule mis à jour.")
  else {
    newVehicleId.value = vehicle._id // présélectionné si le formulaire de rendez-vous est ouvert
    if (!showAppointment.value) flash("Véhicule ajouté.")
  }
}

async function cancelAppointment(a) {
  if (confirmingId.value !== a._id) {
    confirmingId.value = a._id
    return
  }
  try {
    await api(`/appointments/${a._id}/status`, { method: "PATCH", body: { status: "cancelled" } })
    flash("Rendez-vous annulé.")
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    confirmingId.value = null
  }
}

async function removeVehicle(v) {
  if (confirmingId.value !== v._id) {
    confirmingId.value = v._id
    return
  }
  try {
    await api(`/vehicles/${v._id}`, { method: "DELETE" })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    confirmingId.value = null
  }
}

const dayNumber = (d) => new Date(d).getDate()
const monthShort = (d) => new Date(d).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")
const stepIndex = (status) => STEPS.findIndex((s) => s.key === status)
const km = (n) => `${Number(n).toLocaleString("fr-FR")} km`

const stats = computed(() => [
  { n: upcoming.value.length, label: "Rendez-vous à venir", icon: CalendarClock },
  { n: vehicles.value.length, label: "Véhicules", icon: Car },
  { n: doneCount.value, label: "Interventions terminées", icon: CircleCheck },
])
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold tracking-[-0.03em]">Bonjour {{ auth.user.firstName }}</h1>
        <p class="mt-1 text-ink/65">Retrouvez vos véhicules et vos rendez-vous.</p>
      </div>
      <button class="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-semibold text-paper shadow-sm transition hover:bg-ink" @click="openAppointment()">
        <Plus :size="18" />
        Nouveau rendez-vous
      </button>
    </div>

    <p v-if="notice" role="status" class="mt-6 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">{{ notice }}</p>
    <p v-if="error" role="alert" class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</p>

    <!-- Résumé : prochain rendez-vous + chiffres -->
    <section class="mt-8 grid gap-4 lg:grid-cols-6">
      <div class="rounded-2xl bg-ink p-7 text-paper lg:col-span-3">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-paper/50">
          <CalendarClock :size="14" /> Prochain rendez-vous
        </p>

        <div v-if="next" class="mt-4">
          <p class="text-3xl font-bold tracking-tight">{{ formatDay(next.scheduledAt) }} <span class="text-paper/60">à {{ formatTime(next.scheduledAt) }}</span></p>
          <p class="mt-2 text-lg">{{ next.service?.name }}</p>
          <p class="mt-1 text-sm text-paper/65">
            {{ next.vehicle?.model ?? "Véhicule supprimé" }}<template v-if="next.vehicle?.plate"> · {{ next.vehicle.plate }}</template>
            · Durée estimée {{ formatDuration(next.estimatedMinutes) }}
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span class="rounded-full bg-paper/15 px-3 py-1">{{ statusMeta[next.status].label }}</span>
            <span class="rounded-full bg-paper/15 px-3 py-1">{{ next.assignedMechanic ? `Mécanicien : ${next.assignedMechanic.firstName}` : "Mécanicien à assigner" }}</span>
          </div>
        </div>

        <div v-else class="mt-4">
          <p class="text-2xl font-bold tracking-tight">Rien de prévu pour le moment</p>
          <p class="mt-1 text-sm text-paper/65">Un bruit, un voyant, un entretien à faire ? Réservez un créneau.</p>
          <button class="mt-5 rounded-lg bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent hover:text-paper" @click="openAppointment()">
            Prendre un rendez-vous
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3 lg:col-span-3 lg:gap-4">
        <div v-for="s in stats" :key="s.label" class="flex flex-col justify-between rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent sm:h-11 sm:w-11"><component :is="s.icon" :size="20" /></span>
          <div class="mt-4 sm:mt-6">
            <p class="text-3xl font-bold leading-none tracking-tight sm:text-5xl">{{ s.n }}</p>
            <p class="mt-2 text-xs leading-tight text-ink/60 sm:text-sm">{{ s.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="mt-10 grid gap-10 lg:grid-cols-12">
      <!-- RENDEZ-VOUS -->
      <section class="lg:col-span-8 xl:col-span-7">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-xl font-bold tracking-tight">Mes rendez-vous</h2>
          <div class="inline-flex rounded-full bg-ink/[0.07] p-1 text-sm font-semibold">
            <button
              v-for="t in [{ k: 'upcoming', l: 'À venir', n: upcoming.length }, { k: 'history', l: 'Historique', n: history.length }]"
              :key="t.k"
              class="rounded-full px-4 py-1.5 transition"
              :class="tab === t.k ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'"
              @click="tab = t.k"
            >
              {{ t.l }} <span class="ml-0.5 text-ink/40">{{ t.n }}</span>
            </button>
          </div>
        </div>

        <p v-if="loading" class="text-ink/50">Chargement…</p>
        <p v-else-if="!shown.length" class="rounded-2xl border border-dashed border-ink/25 p-10 text-center text-sm text-ink/60">
          {{ tab === "upcoming" ? "Aucun rendez-vous à venir." : "Votre historique est vide pour le moment." }}
        </p>

        <ul v-else class="space-y-4">
          <li v-for="a in shown" :key="a._id" class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
            <div class="flex gap-5 p-5">
              <div class="w-16 flex-none self-start rounded-xl bg-ink py-3 text-center text-paper" :class="a.status === 'cancelled' ? 'opacity-40' : ''">
                <p class="text-3xl font-bold leading-none">{{ dayNumber(a.scheduledAt) }}</p>
                <p class="mt-1 text-xs uppercase tracking-wide text-paper/65">{{ monthShort(a.scheduledAt) }}</p>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <h3 class="text-lg font-semibold" :class="a.status === 'cancelled' ? 'text-ink/50 line-through' : ''">{{ a.service?.name }}</h3>
                  <span class="rounded-full px-3 py-0.5 text-xs font-semibold" :class="statusMeta[a.status].cls">{{ statusMeta[a.status].label }}</span>
                </div>
                <p class="mt-0.5 text-sm text-ink/65">
                  {{ formatDay(a.scheduledAt) }} à {{ formatTime(a.scheduledAt) }}
                  · {{ a.vehicle?.model ?? "Véhicule supprimé" }}<template v-if="a.vehicle?.plate"> ({{ a.vehicle.plate }})</template>
                </p>
                <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55">
                  <span>Durée estimée : {{ formatDuration(a.estimatedMinutes) }}</span>
                  <span>{{ a.assignedMechanic ? `Mécanicien : ${a.assignedMechanic.firstName} ${a.assignedMechanic.lastName}` : "Mécanicien à assigner" }}</span>
                </p>
                <p v-if="a.customerNotes" class="mt-3 rounded-lg bg-ink/[0.04] px-3 py-2 text-sm italic text-ink/65">« {{ a.customerNotes }} »</p>
                <p v-if="a.mechanicNotes" class="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-ink/80"><span class="font-semibold">Note du garage :</span> {{ a.mechanicNotes }}</p>
              </div>
            </div>

            <!-- Progression -->
            <div v-if="a.status !== 'cancelled'" class="flex items-end justify-between gap-6 border-t border-ink/10 bg-ink/[0.02] px-5 py-3">
              <ol class="grid flex-1 grid-cols-4 gap-1.5">
                <li v-for="(s, i) in STEPS" :key="s.key">
                  <span class="block h-1.5 rounded-full" :class="i <= stepIndex(a.status) ? 'bg-accent' : 'bg-ink/10'"></span>
                  <span class="mt-1.5 block text-[11px]" :class="i === stepIndex(a.status) ? 'font-semibold text-ink' : 'text-ink/40'">{{ s.label }}</span>
                </li>
              </ol>
              <button
                v-if="a.status === 'pending' || a.status === 'confirmed'"
                class="flex-none rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                :class="confirmingId === a._id ? 'bg-red-100 text-red-800' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'"
                @click="cancelAppointment(a)"
                @blur="confirmingId = null"
              >
                {{ confirmingId === a._id ? "Confirmer l'annulation" : "Annuler" }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- VEHICULES -->
      <aside class="lg:col-span-4 xl:col-span-5">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-xl font-bold tracking-tight">Mes véhicules <span class="text-sm font-medium text-ink/45">{{ vehicles.length }}</span></h2>
          <button class="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-paper" @click="openVehicle()">
            <Plus :size="16" /> Ajouter
          </button>
        </div>

        <p v-if="!loading && !vehicles.length" class="rounded-2xl border border-dashed border-ink/25 p-8 text-center text-sm text-ink/60">
          Ajoutez votre premier véhicule pour pouvoir réserver.
        </p>

        <ul class="grid gap-4 xl:grid-cols-2">
          <li v-for="v in vehicles" :key="v._id" class="group overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition hover:shadow-md">
            <div class="aspect-[16/9] overflow-hidden bg-ink/10">
              <img v-if="modelImages[v.model]" :src="modelImages[v.model]" :alt="v.model" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div v-else class="grid h-full place-items-center text-sm font-bold uppercase tracking-[0.2em] text-ink/30">Land Rover</div>
            </div>
            <div class="p-4">
              <p class="font-semibold">{{ v.model }}</p>
              <p class="mt-0.5 text-sm text-ink/60">
                {{ [v.year, v.plate, v.engine].filter(Boolean).join(" · ") || "Informations à compléter" }}
              </p>
              <p v-if="v.mileage != null" class="mt-1 text-xs text-ink/45">{{ km(v.mileage) }}</p>

              <div class="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
                <button class="text-sm font-semibold text-accent underline-offset-4 hover:underline" @click="openAppointment(v._id)">
                  Prendre rendez-vous
                </button>
                <div class="flex items-center gap-0.5">
                  <button class="rounded-lg p-2 text-ink/40 transition hover:bg-ink/5 hover:text-ink" aria-label="Modifier ce véhicule" title="Modifier" @click="openVehicle(v)">
                    <Pencil :size="17" />
                  </button>
                  <button
                    class="rounded-lg p-2 transition"
                    :class="confirmingId === v._id ? 'bg-red-100 text-red-800' : 'text-ink/40 hover:bg-ink/5 hover:text-ink'"
                    :aria-label="confirmingId === v._id ? 'Confirmer la suppression' : 'Supprimer ce véhicule'"
                    :title="confirmingId === v._id ? 'Cliquez à nouveau pour supprimer' : 'Supprimer'"
                    @click="removeVehicle(v)"
                    @blur="confirmingId = null"
                  >
                    <Trash2 :size="17" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </aside>
    </div>

    <AppointmentModal
      :open="showAppointment"
      :vehicles="vehicles"
      :preselect-vehicle="newVehicleId"
      @close="showAppointment = false"
      @saved="onAppointmentSaved"
      @add-vehicle="openVehicle()"
    />
    <VehicleModal :open="showVehicle" :vehicle="editingVehicle" @close="showVehicle = false" @saved="onVehicleSaved" />
  </div>
</template>
