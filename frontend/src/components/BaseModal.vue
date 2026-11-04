<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { X } from "lucide-vue-next"
import { modalStack as stack } from "@/lib/modalStack"

const props = defineProps({
  open: Boolean,
  title: String,
  subtitle: String,
  wide: Boolean,
})
const emit = defineEmits(["close"])

const id = Symbol()
const panel = ref(null)

watch(
  () => props.open,
  async (open) => {
    if (open) {
      stack.push(id)
      await nextTick()
      panel.value?.querySelector("input, select, textarea")?.focus()
    } else {
      const i = stack.indexOf(id)
      if (i !== -1) stack.splice(i, 1)
    }
  },
  { immediate: true },
)

const onKey = (e) => {
  if (e.key === "Escape" && props.open && stack[stack.length - 1] === id) emit("close")
}
onMounted(() => window.addEventListener("keydown", onKey))
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey)
  const i = stack.indexOf(id)
  if (i !== -1) stack.splice(i, 1)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" :duration="350">
      <div v-if="open" class="fixed inset-0 z-[100]">
        <!-- fixed : le fond reste en place même quand le contenu de la fenêtre défile -->
        <div class="modal-backdrop fixed inset-0" @click="emit('close')"></div>

        <div class="relative flex h-full items-center justify-center p-4">
          <!-- Hauteur limitée à l'écran : le titre et le pied restent visibles, seul le contenu défile -->
          <div
            ref="panel"
            role="dialog"
            aria-modal="true"
            :aria-label="title"
            class="modal-panel relative flex max-h-full w-full flex-col rounded-2xl bg-paper shadow-2xl"
            :class="wide ? 'max-w-2xl' : 'max-w-xl'"
          >
            <button
              class="absolute right-4 top-4 z-10 p-1.5 text-ink/50 transition hover:text-ink"
              aria-label="Fermer"
              @click="emit('close')"
            >
              <X :size="22" />
            </button>

            <header class="flex-none px-6 pt-6 sm:px-9 sm:pt-8">
              <h2 class="pr-8 text-2xl font-bold tracking-tight">{{ title }}</h2>
              <p v-if="subtitle" class="mt-1.5 text-sm text-ink/60">{{ subtitle }}</p>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-9" :class="$slots.footer ? '' : 'pb-7 sm:pb-9'">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="flex-none border-t border-ink/10 px-6 py-4 sm:px-9">
              <slot name="footer" />
            </footer>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
