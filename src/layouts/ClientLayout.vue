<script setup>
import { nextTick, ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'

const isSidebarOpen = ref(true)

const emitLayoutResize = async () => {
  await nextTick()
  window.dispatchEvent(new Event('resize'))
  window.setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 120)
}

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
  emitLayoutResize()
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)]">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <div class="mx-auto flex max-w-screen-2xl pt-14">
      <AppSidebar :visible="isSidebarOpen" />
      <main class="min-h-[calc(100vh-56px)] min-w-0 flex-1 p-6">
        <ErrorBoundary>
          <router-view />
        </ErrorBoundary>
      </main>
    </div>
  </div>
</template>
