<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CdrButton, IconRefresh } from '@rei/cedar'
import PageHeader from '@/components/common/PageHeader.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import { decideApprovalStep, getApprovalDetail, searchApprovals } from '@/api/approval'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const authStore = useAuthStore()

const TAB_OPTIONS = [
  { key: 'ALL', label: '전체' },
  { key: 'ADMIN', label: '관리자 승인' },
  { key: 'CLIENT', label: '거래처 승인' },
  { key: 'DONE', label: '완료/반려' },
]

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']
const DEAL_TYPE_OPTIONS = ['QUO', 'CNT']
const DECISION_ROLE_MAP = {
  [ROLES.ADMIN]: 'ADMIN',
  [ROLES.CLIENT]: 'CLIENT',
}

const filterForm = reactive({
  tab: 'ALL',
  status: 'ALL',
  dealType: 'ALL',
  targetId: '',
  keyword: '',
})

const appliedFilters = reactive({
  status: 'ALL',
  dealType: 'ALL',
  targetId: '',
})

const page = ref(1)
const pageSize = 10
const listLoading = ref(false)
const listError = ref('')
const listResponse = ref({
  content: [],
  totalElements: 0,
  totalPages: 1,
  number: 0,
  size: pageSize,
})

const feedback = ref({ tone: '', message: '' })
const detailModalOpen = ref(false)
const decisionModalOpen = ref(false)

const detailLoading = ref(false)
const selectedApproval = ref(null)
const selectedApprovalId = ref(null)

const decisionSubmitting = ref(false)
const decisionReason = ref('')
const decisionContext = ref(null)
const decisionError = ref('')
let filterApplyTimer = null

const currentRole = computed(() => authStore.currentRole)
const currentActorType = computed(() => DECISION_ROLE_MAP[currentRole.value] || null)

const dealTypeLabel = (dealType) => {
  if (dealType === 'QUO') return '견적서'
  if (dealType === 'CNT') return '계약서'
  return dealType || '-'
}

const approvalStatusLabel = (status) => {
  if (status === 'PENDING') return '진행 중'
  if (status === 'APPROVED') return '승인 완료'
  if (status === 'REJECTED') return '반려'
  if (status === 'CANCELED') return '취소'
  return status || '-'
}

const stepStatusLabel = (status) => {
  if (status === 'WAITING') return '대기'
  if (status === 'APPROVED') return '승인'
  if (status === 'REJECTED') return '반려'
  return status || '-'
}

const actorTypeLabel = (actorType) => {
  if (actorType === 'ADMIN') return '관리자'
  if (actorType === 'CLIENT') return '거래처'
  return actorType || '-'
}

const decisionLabel = (decision) => {
  if (decision === 'APPROVE') return '승인'
  if (decision === 'REJECT') return '반려'
  return '-'
}

const formatDateTime = (value) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const normalizeApproval = (approval) => {
  const steps = Array.isArray(approval?.steps)
    ? [...approval.steps].sort((left, right) => left.stepOrder - right.stepOrder)
    : []
  const activeStep = steps.find((step) => step.status === 'WAITING') || null
  const code = approval?.targetCodeSnapshot || `${approval?.dealType || 'DOC'}-${approval?.targetId ?? '-'}`

  return {
    ...approval,
    displayCode: code,
    steps,
    activeStep,
  }
}

