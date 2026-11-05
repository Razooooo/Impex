<script setup>
import { computed, onMounted, ref } from "vue"
import { CalendarClock, Hourglass, Pencil, Plus, Users, Wrench } from "lucide-vue-next"
import { api } from "@/lib/api"
import { categoryMeta, categoryOrder } from "@/lib/categories"
import { formatDay, formatDayMonth, formatDuration, formatTime, toDateInput } from "@/lib/format"
import { useAuthStore } from "@/stores/auth"
import AdminAppointmentCard from "@/components/AdminAppointmentCard.vue"
import ServiceModal from "@/components/ServiceModal.vue"
import StaffModal from "@/components/StaffModal.vue"

const auth = useAuthStore()

const appointments = ref([])
const staff = ref([])
const services = ref([])
const loading = ref(true)
const error = ref("")
const notice = ref("")

const tab = ref("appointments")
const filter = ref("pending")
const showStaff = ref(false)
const showService = ref(false)
const editingService = ref(null)

const ACTIVE = ["pending", "confirmed", "in_progress"]
const mechanics = computed(() => staff.value.filter((s) => s.role === "mecano"))
const admins = computed(() => staff.value.filter((s) => s.role === "admin"))

async function load() {
  try {
    const [a, s, sv] = await Promise.all([api("/appointments"), api("/users/staff"), api("/services/all")])
    appointments.value = a.appointments
    staff.value = s.staff
    services.value = sv.services
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await load()
  // Si rien n'est en attente, on affiche tout plutôt qu'une liste vide
  if (!pending.value.length) filter.value = "all"
})

let noticeTimer
function flash(message) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ""), 6000)
}

async function onChanged(message) {
  await load()
  flash(message)
}

// ---- Résumé ----
const pending = computed(() => appointments.value.filter((a) => a.status === "pending").sort(byDate(1)))
const inProgress = computed(() => appointments.value.filter((a) => a.status === "in_progress"))
const today = computed(() => {
  const t = toDateInput()
  return appointments.value.filter((a) => ACTIVE.includes(a.status) && toDateInput(new Date(a.scheduledAt)) === t)
})
const stats = computed(() => [
  { n: today.value.length, label: "Interventions aujourd'hui", icon: CalendarClock },
  { n: inProgress.value.length, label: "En cours", icon: Wrench },
  { n: mechanics.value.length, label: "Mécaniciens", icon: Users },
])

// ---- Liste des rendez-vous ----
function byDate(dir) {
  return (a, b) => dir * (new Date(a.scheduledAt) - new Date(b.scheduledAt))
}
const count = (status) => appointments.value.filter((a) => a.status === status).length
const filters = computed(() => [
  { k: "pending", l: "En attente", n: count("pending") },
  { k: "confirmed", l: "Confirmés", n: count("confirmed") },
  { k: "in_progress", l: "En cours", n: count("in_progress") },
  { k: "done", l: "Terminés", n: count("done") },
  { k: "cancelled", l: "Annulés", n: count("cancelled") },
  { k: "all", l: "Tous", n: appointments.value.length },
])
const shown = computed(() => {
  const list = filter.value === "all" ? appointments.value : appointments.value.filter((a) => a.status === filter.value)
  const upcomingFirst = ["pending", "confirmed", "in_progress"].includes(filter.value)
  return [...list].sort(byDate(upcomingFirst ? 1 : -1))
})

function treat() {
  tab.value = "appointments"
  filter.value = "pending"
}

// ---- Équipe ----
function agenda(m) {
  return appointments.value
    .filter((a) => a.assignedMechanic?._id === m._id && ["confirmed", "in_progress"].includes(a.status))
    .sort(byDate(1))
}
const initials = (u) => `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase()

async function onStaffSaved(user) {
  showStaff.value = false
  await load()
  flash(`${user.firstName} ${user.lastName} a été ajouté à l'équipe.`)
}

// ---- Services ----
const zones = computed(() => {
  const groups = {}
  for (const s of services.value) (groups[s.category] ??= []).push(s)
  return categoryOrder.filter((k) => groups[k]).map((k) => ({ key: k, ...categoryMeta[k], items: groups[k] }))
})

function openService(service = null) {
  editingService.value = service
  showService.value = true
}

async function onServiceSaved() {
  const wasEdit = !!editingService.value
  showService.value = false
  await load()
  flash(wasEdit ? "Service mis à jour." : "Service ajouté.")
}

