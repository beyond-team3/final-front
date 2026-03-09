<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { CdrButton } from '@rei/cedar'
import ModalBase from '@/components/common/ModalBase.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import PageHeader from '@/components/common/PageHeader.vue'
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

const store = useNotificationStore()

const selectedCategory = ref('전체')
const unreadOnly = ref(false)
const page = ref(1)
const pageSize = 5
const modalOpen = ref(false)
const selectedId = ref(null)

const typeLabelMap = {
  ACCOUNT_ACTIVATED: '계정 활성화',
  ACCOUNT_ACTIVATION: '계정 활성화',
  QUOTATION_REQUEST_CREATED: '견적요청 생성',
  QUOTATION_APPROVAL_RESULT: '견적 승인 결과',
  CONTRACT_APPROVAL_REQUESTED: '계약 승인 요청',
  CONTRACT_APPROVAL_REQUEST: '계약 승인 요청',
  CONTRACT_APPROVAL_RESULT: '계약 승인 결과',
  INVOICE_ISSUED: '청구서 발행',
  STATEMENT_ISSUED: '명세서 발행',
  STOCK_CHANGED: '재고 변경',
  PRODUCT_STOCK_ALERT: '재고 임계치',
  CULTIVATION_SOWING_PROMOTION: '파종 프로모션',
  CULTIVATION_HARVEST_FEEDBACK: '수확 피드백',
  DEAL_STATUS_CHANGED: '딜 상태 변경',
  APPROVAL_REQUESTED: '승인 요청',
  APPROVAL_COMPLETED: '승인 완료',
  APPROVAL_REJECTED: '승인 반려',
  CLIENT_REGISTERED: '거래처 등록',
  USER_ACTIVATION_REQUEST: '계정 활성화 요청',
  MEETING_SCHEDULE_UPDATE: '일정 변경',
  PRODUCT_PRICE_CHANGE: '가격 변경',
  SCHEDULE_REMINDER: '일정 리마인드',
}

const categories = computed(() => store.getCategories(props.role))
const roleNotifications = computed(() => store.getFiltered(props.role, '전체', false))
const filteredNotifications = computed(() => store.getFiltered(props.role, selectedCategory.value, unreadOnly.value))
const unreadCount = computed(() => roleNotifications.value.filter((item) => !item.read).length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredNotifications.value.length / pageSize)))
const pagedNotifications = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredNotifications.value.slice(start, start + pageSize)
})
const selectedNotification = computed(() => store.getById(props.role, selectedId.value))

const typeLabel = (type) => typeLabelMap[type] || type || '일반 알림'

const typeToneClass = (type) => {
  if (!type) return 'type-tone-neutral'
  if (type.includes('APPROVAL') || type.includes('CONTRACT')) return 'type-tone-olive'
  if (type.includes('CULTIVATION') || type.includes('SCHEDULE')) return 'type-tone-info'
  if (type.includes('INVOICE') || type.includes('STATEMENT') || type.includes('QUOTATION')) return 'type-tone-orange'
  return 'type-tone-neutral'
}

const openDetail = (item) => {
  selectedId.value = item.id
  if (!item.read) {
    store.markRead(props.role, item.id, true)
  }
  modalOpen.value = true
}

const toggleSelectedRead = () => {
  if (!selectedNotification.value) return
  store.toggleRead(props.role, selectedNotification.value.id)
}

watch([selectedCategory, unreadOnly], () => {
  page.value = 1
})

watch(totalPages, (next) => {
  if (page.value > next) {
    page.value = next
  }
})

onMounted(() => {
  void store.fetchNotifications(props.role)
})
</script>

