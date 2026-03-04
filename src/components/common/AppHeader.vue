<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { HEADER_MENU_CONFIG } from '@/utils/constants'
import Icon from '@/components/common/Icon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const emit = defineEmits(['toggle-sidebar'])

const roleLabel = computed(() => authStore.currentRole || '미선택')

const hasRoleAccess = (roles) => {
  if (!roles || roles.length === 0) {
    return true
  }

  return roles.includes(authStore.currentRole)
}

const visibleHeaderMenus = computed(() => HEADER_MENU_CONFIG.filter((menu) => hasRoleAccess(menu.roles)))
const iconNameMap = {
  schedule: 'calendar', // UPDATED
  notification: 'bell', // UPDATED
  settings: 'settings', // UPDATED
}
const iconOnlyMenuKeys = ['schedule', 'notification', 'settings'] // UPDATED
const iconHeaderMenus = computed(() => visibleHeaderMenus.value.filter((menu) => iconOnlyMenuKeys.includes(menu.key))) // UPDATED
const unreadCount = computed(() => { // UPDATED
  const role = authStore.currentRole
  if (!role) {
    return 0
  }
  return notificationStore.unreadCountByRole?.[role] || 0
})

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

watch(
  () => authStore.currentRole,
  (role) => { // UPDATED
    if (role && typeof notificationStore.fetchNotifications === 'function') {
      notificationStore.fetchNotifications(role)
    }
  },
  { immediate: true },
)
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
          style="font-family: var(--font-display); font-weight: 700; font-style: normal; color: var(--color-text);"
          @click="navigateTo('/dashboard')"
        >
          SeedFlow+
        </button>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <nav class="hidden items-center gap-1 md:flex">
          <button
            v-for="menu in iconHeaderMenus"
            :key="menu.key"
            type="button"
            class="header-icon-btn"
            :class="{ 'is-active': isActivePath(menu.route) }"
            :aria-label="menu.label"
            :title="menu.label"
            @click="navigateTo(menu.route)"
          >
            <Icon :name="iconNameMap[menu.key]" :size="20" /> <!-- UPDATED -->
            <span v-if="menu.key === 'notification' && unreadCount > 0" class="header-icon-badge" aria-hidden="true" /> <!-- UPDATED -->
          </button>
        </nav>
        <div class="flex items-center gap-2 md:hidden">
          <button
            v-for="menu in iconHeaderMenus"
            :key="`mobile-${menu.key}`"
            type="button"
            class="header-icon-btn"
            :class="{ 'is-active': isActivePath(menu.route) }"
            :aria-label="menu.label"
            :title="menu.label"
            @click="navigateTo(menu.route)"
          >
            <Icon :name="iconNameMap[menu.key]" :size="20" /> <!-- UPDATED -->
            <span v-if="menu.key === 'notification' && unreadCount > 0" class="header-icon-badge" aria-hidden="true" /> <!-- UPDATED -->
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

<style scoped>
.header-icon-btn { /* UPDATED */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--color-accent);
  background: transparent;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.header-icon-btn:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-text);
}

.header-icon-btn:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.header-icon-btn.is-active {
  background: var(--color-sidebar-hover);
  border-color: var(--color-border);
  color: var(--color-text);
}

.header-icon-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
  box-shadow: 0 0 0 2px var(--color-sidebar);
}

:global(.dark) .header-icon-btn {
  color: var(--color-text);
}

:global(.dark) .header-icon-btn:hover,
:global(.dark) .header-icon-btn.is-active {
  background: var(--color-surface);
}

@media (max-width: 640px) {
  .header-icon-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
