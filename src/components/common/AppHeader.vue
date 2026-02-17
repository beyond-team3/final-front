<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const emit = defineEmits(['toggle-sidebar'])

const roleLabel = computed(() => authStore.currentRole || '미선택')

const logout = () => {
  authStore.setRole(null)
  router.push('/login')
}

const toggleSidebar = () => {
  emit('toggle-sidebar')
}
</script>

<template>
  <header class="h-14 border-b border-slate-200 bg-white px-4">
    <div class="mx-auto flex h-full max-w-screen-2xl items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
          aria-label="사이드바 토글"
          @click="toggleSidebar"
        >
          ☰
        </button>
        <h1 class="text-base font-semibold text-slate-800">MonSoon</h1>
      </div>
      <div class="flex items-center gap-3">
        <span class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {{ roleLabel }}
        </span>
        <button
          type="button"
          class="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          @click="logout"
        >
          로그아웃
        </button>
      </div>
    </div>
  </header>
</template>
