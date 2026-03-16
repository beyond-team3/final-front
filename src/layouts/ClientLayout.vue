<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import { provideLayoutState } from '@/composables/layoutState'

const isSidebarOpen = ref(window.innerWidth >= 1024)
const layoutState = provideLayoutState()

const emitLayoutResize = () => {
  layoutState.setSidebarOpen(isSidebarOpen.value)
  layoutState.notifyLayoutResize()
}

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
  emitLayoutResize()
}

const handleResize = () => {
  if (window.innerWidth < 1024 && isSidebarOpen.value) {
    isSidebarOpen.value = false
    emitLayoutResize()
  } else if (window.innerWidth >= 1024 && !isSidebarOpen.value) {
    isSidebarOpen.value = true
    emitLayoutResize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  emitLayoutResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)]">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <div class="flex pt-14">
      <!-- 사이드바 -->
      <AppSidebar :visible="isSidebarOpen" />

      <!-- 모바일용 배후 레이어(Backdrop) -->
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 z-40 bg-black/40 lg:hidden"
        @click="toggleSidebar"
      />

      <main class="min-h-[calc(100vh-56px)] min-w-0 flex-1 p-6">
        <ErrorBoundary>
          <router-view />
        </ErrorBoundary>
      </main>
    </div>
  </div>
</template>
