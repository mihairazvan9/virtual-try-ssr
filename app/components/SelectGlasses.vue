<script setup>
import { ref } from 'vue'

// Available glasses models
const glassesModels = [
  { id: 1, name: 'Glasses 1', path: '/glasses1' },
  { id: 2, name: 'Glasses 2', path: '/glasses2' },
  { id: 3, name: 'Glasses 3', path: '/glasses3' },
  { id: 4, name: 'Glasses 4', path: '/glasses4' },
  { id: 5, name: 'Glasses 5', path: '/glasses5' }
]

// Current selected model
const selectedModel = ref(1)

// Function to handle model selection
const selectModel = (modelId) => {
  selectedModel.value = modelId
  // Emit event to parent component or call global function
  if (typeof window !== 'undefined' && window.switchGlassesModel) {
    window.switchGlassesModel(modelId)
  }
}
</script>

<template>
  <div class="select-glasses-wrapper">
    <div 
      v-for="model in glassesModels" 
      :key="model.id"
      class="glasses-bullet"
      :class="{ active: selectedModel === model.id }"
      @click="selectModel(model.id)"
      :title="model.name"
    >
      <img :src="`/imgs/${model.path}.webp`" :alt="model.name"> 
    </div>
  </div>
</template>

<style lang="scss">
  .select-glasses-wrapper {
    position: absolute;
    z-index: 9999;
    bottom: 16px;
    display: flex;

    .glasses-bullet {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:not(:last-child) {
        margin-right: clamp(8px, 2vw, 16px);
      }
      
      &:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      &.active {
        border-color: #007bff;
        background: #e3f2fd;
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
      }

      img {
        width: 100%;
      }
    }
  }
</style>