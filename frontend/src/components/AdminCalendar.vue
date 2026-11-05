<script setup>
import { computed, ref } from "vue"
import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-vue-next"
import { addDays, capitalize, dowOf, labelDay, mondayOf } from "@/lib/dates"
import { formatTime, garageMinutes, toDateInput } from "@/lib/format"

const props = defineProps({
  appointments: { type: Array, default: () => [] },
  mechanics: { type: Array, default: () => [] },
  timeOffs: { type: Array, default: () => [] },
  config: { type: Object, default: null }, // { openingHours } : horaires renvoyés par l'API
})
const emit = defineEmits(["open", "add-timeoff"])

const PX = 1.2 // pixels par minute : une heure = 72 px
const COL_MIN = 140 // largeur minimale d'une colonne, en pixels

const mode = ref("day")
const date = ref(toDateInput())
const today = toDateInput()

// ---- Horaires ----
const openingHours = computed(() => props.config?.openingHours ?? {})
const openingOf = (d) => openingHours.value[dowOf(d)] // [ouverture, fermeture] en heures, ou undefined (fermé)
const hourRanges = computed(() => Object.values(openingHours.value))
const gridStart = computed(() => (hourRanges.value.length ? Math.floor(Math.min(...hourRanges.value.map((h) => h[0]))) * 60 : 480))
const gridEnd = computed(() => (hourRanges.value.length ? Math.ceil(Math.max(...hourRanges.value.map((h) => h[1]))) * 60 : 1080))
const gridHeight = computed(() => (gridEnd.value - gridStart.value) * PX)
const hourTicks = computed(() => {
  const ticks = []
  // pas de trait à la dernière heure : il déborderait de la grille et créerait un défilement interne
  for (let m = gridStart.value; m < gridEnd.value; m += 60) ticks.push(m)
  return ticks
})
const y = (minutes) => (minutes - gridStart.value) * PX

// ---- Fermetures et absences ----
const offOn = (d) => props.timeOffs.filter((t) => t.startDate <= d && t.endDate >= d)
const closureOn = (d) => offOn(d).find((t) => t.scope === "garage")
const absenceOf = (d, mechanicId) => offOn(d).find((t) => t.scope === "mechanic" && t.mechanic?._id === mechanicId)

// ---- Rendez-vous d'un jour, placés côte à côte quand ils se chevauchent ----
const eventsOn = (d) => props.appointments.filter((a) => a.status !== "cancelled" && toDateInput(a.scheduledAt) === d)

function layout(appointments) {
  const items = appointments
    .map((a) => {
      const start = garageMinutes(a.scheduledAt)
      return { a, start, end: start + (a.estimatedMinutes || 60) }
    })
    .sort((p, q) => p.start - q.start || q.end - p.end)

  const placed = []
  let cluster = []
  let lanesEnd = []
  let clusterEnd = -1
  const flush = () => {
    cluster.forEach((it) => (it.lanes = lanesEnd.length))
    placed.push(...cluster)
    cluster = []
    lanesEnd = []
    clusterEnd = -1
  }
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) flush()
    let lane = lanesEnd.findIndex((end) => end <= it.start)
    if (lane === -1) {
      lane = lanesEnd.length
      lanesEnd.push(it.end)
    } else lanesEnd[lane] = it.end
    it.lane = lane
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.end)
  }
  flush()
  return placed
}

// ---- Colonnes ----
function makeColumn(base) {
  const hours = openingOf(base.date)
  const closure = closureOn(base.date)
  return {
    ...base,
    closure,
    closed: !hours || !!closure,
    // zones hors horaires d'ouverture, grisées
    before: hours ? y(hours[0] * 60) : 0,
    after: hours ? y(hours[1] * 60) : 0,
    items: layout(base.events),
    isToday: base.date === today,
  }
}

const weekDays = computed(() => {
  const monday = mondayOf(date.value)
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i)).filter((d) => openingOf(d))
})