async function toggleService(s) {
  try {
    await api(`/services/${s._id}`, { method: "PATCH", body: { active: !s.active } })
    await load()
    flash(s.active ? `« ${s.name} » n'est plus proposé aux clients.` : `« ${s.name} » est de nouveau proposé aux clients.`)
  } catch (e) {
    error.value = e.message
  }
}

const tabs = computed(() => [
  { k: "appointments", l: "Rendez-vous", n: pending.value.length, alert: pending.value.length > 0 },
  { k: "team", l: "Équipe", n: staff.value.length },
  { k: "services", l: "Services", n: services.value.length },
])
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold tracking-[-0.03em]">Espace garage</h1>
        <p class="mt-1 text-ink/65">Bonjour {{ auth.user.firstName }}, voici l'activité du garage.</p>
      </div>
    </div>

    <p v-if="notice" role="status" class="mt-6 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">{{ notice }}</p>
    <p v-if="error" role="alert" class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</p>

    <!-- Résumé -->
    <section class="mt-8 grid gap-4 lg:grid-cols-6">
      <div class="rounded-2xl bg-ink p-7 text-paper lg:col-span-3">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-paper/50">
          <Hourglass :size="14" /> À traiter
        </p>

        <div v-if="pending.length" class="mt-4">
          <p class="text-3xl font-bold tracking-tight">
            {{ pending.length }} demande{{ pending.length > 1 ? "s" : "" }} <span class="text-paper/60">en attente</span>
          </p>
          <p class="mt-2 text-sm text-paper/65">
            La plus proche : {{ formatDay(pending[0].scheduledAt) }} à {{ formatTime(pending[0].scheduledAt) }}
            · {{ pending[0].service?.name }} · {{ pending[0].customer?.firstName }} {{ pending[0].customer?.lastName }}
          </p>
          <button class="mt-5 rounded-lg bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent hover:text-paper" @click="treat">
            Traiter les demandes
          </button>
        </div>
        <div v-else class="mt-4">
          <p class="text-2xl font-bold tracking-tight">Tout est à jour</p>
          <p class="mt-1 text-sm text-paper/65">Aucune demande en attente. Les nouvelles demandes de vos clients apparaîtront ici.</p>
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
    <div class="mt-10 flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex rounded-full bg-ink/[0.07] p-1 text-sm font-semibold">
        <button
          v-for="t in tabs"
          :key="t.k"
          class="rounded-full px-5 py-1.5 transition"
          :class="tab === t.k ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'"
          @click="tab = t.k"
        >
          {{ t.l }}
          <span class="ml-1 rounded-full px-1.5 text-xs" :class="t.alert ? 'bg-amber-200 text-amber-900' : 'text-ink/40'">{{ t.n }}</span>
        </button>
      </div>

      <button v-if="tab === 'team'" class="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink" @click="showStaff = true">
        <Plus :size="16" /> Ajouter un membre
      </button>
      <button v-if="tab === 'services'" class="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink" @click="openService()">
        <Plus :size="16" /> Ajouter un service
      </button>
    </div>

    <p v-if="loading" class="mt-8 text-ink/50">Chargement…</p>

    <!-- RENDEZ-VOUS -->
    <section v-else-if="tab === 'appointments'" class="mt-6">
      <div class="mb-5 flex flex-wrap gap-2">
        <button
          v-for="f in filters"
          :key="f.k"
          class="rounded-full border px-4 py-1.5 text-sm font-medium transition"
          :class="filter === f.k ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-white/70 text-ink/70 hover:border-ink/40'"
          @click="filter = f.k"
        >
          {{ f.l }} <span :class="filter === f.k ? 'text-paper/60' : 'text-ink/40'">{{ f.n }}</span>
        </button>
      </div>

      <p v-if="!shown.length" class="rounded-2xl border border-dashed border-ink/25 p-10 text-center text-sm text-ink/60">Aucun rendez-vous dans cette catégorie.</p>
      <ul v-else class="grid gap-4 xl:grid-cols-2">
        <AdminAppointmentCard v-for="a in shown" :key="a._id" :appointment="a" :mechanics="mechanics" :all="appointments" @changed="onChanged" />
      </ul>
    </section>

    <!-- EQUIPE -->
    <section v-else-if="tab === 'team'" class="mt-6">
      <p v-if="!mechanics.length" class="rounded-2xl border border-dashed border-ink/25 p-10 text-center text-sm text-ink/60">Aucun mécanicien. Ajoutez-en un pour pouvoir assigner des rendez-vous.</p>

      <ul class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <li v-for="m in mechanics" :key="m._id" class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-4">
            <span class="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-ink text-sm font-bold text-paper">{{ initials(m) }}</span>
            <div class="min-w-0">
              <p class="font-semibold">{{ m.firstName }} {{ m.lastName }}</p>
              <p class="truncate text-sm text-ink/60">{{ m.email }}</p>
              <p v-if="m.phone" class="text-xs text-ink/45">{{ m.phone }}</p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2 text-center">
            <p class="rounded-xl bg-ink/[0.04] py-2"><span class="block text-xl font-bold">{{ agenda(m).filter((a) => a.status === "confirmed").length }}</span><span class="text-xs text-ink/55">à venir</span></p>
            <p class="rounded-xl bg-ink/[0.04] py-2"><span class="block text-xl font-bold">{{ agenda(m).filter((a) => a.status === "in_progress").length }}</span><span class="text-xs text-ink/55">en cours</span></p>
          </div>

          <p class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink/45">Prochaines interventions</p>
          <p v-if="!agenda(m).length" class="text-sm text-ink/50">Disponible, rien d'assigné.</p>
          <ul v-else class="space-y-2">
            <li v-for="a in agenda(m).slice(0, 3)" :key="a._id" class="flex items-start justify-between gap-3 text-sm">
              <span class="min-w-0"><span class="block truncate font-medium">{{ a.service?.name }}</span><span class="text-xs text-ink/55">{{ a.vehicle?.model }}</span></span>
              <span class="flex-none text-right text-xs text-ink/60">{{ formatDayMonth(a.scheduledAt) }}<br />{{ formatTime(a.scheduledAt) }} · {{ formatDuration(a.estimatedMinutes) }}</span>
            </li>
          </ul>
        </li>
      </ul>

      <div v-if="admins.length" class="mt-10">
        <h2 class="mb-3 text-lg font-bold tracking-tight">Administrateurs</h2>
        <ul class="flex flex-wrap gap-3">
          <li v-for="u in admins" :key="u._id" class="flex items-center gap-3 rounded-full border border-ink/10 bg-white py-1.5 pl-1.5 pr-4 text-sm shadow-sm">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-paper">{{ initials(u) }}</span>
            {{ u.firstName }} {{ u.lastName }}
          </li>
        </ul>
      </div>
    </section>

    <!-- SERVICES -->
    <section v-else class="mt-6 space-y-8">
      <div v-for="z in zones" :key="z.key">
        <h2 class="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><component :is="z.icon" :size="17" /></span>
          {{ z.label }}
        </h2>
        <ul class="grid gap-3 lg:grid-cols-2">
          <li v-for="s in z.items" :key="s._id" class="flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm" :class="s.active ? '' : 'opacity-60'">
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2 font-semibold">
                {{ s.name }}
                <span v-if="s.forUnknownProblem" class="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">« Je ne sais pas »</span>
                <span v-if="!s.active" class="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-semibold text-ink/60">Désactivé</span>
              </p>
              <p v-if="s.description" class="mt-0.5 text-sm text-ink/60">{{ s.description }}</p>
            </div>
            <div class="flex flex-none items-center gap-2">
              <span class="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-xs font-medium text-ink/65">{{ formatDuration(s.estimatedMinutes) }}</span>
              <button class="rounded-lg p-2 text-ink/40 transition hover:bg-ink/5 hover:text-ink" aria-label="Modifier ce service" title="Modifier" @click="openService(s)"><Pencil :size="17" /></button>
              <button
                v-if="!s.forUnknownProblem"
                role="switch"
                :aria-checked="s.active"
                :aria-label="s.active ? 'Désactiver ce service' : 'Activer ce service'"
                :title="s.active ? 'Proposé aux clients : cliquer pour désactiver' : 'Masqué aux clients : cliquer pour activer'"
                class="relative h-6 w-11 flex-none rounded-full transition"
                :class="s.active ? 'bg-accent' : 'bg-ink/20'"
                @click="toggleService(s)"
              >
                <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" :class="s.active ? 'left-[1.375rem]' : 'left-0.5'"></span>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <StaffModal :open="showStaff" @close="showStaff = false" @saved="onStaffSaved" />
    <ServiceModal :open="showService" :service="editingService" @close="showService = false" @saved="onServiceSaved" />
  </div>
</template>
