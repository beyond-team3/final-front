<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdrButton, IconRefresh } from '@rei/cedar'
import PageHeader from '@/components/common/PageHeader.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import HistoryModal from '@/components/history/HistoryModal.vue'
import { decideApprovalStep, getApprovalDetail, searchApprovals } from '@/api/approval'
import { getOrder as getOrderApi } from '@/api/document'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { useEmployeeStore } from '@/stores/employee'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()
const employeeStore = useEmployeeStore()

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']
const DEAL_TYPE_OPTIONS = ['QUO', 'CNT', 'ORD']
const DECISION_ROLE_MAP = {
  [ROLES.SALES_REP]: 'SALES_REP',
  [ROLES.ADMIN]: 'ADMIN',
  [ROLES.CLIENT]: 'CLIENT',
}

const TARGET_TYPE_TO_DEAL_TYPE = {
  QUOTATION: 'QUO',
  CONTRACT: 'CNT',
  ORDER: 'ORD',
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
const selectedContractDetail = ref(null)

const decisionSubmitting = ref(false)
const decisionReason = ref('')
const decisionContext = ref(null)
const decisionError = ref('')
let filterApplyTimer = null
const notificationModalHandled = ref(false)

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

const formatCurrency = (value) => Number(value || 0).toLocaleString()

const unwrapApiData = (response) => {
  if (!response) return null
  if (response.result === 'SUCCESS') return response.data
  if (response.data !== undefined) return response.data
  return response
}

const unwrapApprovalPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  if (Array.isArray(payload.content)) {
    return payload
  }

  if (payload.result === 'SUCCESS' && payload.data) {
    return unwrapApprovalPayload(payload.data)
  }

  if (payload.data && typeof payload.data === 'object') {
    return unwrapApprovalPayload(payload.data)
  }

  return payload
}

const fetchOrderApprovalDetail = async (orderId) => {
  if (typeof documentStore.fetchOrderDetail === 'function') {
    return documentStore.fetchOrderDetail(orderId)
  }

  const raw = unwrapApiData(await getOrderApi(orderId))
  if (!raw) return null

  return {
    ...raw,
    id: raw.orderId || raw.id || orderId,
    displayCode: raw.displayCode || raw.orderCode || `ORD-${orderId}`,
    items: Array.isArray(raw.items) ? raw.items : [],
  }
}

const approvalSnapshot = computed(() => {
  const approval = selectedApproval.value
  return approval?.targetSnapshot
    || approval?.documentSnapshot
    || approval?.targetDocumentSnapshot
    || approval?.targetDocument
    || approval?.target
    || {}
})

const detailDocumentSource = computed(() => {
  const snapshot = approvalSnapshot.value || {}
  const detail = selectedDocumentDetail.value || {}

  return {
    ...snapshot,
    ...detail,
    client: {
      ...(snapshot.client || {}),
      ...(detail.client || {}),
    },
    contract: {
      ...(snapshot.contract || {}),
      ...(detail.contract || {}),
    },
    contractSnapshot: {
      ...(snapshot.contractSnapshot || {}),
      ...(detail.contractSnapshot || {}),
    },
  }
})

const detailClientMasterRecord = computed(() => {
  const source = detailDocumentSource.value || {}
  const clientId = firstFilledValue(source.clientId, selectedApproval.value?.clientIdSnapshot, null)
  if (clientId === null || clientId === undefined) {
    return null
  }

  return documentStore.clientMaster.find((client) => String(client.id) === String(clientId)) || null
})

const detailEmployeeRecord = computed(() => {
  const source = detailDocumentSource.value || {}
  const employeeId = firstFilledValue(source.employeeId, source.salesRepId, null)
  const currentUserName = firstFilledValue(
    authStore.me?.targetPerson,
    authStore.me?.employeeName,
    authStore.me?.name,
    authStore.me?.loginId,
    null,
  )
  const currentUserEmployeeId = firstFilledValue(authStore.me?.employeeId, authStore.me?.refId, authStore.me?.id, null)

  if (currentRole.value === ROLES.SALES_REP && currentUserName) {
    return {
      id: currentUserEmployeeId,
      name: currentUserName,
    }
  }

  if (employeeId === null || employeeId === undefined) {
    return null
  }

  return employeeStore.getEmployeeById(employeeId) || null
})

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
  const snapshot = approvalSnapshot.value
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

