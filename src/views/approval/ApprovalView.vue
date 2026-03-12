<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CdrButton, IconRefresh } from '@rei/cedar'
import PageHeader from '@/components/common/PageHeader.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import { decideApprovalStep, getApprovalDetail, searchApprovals } from '@/api/approval'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const authStore = useAuthStore()
const documentStore = useDocumentStore()

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']
const DEAL_TYPE_OPTIONS = ['QUO', 'CNT', 'ORD']
const DECISION_ROLE_MAP = {
  [ROLES.SALES_REP]: 'SALES_REP',
  [ROLES.ADMIN]: 'ADMIN',
  [ROLES.CLIENT]: 'CLIENT',
}

const filterForm = reactive({
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
const detailError = ref('')
const selectedApproval = ref(null)
const selectedApprovalId = ref(null)
const selectedDocumentDetail = ref(null)

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
  if (dealType === 'ORD') return '주문서'
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
  if (actorType === 'SALES_REP') return '영업사원'
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

const firstFilledValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '')

const detailClientInfo = computed(() => {
  const documentDetail = selectedDocumentDetail.value
  if (documentDetail) {
    return {
      clientCode: firstFilledValue(documentDetail.client?.code, documentDetail.clientId, '-'),
      clientName: firstFilledValue(documentDetail.client?.name, documentDetail.clientName, '-'),
      managerName: firstFilledValue(
        documentDetail.client?.contact,
        documentDetail.client?.managerName,
        documentDetail.authorName,
        documentDetail.salesRepName,
        '-',
      ),
    }
  }

  const approval = selectedApproval.value
  const snapshot = approval?.targetSnapshot
    || approval?.documentSnapshot
    || approval?.targetDocumentSnapshot
    || approval?.targetDocument
    || approval?.target
    || {}
  const client = snapshot?.client || approval?.client || {}

  return {
    clientCode: firstFilledValue(
      client.code,
      client.clientCode,
      snapshot.clientCode,
      snapshot.clientId,
      approval?.clientIdSnapshot,
      '-',
    ),
    clientName: firstFilledValue(
      client.name,
      client.clientName,
      snapshot.clientName,
      approval?.clientNameSnapshot,
      '-',
    ),
    managerName: firstFilledValue(
      client.managerName,
      client.contact,
      client.manager,
      snapshot.managerName,
      snapshot.clientManagerName,
      snapshot.contact,
      approval?.clientManagerNameSnapshot,
      '-',
    ),
  }
})

const detailItems = computed(() => {
  const documentDetail = selectedDocumentDetail.value
  if (Array.isArray(documentDetail?.items)) {
    return documentDetail.items.map((item, index) => ({
      key: firstFilledValue(item.id, item.itemId, item.productId, `${documentDetail.id || 'document'}-${index}`),
      variety: firstFilledValue(item.variety, item.productCategory, item.varietyName, '-'),
      name: firstFilledValue(item.name, item.productName, item.itemName, '-'),
      quantity: firstFilledValue(item.quantity, item.qty, item.count, 0),
      unit: firstFilledValue(item.unit, item.unitName, '-'),
      price: Number(firstFilledValue(item.unitPrice, item.price, item.amount, 0) || 0),
    }))
  }

  const approval = selectedApproval.value
  const snapshot = approval?.targetSnapshot
    || approval?.documentSnapshot
    || approval?.targetDocumentSnapshot
    || approval?.targetDocument
    || approval?.target
    || {}
  const rawItems = snapshot?.items || snapshot?.lineItems || approval?.items || []

  return Array.isArray(rawItems)
    ? rawItems.map((item, index) => ({
      key: firstFilledValue(item.id, item.itemId, item.productId, `${approval?.approvalId || 'approval'}-${index}`),
      variety: firstFilledValue(item.variety, item.category, item.varietyName, '-'),
      name: firstFilledValue(item.name, item.productName, item.itemName, '-'),
      quantity: firstFilledValue(item.quantity, item.qty, item.count, 0),
      unit: firstFilledValue(item.unit, item.unitName, '-'),
      price: Number(firstFilledValue(item.unitPrice, item.price, item.amount, 0) || 0),
    }))
    : []
})

const detailItemsTotal = computed(() => detailItems.value
  .reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0))

const approvalSortWeight = (approval) => {
  if (approval.status === 'PENDING') {
    if (approval.activeStep?.actorType === 'SALES_REP') return 0
    if (approval.activeStep?.actorType === 'ADMIN') return 1
    if (approval.activeStep?.actorType === 'CLIENT') return 2
    return 3
  }

  return 4
}

