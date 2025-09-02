<template>
  <div class="feature-card">
    <div class="feature-card-content">
      <div class="feature-icon">
        <i v-html="icon" />
      </div>
      <h3 class="feature-title">{{ title }}</h3>
      <p class="feature-description">
        {{ description }}
      </p>
    </div>
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  }
})

</script>

<style scoped>
.feature-card {
  background-color: #ffffff;
  border-radius: 1rem;
  border: 1px solid hsl(214.3 31.8% 91.4%);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.feature-card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
}

.feature-icon i, svg, path {
  width: 3rem;
  height: 3rem;
  color: #2563eb;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-title {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #111827;
}

.feature-description {
  color: #4b5563;
  line-height: 1.5;
  font-size: 0.95rem;
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .feature-card-content {
    padding: 1.25rem;
  }
  
  .feature-title {
    font-size: 1.125rem;
  }
  
  .feature-description {
    font-size: 0.9rem;
  }
}
</style>