const detailPartyFields = computed(() => {
  const source = detailDocumentSource.value || {}
  const client = source.client || {}

  return [
    {
      label: '법인명',
      value: firstFilledValue(
        source.clientName,
        client.name,
        detailClientMasterRecord.value?.name,
        selectedApproval.value?.clientNameSnapshot,
        detailClientInfo.value.clientName,
        '-',
      ),
    },
    {
      label: '영업 담당자',
      value: firstFilledValue(
        selectedContractDetail.value?.salesRepName,
        selectedContractDetail.value?.authorName,
        selectedContractDetail.value?.managerName,
        source.salesRepName,
        source.authorName,
        source.managerName,
        source.writerName,
        detailEmployeeRecord.value?.name,
        selectedApproval.value?.salesRepNameSnapshot,
        '-',
      ),
    },
  ]
})

const detailOrderFields = computed(() => {
  if (selectedApproval.value?.dealType !== 'ORD') {
    return []
  }

  const source = detailDocumentSource.value || {}

  return [
    { label: '주문서 코드', value: firstFilledValue(source.displayCode, source.orderCode, selectedApproval.value?.displayCode, '-') },
    {
      label: '계약서 코드',
      value: firstFilledValue(
        source.contractCode,
        source.headerCode,
        source.contractName,
        selectedContractDetail.value?.displayCode,
        selectedContractDetail.value?.contractCode,
        source.contract?.displayCode,
        source.contract?.contractCode,
        source.contractSnapshot?.displayCode,
        source.contractSnapshot?.contractCode,
        approvalSnapshot.value?.contractCode,
        approvalSnapshot.value?.headerCode,
        '-',
      ),
    },
    { label: '주문 상태', value: firstFilledValue(source.status, '-') },
    { label: '주문일', value: formatDateTime(firstFilledValue(source.createdAt, source.orderDate, source.date, null)) },
  ]
})

const detailDeliveryFields = computed(() => {
  if (selectedApproval.value?.dealType !== 'ORD') {
    return []
  }

  const source = detailDocumentSource.value || {}
  const shippingAddress = [
    firstFilledValue(source.shippingAddress, source.deliveryAddress, ''),
    firstFilledValue(source.shippingAddressDetail, source.deliveryAddressDetail, ''),
  ].filter(Boolean).join(' ')

  return [
    { label: '배송지', value: shippingAddress || '-' },
    { label: '수령인', value: firstFilledValue(source.shippingName, source.deliveryRecipient, detailClientInfo.value.managerName, '-') },
    { label: '연락처', value: firstFilledValue(source.shippingPhone, source.deliveryPhone, source.clientContact, '-') },
    { label: '배송 요청사항', value: firstFilledValue(source.deliveryRequest, source.memo, source.requirements, '-') },
  ]
})

const detailInternalMemo = computed(() => {
  const source = detailDocumentSource.value || {}
  return firstFilledValue(source.memo, source.deliveryRequest, '')
})

const detailItems = computed(() => {
  const documentItems = Array.isArray(selectedDocumentDetail.value?.items) ? selectedDocumentDetail.value.items : []
  const snapshotItems = Array.isArray(approvalSnapshot.value?.items)
    ? approvalSnapshot.value.items
    : (Array.isArray(approvalSnapshot.value?.lineItems) ? approvalSnapshot.value.lineItems : [])
  const contractItems = Array.isArray(selectedContractDetail.value?.items) ? selectedContractDetail.value.items : []
  const fallbackItems = Array.isArray(selectedApproval.value?.items) ? selectedApproval.value.items : []
  const baseItems = snapshotItems.length > 0 ? snapshotItems : fallbackItems
  const maxLength = Math.max(documentItems.length, baseItems.length)
  const orderTotalAmount = Number(firstFilledValue(selectedDocumentDetail.value?.totalAmount, approvalSnapshot.value?.totalAmount, 0) || 0)

  return Array.from({ length: maxLength }, (_, index) => {
    const baseItem = baseItems[index] || {}
    const detailItem = documentItems[index] || {}
    const matchedContractItem = contractItems.find((item) =>
      String(item.detailId ?? item.contractDetailId ?? item.id ?? '') === String(detailItem.contractDetailId ?? baseItem.contractDetailId ?? ''),
    ) || contractItems[index] || {}
    const mergedItem = { ...matchedContractItem, ...baseItem, ...detailItem }
    const quantity = Number(firstFilledValue(mergedItem.quantity, mergedItem.qty, mergedItem.count, 0) || 0)
    const unitPrice = Number(firstFilledValue(mergedItem.unitPrice, mergedItem.price, 0) || 0)
    let amount = Number(firstFilledValue(mergedItem.amount, quantity * unitPrice, 0) || 0)

    if (amount === 0 && maxLength === 1 && orderTotalAmount > 0) {
      amount = orderTotalAmount
    }

    return {
      key: firstFilledValue(
        mergedItem.id,
        mergedItem.itemId,
        mergedItem.productId,
        `${selectedApproval.value?.approvalId || 'approval'}-${index}`,
      ),
      name: firstFilledValue(
        mergedItem.name,
        mergedItem.productName,
        mergedItem.itemName,
        matchedContractItem.productName,
        mergedItem.productCode,
        '-',
      ),
      quantity,
      unit: firstFilledValue(mergedItem.unit, mergedItem.unitName, matchedContractItem.unit, '립'),
      amount,
    }
  })
})

