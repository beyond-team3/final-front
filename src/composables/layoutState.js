import { inject, provide, readonly, ref } from 'vue'

const LAYOUT_STATE_KEY = Symbol('layout-state')

export const provideLayoutState = () => {
  const isSidebarOpen = ref(true)
  const resizeTick = ref(0)

  const setSidebarOpen = (isOpen) => {
    isSidebarOpen.value = isOpen
  }

  const notifyLayoutResize = () => {
    resizeTick.value += 1
  }

  provide(LAYOUT_STATE_KEY, {
    isSidebarOpen: readonly(isSidebarOpen),
    resizeTick: readonly(resizeTick),
    setSidebarOpen,
    notifyLayoutResize,
  })

  return {
    isSidebarOpen,
    resizeTick,
    setSidebarOpen,
    notifyLayoutResize,
  }
}

export const useLayoutState = () => inject(LAYOUT_STATE_KEY, null)