const parseApprovalError = (error, fallbackMessage) => {
  const status = error?.response?.status || 0
  const code = error?.response?.data?.error?.code || ''
  const backendMessage = error?.response?.data?.error?.message

  const errorMap = {
    AP001: '동일 문서에 진행 중인 승인 요청이 이미 있습니다.',
    AP002: '승인 요청을 찾을 수 없습니다.',
    AP003: '승인 단계를 찾을 수 없습니다.',
    AP004: '이미 처리된 승인 단계입니다.',
    AP005: '아직 처리할 수 없는 승인 단계입니다.',
    AP006: '반려 사유를 입력해야 합니다.',
    AP007: '현재 사용자에게 이 승인 단계 처리 권한이 없습니다.',
    AP008: '승인 요청의 거래처 정보와 로그인 사용자가 일치하지 않습니다.',
    AP009: '해당 요청에는 clientIdSnapshot 값이 필요합니다.',
    AP010: '현재 승인 기능은 QUO, CNT 문서만 지원합니다.',
  }

  if (status === 401) {
    return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  }

  if (status === 403) {
    return errorMap[code] || '이 승인 요청에 접근할 권한이 없습니다.'
  }

  if (status === 404) {
    return errorMap[code] || '요청한 승인 정보를 찾을 수 없습니다.'
  }

  if (status === 409) {
    return errorMap[code] || '승인 상태가 이미 변경되어 요청을 처리할 수 없습니다.'
  }

  if (status === 400) {
    return errorMap[code] || backendMessage || fallbackMessage
  }

  return backendMessage || fallbackMessage || '승인 요청 처리 중 오류가 발생했습니다.'
}

const showFeedback = (tone, message) => {
  feedback.value = { tone, message }
}

const clearFeedback = () => {
  feedback.value = { tone: '', message: '' }
}

const serverApprovals = computed(() => listResponse.value.content || [])

const filteredApprovals = computed(() => {
  const keyword = filterForm.keyword.trim().toLowerCase()

  return serverApprovals.value.filter((approval) => {
    const matchesTab = (() => {
      if (filterForm.tab === 'ADMIN') {
        return approval.status === 'PENDING' && approval.activeStep?.actorType === 'ADMIN'
      }

      if (filterForm.tab === 'CLIENT') {
        return approval.status === 'PENDING' && approval.activeStep?.actorType === 'CLIENT'
      }

      if (filterForm.tab === 'DONE') {
        return approval.status !== 'PENDING'
      }

      return true
    })()

    const matchesKeyword = !keyword
      || String(approval.approvalId).toLowerCase().includes(keyword)
      || String(approval.targetId).toLowerCase().includes(keyword)
      || String(approval.displayCode).toLowerCase().includes(keyword)

    return matchesTab && matchesKeyword
  })
})

const groupedApprovals = computed(() => ({
  admin: filteredApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'ADMIN'),
  client: filteredApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'CLIENT'),
  done: filteredApprovals.value.filter((approval) => approval.status !== 'PENDING'),
}))

const stats = computed(() => ({
  total: listResponse.value.totalElements || 0,
  pending: serverApprovals.value.filter((approval) => approval.status === 'PENDING').length,
  admin: serverApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'ADMIN').length,
  client: serverApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'CLIENT').length,
}))

const totalPages = computed(() => Math.max(1, listResponse.value.totalPages || 1))

const canDecideApproval = (approval) => {
  if (!approval || approval.status !== 'PENDING') {
    return false
  }

  if (!approval.activeStep?.stepId || !currentActorType.value) {
    return false
  }

  return approval.activeStep.actorType === currentActorType.value
}

const decisionButtonText = (approval) => {
  if (approval?.activeStep?.actorType === 'CLIENT') {
    return '승인 확인'
  }

  return '승인'
}

const loadApprovals = async () => {
  listLoading.value = true
  listError.value = ''

  try {
    const data = await searchApprovals({
      page: page.value - 1,
      size: pageSize,
      sort: 'approvalId,desc',
      ...(appliedFilters.status !== 'ALL' ? { status: appliedFilters.status } : {}),
      ...(appliedFilters.dealType !== 'ALL' ? { dealType: appliedFilters.dealType } : {}),
      ...(appliedFilters.targetId ? { targetId: Number(appliedFilters.targetId) } : {}),
    })

    listResponse.value = {
      ...data,
      content: Array.isArray(data?.content) ? data.content.map(normalizeApproval) : [],
      totalElements: Number(data?.totalElements || 0),
      totalPages: Number(data?.totalPages || 1),
      number: Number(data?.number || 0),
      size: Number(data?.size || pageSize),
    }
  } catch (error) {
    listError.value = parseApprovalError(error, '승인 목록을 불러오지 못했습니다.')
  } finally {
    listLoading.value = false
  }
}