const detailItemsTotal = computed(() => detailItems.value
  .reduce((sum, item) => sum + Number(item.amount || 0), 0))

const detailDocumentTypeKey = computed(() => {
  const dealType = String(selectedApproval.value?.dealType || '').toUpperCase()
  if (dealType === 'QUO') return 'quotation'
  if (dealType === 'CNT') return 'contract'
  if (dealType === 'ORD') return 'order'
  return ''
})

const previewSource = computed(() => detailDocumentSource.value || {})

const previewPdfUrl = computed(() => firstFilledValue(
  previewSource.value?.pdfUrl,
  previewSource.value?.pdfURL,
  previewSource.value?.fileUrl,
  previewSource.value?.fileURL,
  previewSource.value?.documentUrl,
  previewSource.value?.documentURL,
  previewSource.value?.previewUrl,
  previewSource.value?.previewURL,
  previewSource.value?.attachmentUrl,
  previewSource.value?.attachmentURL,
  selectedDocumentDetail.value?.pdfUrl,
  selectedDocumentDetail.value?.fileUrl,
  selectedDocumentDetail.value?.documentUrl,
  null,
))

const previewMode = computed(() => {
  if (previewPdfUrl.value) return 'pdf'
  if (previewHasRenderableDocument.value) return 'generated'
  return 'placeholder'
})

const previewHasRenderableDocument = computed(() => (
  ['quotation', 'contract', 'order'].includes(detailDocumentTypeKey.value)
  && (detailItems.value.length > 0 || Object.keys(previewSource.value).length > 0)
))

const previewDocumentCode = computed(() => firstFilledValue(
  selectedDocumentDetail.value?.displayCode,
  previewSource.value?.displayCode,
  previewSource.value?.quotationCode,
  previewSource.value?.contractCode,
  previewSource.value?.orderCode,
  selectedApproval.value?.displayCode,
  '-',
))

const previewResolvedMemberName = computed(() => firstFilledValue(
  selectedContractDetail.value?.salesRepName,
  selectedContractDetail.value?.authorName,
  previewSource.value?.salesRepName,
  previewSource.value?.authorName,
  previewSource.value?.managerName,
  previewSource.value?.writerName,
  detailEmployeeRecord.value?.name,
  detailClientInfo.value?.managerName,
  '-',
))

const detailDocumentFields = computed(() => {
  const source = previewSource.value || {}
  const approval = selectedApproval.value || {}
  const commonFields = [
    { label: '문서 코드', value: previewDocumentCode.value },
    { label: '문서 유형', value: dealTypeLabel(approval.dealType) },
    {
      label: '문서 상태',
      value: firstFilledValue(source.status, approvalStatusLabel(approval.status), '-'),
    },
    {
      label: '작성/요청 일시',
      value: formatDateTime(firstFilledValue(source.createdAt, source.date, approval.createdAt, null)),
    },
  ]

  if (approval.dealType === 'CNT') {
    commonFields.push(
      { label: '계약 시작일', value: formatDateTime(firstFilledValue(source.startDate, null)) },
      { label: '계약 종료일', value: formatDateTime(firstFilledValue(source.endDate, null)) },
      { label: '청구 주기', value: firstFilledValue(source.billingCycle, '-') },
    )
  }

  if (approval.dealType === 'ORD') {
    commonFields.push(
      { label: '계약서 코드', value: firstFilledValue(detailOrderFields.value.find((field) => field.label === '계약서 코드')?.value, '-') },
      { label: '배송지', value: firstFilledValue(detailDeliveryFields.value.find((field) => field.label === '배송지')?.value, '-') },
    )
  }

  return commonFields
})

