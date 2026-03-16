import { DOC_STATUS } from '@/utils/constants'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  createNotificationSseClient,
  deleteAllNotifications as deleteAllNotificationsApi,
  deleteNotification as deleteNotificationApi,
  getNotifications,
  getUnreadCount,
  markAllAsRead as markAllAsReadApi,
  markAsRead as markAsReadApi,
} from '@/api/notification'

const DEFAULT_PAGE_SIZE = 20

// DOC_STATUS에서 한글 라벨 맵 추출
const STATUS_TRANSLATIONS = Object.values(DOC_STATUS).reduce((acc, category) => {
  Object.entries(category).forEach(([key, value]) => {
    if (value.label) {
      acc[key] = value.label
    }
  })
  return acc
}, {
  // 추가적인 특수 상태값들
  PENDING_ADMIN: '관리자 승인 대기',
  PENDING_CLIENT: '거래처 승인 대기',
})

const TRANSLATION_REGEX = new RegExp(`\\b(${Object.keys(STATUS_TRANSLATIONS).join('|')})\\b`, 'g')

function translateText(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(TRANSLATION_REGEX, (match) => STATUS_TRANSLATIONS[match] || match)
}

const CATEGORY_LABELS = {
  ALL: '전체',
  APPROVAL: '승인',
  QUOTATION_REQUEST: '견적요청',
  BILLING: '정산/청구',
  ACCOUNT: '계정',
  PRODUCT: '상품',
  CULTIVATION: '재배',
  STATUS: '거래 실황',
}

const FIXED_CATEGORY_ORDER = [
  'ALL',
  'APPROVAL',
  'QUOTATION_REQUEST',
  'BILLING',
  'ACCOUNT',
  'PRODUCT',
  'CULTIVATION',
  'STATUS',
]

function getErrorMessage(error, fallback = '알림 요청 처리 중 오류가 발생했습니다.') {
  return error?.response?.data?.error?.message || error?.message || fallback
}

function nowIsoString() {
  return new Date().toISOString()
}

function normalizeNotificationItem(item) {
  if (!item) {
    return null
  }

  return {
    id: Number(item.id),
    type: item.type || 'UNKNOWN',
    title: translateText(item.title || ''),
    content: translateText(item.content || ''),
    approvalId: item.approvalId != null ? Number(item.approvalId) : null,
    targetType: item.targetType || null,
    targetId: item.targetId != null ? Number(item.targetId) : null,
    readAt: item.readAt || null,
    createdAt: item.createdAt || nowIsoString(),
  }
}

function getCategoryKeyByType(type) {
  if (!type) {
    return 'OTHER'
  }

  if (type.startsWith('APPROVAL_')) {
    return 'APPROVAL'
  }

  if (type === 'QUOTATION_REQUEST_CREATED') {
    return 'QUOTATION_REQUEST'
  }

  if (type.startsWith('CONTRACT_')) {
    return 'CONTRACT'
  }

  if (type === 'STATEMENT_ISSUED' || type === 'INVOICE_ISSUED') {
    return 'BILLING'
  }

  if (type === 'ACCOUNT_ACTIVATED') {
    return 'ACCOUNT'
  }

  if (type === 'PRODUCT_CREATED') {
    return 'PRODUCT'
  }

  if (type.startsWith('CULTIVATION_')) {
    return 'CULTIVATION'
  }

  if (type === 'DEAL_STATUS_CHANGED') {
    return 'STATUS'
  }

  return 'OTHER'
}

