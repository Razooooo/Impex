// v-reveal : fait apparaître l'élément quand il entre dans l'écran. v-reveal="150" ajoute un délai (ms).
export default {
  mounted(el, { value }) {
    el.classList.add("reveal")
    if (value) el.style.setProperty("--delay", `${value}ms`)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-in")
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
  },
}
