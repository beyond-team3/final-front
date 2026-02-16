<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  activeScreen: {
    type: String,
    default: 'sales_history',
  },
})

const emit = defineEmits(['navigate'])

const isSidebarOpen = ref(true)

const navItems = [
  { key: 'client_management', label: '거래처 관리' },
  { key: 'sales_history', label: '영업 히스토리' },
]

const mainClass = computed(() => (isSidebarOpen.value ? 'left-64' : 'left-0'))

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const onNavigate = (screen) => {
  emit('navigate', screen)
}
</script>

<template>
  <div class="h-full overflow-hidden bg-slate-200">
    <header class="fixed inset-x-0 top-0 z-20 flex h-14 items-center bg-slate-800 px-4 text-white shadow">
      <button type="button" class="mr-4 rounded px-3 py-1 text-xl hover:bg-white/10" @click="toggleSidebar">
        ≡
      </button>
      <h1 class="text-lg font-semibold">종자 영업 관리 시스템</h1>
    </header>

    <aside
      class="fixed bottom-0 left-0 top-14 z-10 w-64 overflow-y-auto bg-slate-700 text-white transition-transform"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <nav class="p-4">
        <p class="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-300">영업 관리</p>

        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          class="mb-1 block w-full rounded px-3 py-2 text-left text-sm"
          :class="item.key === activeScreen ? 'bg-sky-700 text-white' : 'text-slate-100 hover:bg-white/10'"
          @click="onNavigate(item.key)"
        >
          {{ item.label }}
        </button>
      </nav>
    </aside>

    <main class="fixed bottom-0 right-0 top-14 overflow-y-auto bg-slate-100 p-5 transition-all" :class="mainClass">
      <slot />
    </main>
  </div>
</template>