const detailItemSummaryFields = computed(() => {
  const totalQuantity = detailItems.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  return [
    { label: '품목 수', value: `${detailItems.value.length}건` },
    { label: '총 수량', value: `${formatCurrency(totalQuantity)}` },
    { label: '총 합계', value: `${formatCurrency(detailItemsTotal.value)}원` },
  ]
})

const detailApprovalInfoFields = computed(() => {
  const approval = selectedApproval.value || {}
  const currentStep = approval.activeStep
  const lastCompletedStep = [...(approval.steps || [])]
    .filter((step) => step.status !== 'WAITING')
    .sort((left, right) => (right.stepOrder || 0) - (left.stepOrder || 0))[0]
  const rejectedStep = [...(approval.steps || [])]
    .filter((step) => step.status === 'REJECTED')
    .sort((left, right) => (right.stepOrder || 0) - (left.stepOrder || 0))[0]

  return [
    { label: '승인 ID', value: `#${approval.approvalId || '-'}` },
    { label: '대상 문서 ID', value: firstFilledValue(approval.targetId, '-') },
    { label: '현재 상태', value: approvalStatusLabel(approval.status) },
    {
      label: '승인 요청 시각',
      value: formatDateTime(firstFilledValue(approval.createdAt, approval.requestedAt, approval.requestAt, null)),
    },
    {
      label: '현재 승인 단계',
      value: currentStep
        ? `${currentStep.stepOrder}단계 · ${actorTypeLabel(currentStep.actorType)}`
        : '처리 완료',
    },
    {
      label: '마지막 처리',
      value: lastCompletedStep
        ? `${lastCompletedStep.stepOrder}단계 · ${stepStatusLabel(lastCompletedStep.status)}`
        : '아직 처리 이력이 없습니다.',
    },
    {
      label: '마지막 처리 시각',
      value: formatDateTime(firstFilledValue(lastCompletedStep?.decidedAt, approval.updatedAt, null)),
    },
    {
      label: '최근 반려 사유',
      value: firstFilledValue(rejectedStep?.reason, approval.reason, approval.rejectReason, approval.rejectionReason, '없음'),
    },
  ]
})

const approvalModalDocType = computed(() => {
  if (selectedApproval.value?.dealType === 'QUO') return 'quotation'
  if (selectedApproval.value?.dealType === 'CNT') return 'contract'
  if (selectedApproval.value?.dealType === 'ORD') return 'order'
  return ''
})

const approvalModalDocId = computed(() => String(selectedApproval.value?.targetId || ''))

const approvalModalRejectReason = computed(() => {
  const approval = selectedApproval.value || {}
  const rejectedStep = [...(approval.steps || [])]
    .filter((step) => step.status === 'REJECTED')
    .sort((left, right) => (right.stepOrder || 0) - (left.stepOrder || 0))[0]

  return firstFilledValue(rejectedStep?.reason, approval.reason, approval.rejectReason, approval.rejectionReason, '')
})

const approvalTimelineEntries = computed(() => (
  (selectedApproval.value?.steps || []).map((step) => ({
    id: step.stepId || `${selectedApproval.value?.approvalId || 'approval'}-${step.stepOrder}`,
    title: `${step.stepOrder}단계 · ${actorTypeLabel(step.actorType)}`,
    statusLabel: stepStatusLabel(step.status),
    decisionLabel: step.decision ? decisionLabel(step.decision) : '미결정',
    decidedBy: step.decidedByUserId ?? '-',
    requestedAt: formatDateTime(firstFilledValue(step.createdAt, step.requestedAt, selectedApproval.value?.createdAt, null)),
    decidedAt: formatDateTime(step.decidedAt),
    reason: step.reason || '',
    toneClass: stepToneClass(step.status),
    badgeClass: statusToneClass(step.status === 'WAITING' ? 'PENDING' : step.status),
  }))
))

const previewHeadline = computed(() => {
  if (detailDocumentTypeKey.value === 'quotation') return '견 적 서'
  if (detailDocumentTypeKey.value === 'contract') return '물 품 공 급 계 약 서'
  if (detailDocumentTypeKey.value === 'order') return '주 문 서'
  return '문 서 미 리 보 기'
})

const previewPlaceholderTitle = computed(() => {
  if (detailError.value) return '문서 상세를 불러오지 못했습니다.'
  if (selectedApproval.value?.dealType) return `${dealTypeLabel(selectedApproval.value.dealType)} 미리보기를 준비할 수 없습니다.`
  return '문서 미리보기를 준비할 수 없습니다.'
})

