<template>
  <section id="features" class="features-section">
    <div class="features-container">
      <FeatureCard
        v-for="feature in features"
        :key="feature.title"
        :title="feature.title"
        :description="feature.description"
        :icon="icon[feature.icon]"
      />
    </div>
  </section>
</template>

<script setup>
import FeatureCard from './FeatureCard.vue'
import { icon } from '../style/icon.js'

// Features data
const features = [
  {
    title: 'Realistic Virtual Fitting',
    description: 'Advanced AI technology ensures glasses adjust in real time to face position, scale, and proportions for the most accurate virtual try-on experience.',
    icon: 'glasses'
  },
  {
    title: 'AI-Powered Face Tracking',
    description: 'Cutting-edge computer vision and machine learning algorithms provide smooth, natural face tracking for seamless virtual eyewear fitting.',
    icon: 'sparkles'
  },
  {
    title: 'E-commerce Integration Ready',
    description: 'Built for seamless integration with Shopify and other e-commerce platforms to boost conversion rates and enhance customer shopping experience.',
    icon: 'shopify'
  }
]
</script>

<style scoped>
.features-section {
  padding: 5rem 1.5rem;
  background-color: #ffffff;
}



.features-container {
  display: grid;
  gap: 1.5rem;
  max-width: 72rem;
  margin: 0 auto;
  
  /* Mobile: Single column */
  grid-template-columns: 1fr;
}

/* Tablet and Desktop: 3 columns */
@media (min-width: 768px) {
  .features-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}

/* Large Desktop: Increase spacing */
@media (min-width: 1024px) {
  .features-section {
    padding: 6rem 2rem;
  }
  
  .features-container {
    gap: 2.5rem;
  }
}
</style>
