<template>
  <div class="landing-page">
    <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <!-- Hero Section -->
      <HeroSection @request-demo="requestDemo" />

      <!-- Features -->
      <FeaturesSection />

      <!-- Demo Section -->
      <DemoSection />

      <!-- CTA -->
      <CTASection @contact-us="contactUs" />

      <!-- Footer -->
      <LandingFooter />
    </div>
  </div>
</template>

<script setup>
// Components will be auto-imported by Nuxt
import { computed } from 'vue'
// import HeroSection from './components/landing/HeroSection.vue'
// import FeaturesSection from './components/landing/FeaturesSection.vue'
// import DemoSection from './components/landing/DemoSection.vue'
// import CTASection from './components/landing/CTASection.vue'
// import LandingFooter from './components/landing/LandingFooter.vue'

// Computed
const currentYear = computed(() => new Date().getFullYear())

// Methods
const requestDemo = () => {
  // TODO: Implement demo request functionality
  console.log('Request Demo clicked')
  // You can add your demo request logic here
  // For example, open a modal, navigate to a form, etc.
}

const contactUs = () => {
  // TODO: Implement contact functionality
  console.log('Contact Us clicked')
  // You can add your contact logic here
  // For example, open a contact form, navigate to contact page, etc.
}
</script>

<style lang="scss">

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;

  scroll-behavior: smooth;
}
/* Custom styles for the component */
.bg-gradient-to-b {
  background: linear-gradient(to bottom, #f9fafb, #ffffff);
}

.landing-page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Hero Section Styles */
.hero-title {
  font-size: 3.75rem; /* text-6xl */
  line-height: 1;
  font-weight: 800; /* font-extrabold */
  margin-bottom: 1.5rem; /* mb-6 */
  color: #111827; /* text-gray-900 */
}

.hero-title-accent {
  color: #2563eb; /* text-blue-600 */
}

.hero-description {
  font-size: 1.25rem; /* text-xl */
  line-height: 1.75rem;
  color: #4b5563; /* text-gray-600 */
  margin-bottom: 2rem; /* mb-8 */
}

/* Button Styles - Matching your design exactly */
.btn {
  color: #F8FAFC; /* text-white */
  font-weight: 600; /* font-semibold */
  border-radius: 1rem; /* rounded-2xl */
  padding: 16px 32px; 
  font-size: 1.125rem; /* text-lg */
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: inline-block;
  text-decoration: none;
  line-height: 1;
}

.try-on-btn,
.request-demo-btn,
.contact-us-btn {
  background-color: #0F172A;

}

.try-off-btn {
  background-color: #9e2121;
}

.request-demo-btn:hover,
.contact-us-btn:hover {
  background-color: #30343f; 
}

/* CTA Section Styles */
.cta-title {
  font-size: 2.25rem; /* text-4xl */
  line-height: 2.5rem;
  font-weight: 700; /* font-bold */
  margin-bottom: 1.5rem; /* mb-6 */
  color: #111827; /* text-gray-900 */
}

.cta-description {
  font-size: 1.125rem; /* text-lg */
  line-height: 1.75rem;
  color: #4b5563; /* text-gray-600 */
  margin-bottom: 2rem; /* mb-8 */
  max-width: 42rem; /* max-w-2xl */
  margin-left: auto;
  margin-right: auto;
}

/* Demo Section Styles */
.demo-title {
  font-size: 2.25rem; /* text-4xl */
  line-height: 2.5rem;
  font-weight: 700; /* font-bold */
  margin-bottom: 1.5rem; /* mb-6 */
  color: #111827; /* text-gray-900 */
}

.demo-description {
  font-size: 1.125rem; /* text-lg */
  line-height: 1.75rem;
  color: #4b5563; /* text-gray-600 */
  margin-bottom: 2rem; /* mb-8 */
  max-width: 42rem; /* max-w-2xl */
  margin-left: auto;
  margin-right: auto;
}

/* Feature Card Styles */
.feature-title {
  font-size: 1.25rem; /* text-xl */
  line-height: 1.75rem;
  font-weight: 600; /* font-semibold */
  margin-bottom: 0.5rem; /* mb-2 */
  color: #111827; /* text-gray-900 */
}

.feature-description {
  color: #4b5563; /* text-gray-600 */
  line-height: 1.5;
}

/* Additional spacing utilities */
.mb-6 {
  margin-bottom: 1.5rem;
}

.mb-8 {
  margin-bottom: 2rem;
}

.max-w-2xl {
  max-width: 42rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.25rem; /* text-4xl on mobile */
  }
  
  .cta-title,
  .demo-title {
    font-size: 1.875rem; /* text-3xl on mobile */
  }
}
</style>
