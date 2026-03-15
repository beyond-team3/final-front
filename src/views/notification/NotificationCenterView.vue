<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdrButton } from '@rei/cedar'
import ModalBase from '@/components/common/ModalBase.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useNotificationStore } from '@/stores/notification'

const props = defineProps({
  role: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const store = useNotificationStore()

const selectedCategory = ref('전체')
const unreadOnly = ref(false)
const page = ref(1)
const modalOpen = ref(false)
const selectedId = ref(null)
const toast = ref({
  show: false,
  type: 'error',
  message: '',
})

let toastTimerId = null

const typeMetaMap = {
  APPROVAL_REQUESTED: { icon: '승', label: '승인 요청', tone: 'tone-approval' },
  APPROVAL_COMPLETED: { icon: '승', label: '승인 완료', tone: 'tone-approval' },
  APPROVAL_REJECTED: { icon: '승', label: '승인 반려', tone: 'tone-danger' },
  QUOTATION_REQUEST_CREATED: { icon: '견', label: '견적요청', tone: 'tone-document' },
  CONTRACT_COMPLETED: { icon: '계', label: '계약 완료', tone: 'tone-contract' },
  CONTRACT_STARTING: { icon: '계', label: '계약 시작', tone: 'tone-contract' },
  CONTRACT_ENDING_SOON: { icon: '계', label: '계약 종료 예정', tone: 'tone-contract' },
  CONTRACT_ENDED: { icon: '계', label: '계약 종료', tone: 'tone-neutral' },
  STATEMENT_ISSUED: { icon: '명', label: '명세서', tone: 'tone-document' },
  INVOICE_ISSUED: { icon: '청', label: '청구서', tone: 'tone-document' },
  ACCOUNT_ACTIVATED: { icon: '계', label: '계정 활성화', tone: 'tone-account' },
  PRODUCT_CREATED: { icon: '상', label: '상품 등록', tone: 'tone-product' },
  CULTIVATION_SOWING_PROMOTION: { icon: '재', label: '파종 알림', tone: 'tone-cultivation' },
  CULTIVATION_HARVEST_FEEDBACK: { icon: '재', label: '수확 피드백', tone: 'tone-cultivation' },
  DEAL_STATUS_CHANGED: { icon: '상', label: '상태 변경', tone: 'tone-neutral' },
}

const roleNotifications = computed(() => store.getAll())
const categories = computed(() => store.getCategories(props.role))
const filteredNotifications = computed(() => store.getFiltered(props.role, selectedCategory.value, unreadOnly.value))
const unreadCount = computed(() => store.unreadCount)
const totalPages = computed(() => Math.max(1, store.pageMeta.totalPages || 1))
const selectedNotification = computed(() => store.getById(props.role, selectedId.value))
const hasNotifications = computed(() => roleNotifications.value.length > 0)
const pageSummary = computed(() => ({
  number: Number(store.pageMeta.number || 0) + 1,
  size: Number(store.pageMeta.size || 20),
  totalElements: Number(store.pageMeta.totalElements || 0),
}))
const sseStatusLabel = computed(() => {
  if (store.sseStatus === 'connected') {
    return '실시간 연결됨'
  }

  if (store.sseStatus === 'reconnecting') {
    return '실시간 재연결 중'
  }

  if (store.sseStatus === 'auth-error') {
    return '인증 만료'
  }

  return '실시간 연결 대기'
})

const showToast = (message, type = 'error') => {
  window.clearTimeout(toastTimerId)
  toast.value = {
    show: true,
    type,
    message,
  }

  toastTimerId = window.setTimeout(() => {
    toast.value.show = false
  }, 2800)
}

const formatCreatedAt = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const diffMs = date.getTime() - Date.now()
  const absMinutes = Math.round(Math.abs(diffMs) / 60000)
  const relativeFormatter = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })

  if (absMinutes < 1) {
    return '방금 전'
  }

  if (absMinutes < 60) {
    return relativeFormatter.format(Math.round(diffMs / 60000), 'minute')
  }

  const absHours = Math.round(absMinutes / 60)
  if (absHours < 24) {
    return relativeFormatter.format(Math.round(diffMs / 3600000), 'hour')
  }

  const absDays = Math.round(absHours / 24)
  if (absDays < 7) {
    return relativeFormatter.format(Math.round(diffMs / 86400000), 'day')
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const getTypeMeta = (type) => typeMetaMap[type] || { icon: '알', label: type || '일반 알림', tone: 'tone-neutral' }

const buildNotificationRoute = (item) => {
  if (String(item?.targetType || '').toUpperCase() === 'APPROVAL' && item?.targetId != null) {
    return {
      name: 'approval',
      query: {
        approvalId: String(item.approvalId ?? item.targetId),
        targetType: String(item.targetType || ''),
        notificationType: String(item.type || ''),
        openFromNotification: 'true',
      },
    }
  }

  if (item?.type?.startsWith('APPROVAL_') && item?.targetId != null) {
    return {
      name: 'approval',
      query: {
        ...(item?.approvalId != null ? { approvalId: String(item.approvalId) } : {}),
        targetId: String(item.targetId),
        targetType: String(item.targetType || ''),
        notificationType: String(item.type),
        openFromNotification: 'true',
      },
    }
  }

  if (!item?.targetType || item.targetId == null) {
    return null
  }

  switch (item.targetType) {
    case 'QUOTATION_REQUEST':
    case 'QUOTATION':
    case 'CONTRACT':
    case 'ORDER':
    case 'STATEMENT':
    case 'INVOICE':
      return {
        name: 'document-all',
        query: {
          targetType: String(item.targetType),
          targetId: String(item.targetId),
        },
      }
    case 'PRODUCT':
      return { name: 'product-detail', params: { id: String(item.targetId) } }
    case 'APPROVAL':
      return {
        name: 'approval',
        query: {
          approvalId: String(item.approvalId ?? item.targetId),
          targetType: String(item.targetType || ''),
          notificationType: String(item.type || ''),
          openFromNotification: 'true',
        },
      }
    case 'ACCOUNT':
    case 'DEAL':
    case 'CLIENT':
    case 'INVENTORY':
    default:
      return {
        path: '/notifications',
        query: {
          targetType: String(item.targetType),
          targetId: String(item.targetId),
        },
      }
  }
}

const openDetail = async (item) => {
  selectedId.value = item.id

  if (!item.readAt) {
    try {
      await store.markRead(props.role, item.id)
    } catch (error) {
      showToast(error?.message || '읽음 처리에 실패했습니다.')
    }
  }

  modalOpen.value = true
}

const goToNotificationTarget = async (item) => {
  if (!item) {
    return
  }

  if (!item.readAt) {
    try {
      await store.markRead(props.role, item.id)
    } catch (error) {
      showToast(error?.message || '읽음 처리에 실패했습니다.')
    }
  }

  const targetRoute = buildNotificationRoute(item)
  if (!targetRoute) {
    showToast('연결된 화면 정보가 없습니다.')
    return
  }

  modalOpen.value = false
  await router.push(targetRoute)
}

const markAllRead = async () => {
  try {
    await store.markAllRead(props.role)
    showToast('모든 알림을 읽음 처리했습니다.', 'success')
  } catch (error) {
    showToast(error?.message || '전체 읽음 처리에 실패했습니다.')
  }
}

const removeOne = async (item) => {
  try {
    await store.removeNotification(item.id)
    if (selectedId.value === item.id) {
      modalOpen.value = false
      selectedId.value = null
    }
    showToast('알림을 삭제했습니다.', 'success')
  } catch (error) {
    showToast(error?.message || '알림 삭제에 실패했습니다.')
  }
}

const removeAll = async () => {
  try {
    await store.removeAllNotifications()
    modalOpen.value = false
    selectedId.value = null
    showToast('알림을 모두 삭제했습니다.', 'success')
  } catch (error) {
    showToast(error?.message || '전체 삭제에 실패했습니다.')
  }
}

const fetchPage = async (nextPage) => {
  await store.fetchNotifications(props.role, {
    page: Math.max(0, nextPage - 1),
    size: pageSummary.value.size,
  })
}

watch([selectedCategory, unreadOnly], () => {
  if (filteredNotifications.value.length === 0 && hasNotifications.value) {
    selectedId.value = null
  }
})

watch(categories, (nextCategories) => {
  if (!nextCategories.includes(selectedCategory.value)) {
    selectedCategory.value = '전체'
  }
})

watch(page, async (nextPage, prevPage) => {
  if (nextPage === prevPage) {
    return
  }

  await fetchPage(nextPage)
})

watch(
  () => store.pageMeta.number,
  (nextNumber) => {
    const normalizedPage = Number(nextNumber || 0) + 1
    if (page.value !== normalizedPage) {
      page.value = normalizedPage
    }
  },
)

onMounted(async () => {
  await Promise.all([
    store.initialize(props.role, { page: 0, size: 20 }),
    store.startSse(),
  ])
})

onBeforeUnmount(() => {
  window.clearTimeout(toastTimerId)
})
</script>

<template>
  <section class="screen-content">
    <PageHeader :title="title" :subtitle="subtitle">
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-section)] px-3 py-1 text-xs font-semibold text-[var(--color-text-sub)]">
            전체 {{ store.pageMeta.totalElements || 0 }}건
          </span>
          <span class="rounded-full border border-[var(--color-orange-light)] bg-[var(--color-orange-light)] px-3 py-1 text-xs font-semibold text-[var(--color-orange-dark)]">
            미읽음 {{ unreadCount }}건
          </span>
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold"
            :class="store.sseConnected ? 'bg-[rgba(122,140,66,0.18)] text-[var(--color-olive-dark)]' : 'bg-[rgba(206,121,83,0.16)] text-[var(--color-orange-dark)]'"
          >
            {{ sseStatusLabel }}
          </span>
        </div>
      </template>
    </PageHeader>

    <transition name="fade">
      <div
        v-if="toast.show"
        class="mb-4 rounded-xl border px-4 py-3 text-sm font-medium"
        :class="toast.type === 'success'
          ? 'border-[rgba(122,140,66,0.28)] bg-[rgba(122,140,66,0.12)] text-[var(--color-olive-dark)]'
          : 'border-[rgba(206,121,83,0.28)] bg-[rgba(206,121,83,0.12)] text-[var(--color-orange-dark)]'"
      >
        {{ toast.message }}
      </div>
    </transition>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="schedule-filter" role="group" aria-label="알림 분류 필터">
        <CdrButton
          v-for="category in categories"
          :key="category"
          type="button"
          size="small"
          modifier="secondary"
          class="schedule-filter-btn"
          :class="{ 'is-active': selectedCategory === category }"
          :aria-pressed="selectedCategory === category"
          @click="selectedCategory = category"
        >
          {{ category }}
        </CdrButton>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn !px-4 !py-2 !text-xs !font-bold"
          :class="unreadOnly ? 'toggle-on' : 'ghost'"
          @click="unreadOnly = !unreadOnly"
        >
          미읽음만 보기
        </button>
        <button
          type="button"
          class="btn ghost !px-4 !py-2 !text-xs !font-bold"
          :disabled="store.actionLoading.readAll || unreadCount === 0"
          @click="markAllRead"
        >
          전체 읽음
        </button>
        <button
          type="button"
          class="btn ghost !px-4 !py-2 !text-xs !font-bold"
          :disabled="store.actionLoading.deleteAll || !hasNotifications"
          @click="removeAll"
        >
          전체 삭제
        </button>
      </div>
    </div>

    <LoadingSpinner v-if="store.loading && !store.initialized" text="알림 목록을 불러오는 중입니다." />

    <ErrorMessage
      v-else-if="store.error && !hasNotifications"
      :message="store.error"
      retry-label="알림 다시 불러오기"
      @retry="store.initialize(props.role, { page: page - 1, size: pageSummary.size })"
    />

    <div v-else class="overflow-hidden rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)]">
      <EmptyState
        v-if="!hasNotifications"
        title="도착한 알림이 없습니다."
        description="새 알림이 생성되면 이 화면과 헤더 뱃지에 바로 반영됩니다."
      />

      <EmptyState
        v-else-if="filteredNotifications.length === 0"
        title="조건에 맞는 알림이 없습니다."
        description="미읽음 필터를 해제하거나 다른 페이지를 확인해보세요."
      />

      <div v-else>
        <article
          v-for="item in filteredNotifications"
          :key="item.id"
          class="group grid grid-cols-[auto_1fr_auto] gap-3 border-b border-[var(--color-border-divider)] px-4 py-4 transition-colors hover:bg-[var(--color-bg-section)]"
          :class="item.readAt ? 'bg-[var(--color-bg-input)]' : 'bg-[var(--color-bg-card)]'"
        >
          <button
            type="button"
            class="notification-icon"
            :class="getTypeMeta(item.type).tone"
            @click="openDetail(item)"
          >
            {{ getTypeMeta(item.type).icon }}
          </button>

          <button
            type="button"
            class="min-w-0 text-left"
            @click="openDetail(item)"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full" :class="item.readAt ? 'bg-transparent' : 'bg-[var(--color-orange)]'" />
                  <p class="truncate text-sm font-bold" :class="item.readAt ? 'text-[var(--color-text-body)]' : 'text-[var(--color-text-strong)]'">
                    {{ item.title }}
                  </p>
                </div>
                <p class="mt-1.5 line-clamp-2-custom text-sm text-[var(--color-text-body)]">
                  {{ item.content }}
                </p>
              </div>
            </div>
          </button>

          <div class="flex min-w-[150px] flex-col items-end gap-2">
            <div class="flex flex-wrap justify-end gap-1.5 text-[11px] text-[var(--color-text-sub)]">
              <span class="rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-card)] px-2 py-0.5 font-semibold">
                {{ selectedCategory === '전체' ? getTypeMeta(item.type).label : selectedCategory }}
              </span>
              <span class="rounded-full px-2 py-0.5 font-semibold" :class="getTypeMeta(item.type).tone">
                {{ getTypeMeta(item.type).label }}
              </span>
            </div>
            <span class="text-xs text-[var(--color-text-sub)]">{{ formatCreatedAt(item.createdAt) }}</span>
            <div class="flex gap-2">
              <button
                type="button"
                class="btn ghost !px-3 !py-1.5 !text-[11px] !font-bold"
                :disabled="Boolean(store.actionLoading.byId[item.id])"
                @click="goToNotificationTarget(item)"
              >
                이동
              </button>
              <button
                type="button"
                class="btn ghost !px-3 !py-1.5 !text-[11px] !font-bold"
                :disabled="Boolean(store.actionLoading.byId[item.id])"
                @click="removeOne(item)"
              >
                삭제
              </button>
            </div>
          </div>
        </article>
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-divider)] bg-[var(--color-bg-card)] px-4 py-3">
        <PaginationControls v-model="page" :total-pages="totalPages" />
        <span class="text-xs text-[var(--color-text-sub)]">
          현재 {{ pageSummary.number }}/{{ totalPages }} · 페이지 크기 {{ pageSummary.size }} · 전체 {{ pageSummary.totalElements }}건
        </span>
      </footer>
    </div>

    <ModalBase v-model="modalOpen" title="알림 상세" width-class="max-w-3xl">
      <template v-if="selectedNotification">
        <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-sub)]">
          <span class="notification-icon !h-8 !w-8 !text-xs" :class="getTypeMeta(selectedNotification.type).tone">
            {{ getTypeMeta(selectedNotification.type).icon }}
          </span>
          <span class="rounded-full px-2 py-1 font-semibold" :class="getTypeMeta(selectedNotification.type).tone">
            {{ getTypeMeta(selectedNotification.type).label }}
          </span>
          <span>{{ formatCreatedAt(selectedNotification.createdAt) }}</span>
          <span :class="selectedNotification.readAt ? 'text-[var(--color-text-sub)]' : 'text-[var(--color-orange-dark)]'">
            {{ selectedNotification.readAt ? '읽음' : '미읽음' }}
          </span>
        </div>

        <h4 class="mt-4 text-lg font-bold text-[var(--color-text-strong)]">{{ selectedNotification.title }}</h4>
        <pre class="mt-3 whitespace-pre-wrap break-words rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] p-4 text-sm leading-6 text-[var(--color-text-body)]">{{ selectedNotification.content }}</pre>

        <div class="mt-3 text-xs text-[var(--color-text-sub)]">
          targetType: {{ selectedNotification.targetType || '-' }} / targetId: {{ selectedNotification.targetId ?? '-' }}
        </div>

        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" class="btn ghost !px-4 !py-2 !text-xs !font-bold" @click="removeOne(selectedNotification)">
            삭제
          </button>
          <button
            type="button"
            class="btn !px-4 !py-2 !text-xs !font-bold !text-white !bg-[var(--color-olive)] hover:!bg-[var(--color-olive-dark)]"
            @click="goToNotificationTarget(selectedNotification)"
          >
            연관 화면 이동
          </button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