const compareApprovals = (left, right) => {
  const weightDiff = approvalSortWeight(left) - approvalSortWeight(right)
  if (weightDiff !== 0) {
    return weightDiff
  }

  return Number(right.approvalId || 0) - Number(left.approvalId || 0)
}

const buildSearchParams = (pageNumber, size) => ({
  page: pageNumber,
  size,
  sort: 'approvalId,desc',
  ...(appliedFilters.status !== 'ALL' ? { status: appliedFilters.status } : {}),
  ...(appliedFilters.dealType !== 'ALL' ? { dealType: appliedFilters.dealType } : {}),
  ...(appliedFilters.targetId ? { targetId: Number(appliedFilters.targetId) } : {}),
})

const fetchApprovalPage = async (pageNumber, size) => {
  const data = await searchApprovals(buildSearchParams(pageNumber, size))

  return {
    ...data,
    content: Array.isArray(data?.content) ? data.content.map(normalizeApproval) : [],
    totalElements: Number(data?.totalElements || 0),
    totalPages: Number(data?.totalPages || 1),
    number: Number(data?.number || pageNumber),
    size: Number(data?.size || size),
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
    AP010: '현재 승인 기능은 QUO, CNT, ORD 문서를 지원합니다.',
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
    const matchesKeyword = !keyword
      || String(approval.approvalId).toLowerCase().includes(keyword)
      || String(approval.targetId).toLowerCase().includes(keyword)
      || String(approval.displayCode).toLowerCase().includes(keyword)

    return matchesKeyword
  })
})

const groupedApprovals = computed(() => ({
  salesRep: filteredApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'SALES_REP'),
  admin: filteredApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'ADMIN'),
  client: filteredApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'CLIENT'),
  done: filteredApprovals.value.filter((approval) => approval.status !== 'PENDING'),
}))

const stats = computed(() => ({
  total: listResponse.value.totalElements || 0,
  salesRep: serverApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'SALES_REP').length,
  admin: serverApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'ADMIN').length,
  client: serverApprovals.value.filter((approval) => approval.status === 'PENDING' && approval.activeStep?.actorType === 'CLIENT').length,
  done: serverApprovals.value.filter((approval) => approval.status !== 'PENDING').length,
}))

const totalPages = computed(() => Math.max(1, listResponse.value.totalPages || 1))

const pageSubtitle = computed(() => {
  if (currentRole.value === ROLES.SALES_REP) {
    return '주문 승인 요청을 조회하고 승인 또는 반려할 수 있습니다.'
  }

  return '단계별 검토와 반려 처리를 한 화면에서 관리합니다.'
})

const kpiCards = computed(() => {
  if (currentRole.value === ROLES.SALES_REP) {
    return [
      { key: 'total', value: stats.value.total, label: '검색 결과 전체' },
      { key: 'salesRep', value: stats.value.salesRep, label: '영업 단계 대기' },
      { key: 'done', value: stats.value.done, label: '완료/반려' },
    ]
  }

  if (currentRole.value === ROLES.CLIENT) {
    return [
      { key: 'total', value: stats.value.total, label: '검색 결과 전체' },
      { key: 'client', value: stats.value.client, label: '거래처 단계 대기' },
      { key: 'done', value: stats.value.done, label: '완료/반려' },
    ]
  }

  return [
    { key: 'total', value: stats.value.total, label: '검색 결과 전체' },
    { key: 'admin', value: stats.value.admin, label: '관리자 단계 대기' },
    { key: 'client', value: stats.value.client, label: '거래처 단계 대기' },
    { key: 'done', value: stats.value.done, label: '완료/반려' },
  ]
})

const getDecisionStepForActor = (approval, actorType = currentActorType.value) => {
  if (!approval || !actorType) {
    return null
  }

  const steps = Array.isArray(approval.steps) ? approval.steps : []

  if (actorType === 'ADMIN') {
    return steps.find((step) =>
      step.stepOrder === 1
      && step.actorType === 'ADMIN'
      && step.status === 'WAITING',
    ) || null
  }

  if (actorType === 'CLIENT') {
    return steps.find((step) =>
      step.stepOrder === 2
      && step.actorType === 'CLIENT'
      && step.status === 'WAITING',
    ) || null
  }

  if (actorType === 'SALES_REP') {
    return steps.find((step) =>
      step.stepOrder === 1
      && step.actorType === 'SALES_REP'
      && step.status === 'WAITING',
    ) || null
  }

  return null
}

