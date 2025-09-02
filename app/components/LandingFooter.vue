<template>
  <footer class="landing-footer">
    © {{ currentYear }} Virtual Try-On Glasses. All rights reserved.
  </footer>
</template>

<script setup>
import { computed } from 'vue'

// Computed
const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.landing-footer {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
</style>