<template>
  <section class="screen-content">
    <PageHeader :title="title" :subtitle="subtitle">
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-section)] px-3 py-1 text-xs font-semibold text-[var(--color-text-sub)]">
            전체 {{ roleNotifications.length }}건
          </span>
          <span class="rounded-full border border-[var(--color-orange-light)] bg-[var(--color-orange-light)] px-3 py-1 text-xs font-semibold text-[var(--color-orange-dark)]">
            미읽음 {{ unreadCount }}건
          </span>
        </div>
      </template>
    </PageHeader>

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
          안읽음만
        </button>
        <button type="button" class="btn ghost !px-4 !py-2 !text-xs !font-bold" @click="store.markAllRead(role)">
          모두 읽음
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)]">
      <div v-if="pagedNotifications.length === 0" class="py-16 text-center text-sm text-[var(--color-text-placeholder)]">
        조건에 맞는 알림이 없습니다.
      </div>

      <div v-else>
        <article
          v-for="item in pagedNotifications"
          :key="item.id"
          class="group grid cursor-pointer grid-cols-[10px_1fr] gap-3 border-b border-[var(--color-border-divider)] px-4 py-4 transition-colors hover:bg-[var(--color-bg-section)]"
          :class="!item.read ? 'bg-[var(--color-bg-card)]' : 'bg-[var(--color-bg-input)]'"
          role="button"
          tabindex="0"
          @click="openDetail(item)"
          @keydown.enter.prevent="openDetail(item)"
        >
          <span class="mt-1.5 h-2.5 w-2.5 rounded-full" :class="item.read ? 'bg-transparent' : 'bg-[var(--color-orange)]'" />

          <div class="min-w-0">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="truncate text-sm font-bold" :class="item.read ? 'text-[var(--color-text-body)]' : 'text-[var(--color-text-strong)]'">
                {{ item.title }}
              </p>

              <div class="flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-[var(--color-text-sub)]">
                <span class="rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-card)] px-2 py-0.5 font-semibold">
                  {{ item.category || '기타' }}
                </span>
                <span class="rounded-full px-2 py-0.5 font-semibold" :class="typeToneClass(item.type)">
                  {{ typeLabel(item.type) }}
                </span>
                <span>{{ item.createdAt }}</span>
              </div>
            </div>

            <p class="mt-1.5 line-clamp-2-custom text-sm text-[var(--color-text-body)]">{{ item.message }}</p>
          </div>
        </article>
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-divider)] bg-[var(--color-bg-card)] px-4 py-3">
        <PaginationControls v-model="page" :total-pages="totalPages" />
        <span class="text-xs text-[var(--color-text-sub)]">현재 {{ page }}/{{ totalPages }} · 필터 결과 {{ filteredNotifications.length }}건</span>
      </footer>
    </div>

    <ModalBase v-model="modalOpen" title="알림 상세" width-class="max-w-3xl">
      <template v-if="selectedNotification">
        <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-sub)]">
          <span class="rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-section)] px-2 py-1 font-semibold text-[var(--color-text-body)]">
            {{ selectedNotification.category || '기타' }}
          </span>
          <span class="rounded-full px-2 py-1 font-semibold" :class="typeToneClass(selectedNotification.type)">
            {{ typeLabel(selectedNotification.type) }}
          </span>
          <span>{{ selectedNotification.createdAt }}</span>
          <span :class="selectedNotification.read ? 'text-[var(--color-text-sub)]' : 'text-[var(--color-orange-dark)]'">
            {{ selectedNotification.read ? '읽음' : '미읽음' }}
          </span>
        </div>

        <h4 class="mt-4 text-lg font-bold text-[var(--color-text-strong)]">{{ selectedNotification.title }}</h4>
        <pre class="mt-3 whitespace-pre-wrap break-words rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] p-4 text-sm leading-6 text-[var(--color-text-body)]">{{ selectedNotification.message }}</pre>

        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" class="btn ghost !px-4 !py-2 !text-xs !font-bold" @click="toggleSelectedRead">
            {{ selectedNotification.read ? '미읽음으로 변경' : '읽음 처리' }}
          </button>
          <a
            class="btn !px-4 !py-2 !text-xs !font-bold !text-white"
            :class="selectedNotification.url ? '!bg-[var(--color-olive)] hover:!bg-[var(--color-olive-dark)]' : '!bg-[var(--color-text-placeholder)] pointer-events-none'"
            :href="selectedNotification.url || '#'"
          >
            연관 화면 이동
          </a>
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

.schedule-filter :deep(.schedule-filter-btn:active) {
  transform: translateY(1px);
}

.type-tone-neutral {
  border: 1px solid var(--color-border-card);
  background: var(--color-bg-section);
  color: var(--color-text-body);
}

.type-tone-olive {
  border: 1px solid var(--color-olive-light);
  background: var(--color-olive-light);
  color: var(--color-olive-dark);
}

.type-tone-orange {
  border: 1px solid var(--color-orange-light);
  background: var(--color-orange-light);
  color: var(--color-orange-dark);
}

.type-tone-info {
  border: 1px solid #d6dde6;
  background: #d6dde6;
  color: #596b7f;
}
</style>