const canDecideApproval = (approval) => {
  if (!approval || approval.status !== 'PENDING') {
    return false
  }

  const decisionStep = getDecisionStepForActor(approval)

  if (!decisionStep?.stepId || !currentActorType.value) {
    return false
  }

  return decisionStep.actorType === currentActorType.value
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
    const batchSize = 100
    const firstPage = await fetchApprovalPage(0, batchSize)
    const totalPagesToFetch = Math.max(1, firstPage.totalPages)
    const remainingPages = totalPagesToFetch > 1
      ? await Promise.all(
        Array.from({ length: totalPagesToFetch - 1 }, (_, index) => fetchApprovalPage(index + 1, batchSize)),
      )
      : []
    const mergedApprovals = [firstPage, ...remainingPages]
      .flatMap((response) => response.content)
      .sort(compareApprovals)
    const totalElements = mergedApprovals.length
    const derivedTotalPages = Math.max(1, Math.ceil(totalElements / pageSize))
    const safePage = Math.min(page.value, derivedTotalPages)
    const startIndex = (safePage - 1) * pageSize

    page.value = safePage
    listResponse.value = {
      ...firstPage,
      content: mergedApprovals.slice(startIndex, startIndex + pageSize),
      totalElements,
      totalPages: derivedTotalPages,
      number: safePage - 1,
      size: pageSize,
    }
  } catch (error) {
    listError.value = parseApprovalError(error, '승인 목록을 불러오지 못했습니다.')
  } finally {
    listLoading.value = false
  }
}

const loadApprovalDetail = async (approvalOrId, openModal = true) => {
  const approvalId = typeof approvalOrId === 'object' ? approvalOrId?.approvalId : approvalOrId
  const fallbackApproval = approvalOrId && typeof approvalOrId === 'object'
    ? normalizeApproval(approvalOrId)
    : null

  detailLoading.value = true
  detailError.value = ''
  selectedApprovalId.value = approvalId
  selectedDocumentDetail.value = null
  if (fallbackApproval) {
    selectedApproval.value = fallbackApproval
  }

  if (openModal) {
    detailModalOpen.value = true
  }

  try {
    const data = await getApprovalDetail(approvalId)
    const normalizedApproval = normalizeApproval(data)
    selectedApproval.value = normalizedApproval
  } catch (error) {
    console.error('승인 상세 로드 에러:', error)
    selectedDocumentDetail.value = null
    detailError.value = parseApprovalError(error, '승인 상세 정보를 불러오지 못했습니다.')
    if (!selectedApproval.value) {
      showFeedback('error', detailError.value)
    }
    detailLoading.value = false
    return
  }

  try {
    if (selectedApproval.value?.targetId) {
      if (selectedApproval.value.dealType === 'QUO') {
        selectedDocumentDetail.value = await documentStore.fetchQuotationDetail(selectedApproval.value.targetId)
      } else if (selectedApproval.value.dealType === 'CNT') {
        selectedDocumentDetail.value = await documentStore.fetchContractDetail(selectedApproval.value.targetId)
      } else if (selectedApproval.value.dealType === 'ORD') {
        selectedDocumentDetail.value = await documentStore.fetchOrderDetail(selectedApproval.value.targetId)
      }

      if (
        selectedApproval.value.dealType === 'ORD'
        && !selectedDocumentDetail.value
      ) {
        detailError.value = '주문서 상세 정보를 불러오지 못했습니다. 승인 타임라인은 계속 확인할 수 있습니다.'
      }
    }
  } catch (error) {
    console.error('문서 상세 로드 에러:', error)
    selectedDocumentDetail.value = null
    detailError.value = '문서 상세 정보를 불러오지 못했습니다. 승인 타임라인은 계속 확인할 수 있습니다.'
  } finally {
    detailLoading.value = false
  }
}

const openDetail = async (approval) => {
  clearFeedback()
  await loadApprovalDetail(approval, true)
}

