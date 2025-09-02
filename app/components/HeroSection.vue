<template>
  <section class="relative flex flex-col items-center justify-center text-center px-6 py-20" role="banner">
    <div
      ref="heroRef"
      class="max-w-3xl"
    >
        <h1 class="hero-title">
          Try On Glasses <span class="hero-title-accent">Virtually</span>
        </h1>
        <p class="hero-description">
          Our revolutionary AI-powered virtual try-on technology lets customers try on eyewear instantly
          using their camera. Experience a seamless, realistic, and engaging way to shop for
          glasses online with advanced face tracking and AR technology.
        </p>
        <a href="#demo-section" aria-label="Try our virtual try-on demo">
          <button 
            @click="requestDemo"
            class="request-demo-btn btn"
            type="button"
          >
            Try Virtual Try-On
          </button>
        </a>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Props
const props = defineProps({
  onRequestDemo: {
    type: Function,
    default: () => {}
  }
})

// Refs
const heroRef = ref(null)

// Methods
const requestDemo = () => {
  props.onRequestDemo()
}

// Lifecycle
onMounted(() => {
  // Add entrance animation for hero section
  if (heroRef.value) {
    heroRef.value.style.opacity = '0'
    heroRef.value.style.transform = 'translateY(20px)'
    
    setTimeout(() => {
      heroRef.value.style.transition = 'opacity 0.8s ease, transform 0.8s ease'
      heroRef.value.style.opacity = '1'
      heroRef.value.style.transform = 'translateY(0)'
    }, 100)
  }
})
</script>

<style scoped>
/* Flexbox utilities */
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.text-center {
  text-align: center;
}

/* Spacing utilities */
.px-6 {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.py-20 {
  padding-top: 5rem;
  padding-bottom: 5rem;
}

.max-w-3xl {
  max-width: 48rem;
}
</style>
