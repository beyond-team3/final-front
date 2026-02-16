<script setup>
import { ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'

const isSidebarOpen = ref(true)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <div class="mx-auto flex max-w-screen-2xl">
      <AppSidebar :visible="isSidebarOpen" />
      <main class="min-h-[calc(100vh-56px)] flex-1 p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