const loadApprovalDetail = async (approvalId, openModal = true) => {
  detailLoading.value = true
  selectedApprovalId.value = approvalId

  if (openModal) {
    detailModalOpen.value = true
  }

  try {
    const data = await getApprovalDetail(approvalId)
    selectedApproval.value = normalizeApproval(data)
  } catch (error) {
    selectedApproval.value = null
    showFeedback('error', parseApprovalError(error, '승인 상세 정보를 불러오지 못했습니다.'))
  } finally {
    detailLoading.value = false
  }
}

const openDetail = async (approvalId) => {
  clearFeedback()
  await loadApprovalDetail(approvalId, true)
}

const openDecisionModal = (approval, decision) => {
  decisionReason.value = ''
  decisionError.value = ''
  decisionModalOpen.value = true
  decisionContext.value = {
    ...approval,
    decision,
  }
}

const handlePageChange = async (nextPage) => {
  page.value = nextPage
  await loadApprovals()
}

const submitDecision = async () => {
  if (!decisionContext.value?.activeStep?.stepId) {
    decisionError.value = '현재 처리 가능한 승인 단계가 없습니다.'
    return
  }

  if (decisionContext.value.decision === 'REJECT' && !decisionReason.value.trim()) {
    decisionError.value = '반려 사유를 입력해야 합니다.'
    return
  }

  decisionSubmitting.value = true
  decisionError.value = ''
  clearFeedback()

  try {
    const updated = await decideApprovalStep(
      decisionContext.value.approvalId,
      decisionContext.value.activeStep.stepId,
      {
        decision: decisionContext.value.decision,
        ...(decisionContext.value.decision === 'REJECT' ? { reason: decisionReason.value.trim() } : {}),
      },
    )

    const normalized = normalizeApproval(updated)
    selectedApproval.value = normalized
    selectedApprovalId.value = normalized.approvalId
    decisionModalOpen.value = false
    showFeedback(
      'success',
      decisionContext.value.decision === 'APPROVE'
        ? '승인 처리가 완료되었습니다.'
        : '반려 처리가 완료되었습니다.',
    )
    await loadApprovals()
  } catch (error) {
    decisionError.value = parseApprovalError(error, '승인 결정을 처리하지 못했습니다.')
  } finally {
    decisionSubmitting.value = false
  }
}

const applyFilters = async () => {
  appliedFilters.status = filterForm.status
  appliedFilters.dealType = filterForm.dealType
  appliedFilters.targetId = filterForm.targetId.trim()
  page.value = 1
  await loadApprovals()
}

const resetFilters = async () => {
  filterForm.tab = 'ALL'
  filterForm.status = 'ALL'
  filterForm.dealType = 'ALL'
  filterForm.targetId = ''
  filterForm.keyword = ''
  appliedFilters.status = 'ALL'
  appliedFilters.dealType = 'ALL'
  appliedFilters.targetId = ''
  page.value = 1
  await loadApprovals()
}

const stepToneClass = (status) => {
  if (status === 'APPROVED') return 'step-approved'
  if (status === 'REJECTED') return 'step-rejected'
  return 'step-waiting'
}

const statusToneClass = (status) => {
  if (status === 'APPROVED') return 'tone-approved'
  if (status === 'REJECTED') return 'tone-rejected'
  if (status === 'CANCELED') return 'tone-canceled'
  return 'tone-pending'
}

const railClass = (approval) => {
  if (approval.status !== 'PENDING') {
    return approval.status === 'APPROVED' ? 'rail-approved' : 'rail-closed'
  }

  return approval.activeStep?.actorType === 'CLIENT' ? 'rail-client' : 'rail-admin'
}

