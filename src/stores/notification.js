import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ROLES } from '@/utils/constants'
import eventBus from '@/utils/eventBus'
import {
  getNotifications,
  markAllAsRead as markAllAsReadApi,
  markAsRead as markAsReadApi,
} from '@/api/notification'

const DEFAULT_CATEGORY_MAP = {
  [ROLES.SALES_REP]: ['전체', '계정', '영업', '재고'],
  [ROLES.ADMIN]: ['전체', '영업', '일정', '관리', '상품'],
  [ROLES.CLIENT]: ['전체', '견적요청', '계약', '명세', '청구'],
}

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return error?.response?.data?.message || error?.message || fallback
}

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  return []
}

function toEpoch(dateString) {
  const [datePart, timePart] = String(dateString || '').split(' ')
  if (!datePart || !timePart) {
    return 0
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  return new Date(year, month - 1, day, hour, minute).getTime()
}

export const useNotificationStore = defineStore('notification', () => {
  const notificationsByRole = ref({
    [ROLES.SALES_REP]: [],
    [ROLES.ADMIN]: [],
    [ROLES.CLIENT]: [],
  })
  const loadedByRole = ref({
    [ROLES.SALES_REP]: false,
    [ROLES.ADMIN]: false,
    [ROLES.CLIENT]: false,
  })
  const loading = ref(false)
  const error = ref(null)
  let listenersBound = false

  const nowDateTime = () => {
    const date = new Date()
    const pad = (n) => String(n).padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const appendSystemNotification = ({ role, category, message }) => {
    if (!role || !message) {
      return
    }

    const next = {
      id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: '시스템 알림',
      category: category || '전체',
      message,
      read: false,
      createdAt: nowDateTime(),
    }

    notificationsByRole.value = {
      ...notificationsByRole.value,
      [role]: [next, ...getAllByRole(role)],
    }
  }

  const bindEventListeners = () => {
    if (listenersBound) {
      return
    }

    listenersBound = true

    eventBus.on('document:created', ({ type, id }) => {
      appendSystemNotification({
        role: ROLES.ADMIN,
        category: '관리',
        message: `문서가 생성되었습니다. (${type} / ${id})`,
      })
      appendSystemNotification({
        role: ROLES.SALES_REP,
        category: '영업',
        message: `신규 문서가 등록되었습니다. (${type})`,
      })
    })

    eventBus.on('approval:processed', ({ id, status }) => {
      appendSystemNotification({
        role: ROLES.SALES_REP,
        category: '영업',
        message: `승인 요청 #${id}이(가) ${status} 처리되었습니다.`,
      })
      appendSystemNotification({
        role: ROLES.CLIENT,
        category: '계약',
        message: `문서 승인 상태가 ${status}로 변경되었습니다.`,
      })
    })
  }

  async function fetchNotifications(role, params = {}) {
    if (!role) {
      return []
    }

    loading.value = true
    error.value = null

    try {
      const list = normalizeList(await getNotifications({ role, ...params }))
      notificationsByRole.value = {
        ...notificationsByRole.value,
        [role]: list,
      }
      loadedByRole.value = {
        ...loadedByRole.value,
        [role]: true,
      }
      return list
    } catch (e) {
      error.value = getErrorMessage(e, '알림 목록을 불러오지 못했습니다.')
      return notificationsByRole.value[role] || []
    } finally {
      loading.value = false
    }
  }

  const ensureLoaded = (role) => {
    if (!role || loadedByRole.value[role]) {
      return
    }

    void fetchNotifications(role)
  }

  const getAllByRole = (role) => notificationsByRole.value[role] || []

  const getCategories = (role) => {
    ensureLoaded(role)

    const defaultCategories = DEFAULT_CATEGORY_MAP[role] || ['전체']
    const dynamic = [...new Set(getAllByRole(role).map((item) => item.category).filter(Boolean))]
    const merged = ['전체', ...defaultCategories.filter((item) => item !== '전체'), ...dynamic]

    return [...new Set(merged)]
  }

  const getFiltered = (role, category = '전체', unreadOnly = false) => {
    ensureLoaded(role)

    const sorted = [...getAllByRole(role)].sort((a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt))

    return sorted.filter((item) => {
      const passCategory = category === '전체' || item.category === category
      const passUnread = unreadOnly ? !item.read : true
      return passCategory && passUnread
    })
  }

  const getById = (role, id) => {
    ensureLoaded(role)
    return getAllByRole(role).find((item) => item.id === id) || null
  }

  const markRead = (role, id, read = true) => {
    const list = getAllByRole(role)
    const target = list.find((item) => item.id === id)
    if (!target) {
      return
    }

    target.read = read

    if (read) {
      markAsReadApi(id).catch((e) => {
        error.value = getErrorMessage(e, '읽음 처리에 실패했습니다.')
      })
    }
  }

  const toggleRead = (role, id) => {
    const target = getById(role, id)
    if (!target) {
      return
    }

    target.read = !target.read

    if (target.read) {
      markAsReadApi(id).catch((e) => {
        error.value = getErrorMessage(e, '읽음 처리에 실패했습니다.')
      })
    }
  }

  const markAllRead = (role) => {
    const list = getAllByRole(role)
    list.forEach((item) => {
      item.read = true
    })

    markAllAsReadApi().catch((e) => {
      error.value = getErrorMessage(e, '전체 읽음 처리에 실패했습니다.')
    })
  }

  const unreadCountByRole = computed(() => Object.fromEntries(
    Object.entries(notificationsByRole.value).map(([role, list]) => [role, list.filter((item) => !item.read).length]),
  ))

  bindEventListeners()

  return {
    notificationsByRole,
    unreadCountByRole,
    loading,
    error,
    fetchNotifications,
    getCategories,
    getFiltered,
    getById,
    markRead,
    toggleRead,
    markAllRead,
  }
})
