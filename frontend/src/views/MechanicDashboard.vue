<script setup>
import { computed, onMounted, ref } from "vue"
import { CalendarClock, CircleCheck, Wrench } from "lucide-vue-next"
import { api } from "@/lib/api"
import { formatDay, formatDuration, formatTime } from "@/lib/format"
import { useAuthStore } from "@/stores/auth"
import MechanicTaskCard from "@/components/MechanicTaskCard.vue"

const auth = useAuthStore()

const appointments = ref([])
const loading = ref(true)
const error = ref("")
const notice = ref("")
const tab = ref("today")

async function load() {
  try {
    appointments.value = (await api("/appointments")).appointments
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await load()
  // Rien aujourd'hui : on montre directement la suite
  if (!todayList.value.length && upcomingList.value.length) tab.value = "upcoming"
})

let timer
function flash(message) {
  notice.value = message
  clearTimeout(timer)
  timer = setTimeout(() => (notice.value = ""), 6000)
}

async function onChanged(message) {
  await load()
  flash(message)
}

const asc = (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
const endOfToday = () => new Date().setHours(23, 59, 59, 999)

// À faire aujourd'hui : ce qui est en cours, plus tout ce qui est prévu aujourd'hui ou qui aurait dû être fait
const active = computed(() => appointments.value.filter((a) => ["confirmed", "in_progress"].includes(a.status)).sort(asc))
const todayList = computed(() => active.value.filter((a) => a.status === "in_progress" || new Date(a.scheduledAt) <= endOfToday()))
const upcomingList = computed(() => active.value.filter((a) => a.status === "confirmed" && new Date(a.scheduledAt) > endOfToday()))
const doneList = computed(() => appointments.value.filter((a) => a.status === "done").sort((a, b) => asc(b, a)))

const current = computed(() => active.value.find((a) => a.status === "in_progress"))
const next = computed(() => current.value ?? active.value[0])

const stats = computed(() => [
  { n: todayList.value.length, label: "À faire aujourd'hui", icon: CalendarClock },
  { n: upcomingList.value.length, label: "À venir", icon: Wrench },
  { n: doneList.value.length, label: "Terminées", icon: CircleCheck },
])
const tabs = computed(() => [
  { k: "today", l: "Aujourd'hui", n: todayList.value.length, list: todayList.value },
  { k: "upcoming", l: "À venir", n: upcomingList.value.length, list: upcomingList.value },
  { k: "done", l: "Terminées", n: doneList.value.length, list: doneList.value },
])
const shown = computed(() => tabs.value.find((t) => t.k === tab.value).list)
const empty = { today: "Rien à faire aujourd'hui.", upcoming: "Aucune intervention à venir.", done: "Aucune intervention terminée pour l'instant." }
</script>

<template>
  <div>
    <h1 class="text-4xl font-bold tracking-[-0.03em]">Bonjour {{ auth.user.firstName }}</h1>
    <p class="mt-1 text-ink/65">Vos interventions, du jour et à venir.</p>

    <p v-if="notice" role="status" class="mt-6 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">{{ notice }}</p>
    <p v-if="error" role="alert" class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</p>

    <!-- Résumé -->
    <section class="mt-8 grid gap-4 lg:grid-cols-6">
      <div class="rounded-2xl bg-ink p-7 text-paper lg:col-span-3">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-paper/50">
          <Wrench :size="14" /> {{ current ? "Intervention en cours" : "Prochaine intervention" }}
        </p>

        <div v-if="next" class="mt-4">
          <p class="text-3xl font-bold tracking-tight">{{ formatDay(next.scheduledAt) }} <span class="text-paper/60">à {{ formatTime(next.scheduledAt) }}</span></p>
          <p class="mt-2 text-lg">{{ next.service?.name }}</p>
          <p class="mt-1 text-sm text-paper/65">
            {{ next.vehicle?.model ?? "Véhicule supprimé" }}<template v-if="next.vehicle?.plate"> · {{ next.vehicle.plate }}</template>
            · {{ formatDuration(next.estimatedMinutes) }} · {{ next.customer?.firstName }} {{ next.customer?.lastName }}
          </p>
        </div>
        <div v-else class="mt-4">
          <p class="text-2xl font-bold tracking-tight">Aucune intervention assignée</p>
          <p class="mt-1 text-sm text-paper/65">Les rendez-vous que le garage vous assigne apparaîtront ici.</p>
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

    <!-- Onglets -->
    <div class="mt-10 inline-flex rounded-full bg-ink/[0.07] p-1 text-sm font-semibold">
      <button
        v-for="t in tabs"
        :key="t.k"
        class="rounded-full px-5 py-1.5 transition"
        :class="tab === t.k ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'"
        @click="tab = t.k"
      >
        {{ t.l }} <span class="ml-0.5 text-ink/40">{{ t.n }}</span>
      </button>
    </div>

    <p v-if="loading" class="mt-8 text-ink/50">Chargement…</p>
    <p v-else-if="!shown.length" class="mt-6 rounded-2xl border border-dashed border-ink/25 p-10 text-center text-sm text-ink/60">{{ empty[tab] }}</p>
    <ul v-else class="mt-6 grid gap-4 xl:grid-cols-2">
      <MechanicTaskCard v-for="a in shown" :key="a._id" :appointment="a" @changed="onChanged" />
    </ul>
  </div>
</template>