const sectionList = computed(() => {
  if (filterForm.tab === 'ADMIN') {
    return [{ key: 'admin', title: '관리자 승인 대기', accent: 'accent-admin', items: groupedApprovals.value.admin }]
  }

  if (filterForm.tab === 'CLIENT') {
    return [{ key: 'client', title: '거래처 승인 대기', accent: 'accent-client', items: groupedApprovals.value.client }]
  }

  if (filterForm.tab === 'DONE') {
    return [{ key: 'done', title: '완료/반려', accent: 'accent-done', items: groupedApprovals.value.done }]
  }

  return [
    { key: 'admin', title: '관리자 승인 대기', accent: 'accent-admin', items: groupedApprovals.value.admin },
    { key: 'client', title: '거래처 승인 대기', accent: 'accent-client', items: groupedApprovals.value.client },
    { key: 'done', title: '완료/반려', accent: 'accent-done', items: groupedApprovals.value.done },
  ]
})

onMounted(async () => {
  await authStore.initializeAuth()
  await loadApprovals()
})

watch(
  () => [filterForm.status, filterForm.dealType, filterForm.targetId],
  () => {
    if (filterApplyTimer) {
      clearTimeout(filterApplyTimer)
    }

    filterApplyTimer = window.setTimeout(() => {
      applyFilters()
    }, 250)
  },
)

onBeforeUnmount(() => {
  if (filterApplyTimer) {
    clearTimeout(filterApplyTimer)
  }
})
</script>