function buildEmptyPageMeta(page = 0, size = DEFAULT_PAGE_SIZE) {
  return {
    number: page,
    size,
    totalPages: 1,
    totalElements: 0,
    numberOfElements: 0,
    first: page === 0,
    last: true,
    empty: true,
  }
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const pageMeta = ref(buildEmptyPageMeta())
  const unreadCount = ref(0)
  const loading = ref(false)
  const refreshingUnreadCount = ref(false)
  const actionLoading = ref({
    readAll: false,
    deleteAll: false,
    byId: {},
  })
  const error = ref(null)
  const sseConnected = ref(false)
  const sseStatus = ref('idle')
  const initialized = ref(false)

  let sseClient = null

  const unreadCountByRole = computed(() => {
    const role = useAuthStore().currentRole
    return role ? { [role]: unreadCount.value } : {}
  })

  const categories = computed(() => {
    return FIXED_CATEGORY_ORDER.map((key) => CATEGORY_LABELS[key])
  })

  const getAll = () => notifications.value

  const getById = (_role, id) => notifications.value.find((item) => item.id === Number(id)) || null

  const getFiltered = (_role, category = CATEGORY_LABELS.ALL, unreadOnly = false) => notifications.value.filter((item) => {
    const matchesCategory = category === CATEGORY_LABELS.ALL
      || CATEGORY_LABELS[getCategoryKeyByType(item.type)] === category
    const matchesUnread = unreadOnly ? item.readAt === null : true

    return matchesCategory && matchesUnread
  })

  const getCategories = () => categories.value

  const setActionLoading = (id, value) => {
    actionLoading.value = {
      ...actionLoading.value,
      byId: {
        ...actionLoading.value.byId,
        [id]: value,
      },
    }
  }

  const updateUnreadCount = (value) => {
    unreadCount.value = Math.max(0, Number(value) || 0)
  }

  const syncPageMeta = (pageData, fallbackPage = 0, fallbackSize = DEFAULT_PAGE_SIZE) => {
    pageMeta.value = {
      ...buildEmptyPageMeta(fallbackPage, fallbackSize),
      ...(pageData || {}),
      number: Number(pageData?.number ?? fallbackPage),
      size: Number(pageData?.size ?? fallbackSize),
      totalPages: Math.max(1, Number(pageData?.totalPages ?? 1)),
      totalElements: Number(pageData?.totalElements ?? 0),
      numberOfElements: Number(pageData?.numberOfElements ?? ((pageData?.content || []).length || 0)),
      first: Boolean(pageData?.first ?? fallbackPage === 0),
      last: Boolean(pageData?.last ?? true),
      empty: Boolean(pageData?.empty ?? !(pageData?.content || []).length),
    }
  }

  async function fetchUnreadCount() {
    refreshingUnreadCount.value = true

    try {
      const data = await getUnreadCount()
      updateUnreadCount(data?.unreadCount)
      return unreadCount.value
    } catch (e) {
      error.value = getErrorMessage(e, '미읽음 개수를 불러오지 못했습니다.')
      return unreadCount.value
    } finally {
      refreshingUnreadCount.value = false
    }
  }

  async function fetchNotifications(_role, params = {}) {
    const nextPage = Number(params.page ?? pageMeta.value.number ?? 0)
    const nextSize = Number(params.size ?? pageMeta.value.size ?? DEFAULT_PAGE_SIZE)

    loading.value = true
    error.value = null

    try {
      const pageData = await getNotifications({ page: nextPage, size: nextSize })
      notifications.value = Array.isArray(pageData?.content)
        ? pageData.content.map(normalizeNotificationItem).filter(Boolean)
        : []
      syncPageMeta(pageData, nextPage, nextSize)
      initialized.value = true
      return notifications.value
    } catch (e) {
      error.value = getErrorMessage(e, '알림 목록을 불러오지 못했습니다.')
      notifications.value = []
      syncPageMeta(null, nextPage, nextSize)
      return []
    } finally {
      loading.value = false
    }
  }

  async function initialize(role, params = {}) {
    await Promise.all([
      fetchNotifications(role, params),
      fetchUnreadCount(),
    ])
  }

  async function refreshCurrentPage() {
    return initialize(null, {
      page: pageMeta.value.number,
      size: pageMeta.value.size,
    })
  }

  function mergeNotifications(_role, incoming = []) {
    const normalized = incoming
      .map(normalizeNotificationItem)
      .filter(Boolean)
      .filter((item) => !notifications.value.some((current) => current.id === item.id))

    if (normalized.length === 0) {
      return
    }

    notifications.value = [...normalized, ...notifications.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, pageMeta.value.size || DEFAULT_PAGE_SIZE)

    syncPageMeta({
      ...pageMeta.value,
      totalElements: pageMeta.value.totalElements + normalized.length,
      numberOfElements: Math.min(
        (pageMeta.value.size || DEFAULT_PAGE_SIZE),
        notifications.value.length,
      ),
      empty: false,
    })

    const unreadDelta = normalized.filter((item) => item.readAt === null).length
    if (unreadDelta > 0) {
      updateUnreadCount(unreadCount.value + unreadDelta)
    }
  }

  function applyIncomingNotification(payload) {
    const incoming = normalizeNotificationItem(payload)
    if (!incoming || notifications.value.some((item) => item.id === incoming.id)) {
      return
    }

    notifications.value = [incoming, ...notifications.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, pageMeta.value.size || DEFAULT_PAGE_SIZE)

    syncPageMeta({
      ...pageMeta.value,
      totalElements: pageMeta.value.totalElements + 1,
      numberOfElements: Math.min(pageMeta.value.size || DEFAULT_PAGE_SIZE, notifications.value.length),
      empty: false,
    })

    if (incoming.readAt === null) {
      updateUnreadCount(unreadCount.value + 1)
    }
  }

  async function markRead(_role, id) {
    const numericId = Number(id)
    const target = notifications.value.find((item) => item.id === numericId)

    if (!target || target.readAt) {
      return true
    }

    const previousReadAt = target.readAt
    target.readAt = nowIsoString()
    updateUnreadCount(unreadCount.value - 1)
    setActionLoading(numericId, true)

    try {
      await markAsReadApi(numericId)
      return true
    } catch (e) {
      target.readAt = previousReadAt
      updateUnreadCount(unreadCount.value + 1)
      error.value = getErrorMessage(e, '읽음 처리에 실패했습니다.')
      throw e
    } finally {
      setActionLoading(numericId, false)
    }
  }

  async function markAllRead() {
    const previousUnreadIds = notifications.value
      .filter((item) => item.readAt === null)
      .map((item) => item.id)

    notifications.value = notifications.value.map((item) => ({
      ...item,
      readAt: item.readAt || nowIsoString(),
    }))
    updateUnreadCount(0)
    actionLoading.value = {
      ...actionLoading.value,
      readAll: true,
    }

    try {
      await markAllAsReadApi()
      return true
    } catch (e) {
      notifications.value = notifications.value.map((item) => ({
        ...item,
        readAt: previousUnreadIds.includes(item.id) ? null : item.readAt,
      }))
      await fetchUnreadCount()
      error.value = getErrorMessage(e, '전체 읽음 처리에 실패했습니다.')
      throw e
    } finally {
      actionLoading.value = {
        ...actionLoading.value,
        readAll: false,
      }
    }
  }

  async function removeNotification(id) {
    const numericId = Number(id)
    const index = notifications.value.findIndex((item) => item.id === numericId)

    if (index < 0) {
      return true
    }

    const removed = notifications.value[index]
    const previousMeta = { ...pageMeta.value }
    notifications.value = notifications.value.filter((item) => item.id !== numericId)
    syncPageMeta({
      ...pageMeta.value,
      totalElements: Math.max(0, pageMeta.value.totalElements - 1),
      numberOfElements: notifications.value.length,
      empty: notifications.value.length === 0,
    })

    if (removed.readAt === null) {
      updateUnreadCount(unreadCount.value - 1)
    }

    setActionLoading(numericId, true)

    try {
      await deleteNotificationApi(numericId)
      return true
    } catch (e) {
      const restored = [...notifications.value]
      restored.splice(index, 0, removed)
      notifications.value = restored
      pageMeta.value = previousMeta

      if (removed.readAt === null) {
        updateUnreadCount(unreadCount.value + 1)
      }

      error.value = getErrorMessage(e, '알림 삭제에 실패했습니다.')
      throw e
    } finally {
      setActionLoading(numericId, false)
    }
  }

  async function removeAllNotifications() {
    const previous = [...notifications.value]
    const previousMeta = { ...pageMeta.value }
    notifications.value = []
    syncPageMeta({
      ...pageMeta.value,
      totalElements: 0,
      numberOfElements: 0,
      totalPages: 1,
      empty: true,
      first: true,
      last: true,
    })
    updateUnreadCount(0)
    actionLoading.value = {
      ...actionLoading.value,
      deleteAll: true,
    }

    try {
      await deleteAllNotificationsApi()
      return true
    } catch (e) {
      notifications.value = previous
      pageMeta.value = previousMeta
      await fetchUnreadCount()
      error.value = getErrorMessage(e, '전체 삭제에 실패했습니다.')
      throw e
    } finally {
      actionLoading.value = {
        ...actionLoading.value,
        deleteAll: false,
      }
    }
  }

  async function startSse() {
    const authStore = useAuthStore()
    if (!authStore.token || sseClient) {
      return
    }

    sseStatus.value = 'connecting'

    sseClient = createNotificationSseClient({
      token: authStore.token,
      onOpen: () => {
        sseConnected.value = true
        sseStatus.value = 'connected'
      },
      onMessage: (payload) => {
        applyIncomingNotification(payload)
      },
      onError: () => {
        sseConnected.value = false
        sseStatus.value = 'reconnecting'
      },
      onAuthError: async () => {
        sseConnected.value = false
        sseStatus.value = 'auth-error'
        stopSse()
        await authStore.logout()
        const { default: router } = await import('@/router')
        if (router.currentRoute.value.path !== '/login') {
          await router.push('/login')
        }
      },
    })
  }

  function stopSse() {
    sseClient?.close()
    sseClient = null
    sseConnected.value = false
    sseStatus.value = 'idle'
  }

  async function bootstrap() {
    await fetchUnreadCount()
    await startSse()
  }

  return {
    notifications,
    pageMeta,
    unreadCount,
    unreadCountByRole,
    loading,
    refreshingUnreadCount,
    actionLoading,
    error,
    initialized,
    sseConnected,
    sseStatus,
    fetchNotifications,
    fetchUnreadCount,
    initialize,
    refreshCurrentPage,
    getCategories,
    getFiltered,
    getById,
    getAll,
    markRead,
    markAllRead,
    removeNotification,
    removeAllNotifications,
    mergeNotifications,
    bootstrap,
    startSse,
    stopSse,
  }
})