const previewPlaceholderMessages = computed(() => {
  if (detailError.value) {
    return [
      detailError.value,
      '승인 정보와 승인 타임라인은 계속 확인할 수 있습니다.',
    ]
  }

  if (!previewPdfUrl.value && !previewHasRenderableDocument.value) {
    return [
      '연결된 PDF URL 또는 문서 렌더링에 필요한 상세 데이터가 없습니다.',
      '오른쪽 정보 패널에서 문서/승인 정보를 확인한 뒤 승인 여부를 판단할 수 있습니다.',
    ]
  }

  return ['미리보기 소스를 준비하는 중입니다.']
})

const getValidityDate = (dateStr) => {
  if (!dateStr) return ''
  const baseDate = new Date(dateStr)
  if (Number.isNaN(baseDate.getTime())) return dateStr
  baseDate.setDate(baseDate.getDate() + 30)
  return baseDate.toISOString().split('T')[0]
}

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
  const rawData = await searchApprovals(buildSearchParams(pageNumber, size))
  const data = unwrapApprovalPayload(rawData)

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

const normalizeIdOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
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
  selectedContractDetail.value = null
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
    if (documentStore.clientMaster.length === 0) {
      await documentStore.fetchClientMaster()
    }

    if (employeeStore.employees.length === 0 && currentRole.value === ROLES.ADMIN) {
      await employeeStore.fetchEmployees()
    }

    if (selectedApproval.value?.targetId) {
      if (selectedApproval.value.dealType === 'QUO') {
        selectedDocumentDetail.value = await documentStore.fetchQuotationDetail(selectedApproval.value.targetId)
      } else if (selectedApproval.value.dealType === 'CNT') {
        selectedDocumentDetail.value = await documentStore.fetchContractDetail(selectedApproval.value.targetId)
      } else if (selectedApproval.value.dealType === 'ORD') {
        selectedDocumentDetail.value = await fetchOrderApprovalDetail(selectedApproval.value.targetId)
        const contractId = firstFilledValue(
          selectedDocumentDetail.value?.headerId,
          selectedDocumentDetail.value?.contractId,
          approvalSnapshot.value?.headerId,
          approvalSnapshot.value?.contractId,
          null,
        )

        if (contractId) {
          selectedContractDetail.value = documentStore.getContractById(contractId)
          if (!selectedContractDetail.value?.items?.length) {
            try {
              selectedContractDetail.value = await documentStore.fetchContractDetail(contractId)
            } catch (error) {
              console.warn('계약 상세 보강 로드 실패:', error)
            }
          }
        }
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

const resolveApprovalIdFromNotification = async ({ approvalId, targetId, targetType, notificationType }) => {
  const numericApprovalId = normalizeIdOrNull(approvalId)
  const numericTargetId = normalizeIdOrNull(targetId)

  if (numericApprovalId) {
    return numericApprovalId
  }

  if (!numericTargetId) {
    return null
  }

  const normalizedTargetType = String(targetType || '').toUpperCase()
  if (normalizedTargetType === 'APPROVAL') {
    return numericTargetId
  }

  const searchParams = {
    page: 0,
    size: 100,
    targetId: numericTargetId,
    ...(TARGET_TYPE_TO_DEAL_TYPE[normalizedTargetType]
      ? { dealType: TARGET_TYPE_TO_DEAL_TYPE[normalizedTargetType] }
      : {}),
  }

  const approvals = await searchApprovals(searchParams)
  const candidates = Array.isArray(approvals?.content) ? approvals.content.map(normalizeApproval) : []
  const matchedApproval = candidates
    .sort(compareApprovals)
    .find((approval) => String(approval.targetId) === String(targetId))

  if (matchedApproval?.approvalId) {
    return Number(matchedApproval.approvalId)
  }

  if (!TARGET_TYPE_TO_DEAL_TYPE[normalizedTargetType]) {
    return null
  }

  const fallbackApprovals = await searchApprovals({
    page: 0,
    size: 100,
    targetId: numericTargetId,
  })
  const fallbackCandidates = Array.isArray(fallbackApprovals?.content)
    ? fallbackApprovals.content.map(normalizeApproval)
    : []
  const fallbackMatchedApproval = fallbackCandidates
    .sort(compareApprovals)
    .find((approval) => String(approval.targetId) === String(targetId))

  return fallbackMatchedApproval?.approvalId ? Number(fallbackMatchedApproval.approvalId) : null
}

const openApprovalFromRouteQuery = async () => {
  const approvalId = route.query.approvalId
  const targetId = route.query.targetId
  const targetType = route.query.targetType
  const notificationType = route.query.notificationType
  const shouldOpen = route.query.openFromNotification === 'true'

  if ((!approvalId && !targetId) || !shouldOpen || notificationModalHandled.value) {
    return
  }

  notificationModalHandled.value = true
  clearFeedback()

  try {
    const resolvedApprovalId = await resolveApprovalIdFromNotification({
      approvalId,
      targetId,
      targetType,
      notificationType,
    })

    if (!resolvedApprovalId) {
      showFeedback('error', '승인 요청이 아직 없거나 최신 문서 기준으로 다시 확인이 필요합니다.')
      return
    }

    await loadApprovalDetail(resolvedApprovalId, true)
  } catch (error) {
    showFeedback('error', parseApprovalError(error, '승인 상세 정보를 불러오지 못했습니다.'))
  } finally {
    const nextQuery = { ...route.query }
    delete nextQuery.approvalId
    delete nextQuery.targetId
    delete nextQuery.targetType
    delete nextQuery.notificationType
    delete nextQuery.openFromNotification
    router.replace({ query: nextQuery })
  }
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
  let sections

  if (currentRole.value === ROLES.SALES_REP) {
    sections = [
      { key: 'sales-rep', title: '영업 승인 대기', accent: 'accent-sales', items: groupedApprovals.value.salesRep },
      { key: 'done', title: '완료/반려', accent: 'accent-done', items: groupedApprovals.value.done },
    ]
  } else if (currentRole.value === ROLES.CLIENT) {
    sections = [
      { key: 'client', title: '거래처 승인 대기', accent: 'accent-client', items: groupedApprovals.value.client },
      { key: 'done', title: '완료/반려', accent: 'accent-done', items: groupedApprovals.value.done },
    ]
  } else {
    sections = [
      { key: 'admin', title: '관리자 승인 대기', accent: 'accent-admin', items: groupedApprovals.value.admin },
      { key: 'client', title: '거래처 승인 대기', accent: 'accent-client', items: groupedApprovals.value.client },
      { key: 'done', title: '완료/반려', accent: 'accent-done', items: groupedApprovals.value.done },
    ]
  }

  const visibleSections = sections.filter((section) => section.items.length > 0)
  if (visibleSections.length > 0) {
    return visibleSections
  }

  return filteredApprovals.value.length > 0
    ? [{ key: 'all', title: '승인 요청 전체', accent: 'accent-done', items: filteredApprovals.value }]
    : sections
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

watch(
  () => [route.query.approvalId, route.query.targetId, route.query.targetType, route.query.openFromNotification, serverApprovals.value.length],
  async () => {
    await openApprovalFromRouteQuery()
  },
  { immediate: true },
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
          <section v-for="section in sectionList" :key="section.key" class="approval-section">
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
          </footer>
        </template>
      </template>
    </section>

    <HistoryModal
      v-model="detailModalOpen"
      :title="selectedApproval?.displayCode || '승인 상세'"
      :doc-id="approvalModalDocId"
      :doc-type="approvalModalDocType"
      :reject-reason="approvalModalRejectReason"
      :approval-info-fields="detailApprovalInfoFields"
      :approval-timeline="approvalTimelineEntries"
      :show-approval-actions="canDecideApproval(selectedApproval)"
      :approval-action-label="decisionButtonText(selectedApproval)"
      @approve="openDecisionModal(selectedApproval, 'APPROVE')"
      @reject="openDecisionModal(selectedApproval, 'REJECT')"
    />

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

.detail-sidebar-actions {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: linear-gradient(180deg, rgba(247, 243, 236, 0) 0%, rgba(247, 243, 236, 0.94) 24%, rgba(247, 243, 236, 1) 100%);
  backdrop-filter: blur(8px);
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

.detail-multiline {
  white-space: pre-wrap;
  word-break: break-word;
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
  justify-content: center;
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
  grid-template-columns: 1fr;
}

.approval-history-modal {
  display: flex;
  height: 85vh;
  width: 100%;
  max-width: 72rem;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border-card);
  background: var(--color-bg-base);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.24);
}

.approval-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--color-border-divider);
  background: var(--color-bg-sidebar);
  padding: 12px 20px;
}

.approval-history-header-title {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.approval-history-header-title h3 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 18px;
  font-weight: 600;
}

.approval-history-header-title span {
  border: 1px solid var(--color-border-card);
  border-radius: 6px;
  background: var(--color-bg-section);
  padding: 2px 8px;
  color: var(--color-text-sub);
  font-family: monospace;
  font-size: 14px;
}

.approval-history-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approval-history-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: var(--color-bg-base);
}