<template>
  <section class="screen-content approval-page">
    <PageHeader title="승인 관리" subtitle="단계별 검토와 반려 처리를 한 화면에서 관리합니다." />

    <div v-if="feedback.message" class="feedback-banner" :class="feedback.tone === 'success' ? 'feedback-success' : 'feedback-error'">
      {{ feedback.message }}
    </div>

    <section class="kpi-grid">
      <article class="kpi-card">
        <p class="kpi-number">{{ stats.total }}</p>
        <p class="kpi-label">검색 결과 전체</p>
      </article>
      <article class="kpi-card">
        <p class="kpi-number kpi-number-warn">{{ stats.pending }}</p>
        <p class="kpi-label">현재 페이지 진행 중</p>
      </article>
      <article class="kpi-card">
        <p class="kpi-number">{{ stats.admin }}</p>
        <p class="kpi-label">관리자 단계 대기</p>
      </article>
      <article class="kpi-card">
        <p class="kpi-number">{{ stats.client }}</p>
        <p class="kpi-label">거래처 단계 대기</p>
      </article>
    </section>

    <section class="filter-panel">
      <div class="tab-row" role="tablist" aria-label="승인 분류">
        <button
          v-for="tab in TAB_OPTIONS"
          :key="tab.key"
          type="button"
          class="tab-chip"
          :class="{ active: filterForm.tab === tab.key }"
          :aria-selected="filterForm.tab === tab.key"
          @click="filterForm.tab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="filter-grid">
        <label class="filter-field">
          <span>상태</span>
          <select v-model="filterForm.status">
            <option value="ALL">전체</option>
            <option v-for="status in STATUS_OPTIONS" :key="status" :value="status">
              {{ approvalStatusLabel(status) }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span>문서 타입</span>
          <select v-model="filterForm.dealType">
            <option value="ALL">전체</option>
            <option v-for="dealType in DEAL_TYPE_OPTIONS" :key="dealType" :value="dealType">
              {{ dealTypeLabel(dealType) }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span>대상 문서 ID</span>
          <input
            v-model="filterForm.targetId"
            inputmode="numeric"
            placeholder="예: 500"
          >
        </label>

        <label class="filter-field filter-field-wide">
          <span>현재 페이지 검색</span>
          <input
            v-model="filterForm.keyword"
            placeholder="승인 ID, targetId, 문서 코드 검색"
          >
        </label>

        <div class="filter-actions">
          <CdrButton
            type="button"
            modifier="secondary"
            icon-only
            class="filter-reset-btn"
            aria-label="필터 초기화"
            @click="resetFilters"
          >
            <IconRefresh />
          </CdrButton>
        </div>
      </div>
    </section>

    <ErrorMessage v-if="listError" :message="listError" @retry="loadApprovals" />

    <section v-else class="approval-board">
      <div v-if="listLoading" class="loading-panel">
        승인 목록을 불러오는 중입니다.
      </div>

      <template v-else>
        <EmptyState
          v-if="filteredApprovals.length === 0"
          title="표시할 승인 요청이 없습니다."
          description="필터 조건을 조정한 뒤 다시 조회해보세요."
        />

        <template v-else>
          <section
            v-for="section in sectionList"
            :key="section.key"
            v-show="section.items.length > 0"
            class="approval-section"
          >
            <div class="section-header">
              <div class="section-title-wrap">
                <span class="section-accent" :class="section.accent" />
                <h3>{{ section.title }}</h3>
              </div>
              <span class="section-count">{{ section.items.length }}건</span>
            </div>

            <div class="approval-list">
              <article
                v-for="approval in section.items"
                :key="approval.approvalId"
                class="approval-card"
                :class="railClass(approval)"
              >
                <div class="card-main" role="button" tabindex="0" @click="openDetail(approval.approvalId)" @keydown.enter.prevent="openDetail(approval.approvalId)">
                  <div class="card-top">
                    <div>
                      <p class="doc-code">{{ approval.displayCode }}</p>
                      <h4>{{ dealTypeLabel(approval.dealType) }} 승인 요청</h4>
                    </div>

                    <div class="badge-row">
                      <span class="badge">{{ actorTypeLabel(approval.activeStep?.actorType || '-') }}</span>
                      <span class="badge" :class="statusToneClass(approval.status)">
                        {{ approvalStatusLabel(approval.status) }}
                      </span>
                    </div>
                  </div>

                  <dl class="meta-grid">
                    <div>
                      <dt>승인 ID</dt>
                      <dd>#{{ approval.approvalId }}</dd>
                    </div>
                    <div>
                      <dt>대상 문서 ID</dt>
                      <dd>{{ approval.targetId }}</dd>
                    </div>
                    <div>
                      <dt>거래처 스냅샷</dt>
                      <dd>{{ approval.clientIdSnapshot ?? '-' }}</dd>
                    </div>
                    <div>
                      <dt>현재 단계</dt>
                      <dd>
                        <template v-if="approval.activeStep">
                          {{ approval.activeStep.stepOrder }}단계 · {{ actorTypeLabel(approval.activeStep.actorType) }}
                        </template>
                        <template v-else>
                          처리 완료
                        </template>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="card-actions">
                  <button type="button" class="btn ghost-btn" @click="openDetail(approval.approvalId)">상세 보기</button>
                  <button
                    v-if="canDecideApproval(approval)"
                    type="button"
                    class="btn approve-btn"
                    @click="openDecisionModal(approval, 'APPROVE')"
                  >
                    {{ decisionButtonText(approval) }}
                  </button>
                  <button
                    v-if="canDecideApproval(approval)"
                    type="button"
                    class="btn reject-btn"
                    @click="openDecisionModal(approval, 'REJECT')"
                  >
                    반려
                  </button>
                </div>
              </article>
            </div>
          </section>

          <footer class="board-footer">
            <PaginationControls :model-value="page" :total-pages="totalPages" @update:modelValue="handlePageChange" />
            <span class="footer-meta">
              총 {{ listResponse.totalElements }}건 · {{ page }}/{{ totalPages }} 페이지
            </span>
          </footer>
        </template>
      </template>
    </section>

    <ModalBase v-model="detailModalOpen" title="승인 상세" width-class="max-w-4xl">
      <div v-if="detailLoading" class="loading-panel">승인 상세를 불러오는 중입니다.</div>

      <template v-else-if="selectedApproval">
        <div class="detail-summary">
          <span class="badge">{{ dealTypeLabel(selectedApproval.dealType) }}</span>
          <span class="badge" :class="statusToneClass(selectedApproval.status)">
            {{ approvalStatusLabel(selectedApproval.status) }}
          </span>
          <span>승인 ID #{{ selectedApproval.approvalId }}</span>
          <span>문서 코드 {{ selectedApproval.displayCode }}</span>
        </div>

        <div class="detail-grid">
          <div class="detail-card">
            <h4>기본 정보</h4>
            <dl>
              <div><dt>대상 문서 ID</dt><dd>{{ selectedApproval.targetId }}</dd></div>
              <div><dt>거래처 스냅샷</dt><dd>{{ selectedApproval.clientIdSnapshot ?? '-' }}</dd></div>
              <div><dt>현재 상태</dt><dd>{{ approvalStatusLabel(selectedApproval.status) }}</dd></div>
              <div><dt>활성 단계</dt><dd>{{ selectedApproval.activeStep ? `${selectedApproval.activeStep.stepOrder}단계 · ${actorTypeLabel(selectedApproval.activeStep.actorType)}` : '없음' }}</dd></div>
            </dl>
          </div>

          <div class="detail-card">
            <h4>처리 액션</h4>
            <p class="detail-copy">
              상태가 `PENDING` 이고 현재 로그인 역할이 활성 단계의 처리 주체와 일치할 때만 결정 버튼이 노출됩니다.
            </p>
            <div class="detail-actions">
              <button
                v-if="canDecideApproval(selectedApproval)"
                type="button"
                class="btn approve-btn"
                @click="openDecisionModal(selectedApproval, 'APPROVE')"
              >
                {{ decisionButtonText(selectedApproval) }}
              </button>
              <button
                v-if="canDecideApproval(selectedApproval)"
                type="button"
                class="btn reject-btn"
                @click="openDecisionModal(selectedApproval, 'REJECT')"
              >
                반려
              </button>
              <button type="button" class="btn ghost-btn" @click="loadApprovalDetail(selectedApproval.approvalId, false)">
                다시 조회
              </button>
            </div>
          </div>
        </div>

        <section class="timeline-card">
          <div class="timeline-header">
            <h4>승인 타임라인</h4>
            <p>stepOrder 오름차순으로 표시됩니다.</p>
          </div>

          <ol class="timeline-list">
            <li v-for="step in selectedApproval.steps" :key="step.stepId" class="timeline-item">
              <div class="timeline-bullet" :class="stepToneClass(step.status)" />
              <div class="timeline-body">
                <div class="timeline-top">
                  <strong>{{ step.stepOrder }}단계 · {{ actorTypeLabel(step.actorType) }}</strong>
                  <span class="badge" :class="statusToneClass(step.status === 'WAITING' ? 'PENDING' : step.status)">
                    {{ stepStatusLabel(step.status) }}
                  </span>
                </div>
                <p class="timeline-meta">
                  결정: {{ step.decision ? decisionLabel(step.decision) : '미결정' }} · 결정자 ID: {{ step.decidedByUserId ?? '-' }} · 결정 시각: {{ formatDateTime(step.decidedAt) }}
                </p>
                <p v-if="step.reason" class="timeline-reason">사유: {{ step.reason }}</p>
              </div>
            </li>
          </ol>
        </section>
      </template>
    </ModalBase>

    <ModalBase
      v-model="decisionModalOpen"
      :title="decisionContext?.decision === 'REJECT' ? '반려 처리' : '승인 처리'"
      width-class="max-w-2xl"
      :close-on-backdrop="!decisionSubmitting"
      :close-on-esc="!decisionSubmitting"
    >
      <div v-if="decisionContext" class="modal-form">
        <div class="decision-summary">
          <p class="decision-title">{{ decisionContext.displayCode }}</p>
          <p class="decision-copy">
            {{ dealTypeLabel(decisionContext.dealType) }} · 승인 ID #{{ decisionContext.approvalId }} · 현재 {{ decisionContext.activeStep?.stepOrder }}단계 {{ actorTypeLabel(decisionContext.activeStep?.actorType) }}
          </p>
        </div>

        <label v-if="decisionContext.decision === 'REJECT'" class="filter-field">
          <span>반려 사유</span>
          <textarea
            v-model="decisionReason"
            rows="5"
            placeholder="반려 사유를 입력하세요."
          />
        </label>

        <p v-else class="detail-copy">
          이 요청을 승인하면 다음 단계로 진행되거나 최종 승인 상태로 변경됩니다.
        </p>

        <p v-if="decisionError" class="decision-error">{{ decisionError }}</p>
      </div>

      <template #footer>
        <div class="modal-footer-actions">
          <button type="button" class="btn ghost-btn" :disabled="decisionSubmitting" @click="decisionModalOpen = false">취소</button>
          <button
            type="button"
            class="btn"
            :class="decisionContext?.decision === 'REJECT' ? 'reject-btn' : 'approve-btn'"
            :disabled="decisionSubmitting"
            @click="submitDecision"
          >
            {{ decisionSubmitting ? '처리 중...' : decisionContext?.decision === 'REJECT' ? '반려 확정' : '승인 확정' }}
          </button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
.approval-page {
  color: var(--color-text-body);
}

.feedback-banner {
  margin-bottom: 16px;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 700;
}

.feedback-success {
  background: var(--color-olive-light);
  color: var(--color-olive-dark);
  border: 1px solid rgba(107, 124, 69, 0.2);
}

.feedback-error {
  background: #f6e4e4;
  color: var(--color-status-error);
  border: 1px solid rgba(184, 92, 92, 0.2);
}

.kpi-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-card {
  border: 1px solid var(--color-border-card);
  border-radius: 16px;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(247, 243, 236, 0.96) 0%, rgba(239, 234, 223, 0.92) 100%);
  box-shadow: var(--shadow-sm);
}

.kpi-number {
  color: var(--color-text-strong);
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.kpi-number-warn {
  color: var(--color-orange);
}

.kpi-label {
  margin-top: 8px;
  color: var(--color-text-sub);
  font-size: 12px;
  font-weight: 700;
}

.filter-panel,
.approval-board,
.timeline-card,
.detail-card {
  border: 1px solid var(--color-border-card);
  border-radius: 18px;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}

.filter-panel {
  margin-bottom: 20px;
  padding: 18px;
}

.tab-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.tab-chip {
  border: 1px solid var(--color-border-card);
  border-radius: 999px;
  background: var(--color-bg-input);
  color: var(--color-text-body);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
}

.tab-chip.active {
  border-color: var(--color-olive);
  background: var(--color-olive);
  color: #fff;
}

.filter-grid,
.form-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-field span {
  color: var(--color-text-sub);
  font-size: 12px;
  font-weight: 700;
}

.filter-field-wide {
  grid-column: span 2;
}

.filter-actions,
.modal-footer-actions,
.detail-actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-reset-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--color-orange-light, #F0C9A8);
  background: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
  box-shadow: none;
}

.filter-reset-btn:hover,
.filter-reset-btn:focus {
  border-color: var(--color-orange, #C8622A);
  background: var(--color-orange, #C8622A);
  color: #fff;
}

.filter-reset-btn:active {
  border-color: var(--color-orange-dark, #A34E20);
  background: var(--color-orange-dark, #A34E20);
  color: #fff;
}

.filter-reset-btn :deep(svg) {
  width: 20px;
  height: 20px;
  margin: 0;
  fill: currentColor;
}

.create-btn,
.approve-btn {
  background: var(--color-olive);
  color: #fff;
}

.create-btn:hover,
.approve-btn:hover {
  background: var(--color-olive-dark);
}

.ghost-btn {
  border: 1px solid var(--color-border-card);
  background: transparent;
  color: var(--color-text-body);
}

.ghost-btn:hover {
  background: var(--color-bg-section);
}

.reject-btn {
  border: 1px solid rgba(184, 92, 92, 0.2);
  background: rgba(184, 92, 92, 0.08);
  color: var(--color-status-error);
}

.reject-btn:hover {
  background: rgba(184, 92, 92, 0.14);
}

.approval-board {
  padding: 18px;
}

.loading-panel {
  padding: 36px 16px;
  text-align: center;
  color: var(--color-text-sub);
}

.approval-section + .approval-section {
  margin-top: 24px;
}

.section-header,
.timeline-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-accent {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.accent-admin {
  background: var(--color-orange);
}

.accent-client {
  background: var(--color-status-info);
}

.accent-done {
  background: var(--color-status-success);
}

.section-count,
.timeline-header p,
.footer-meta,
.detail-copy,
.timeline-meta,
.decision-copy {
  color: var(--color-text-sub);
  font-size: 12px;
}

.approval-list {
  display: grid;
  gap: 14px;
}

.approval-card {
  position: relative;
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-card);
  border-radius: 18px;
  padding: 18px 18px 18px 24px;
  background: linear-gradient(135deg, rgba(247, 243, 236, 0.98) 0%, rgba(250, 247, 243, 0.96) 100%);
  grid-template-columns: minmax(0, 1fr) 180px;
  overflow: hidden;
}

.approval-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
}

.rail-admin::before {
  background: var(--color-orange);
}

.rail-client::before {
  background: var(--color-status-info);
}

.rail-approved::before {
  background: var(--color-status-success);
}

.rail-closed::before {
  background: var(--color-status-error);
}

.card-main {
  min-width: 0;
  cursor: pointer;
}

.card-top,
.timeline-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.doc-code {
  margin-bottom: 4px;
  color: var(--color-text-sub);
  font-size: 12px;
  font-weight: 700;
}

.badge-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: var(--color-bg-section);
  color: var(--color-text-body);
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
}

.tone-pending {
  background: rgba(240, 201, 168, 0.45);
  color: var(--color-orange-dark);
}

.tone-approved {
  background: var(--color-olive-light);
  color: var(--color-olive-dark);
}

.tone-rejected {
  background: rgba(184, 92, 92, 0.12);
  color: var(--color-status-error);
}

.tone-canceled {
  background: rgba(154, 140, 126, 0.14);
  color: var(--color-text-sub);
}

.meta-grid {
  margin-top: 14px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.meta-grid dt,
.detail-card dt {
  color: var(--color-text-sub);
  font-size: 12px;
  font-weight: 700;
}

.meta-grid dd,
.detail-card dd {
  margin-top: 2px;
  color: var(--color-text-strong);
  font-weight: 700;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.board-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border-divider);
  flex-wrap: wrap;
}

.detail-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  color: var(--color-text-sub);
  font-size: 12px;
}

.detail-grid {
  display: grid;
  gap: 16px;
  margin-top: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-card {
  padding: 18px;
}

.detail-card h4,
.timeline-header h4 {
  margin-bottom: 10px;
  color: var(--color-text-strong);
}

.detail-card dl {
  display: grid;
  gap: 10px;
}

.timeline-card {
  margin-top: 16px;
  padding: 18px;
}

.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 12px;
}

.timeline-bullet {
  margin-top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid transparent;
}

.step-approved {
  background: var(--color-status-success);
}

.step-rejected {
  background: var(--color-status-error);
}

.step-waiting {
  background: var(--color-orange);
}

.timeline-body {
  border: 1px solid var(--color-border-divider);
  border-radius: 14px;
  padding: 14px;
  background: var(--color-bg-input);
}

.timeline-reason,
.decision-error {
  margin-top: 8px;
  color: var(--color-status-error);
  font-size: 13px;
  font-weight: 700;
}

.modal-form {
  display: grid;
  gap: 16px;
}

.decision-summary {
  border: 1px solid var(--color-border-divider);
  border-radius: 14px;
  padding: 14px;
  background: var(--color-bg-input);
}

.decision-title {
  color: var(--color-text-strong);
  font-size: 15px;
  font-weight: 700;
}

@media (max-width: 1120px) {
  .kpi-grid,
  .filter-grid,
  .form-grid,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-field-wide {
    grid-column: span 2;
  }
}

@media (max-width: 860px) {
  .approval-card {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .card-actions .btn {
    flex: 1 1 140px;
  }
}

@media (max-width: 640px) {
  .kpi-grid,
  .filter-grid,
  .form-grid,
  .detail-grid,
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .filter-field-wide {
    grid-column: span 1;
  }

  .section-header,
  .timeline-header,
  .card-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .badge-row {
    justify-content: flex-start;
  }
}
</style>