const columns = computed(() => {
  if (mode.value === "day") {
    const d = date.value
    const events = eventsOn(d)
    return [
      ...props.mechanics.map((m) =>
        makeColumn({
          key: m._id,
          date: d,
          title: `${m.firstName} ${m.lastName}`,
          events: events.filter((a) => a.assignedMechanic?._id === m._id),
          absence: absenceOf(d, m._id),
        }),
      ),
      makeColumn({ key: "unassigned", date: d, title: "À assigner", events: events.filter((a) => !a.assignedMechanic), unassigned: true }),
    ]
  }
  return weekDays.value.map((d) =>
    makeColumn({
      key: d,
      date: d,
      title: capitalize(labelDay(d, { weekday: "short" }).replace(".", "")),
      subtitle: labelDay(d, { day: "numeric", month: "short" }),
      events: eventsOn(d),
      absences: offOn(d).filter((t) => t.scope === "mechanic"),
    }),
  )
})

const template = computed(() => `3.5rem repeat(${columns.value.length}, minmax(${COL_MIN}px, 1fr))`)
const minWidth = computed(() => `${56 + columns.value.length * COL_MIN}px`)

// ---- Navigation ----
function move(direction) {
  date.value = addDays(date.value, direction * (mode.value === "day" ? 1 : 7))
}
const goToday = () => (date.value = today)
const setDate = (value) => value && (date.value = value)

const title = computed(() => {
  if (mode.value === "day") return capitalize(labelDay(date.value, { weekday: "long", day: "numeric", month: "long" }))
  const days = weekDays.value
  if (!days.length) return ""
  return `Semaine du ${labelDay(days[0], { day: "numeric" })} au ${labelDay(days.at(-1), { day: "numeric", month: "long" })}`
})

const dayClosure = computed(() => (mode.value === "day" ? columns.value[0] : null))