.approval-history-preview {
  flex: 1.2 1 0%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--color-border-card);
  background: #525659;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
}

.approval-history-preview-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.approval-history-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  color: var(--color-text-body);
}

.approval-history-sidebar {
  width: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--color-border-card);
  background: var(--color-bg-base);
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.15);
  z-index: 1;
}

.approval-history-sidebar-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.approval-history-card {
  border: 1px solid var(--color-border-card);
  border-radius: 1rem;
  background: var(--color-bg-card);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.approval-history-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-divider);
}

.approval-history-card-header span {
  color: var(--color-text-sub);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.approval-history-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approval-history-card-title h3 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 14px;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.approval-history-card-accent {
  width: 6px;
  height: 16px;
  border-radius: 999px;
  background: #94a3b8;
}

.approval-history-card-accent-olive {
  background: var(--color-olive);
}

.approval-history-card-accent-orange {
  background: var(--color-orange);
}

.approval-history-card-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.approval-history-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.approval-history-field label {
  color: var(--color-text-sub);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.approval-history-field > div {
  border: 1px solid var(--color-border-card);
  border-radius: 12px;
  background: var(--color-bg-input);
  padding: 12px;
  color: var(--color-text-strong);
  font-size: 14px;
  font-weight: 800;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
}

.approval-history-field-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.approval-history-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(122, 140, 66, 0.2);
  background: rgba(122, 140, 66, 0.08);
  color: var(--color-olive);
  font-size: 12px;
  font-weight: 900;
}

.approval-info-list {
  display: grid;
  gap: 14px;
}

.approval-info-list dt {
  margin-bottom: 4px;
  color: var(--color-text-sub);
  font-size: 11px;
  font-weight: 700;
}

.approval-info-list dd {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 14px;
  font-weight: 700;
  white-space: pre-wrap;
  word-break: break-word;
}

.approval-history-items {
  max-height: 18rem;
  overflow-y: auto;
  border: 1px solid var(--color-border-card);
  border-radius: 12px;
  background: var(--color-bg-input);
  padding: 8px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
}

.approval-history-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border-divider);
}

