<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { HEADER_MENU_CONFIG } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const emit = defineEmits(['toggle-sidebar'])

const roleLabel = computed(() => authStore.currentRole || '미선택')

const hasRoleAccess = (roles) => {
  if (!roles || roles.length === 0) {
    return true
  }

  return roles.includes(authStore.currentRole)
}

const visibleHeaderMenus = computed(() => HEADER_MENU_CONFIG.filter((menu) => hasRoleAccess(menu.roles)))

const isActivePath = (path) => {
  if (!path) {
    return false
  }

  return route.path === path || route.path.startsWith(`${path}/`)
}

const navigateTo = (path) => {
  if (path) {
    router.push(path)
  }
}

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

const toggleSidebar = () => {
  emit('toggle-sidebar')
}
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50 h-14 border-b px-4" style="background: var(--color-sidebar); border-color: var(--color-border);">
    <div class="mx-auto flex h-full max-w-screen-2xl items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded border text-sm transition-colors"
          style="border-color: var(--color-border); color: var(--color-text);"
          aria-label="사이드바 토글"
          @click="toggleSidebar"
        >
          ☰
        </button>
        <button
          type="button"
          class="text-2xl leading-none"
          style="font-family: var(--font-display); font-weight: 300; font-style: normal; color: var(--color-text);"
          @click="navigateTo('/dashboard')"
        >
          SeedFlow+
        </button>
      </div>
      <nav class="hidden items-center gap-2 md:flex">
        <button
          v-for="menu in visibleHeaderMenus"
          :key="menu.key"
          type="button"
          class="rounded px-3 py-1.5 text-sm transition-colors"
          :class="isActivePath(menu.route) ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'"
          :style="isActivePath(menu.route) ? 'background: var(--color-sidebar-hover);' : ''"
          @click="navigateTo(menu.route)"
        >
          {{ menu.label }}
        </button>
      </nav>
      <div class="flex items-center gap-2 sm:gap-3">
        <div class="flex items-center gap-2 md:hidden">
          <button
            v-for="menu in visibleHeaderMenus"
            :key="`mobile-${menu.key}`"
            type="button"
            class="rounded px-2 py-1 text-xs transition-colors"
            :class="isActivePath(menu.route) ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'"
            :style="isActivePath(menu.route) ? 'background: var(--color-sidebar-hover);' : ''"
            @click="navigateTo(menu.route)"
          >
            {{ menu.label }}
          </button>
        </div>
        <span class="hidden rounded px-2 py-1 text-xs font-bold sm:inline-flex" style="background: rgba(107, 124, 69, 0.14); color: var(--color-olive);">
          {{ roleLabel }}
        </span>
        <button
          type="button"
          class="rounded px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-95"
          style="background: var(--color-accent);"
          @click="logout"
        >
          로그아웃
        </button>
      </div>
    </div>
  </header>
</template>
