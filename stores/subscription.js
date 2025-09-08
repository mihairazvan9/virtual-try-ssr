import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSubscriptionStore = defineStore('subscription', () => {
  const config = useRuntimeConfig()
  const api_url = config.public.apiUrl
  // State
  const email = ref('')
  const isSubscribing = ref(false)
  const message = ref('')
  const success = ref(false)

  // Actions
  const setEmail = (newEmail) => {
    email.value = newEmail
  }

  const subscribe = async () => {
    if (!email.value) return

    isSubscribing.value = true
    message.value = ''

    try {
      const response = await $fetch(`${api_url}/subscribe`, {
        method: 'POST',
        body: {
          email: email.value
        }
      })

      if (response.success) {
        message.value = 'Thank you for subscribing!'
        success.value = true
        email.value = '' // Clear email after success
      } else {
        message.value = 'Subscription failed. Please try again.'
        success.value = false
      }
    } catch (error) {
      console.error('Subscription error:', error)
      message.value = 'Sorry, there was an error subscribing. Please try again.'
      success.value = false
    } finally {
      isSubscribing.value = false
    }
  }

  return {
    // State
    email,
    isSubscribing,
    message,
    success,
    // Actions
    setEmail,
    subscribe
  }
})