.approval-history-item-row:last-child {
  border-bottom: 0;
}

.approval-history-item-row > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.approval-history-item-name {
  color: var(--color-text-strong);
  font-size: 12px;
  font-weight: 700;
}

.approval-history-item-meta {
  color: var(--color-text-sub);
  font-size: 10px;
}

.approval-history-item-value {
  align-items: flex-end;
  text-align: right;
}

.approval-history-item-value span:first-child {
  color: var(--color-text-strong);
  font-size: 12px;
  font-weight: 900;
}

.approval-history-item-value span:last-child {
  color: var(--color-olive);
  font-size: 10px;
  font-weight: 700;
}

.approval-history-empty {
  padding: 20px 12px;
  color: var(--color-text-sub);
  text-align: center;
}

.approval-history-total {
  margin-top: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--color-border-divider);
  border-radius: 12px;
  background: rgba(239, 234, 223, 0.6);
  padding: 16px;
}

.approval-history-total > div {
  display: flex;
  flex-direction: column;
}

.approval-history-total span:first-child {
  color: var(--color-text-sub);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.approval-history-total strong {
  color: var(--color-olive);
  font-size: 28px;
  font-weight: 900;
}

.approval-history-total p,
.approval-history-total span:last-child {
  margin: 0;
  color: var(--color-text-sub);
  font-size: 10px;
  font-weight: 700;
}

.approval-history-note {
  border: 1px solid var(--color-border-card);
  border-radius: 12px;
  background: var(--color-bg-input);
  padding: 16px;
  color: var(--color-text-strong);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.approval-history-sidebar-footer {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-divider);
  background: var(--color-bg-sidebar);
}

.approval-history-sidebar-footer .btn {
  flex: 1 1 0;
}

.approval-history-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-divider);
  background: var(--color-bg-sidebar);
  color: var(--color-text-sub);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.approval-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
  gap: 18px;
  margin-top: 16px;
  align-items: start;
}