// ---- Rendu d'un rendez-vous ----
const tone = {
  pending: "border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200",
  confirmed: "border-accent bg-accent/15 text-ink hover:bg-accent/25",
  in_progress: "border-ink bg-ink text-paper hover:bg-ink/90",
  done: "border-ink/25 bg-ink/5 text-ink/60 hover:bg-ink/10",
}
const eventStyle = (it) => ({
  top: `${y(it.start)}px`,
  height: `${Math.max((it.end - it.start) * PX - 2, 26)}px`,
  left: `calc(${(it.lane * 100) / it.lanes}% + 2px)`,
  width: `calc(${100 / it.lanes}% - 4px)`,
})
const nowLine = () => {
  const m = garageMinutes(new Date())
  return m >= gridStart.value && m <= gridEnd.value ? y(m) : null
}
const hh = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}h`
const initials = (m) => (m ? `${m.firstName[0]}${m.lastName?.[0] ?? ""}` : "")
</script>

<template>
  <div>
    <!-- Barre d'outils -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="inline-flex rounded-full bg-ink/[0.07] p-1 text-sm font-semibold">
          <button
            v-for="m in [{ k: 'day', l: 'Jour' }, { k: 'week', l: 'Semaine' }]"
            :key="m.k"
            class="rounded-full px-4 py-1.5 transition"
            :class="mode === m.k ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'"
            @click="mode = m.k"
          >
            {{ m.l }}
          </button>
        </div>

        <div class="flex items-center gap-1">
          <button class="rounded-lg p-2 text-ink/60 transition hover:bg-ink/5 hover:text-ink" aria-label="Précédent" @click="move(-1)"><ChevronLeft :size="20" /></button>
          <button class="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink" @click="goToday">Aujourd'hui</button>
          <button class="rounded-lg p-2 text-ink/60 transition hover:bg-ink/5 hover:text-ink" aria-label="Suivant" @click="move(1)"><ChevronRight :size="20" /></button>
        </div>

        <h2 class="text-lg font-bold tracking-tight">{{ title }}</h2>
        <input :value="date" type="date" class="field py-1.5 text-sm" style="width: 9.5rem" aria-label="Aller à une date" @change="setDate($event.target.value)" />
      </div>

      <button class="inline-flex items-center gap-2 rounded-xl border border-ink/20 bg-white px-4 py-2 text-sm font-semibold transition hover:border-ink hover:bg-ink hover:text-paper" @click="emit('add-timeoff', date)">
        <CalendarOff :size="16" /> Absence ou fermeture
      </button>
    </div>

    <p v-if="dayClosure?.closed" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900">
      {{ dayClosure.closure ? `Garage fermé ce jour-là${dayClosure.closure.reason ? ` : ${dayClosure.closure.reason}` : ""}.` : "Le garage est fermé ce jour-là." }}
    </p>

    <!-- Légende -->
    <ul class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/60">
      <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-amber-400 bg-amber-100"></span> En attente</li>
      <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-accent bg-accent/15"></span> Confirmé</li>
      <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-ink bg-ink"></span> En cours</li>
      <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-ink/25 bg-ink/5"></span> Terminé</li>
    </ul>

    <!-- Grille -->
    <div class="mt-3 overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div :style="{ minWidth }">
        <div class="grid border-b border-ink/10 bg-ink/[0.02]" :style="{ gridTemplateColumns: template }">
          <div></div>
          <div v-for="c in columns" :key="c.key" class="border-l border-ink/10 px-2 py-2.5 text-center" :class="c.isToday && mode === 'week' ? 'bg-accent/10' : ''">
            <p class="text-sm font-semibold" :class="c.unassigned ? 'text-amber-800' : ''">{{ c.title }}</p>
            <p v-if="c.subtitle" class="text-xs text-ink/55">{{ c.subtitle }}</p>
            <p v-if="c.absence" class="mx-auto mt-1 w-fit rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">Absent{{ c.absence.reason ? ` · ${c.absence.reason}` : "" }}</p>
            <p v-if="c.closure" class="mx-auto mt-1 w-fit rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">Fermé{{ c.closure.reason ? ` · ${c.closure.reason}` : "" }}</p>
            <p v-for="a in c.absences ?? []" :key="a._id" class="mx-auto mt-1 w-fit max-w-full truncate rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800" :title="a.reason">
              {{ a.mechanic?.firstName }} absent
            </p>
          </div>
        </div>

        <div class="grid" :style="{ gridTemplateColumns: template }">
          <!-- Heures -->
          <div class="relative" :style="{ height: `${gridHeight}px` }">
            <span v-for="t in hourTicks" :key="t" class="absolute right-2 -translate-y-1/2 text-[11px] text-ink/40" :style="{ top: `${y(t)}px` }">{{ hh(t) }}</span>
          </div>

          <div v-for="c in columns" :key="c.key" class="relative border-l border-ink/10" :style="{ height: `${gridHeight}px` }">
            <span v-for="t in hourTicks" :key="t" class="absolute inset-x-0 border-t border-ink/10" :style="{ top: `${y(t)}px` }"></span>

            <!-- Hors horaires d'ouverture -->
            <template v-if="!c.closed">
              <span class="absolute inset-x-0 top-0 bg-ink/[0.05]" :style="{ height: `${c.before}px` }"></span>
              <span class="absolute inset-x-0 bottom-0 bg-ink/[0.05]" :style="{ top: `${c.after}px` }"></span>
            </template>
            <!-- Fermé ou absent : hachuré -->
            <span
              v-if="c.closed || c.absence"
              class="pointer-events-none absolute inset-0"
              style="background: repeating-linear-gradient(135deg, rgb(20 19 15 / 0.07) 0 8px, transparent 8px 16px)"
            ></span>

            <!-- Maintenant -->
            <span v-if="c.isToday && nowLine() !== null" class="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" :style="{ top: `${nowLine()}px` }">
              <span class="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500"></span>
            </span>

            <button
              v-for="it in c.items"
              :key="it.a._id"
              class="absolute overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight transition"
              :class="tone[it.a.status]"
              :style="eventStyle(it)"
              :title="`${formatTime(it.a.scheduledAt)} · ${it.a.service?.name} · ${it.a.customer?.firstName} ${it.a.customer?.lastName} · ${it.a.vehicle?.model ?? ''}`"
              @click="emit('open', it.a)"
            >
              <span class="block truncate font-semibold">{{ formatTime(it.a.scheduledAt) }} {{ it.a.service?.name }}</span>
              <span class="block truncate opacity-80">{{ it.a.customer?.firstName }} {{ it.a.customer?.lastName }}</span>
              <span class="block truncate opacity-70">
                {{ it.a.vehicle?.model }}<template v-if="mode === 'week'"> · {{ it.a.assignedMechanic ? initials(it.a.assignedMechanic) : "à assigner" }}</template>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
