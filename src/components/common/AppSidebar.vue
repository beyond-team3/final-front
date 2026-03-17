<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MENU_CONFIG } from '@/utils/constants'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
})

const expandedMenus = ref({})

const hasRoleAccess = (roles) => {
  if (!roles || roles.length === 0) {
    return true
  }

  return roles.includes(authStore.currentRole)
}

const visibleMenus = computed(() => {
  return MENU_CONFIG.filter((menu) => hasRoleAccess(menu.roles))
    .map((menu) => {
      if (!menu.children) {
        return menu
      }

      const children = menu.children.filter((child) => hasRoleAccess(child.roles || menu.roles))
      return { ...menu, children }
    })
    .filter((menu) => !menu.children || menu.children.length > 0)
})

const isActivePath = (path) => {
  if (!path) {
    return false
  }

  return route.path === path || route.path.startsWith(`${path}/`)
}

const isExactPath = (path) => {
  if (!path) {
    return false
  }

  return route.path === path
}

const isParentMenuActive = (menu) => {
  if (!menu?.children || menu.children.length === 0) {
    return false
  }

  return menu.children.some((child) => isExactPath(child.route))
}

const toggleMenu = (menuKey) => {
  expandedMenus.value[menuKey] = !expandedMenus.value[menuKey]
}

const navigateTo = (path) => {
  if (path) {
    router.push(path)
  }
}

watch(
  () => route.path,
  () => {
    visibleMenus.value.forEach((menu) => {
      if (!menu.children) {
        return
      }

      const shouldExpand = menu.children.some((child) => isExactPath(child.route))
      if (shouldExpand) {
        expandedMenus.value[menu.key] = true
      }
    })
  },
  { immediate: true },
)
</script>

<template>
  <aside
    v-show="visible"
    class="sidebar fixed inset-y-0 left-0 z-50 mt-14 w-64 shrink-0 overflow-y-auto bg-[var(--color-bg-card)] shadow-xl lg:h-[calc(100vh-56px)] lg:shadow-none"
  >
    <nav class="p-3">
      <template v-for="menu in visibleMenus" :key="menu.key">
        <template v-if="menu.children">
          <button
            type="button"
            class="sidebar-item has-children mb-1 flex w-full items-center px-3 py-2 text-left text-sm font-medium"
            :class="{ active: isParentMenuActive(menu), open: expandedMenus[menu.key] }"
            @click="toggleMenu(menu.key)"
          >
            <span>{{ menu.label }}</span>
          </button>

          <div v-if="expandedMenus[menu.key]" class="mb-2 ml-2">
            <button
              v-for="child in menu.children"
              :key="child.key"
              type="button"
              class="sidebar-item sidebar-sub-item mb-1 block w-full px-3 py-2 text-left text-sm"
              :class="{ active: isExactPath(child.route), 'font-bold': isExactPath(child.route) }"
              @click="navigateTo(child.route)"
            >
              {{ child.label }}
            </button>
          </div>
        </template>

        <button
          v-else
          type="button"
          class="sidebar-item mb-1 block w-full px-3 py-2 text-left text-sm font-medium"
          :class="{ active: isActivePath(menu.route), 'font-bold': isActivePath(menu.route) }"
          @click="navigateTo(menu.route)"
        >
          {{ menu.label }}
        </button>
      </template>
    </nav>
  </aside>
</template>