const openDecisionModal = async (approval, decision) => {
  decisionReason.value = ''
  decisionError.value = ''
  clearFeedback()

  try {
    const latestApproval = approval?.approvalId
      ? normalizeApproval(await getApprovalDetail(approval.approvalId))
      : approval
    const decisionStep = getDecisionStepForActor(latestApproval)

    if (!decisionStep?.stepId) {
      showFeedback('error', '현재 사용자에게 처리 가능한 승인 단계가 없습니다.')
      return
    }

    decisionModalOpen.value = true
    decisionContext.value = {
      ...latestApproval,
      activeStep: decisionStep,
      decision,
    }
  } catch (error) {
    showFeedback('error', parseApprovalError(error, '승인 정보를 최신 상태로 불러오지 못했습니다.'))
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

  if (approval.activeStep?.actorType === 'SALES_REP') {
    return 'rail-sales'
  }

  return approval.activeStep?.actorType === 'CLIENT' ? 'rail-client' : 'rail-admin'
}

const sectionList = computed(() => {
  if (currentRole.value === ROLES.SALES_REP) {
    return [
      { key: 'sales-rep', title: '영업 승인 대기', accent: 'accent-sales', items: groupedApprovals.value.salesRep },
      { key: 'done', title: '완료/반려', accent: 'accent-done', items: groupedApprovals.value.done },
    ]
  }

  if (currentRole.value === ROLES.CLIENT) {
    return [
      { key: 'client', title: '거래처 승인 대기', accent: 'accent-client', items: groupedApprovals.value.client },
      { key: 'done', title: '완료/반려', accent: 'accent-done', items: groupedApprovals.value.done },
    ]
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
    <PageHeader title="승인 관리" :subtitle="pageSubtitle" />

    <div v-if="feedback.message" class="feedback-banner" :class="feedback.tone === 'success' ? 'feedback-success' : 'feedback-error'">
      {{ feedback.message }}
    </div>

    <section class="kpi-grid">
      <article v-for="card in kpiCards" :key="card.key" class="kpi-card">
        <p class="kpi-number">{{ card.value }}</p>
        <p class="kpi-label">{{ card.label }}</p>
      </article>
    </section>

    <section class="filter-panel">
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

        <div class="filter-search-row filter-field-wide">
          <label class="filter-field filter-search-field">
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
            </div>

            <div class="approval-list">
              <article
                v-for="approval in section.items"
                :key="approval.approvalId"
                class="approval-card"
                :class="railClass(approval)"
              >
                <div class="card-main" role="button" tabindex="0" @click="openDetail(approval)" @keydown.enter.prevent="openDetail(approval)">
                  <div class="card-top">
                    <div>
                      <p class="doc-code">{{ approval.displayCode }}</p>
                      <h4>{{ dealTypeLabel(approval.dealType) }} 승인 요청</h4>
                    </div>

                    <div class="badge-row">
                      <span v-if="approval.activeStep?.actorType" class="badge">{{ actorTypeLabel(approval.activeStep.actorType) }}</span>
                      <span class="badge" :class="statusToneClass(approval.status)">
                        {{ approvalStatusLabel(approval.status) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="card-actions">
                  <button type="button" class="btn ghost-btn" @click="openDetail(approval)">상세보기</button>
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
        <div v-if="detailError" class="detail-inline-error">
          {{ detailError }}
        </div>

        <div class="detail-summary">
          <span class="badge">{{ dealTypeLabel(selectedApproval.dealType) }}</span>
          <span class="badge" :class="statusToneClass(selectedApproval.status)">
            {{ approvalStatusLabel(selectedApproval.status) }}
          </span>
          <span>승인 ID #{{ selectedApproval.approvalId }}</span>
          <span>문서 코드 {{ selectedDocumentDetail?.displayCode || selectedApproval.displayCode }}</span>
        </div>

        <div class="detail-grid">
          <div class="detail-card">
            <h4>거래처 및 담당자</h4>
            <div class="detail-info-grid">
              <div>
                <dt>거래처 코드</dt>
                <dd>{{ detailClientInfo.clientCode }}</dd>
              </div>
              <div>
                <dt>법인명</dt>
                <dd>{{ detailClientInfo.clientName }}</dd>
              </div>
              <div>
                <dt>담당자</dt>
                <dd>{{ detailClientInfo.managerName }}</dd>
              </div>
              <div>
                <dt>문서 코드</dt>
                <dd>{{ selectedDocumentDetail?.displayCode || selectedApproval.displayCode }}</dd>
              </div>
            </div>
          </div>

          <div class="detail-card detail-card-wide">
            <h4>세부 품목 내역</h4>
            <div class="detail-table-wrap">
              <table class="detail-items-table">
                <thead>
                  <tr>
                    <th>품종명</th>
                    <th>상품명</th>
                    <th>수량</th>
                    <th>단위</th>
                    <th>단가</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in detailItems" :key="item.key">
                    <td>{{ item.variety }}</td>
                    <td class="detail-item-name">{{ item.name }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.unit }}</td>
                    <td class="detail-item-price">{{ Number(item.price || 0).toLocaleString() }}</td>
                  </tr>
                  <tr v-if="detailItems.length === 0">
                    <td colspan="5" class="detail-empty-row">표시할 품목 정보가 없습니다.</td>
                  </tr>
                </tbody>
                <tfoot v-if="detailItems.length > 0">
                  <tr>
                    <td colspan="4">총 합계</td>
                    <td class="detail-item-price">{{ detailItemsTotal.toLocaleString() }}</td>
                  </tr>
                </tfoot>
              </table>
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

        <div v-if="canDecideApproval(selectedApproval)" class="detail-sticky-actions">
          <button
            type="button"
            class="btn approve-btn"
            @click="openDecisionModal(selectedApproval, 'APPROVE')"
          >
            {{ decisionButtonText(selectedApproval) }}
          </button>
          <button
            type="button"
            class="btn reject-btn"
            @click="openDecisionModal(selectedApproval, 'REJECT')"
          >
            반려
          </button>
        </div>
      </template>

      <div v-else-if="detailError" class="loading-panel">
        {{ detailError }}
      </div>
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

.filter-grid,
.form-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.filter-grid {
  grid-template-columns: minmax(0, 148px) minmax(0, 148px) minmax(0, 148px) minmax(0, 1fr);
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
  grid-column: span 1;
}

.filter-search-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.filter-search-field {
  flex: 1 1 auto;
}

.filter-actions,
.modal-footer-actions,
.detail-actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.modal-footer-actions {
  justify-content: flex-end;
  width: 100%;
}

.modal-footer-actions .btn {
  flex: 0 0 auto;
  min-width: 96px;
  white-space: nowrap;
}

.detail-sticky-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border-divider);
}

.detail-sticky-actions .btn {
  min-width: 96px;
  white-space: nowrap;
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

.accent-sales {
  background: var(--color-olive-dark);
}

.accent-client {
  background: var(--color-status-info);
}

.accent-done {
  background: var(--color-status-success);
}

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
  gap: 12px;
  border: 1px solid var(--color-border-card);
  border-radius: 18px;
  padding: 14px 14px 14px 20px;
  background: linear-gradient(135deg, rgba(247, 243, 236, 0.98) 0%, rgba(250, 247, 243, 0.96) 100%);
  grid-template-columns: minmax(0, 1fr) 148px;
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

.rail-sales::before {
  background: var(--color-olive-dark);
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
  margin-bottom: 2px;
  color: var(--color-text-sub);
  font-size: 11px;
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

.detail-card dt {
  color: var(--color-text-sub);
  font-size: 12px;
  font-weight: 700;
}

.detail-card dd {
  margin-top: 2px;
  color: var(--color-text-strong);
  font-weight: 700;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}

.card-actions .btn {
  align-self: center;
  width: auto;
  min-width: 88px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.25;
}

.card-actions .ghost-btn {
  padding-inline: 8px;
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

.detail-inline-error {
  margin-bottom: 14px;
  border: 1px solid rgba(184, 92, 92, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  background: #f6e4e4;
  color: var(--color-status-error);
  font-size: 12px;
  font-weight: 700;
}

.detail-grid {
  display: grid;
  gap: 16px;
  margin-top: 16px;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
}

.detail-card {
  padding: 18px;
}

.detail-card-wide {
  min-width: 0;
}

.detail-card h4,
.timeline-header h4 {
  margin-bottom: 10px;
  color: var(--color-text-strong);
}

.detail-info-grid {
  display: grid;
  gap: 10px;
}

.detail-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border-divider);
  border-radius: 14px;
  background: var(--color-bg-input);
}

.detail-items-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
}

.detail-items-table thead {
  background: var(--color-bg-section);
}

.detail-items-table th,
.detail-items-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-divider);
  text-align: left;
  font-size: 13px;
}

.detail-items-table th {
  color: var(--color-text-sub);
  font-weight: 700;
}

.detail-items-table td {
  color: var(--color-text-body);
}

.detail-item-name {
  font-weight: 700;
  color: var(--color-text-strong);
}

.detail-item-price {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

.detail-empty-row {
  text-align: center !important;
  color: var(--color-text-sub) !important;
  padding: 24px 14px !important;
}

.detail-items-table tfoot td {
  background: var(--color-bg-section);
  font-weight: 700;
  border-bottom: none;
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
  .detail-grid {
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
