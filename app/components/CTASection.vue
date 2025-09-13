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
    <form @submit.prevent="subscribe" class="subscribe-form">
      <div class="email-input-group">
        <input
          v-model="subscriptionStore.email"
          @input="subscriptionStore.setEmail($event.target.value)"
          type="email"
          placeholder="Enter your email address"
          class="email-input"
          required
          aria-label="Email address for subscription"
        />
        <button 
          type="submit"
          class="subscribe-btn btn"
          :disabled="!subscriptionStore.email || subscriptionStore.isSubscribing"
          aria-label="Subscribe to updates"
        >
          {{ subscriptionStore.isSubscribing ? 'Subscribing...' : 'Subscribe' }}
        </button>
      </div>
      <p v-if="subscriptionStore.message" class="subscription-message" :class="{ 'success': subscriptionStore.success, 'error': !subscriptionStore.success }">
        {{ subscriptionStore.message }}
      </p>
    </form>
  </section>
</template>

<script setup>
import { useSubscriptionStore } from '@/stores/subscription.js'

// Pinia store
const subscriptionStore = useSubscriptionStore()

// Methods
async function subscribe () {
  await subscriptionStore.subscribe()
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

.subscribe-form {
  max-width: 28rem;
  margin: 0 auto;
}

.email-input-group {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.email-input {
  flex: 1;
  padding: 16px 20px;
  font-size: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.email-input:focus {
  border-color: #0F172A;
}

.email-input::placeholder {
  color: #9ca3af;
}

.subscribe-btn {
  background-color: #0F172A;
  color: #F8FAFC;
  font-weight: 600;
  border-radius: 1rem;
  padding: 16px 32px;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 120px;
}

.subscribe-btn:hover:not(:disabled) {
  background-color: #30343f;
}

.subscribe-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.subscription-message {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.subscription-message.success {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.subscription-message.error {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

@media (max-width: 640px) {
  .email-input-group {
    flex-direction: column;
  }
  
  .subscribe-btn {
    min-width: auto;
  }
}
</style>