.line-clamp-2-custom {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.schedule-filter {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
  flex-wrap: wrap;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(239, 234, 223, 0.92) 0%, rgba(247, 243, 236, 0.92) 100%);
  box-shadow: inset 0 0 0 1px rgba(221, 215, 206, 0.45);
}

.schedule-filter :deep(.schedule-filter-btn) {
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, rgba(250, 247, 243, 0.96) 0%, rgba(239, 234, 223, 0.96) 100%);
  color: var(--color-text-body, #6B5F50);
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(61, 53, 41, 0.08);
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease;
}

.schedule-filter :deep(.schedule-filter-btn:hover),
.schedule-filter :deep(.schedule-filter-btn:focus-visible) {
  background: linear-gradient(135deg, rgba(239, 234, 223, 0.95) 0%, rgba(200, 212, 160, 0.55) 100%);
  color: var(--color-text-strong, #3D3529);
  box-shadow: 0 0 0 4px rgba(122, 140, 66, 0.12), 0 6px 14px rgba(61, 53, 41, 0.14);
}

.schedule-filter :deep(.schedule-filter-btn.is-active) {
  background: linear-gradient(120deg, rgba(200, 212, 160, 0.92) 0%, rgba(122, 140, 66, 0.48) 100%);
  color: var(--color-text-strong, #3D3529);
  box-shadow: 0 0 0 4px rgba(122, 140, 66, 0.16), 0 6px 14px rgba(88, 104, 48, 0.2);
}

.notification-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.tone-neutral {
  background: rgba(107, 95, 80, 0.12);
  color: var(--color-text-body);
}

.tone-approval {
  background: rgba(122, 140, 66, 0.18);
  color: var(--color-olive-dark);
}

.tone-contract {
  background: rgba(88, 124, 165, 0.16);
  color: #365472;
}

.tone-document {
  background: rgba(206, 121, 83, 0.16);
  color: var(--color-orange-dark);
}

.tone-account {
  background: rgba(130, 113, 184, 0.14);
  color: #5e4f95;
}

.tone-product {
  background: rgba(55, 144, 115, 0.16);
  color: #2c775f;
}

.tone-cultivation {
  background: rgba(84, 152, 82, 0.16);
  color: #326a31;
}

.tone-danger {
  background: rgba(195, 84, 84, 0.16);
  color: #9b3939;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
