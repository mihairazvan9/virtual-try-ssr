<template>
  <section class="cta-section">
    <h2 class="cta-title">
      Ready to Transform Your Eyewear E-commerce Experience?
    </h2>
    <p class="cta-description">
      Be among the first to integrate our revolutionary AI-powered virtual try-on system 
      into your online eyewear store. Boost customer confidence, reduce returns, and 
      increase conversion rates with cutting-edge AR technology.
    </p>
    <button 
      @click="contactUs"
      class="contact-us-btn btn"
      aria-label="Contact us to integrate virtual try-on technology"
    >
      Get Started Today
    </button>
  </section>
</template>

<script setup>
// Props
const props = defineProps({
  onContactUs: {
    type: Function,
    default: () => {}
  }
})

// Methods
const contactUs = () => {
  props.onContactUs()
}
</script>

<style scoped>
.cta-section {
  padding-top: 5rem;
  padding-bottom: 5rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  text-align: center;
}

.cta-title {
  font-size: 2.25rem;
  line-height: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #111827;
}

.cta-description {
  font-size: 1.125rem;
  line-height: 1.75rem;
  color: #4b5563;
  margin-bottom: 2rem;
  max-width: 42rem;
  margin-left: auto;
  margin-right: auto;
}

.contact-us-btn {
  background-color: #0F172A;
  color: #F8FAFC;
  font-weight: 600;
  border-radius: 1rem;
  padding: 16px 32px;
  font-size: 1.125rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: inline-block;
  text-decoration: none;
  line-height: 1;
}

.contact-us-btn:hover {
  background-color: #30343f;
}
</style>