.preview-panel {
  min-width: 0;
}

.preview-stage {
  min-height: 640px;
  border: 1px solid var(--color-border-card);
  border-radius: 22px;
  background: linear-gradient(180deg, #5b5f64 0%, #43474d 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  padding: 24px;
}

.preview-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  color: rgba(255, 255, 255, 0.96);
}

.preview-toolbar-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.72);
}

.preview-toolbar h4 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.preview-link-btn {
  border-color: rgba(255, 255, 255, 0.16);
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.preview-link-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}

.preview-canvas {
  height: 100%;
  min-height: 592px;
  overflow: auto;
  display: flex;
  justify-content: center;
}

.preview-pdf-canvas {
  min-height: 720px;
  overflow: hidden;
}

.preview-pdf-frame {
  width: 100%;
  min-height: 720px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background: #fff;
}

.preview-sheet {
  width: min(100%, 780px);
  display: flex;
  justify-content: center;
}

.preview-page {
  width: 100%;
  min-height: 1040px;
  border-radius: 0;
  background: #fff;
  color: #111827;
  padding: 44px 42px;
  box-shadow: 0 28px 70px -24px rgba(15, 23, 42, 0.55);
  display: grid;
  align-content: start;
  gap: 22px;
}

.preview-page-header {
  padding-bottom: 18px;
  border-bottom: 2px solid #111827;
}

.preview-page-header h3 {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-align: center;
}

.preview-page-kicker {
  margin: 0 0 10px;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.preview-page-block {
  display: grid;
  gap: 14px;
}

.preview-two-column {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preview-three-column {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.preview-label {
  margin: 0 0 6px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.preview-page strong {
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}

.preview-copy {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #f8fafc;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.65;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #d1d5db;
}

.preview-table th,
.preview-table td {
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  font-size: 13px;
  text-align: left;
}

.preview-table th {
  background: #f8fafc;
  font-weight: 800;
}

.preview-number {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

.preview-placeholder {
  min-height: 592px;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  display: grid;
  gap: 8px;
  align-content: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.92);
}

.preview-placeholder h4,
.preview-placeholder p {
  margin: 0;
}

.preview-placeholder-badge {
  display: inline-flex;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.preview-placeholder-meta {
  margin: 10px 0 0;
  display: grid;
  gap: 10px;
}

.preview-placeholder-meta div {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.preview-placeholder-meta dt {
  margin-bottom: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.72);
}

.preview-placeholder-meta dd {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.detail-sidebar {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-sidebar-scroll {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.detail-panel-section,
.timeline-panel-section {
  display: grid;
  gap: 12px;
}

.detail-panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-panel-header p {
  margin: 0;
  color: var(--color-text-sub);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.detail-panel-header h4 {
  margin: 0;
  color: var(--color-text-strong);
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
  grid-template-columns: 1fr;
  gap: 10px;
}

.detail-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border-divider);
  border-radius: 14px;
  background: var(--color-bg-input);
}

.detail-table-wrap-compact {
  margin-top: 14px;
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

.detail-memo-copy {
  color: var(--color-text-strong);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
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

.timeline-detail-grid {
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}

.timeline-detail-grid dt {
  margin-bottom: 4px;
  color: var(--color-text-sub);
  font-size: 11px;
  font-weight: 700;
}

.timeline-detail-grid dd {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 13px;
  font-weight: 700;
  word-break: break-word;
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

  .approval-detail-layout {
    grid-template-columns: 1fr;
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
  .detail-info-grid {
    grid-template-columns: 1fr;
  }

  .preview-stage,
  .preview-page {
    padding: 16px;
  }

  .preview-toolbar {
    flex-direction: column;
  }

  .preview-pdf-canvas,
  .preview-pdf-frame {
    min-height: 420px;
  }

  .preview-two-column,
  .preview-three-column {
    grid-template-columns: 1fr;
  }

  .timeline-detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-sticky-actions,
  .detail-sidebar-actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .detail-sticky-actions .btn,
  .detail-sidebar-actions .btn {
    width: 100%;
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

  .approval-history-header,
  .approval-history-header-title,
  .approval-history-body,
  .approval-history-sidebar-footer,
  .approval-history-footer-meta {
    flex-direction: column;
    align-items: stretch;
  }

  .approval-history-sidebar {
    width: 100%;
  }

  .badge-row {
    justify-content: flex-start;
  }
}
</style>
