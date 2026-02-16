import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const currentRole = ref(null)

  const setRole = (role) => {
    currentRole.value = role
  }

  return {
    currentRole,
    setRole,
  }
})
