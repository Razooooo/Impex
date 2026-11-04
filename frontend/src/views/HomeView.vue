<script setup>
import { ArrowRight } from "lucide-vue-next"
import { useUiStore } from "@/stores/ui"
import { contactInfo, models, services, steps } from "@/data/garage"

const ui = useUiStore()
const whatsappLink = `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite prendre rendez-vous pour mon véhicule.")}`
</script>

<template>
  <!-- HERO -->
  <section class="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
    <div class="grid items-end gap-10 lg:grid-cols-12">
      <div class="lg:col-span-6">
        <h1 class="text-[clamp(2.4rem,4.8vw,4rem)] font-bold leading-[1.02] tracking-[-0.035em]">
          <span class="line"><span style="--delay: 100ms">L'atelier des</span></span>
          <span class="line text-accent"><span style="--delay: 230ms">Land Rover</span></span>
          <span class="line"><span style="--delay: 360ms">à Antananarivo</span></span>
        </h1>
        <p class="fade-in mt-8 max-w-md text-lg leading-relaxed text-ink/75" style="--delay: 650ms">
          IMPEX entretient et répare les Land Rover, les Range Rover et la plupart des véhicules, avec des mécaniciens
          qui connaissent la route et la piste.
        </p>
        <div class="fade-in mt-9 flex flex-wrap items-center gap-6" style="--delay: 800ms">
          <button
            class="group inline-flex items-center gap-3 bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-accent"
            @click="ui.openAuth()"
          >
            Prendre rendez-vous
            <ArrowRight :size="18" class="transition group-hover:translate-x-1" />
          </button>
          <a href="#services" class="font-semibold underline decoration-ink/30 underline-offset-8 hover:decoration-accent">
            Voir les services
          </a>
        </div>
      </div>

      <div class="img-reveal lg:col-span-6">
        <img
          src="/images/hero-range-rover-sport.jpg"
          alt="Range Rover Sport rouge"
          fetchpriority="high"
          class="aspect-[4/3] w-full object-cover"
        />
      </div>
    </div>
  </section>

  <!-- SERVICES -->
  <section id="services" class="scroll-mt-16 border-t border-ink/15 py-24">
    <div class="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-12">
      <div v-reveal class="lg:col-span-4">
        <h2 class="text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">Nos services</h2>
        <p class="mt-4 max-w-xs text-ink/70">
          De l'entretien courant aux grosses réparations, tout se fait dans le même atelier.
        </p>
      </div>

      <ul class="space-y-9 lg:col-span-8">
        <li
          v-for="(s, i) in services"
          :key="s.title"
          v-reveal="i * 60"
          class="border-l-2 border-ink/15 pl-6 transition-colors duration-300 hover:border-accent"
        >
          <h3 class="text-2xl font-semibold tracking-tight">{{ s.title }}</h3>
          <p class="mt-1.5 max-w-xl leading-relaxed text-ink/70">{{ s.description }}</p>
        </li>
      </ul>
    </div>
  </section>

  <!-- MODELES -->
  <section id="modeles" class="scroll-mt-16 bg-[#e6e2da] py-24">
    <div class="mx-auto max-w-6xl px-5">
      <div v-reveal class="mb-12 max-w-xl">
        <h2 class="text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">Tous les modèles</h2>
        <p class="mt-4 text-ink/70">Des classiques aux modèles récents, nous travaillons sur l'ensemble de la gamme Land Rover.</p>
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4">
        <figure v-for="(m, i) in models" :key="m.name" v-reveal="(i % 4) * 80" class="group">
          <div class="overflow-hidden bg-ink/10">
            <img
              :src="m.image"
              :alt="m.name"
              loading="lazy"
              class="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
            />
          </div>
          <figcaption class="mt-3">
            <span class="font-semibold">{{ m.name }}</span>
            <span class="block text-sm text-ink/60">{{ m.description }}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <!-- RENDEZ-VOUS -->
  <section id="rdv" class="mx-auto max-w-6xl scroll-mt-16 px-5 py-24">
    <div class="grid gap-12 lg:grid-cols-12">
      <div v-reveal class="lg:col-span-5">
        <h2 class="text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
          Réservez en ligne, <span class="text-accent">sans appeler</span>
        </h2>
        <div class="mt-8 flex flex-wrap items-center gap-6">
          <button
            class="inline-flex items-center gap-3 bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-accent"
            @click="ui.openAuth()"
          >
            Se connecter
            <ArrowRight :size="18" />
          </button>
          <a
            :href="whatsappLink"
            target="_blank"
            rel="noopener"
            class="font-semibold underline decoration-ink/30 underline-offset-8 hover:decoration-accent"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <ol class="space-y-6 lg:col-span-6 lg:col-start-7">
        <li v-for="(s, i) in steps" :key="s.title" v-reveal="i * 100" class="flex gap-4">
          <span class="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent text-sm font-semibold text-paper">
            {{ i + 1 }}
          </span>
          <div>
            <h3 class="text-lg font-semibold">{{ s.title }}</h3>
            <p class="mt-1 text-ink/70">{{ s.text }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>

  <!-- CONTACT -->
  <footer id="contact" class="bg-ink text-paper">
    <div class="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-12">
      <div class="md:col-span-5">
        <p class="text-3xl font-extrabold tracking-wide">IMPEX</p>
        <p class="mt-2 max-w-xs text-sm text-paper/60">Mécanique automobile et Land Rover à Antananarivo.</p>
      </div>
      <div class="text-sm md:col-span-3">
        <p class="mb-2 text-paper/50">Atelier</p>
        <p>{{ contactInfo.address }}</p>
        <p v-for="h in contactInfo.hours" :key="h" class="mt-1">{{ h }}</p>
      </div>
      <div class="text-sm md:col-span-4">
        <p class="mb-2 text-paper/50">Contact</p>
        <p><a :href="`tel:${contactInfo.phone}`" class="hover:underline">{{ contactInfo.phone }}</a></p>
        <p class="mt-1"><a :href="`mailto:${contactInfo.email}`" class="hover:underline">{{ contactInfo.email }}</a></p>
      </div>
    </div>
    <p class="border-t border-paper/15 px-5 py-5 text-center text-xs text-paper/50">© {{ new Date().getFullYear() }} IMPEX, Antananarivo</p>
  </footer>
</template>
