<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { searchApprovals } from '@/api/approval'
import { cancelOrder as apiCancelOrder, getContractsByClient, getContract } from '@/api/document'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { useEmployeeStore } from '@/stores/employee'
import { ROLES } from '@/utils/constants'
import ModalBase from '@/components/common/ModalBase.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  docId: {
    type: String,
    default: '',
  },
  docType: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '문서 상세',
  },
  mode: {
    type: String,
    default: 'sales-clean',
    validator: (value) => ['sales-clean', 'sales-rejected', 'admin-rejected', 'readonly'].includes(value),
  },
  remark: {
    type: String,
    default: '',
  },
  rejectReason: {
    type: String,
    default: '',
  },
  showDownload: {
    type: Boolean,
    default: true,
  },
  hideRemark: {
    type: Boolean,
    default: false,
  },
  approvalInfoFields: {
    type: Array,
    default: () => [],
  },
  approvalTimeline: {
    type: Array,
    default: () => [],
  },
  showApprovalActions: {
    type: Boolean,
    default: false,
  },
  approvalActionLabel: {
    type: String,
    default: '승인',
  },
  showApprovalReject: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'approve', 'reject', 'cancelled'])

const router = useRouter()
const documentStore = useDocumentStore()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()

const docDetail = ref(null)
const isLoading = ref(false)
const approvalRejectReason = ref('')
const orderContract = ref(null) // 주문서용 계약 상세 (contractDetailId 매핑에 사용)

const showInfoPanel = computed(() => props.mode !== 'readonly')
const showApprovalInfoPanel = computed(() => props.approvalInfoFields.length > 0)
const showApprovalTimelinePanel = computed(() => props.approvalTimeline.length > 0)
const showCancelConfirm = ref(false)
const cancelErrorMessage = ref('')

const resolveDocumentTypeKey = (rawType) => {
  const normalizedType = String(rawType || '').toLowerCase().trim()
  const typeMap = {
    '견적': 'quotation',
    '견적서': 'quotation',
    quotation: 'quotation',
    quo: 'quotation',
    '주문': 'order',
    '주문서': 'order',
    order: 'order',
    ord: 'order',
    '계약': 'contract',
    '계약서': 'contract',
    contract: 'contract',
    cnt: 'contract',
    '명세': 'statement',
    '명세서': 'statement',
    statement: 'statement',
    stmt: 'statement',
    '청구': 'invoice',
    '청구서': 'invoice',
    invoice: 'invoice',
    inv: 'invoice',
    '결제': 'payment',
    '결제확인서': 'payment',
    payment: 'payment',
    pay: 'payment',
    '견적요청': 'quotation-request',
    '견적요청서': 'quotation-request',
    'quotation-request': 'quotation-request',
    rfq: 'quotation-request',
  }

  return typeMap[normalizedType] || normalizedType
}

const normalizeOrderStatus = (status) => {
  const raw = String(status || '').trim().toUpperCase()
  if (['ORDERED', 'PENDING', 'REQUESTED', '처리중', '대기'].includes(raw)) return 'REQUESTED'
  if (['CONFIRMED', 'APPROVED', 'ACTIVE', '승인', '완료', '확정'].includes(raw)) return 'APPROVED'
  if (['REJECTED', 'REJECT', '반려'].includes(raw)) return 'REJECTED'
  if (['CANCELED', 'CANCELLED', 'CANCEL', '취소'].includes(raw)) return 'CANCELED'
  return 'DRAFT'
}

// 💡 문서 타입 판별
const isQuotationRequest = computed(() => {
  const type = String(props.docType || '').toLowerCase().replace(/[\s-]+/g, '')
  const detailType = String(docDetail.value?.type || '').toLowerCase().replace(/[\s-]+/g, '')
  const docId = String(props.docId || '').toUpperCase()
  const labels = ['견적요청', '견적요청서', 'quotationrequest', 'rfq']
  return labels.some(l => type.includes(l) || detailType.includes(l)) || docId.startsWith('RFQ')
})

const isQuotationDocument = computed(() => {
  const type = String(docDetail.value?.type || props.docType || '').toLowerCase().replace(/[\s-]+/g, '')
  const docId = String(props.docId || '').toUpperCase()
  return type === 'quotation' || type === 'quo' || type.includes('견적서') || docId.startsWith('QT') || docId.startsWith('QUO')
})

const isContractDocument = computed(() => {
  const type = String(docDetail.value?.type || props.docType || '').toLowerCase().replace(/[\s-]+/g, '')
  const docId = String(props.docId || '').toUpperCase()
  return type === 'contract' || type === 'cnt' || type.includes('계약') || docId.startsWith('CNT')
})

const isOrderDocument = computed(() => {
  const type = String(docDetail.value?.type || props.docType || '').toLowerCase().replace(/[\s-]+/g, '')
  return type === 'order' || type === 'ord' || type.includes('주문')
})

const isStatementDocument = computed(() => {
  const type = String(docDetail.value?.type || props.docType || '').toLowerCase().replace(/[\s-]+/g, '')
  const docId = String(props.docId || '').toUpperCase()
  return type === 'statement' || type === 'stmt' || type.includes('명세') || docId.startsWith('STMT')
})

const isInvoiceDocument = computed(() => {
  const type = String(docDetail.value?.type || props.docType || '').toLowerCase()
  return type === 'invoice' || type.includes('청구') || String(props.docId).startsWith('INV')
})

const isPaymentDocument = computed(() => {
  const type = String(docDetail.value?.type || props.docType || '').toLowerCase()
  return type === 'payment' || type.includes('결제') || String(props.docId).toUpperCase().startsWith('PAY')
})

const paymentMethodLabel = computed(() => {
  const map = {
    TRANSFER: '계좌이체',
    CASH: '현금',
    CREDIT_CARD: '신용카드',
  }
  return map[docDetail.value?.paymentMethod] || docDetail.value?.paymentMethod || '-'
})

// 💡 작성자 본인 여부 확인
const isAuthor = computed(() => {
  const doc = docDetail.value
  if (!doc) return false

  const me = authStore.me
  if (!me) return false

  const authorIds = [
    doc.authorId, doc.writerId, doc.userId, doc.clientId, doc.salesRepId,
    doc.client?.id, doc.salesRep?.id, doc.writer?.id
  ].map(v => String(v || '').trim()).filter(v => v !== '' && v !== 'null' && v !== 'undefined')

  const myIds = [
    me.id, me.refId, me.clientId, me.employeeId, me.userId
  ].map(v => String(v || '').trim()).filter(v => v !== '' && v !== 'null' && v !== 'undefined')

  const isNameMatch = authStore.currentRole === ROLES.CLIENT &&
      (String(doc.clientName || '').trim() === String(me.clientName || me.name || '').trim())

  // 주문서: CLIENT 역할이면 clientId 일치만으로도 본인으로 간주
  const isOrderClientMatch = isOrderDocument.value &&
      authStore.currentRole === ROLES.CLIENT &&
      doc.clientId && me.refId &&
      String(doc.clientId) === String(me.refId)

  return authorIds.some(aid => myIds.includes(aid)) || isNameMatch || isOrderClientMatch
})

// 💡 표시할 멤버 이름 (작성자/담당자)
// ✅ SALES_REP/ADMIN은 employeeStore 조회, CLIENT는 recentLogs SALES_REP actorId로 fallback
const resolvedMemberName = computed(() => {
  const doc = docDetail.value
  if (!doc) return '-'

  // employeeId로 store 조회 (SALES_REP/ADMIN 전용 — CLIENT는 employees store 비어있음)
  const employeeFromStore = (() => {
    const eid = doc.employeeId ?? doc.salesRepId
    if (!eid) return null
    const emp = employeeStore.employees.find(e => String(e.id) === String(eid))
    return emp?.name || emp?.employeeName || null
  })()

  // CLIENT 역할일 때: recentLogs에서 SALES_REP actorId로 이름 추출 시도
  const employeeFromLogs = (() => {
    if (authStore.currentRole !== ROLES.CLIENT) return null
    if (!Array.isArray(doc.recentLogs)) return null
    const salesRepLog = doc.recentLogs.find(log => log.actorType === 'SALES_REP')
    if (!salesRepLog) return null
    // actorId가 있어도 이름을 알 수 없으므로 employeeId 필드명으로 store 재시도
    const emp = employeeStore.employees.find(e => String(e.id) === String(salesRepLog.actorId))
    return emp?.name || emp?.employeeName || null
  })()

  if (isQuotationRequest.value) {
    return doc.managerName || doc.client?.contact || doc.authorName || doc.writerName || '담당자 미지정'
  } else if (isOrderDocument.value) {
    // orderContract(getContract 응답)에 salesRepName이 있으면 우선 사용
    const fromContract = orderContract.value?.salesRepName || null
    return doc.salesRepName || doc.managerName || fromContract || employeeFromStore || employeeFromLogs || doc.employeeName || doc.authorName || doc.writerName || '담당자 미지정'
  } else if (isStatementDocument.value) {
    return doc.employeeName || doc.salesRepName || employeeFromStore || employeeFromLogs || doc.authorName || doc.writerName || '담당자 미지정'
  } else if (isInvoiceDocument.value) {
    return doc.salesRepName || doc.employeeName || employeeFromStore || employeeFromLogs || doc.authorName || doc.writerName || '담당자 미지정'
  } else if (isPaymentDocument.value) {
    // 결제확인서: 담당자 정보 없음 — 결제자(CLIENT) 이름으로 대체
    return doc.clientName || resolvedClientName.value || '-'
  } else {
    return doc.salesRepName || employeeFromStore || doc.authorName || doc.writerName || '영업 담당자 미지정'
  }
})

// 💡 거래처명 — clientName 없을 때 clientId로 store 조회, 주문서는 orderContract에서도 확인
const resolvedClientName = computed(() => {
  const doc = docDetail.value
  if (!doc) return '-'
  if (doc.clientName) return doc.clientName
  if (doc.client?.name) return doc.client.name
  // 주문서: getContract 응답에 clientName 있음
  if (isOrderDocument.value && orderContract.value?.clientName) return orderContract.value.clientName
  const cid = doc.clientId
  if (!cid) return '-'
  const client = documentStore.clientMaster?.find(c => String(c.id) === String(cid))
  return client?.name || client?.clientName || `거래처 #${cid}`
})

// 💡 청구서 statements 금액 보완 — supplyAmount/vatAmount 없을 때 totalAmount 기준 역산
const resolvedInvoiceStatements = computed(() => {
  const doc = docDetail.value
  if (!doc || !isInvoiceDocument.value) return []
  return (doc.statements || []).map(stmt => {
    const total = Number(stmt.totalAmount ?? stmt.total ?? 0)
    const supply = Number(stmt.supplyAmount ?? stmt.supply ?? Math.round(total / 1.1))
    const vat = Number(stmt.vatAmount ?? (total - supply))
    return { ...stmt, supplyAmount: supply, vatAmount: vat, totalAmount: total }
  })
})

// 💡 청구서 합계 — 최상위 금액 우선, 없으면 statements 합산으로 계산
const invoiceTotals = computed(() => {
  const doc = docDetail.value
  if (!doc) return { supply: 0, vat: 0, total: 0 }

  // 최상위에 totalAmount가 있으면 우선 사용
  if (doc.totalAmount || doc.amount) {
    const total = Number(doc.totalAmount ?? doc.amount ?? 0)
    const supply = Number(doc.supplyAmount ?? Math.round(total / 1.1))
    const vat = Number(doc.vatAmount ?? (total - supply))
    return { supply, vat, total }
  }

  // 없으면 statements 합산
  const stmts = resolvedInvoiceStatements.value
  const supply = stmts.reduce((s, st) => s + st.supplyAmount, 0)
  const vat = stmts.reduce((s, st) => s + st.vatAmount, 0)
  const total = stmts.reduce((s, st) => s + st.totalAmount, 0)
  return { supply, vat, total }
})

// 💡 주문서 items — contractDetailId로 계약 상세에서 상품명/단가 매핑
const resolvedOrderItems = computed(() => {
  const doc = docDetail.value
  if (!doc || !isOrderDocument.value) return []

  const contractId = doc.headerId ?? doc.contractId
  const contract = orderContract.value || (contractId ? documentStore.getContractById(String(contractId)) : null)
  const contractItems = contract?.items || []

  return (doc.items || []).map((item, idx) => {
    // getContract 응답: items[].id = detailId, productName, unitPrice, unit, productCategory
    const matched = contractItems.find(ci =>
        String(ci.id ?? ci.detailId ?? ci.contractDetailId) === String(item.contractDetailId)
    )
    const unitPrice = Number(matched?.unitPrice ?? item.unitPrice ?? item.price ?? 0)
    const quantity = Number(item.quantity ?? item.count ?? 0)
    return {
      ...item,
      name: matched?.productName || matched?.name || item.productName || item.name || `주문 품목 ${idx + 1}`,
      unit: matched?.unit || item.unit || 'EA',
      unitPrice,
      variety: matched?.productCategory || matched?.variety || item.variety || '',
      amount: quantity * unitPrice,
    }
  })
})

const statementRecentLogs = computed(() => {
  const detail = docDetail.value
  if (!detail || !isStatementDocument.value) {
    return []
  }

  if (Array.isArray(detail.recentLogs) && detail.recentLogs.length > 0) {
    return detail.recentLogs.map((item, index) => ({
      key: `recent-${index}`,
      title: item.title || item.action || item.status || '최근 이력',
      description: item.description || item.message || item.memo || '',
      at: item.createdAt || item.changedAt || item.timestamp || '',
    }))
  }

  if (Array.isArray(detail.statusHistory) && detail.statusHistory.length > 0) {
    return detail.statusHistory.map((item, index) => ({
      key: `status-${index}`,
      title: item.previousStatus || item.status || '상태 변경',
      description: item.actor || item.reason || '',
      at: item.timestamp || '',
    }))
  }

  return []
})

const statementAmounts = computed(() => {
  const detail = docDetail.value || {}
  const supplyAmount = Number(detail.supplyAmount ?? detail.supplyPrice ?? detail.netAmount ?? detail.totalAmount ?? detail.amount ?? 0)
  const vatAmount = Number(detail.vatAmount ?? detail.taxAmount ?? Math.round(supplyAmount * 0.1))
  const totalAmount = Number(detail.totalAmount ?? detail.amount ?? (supplyAmount + vatAmount))

  return { supplyAmount, vatAmount, totalAmount }
})

// 💡 버튼 노출 조건
const showRFQCancelButton = computed(() => isQuotationRequest.value && authStore.currentRole === ROLES.CLIENT && isAuthor.value && authStore.currentRole !== ROLES.ADMIN)
const showQuotationCancelButton = computed(() => isQuotationDocument.value && authStore.currentRole === ROLES.SALES_REP && isAuthor.value && authStore.currentRole !== ROLES.ADMIN)
const showContractDeleteButton = computed(() => isContractDocument.value && authStore.currentRole === ROLES.SALES_REP && isAuthor.value && authStore.currentRole !== ROLES.ADMIN)
const displayedRejectReason = computed(() => String(props.rejectReason || approvalRejectReason.value || '').trim())
const rewriteSourceId = computed(() => {
  if (isQuotationDocument.value) {
    return docDetail.value?.requestId || docDetail.value?.quotationRequestId || null
  }

  if (isContractDocument.value) {
    return docDetail.value?.quotationId || null
  }

  return null
})
const isRewritableQuotation = computed(() => {
  if (!isQuotationDocument.value) {
    return false
  }

  const rawStatus = String(docDetail.value?.status || '').trim().toUpperCase()
  return ['REJECTED_ADMIN', 'REJECTED_CLIENT', 'EXPIRED'].includes(rawStatus)
})

const isRewritableContract = computed(() => {
  if (!isContractDocument.value) {
    return false
  }

  const rawStatus = String(docDetail.value?.status || '').trim().toUpperCase()
  return rawStatus.includes('REJECT') || rawStatus.includes('반려') || Boolean(displayedRejectReason.value)
})

const showRewriteButton = computed(() => (
    authStore.currentRole === ROLES.SALES_REP
    && isAuthor.value
    && (
        (isRewritableQuotation.value && showQuotationCancelButton.value)
        || (isRewritableContract.value && showContractDeleteButton.value)
    )
))

const orderStatus = computed(() => normalizeOrderStatus(docDetail.value?.status))
// 취소 가능 상태: PENDING만 허용
const cancellableOrderStatuses = ['REQUESTED']
const canOrderCancel = computed(() => isOrderDocument.value && authStore.currentRole === ROLES.CLIENT && cancellableOrderStatuses.includes(orderStatus.value) && authStore.currentRole !== ROLES.ADMIN)
const showOrderCancelButton = computed(() => isOrderDocument.value && orderStatus.value !== 'CANCELED' && orderStatus.value !== 'REJECTED' && authStore.currentRole === ROLES.CLIENT && isAuthor.value && authStore.currentRole !== ROLES.ADMIN)

const isDeleteAction = ref(false)
const handleDelete = () => {
  isDeleteAction.value = true
  showCancelConfirm.value = true
}

const handleRewrite = async () => {
  try {
    if (isQuotationDocument.value) {
      close()
      await router.push({
        path: '/documents/quotation',
        query: {
          rewrite: 'true',
          quotationId: String(props.docId),
        },
      })
      return
    }

    if (isContractDocument.value) {
      close()
      await router.push({
        path: '/documents/contract',
        query: {
          rewrite: 'true',
          contractId: String(props.docId),
        },
      })
    }
  } catch (error) {
    console.error('[HistoryModal] 재작성 처리 중 오류 발생:', error)
    window.alert('재작성 처리 중 오류가 발생했습니다.')
  }
}

const formatKRDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toISOString().split('T')[0]
}

watch(showCancelConfirm, (val) => {
  if (!val) {
    isDeleteAction.value = false
    cancelErrorMessage.value = ''
  }
})

const close = () => {
  emit('update:modelValue', false)
  showCancelConfirm.value = false
  cancelErrorMessage.value = ''
}

const getApprovalRejectReason = (approval) => {
  const stepReason = Array.isArray(approval?.steps)
      ? [...approval.steps]
          .sort((left, right) => (right.stepOrder || 0) - (left.stepOrder || 0))
          .find((step) => String(step?.status || '').toUpperCase().includes('REJECT'))?.reason
      : ''

  return String(
      stepReason
      || approval?.reason
      || approval?.rejectReason
      || approval?.rejectionReason
      || '',
  ).trim()
}

const loadRejectReason = async () => {
  approvalRejectReason.value = ''

  if (props.rejectReason) {
    approvalRejectReason.value = String(props.rejectReason).trim()
    return
  }

  if (!props.docId) return

  const dealType = isQuotationDocument.value ? 'QUO' : (isContractDocument.value ? 'CNT' : '')
  if (!dealType) return

  try {
    const result = await searchApprovals({
      page: 0,
      size: 20,
      dealType,
      targetId: Number(props.docId),
    })

    const approvals = Array.isArray(result?.content)
        ? result.content
        : (Array.isArray(result) ? result : [])
    const rejectedApproval = approvals.find((approval) => getApprovalRejectReason(approval))

    approvalRejectReason.value = rejectedApproval ? getApprovalRejectReason(rejectedApproval) : ''
  } catch (error) {
    console.error('[HistoryModal] 반려 사유 조회 중 오류 발생:', error)
  }
}

const loadDetail = async () => {
  const currentId = props.docId
  if (!currentId) {
    docDetail.value = null
    approvalRejectReason.value = ''
    return
  }

  docDetail.value = null
  approvalRejectReason.value = ''
  isLoading.value = true

  try {
    const typeKey = resolveDocumentTypeKey(props.docType)

    let detail = null
    if (typeKey === 'quotation') detail = documentStore.getQuotationById(currentId)
    else if (typeKey === 'order') detail = documentStore.getOrderById(currentId)
    else if (typeKey === 'contract') detail = documentStore.getContractById(currentId)
    else if (typeKey === 'statement') detail = documentStore.getStatementById?.(currentId)
    else if (typeKey === 'invoice') detail = documentStore.getInvoiceById(currentId)
    else if (['quotation-request', 'rfq'].includes(typeKey)) detail = documentStore.getRequestById(currentId)

    // ✅ 수정: isOrderDocument, isInvoiceDocument도 fresh fetch 대상에 포함
    const requiresFreshDetail = isQuotationDocument.value || isContractDocument.value || isStatementDocument.value || isOrderDocument.value || isInvoiceDocument.value

    if (requiresFreshDetail || !detail || !detail.items || detail.items.length === 0) {
      const fetched = await documentStore.fetchTypedDocumentDetail({
        id: currentId,
        type: typeKey,
      })
      if (fetched) detail = fetched
    }

    docDetail.value = detail
    if (docDetail.value && !docDetail.value.type) docDetail.value.type = typeKey

    // ✅ 주문서: headerId(contractId)로 계약 품목 fetch → resolvedOrderItems 매핑
    if (isOrderDocument.value && docDetail.value) {
      orderContract.value = null
      const contractId = docDetail.value.headerId ?? docDetail.value.contractId
      if (contractId) {
        try {
          if (authStore.currentRole === ROLES.CLIENT) {
            // CLIENT는 contracts/{id} 상세 조회 가능 (OrderView.vue에서도 동일하게 사용)
            try {
              const res = await getContract(contractId)
              const contract = res?.data?.data || res?.data || null
              orderContract.value = contract || null
            } catch (e) {
              // getContract 실패 시 active 목록에서 id 확인 후 재시도
              const clientId = authStore.me?.refId || authStore.me?.clientId || docDetail.value.clientId
              if (clientId) {
                const listRes = await getContractsByClient(clientId)
                const list = listRes?.data?.data || listRes?.data || []
                const found = Array.isArray(list) ? list.find(c => String(c.id) === String(contractId)) : null
                orderContract.value = found || null
              }
            }
          } else {
            // SALES_REP/ADMIN은 계약 상세 직접 fetch
            let contract = documentStore.getContractById(String(contractId))
            if (!contract || !contract.items || contract.items.length === 0) {
              contract = await documentStore.fetchTypedDocumentDetail({ id: String(contractId), type: 'contract' })
            }
            orderContract.value = contract || null
          }
        } catch (e) {
          console.error('[HistoryModal] 주문서 계약 상세 조회 실패:', e)
        }
      }
    } else {
      orderContract.value = null
    }

    // ✅ employeeStore 로드 — SALES_REP/ADMIN만 호출 (CLIENT는 403)
    if (authStore.currentRole !== ROLES.CLIENT && employeeStore.employees.length === 0) {
      try { await employeeStore.fetchEmployees() } catch (e) {}
    }

    await loadRejectReason()
  } catch (e) {
    console.error('[HistoryModal] 상세 로드 중 오류 발생:', e)
  } finally {
    isLoading.value = false
  }
}

watch([() => props.modelValue, () => props.docId], ([show, id]) => {
  if (show && id) loadDetail()
}, { immediate: true })

const isDownloading = ref(false)
const downloadDocument = async () => {
  if (!docDetail.value) return
  const element = document.querySelector('.current-pdf-template')
  if (!element) return
  isDownloading.value = true

  const isContract = isContractDocument.value
  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'; overlay.style.left = '-10000px'; overlay.style.top = '0'; overlay.style.width = '794px'; overlay.style.backgroundColor = '#ffffff'; overlay.style.zIndex = '-999999';

  const clone = element.cloneNode(true)
  clone.style.transform = 'none'; clone.style.margin = '0'; clone.style.padding = '0';

  const allPapers = clone.querySelectorAll('.bg-white');
  allPapers.forEach(paper => {
    paper.style.width = '794px';
    paper.style.boxShadow = 'none';
    paper.style.margin = '0';
    paper.style.borderRadius = '0';
    paper.style.boxSizing = 'border-box';

    if (isContract) {
      paper.style.minHeight = 'auto';
      paper.style.height = 'auto';
      paper.style.overflow = 'visible';
    } else {
      paper.style.height = '1110px';
      paper.style.overflow = 'hidden';
    }
  });

  overlay.appendChild(clone); document.body.appendChild(overlay)

  const opt = {
    margin: 0,
    filename: `${docDetail.value?.displayCode || props.docId}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: {
      scale: isContract ? 2 : 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      y: 0,
      scrollY: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: {
      mode: isContract ? ['css', 'legacy'] : 'avoid-all',
      avoid: ['tr', 'h1', 'h2', 'h3', 'table', '.no-break']
    }
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await window.html2pdf().set(opt).from(isContract ? clone : clone).save()
  } catch (error) {
    console.error('PDF 다운로드 실패:', error);
    alert('PDF 생성 중 오류가 발생했습니다.')
  } finally {
    if (overlay.parentNode) document.body.removeChild(overlay);
    isDownloading.value = false
  }
}

const confirmCancel = async () => {
  cancelErrorMessage.value = ''

  if (isDeleteAction.value) {
    let success = false
    if (isContractDocument.value) success = await documentStore.deleteContract(props.docId)
    else success = await documentStore.deleteDocument(props.docId, props.docType)
    if (success) { showCancelConfirm.value = false; isDeleteAction.value = false; close(); return }
    cancelErrorMessage.value = '문서 삭제에 실패했습니다. 권한이 없거나 이미 처리된 문서일 수 있습니다.'
    return
  }

  if (showOrderCancelButton.value) {
    if (orderStatus.value === 'CANCELED') {
      cancelErrorMessage.value = '이미 취소된 주문입니다.'
      return
    }
    if (!canOrderCancel.value) {
      cancelErrorMessage.value = '이미 승인된 주문서라 취소가 불가합니다.'
      return
    }
    try {
      // 캐시된 상태가 stale할 수 있으므로 서버에서 최신 상태 재확인
      const freshData = await documentStore.fetchTypedDocumentDetail({ id: props.docId, type: 'order' })
      const freshStatus = normalizeOrderStatus(freshData?.status)
      if (freshStatus === 'CANCELED') {
        cancelErrorMessage.value = '이미 취소된 주문입니다.'
        docDetail.value = freshData
        return
      }
      if (!cancellableOrderStatuses.includes(freshStatus)) {
        cancelErrorMessage.value = '이미 승인된 주문서라 취소가 불가합니다.'
        docDetail.value = freshData
        return
      }

      await apiCancelOrder(Number(props.docId))
      // axios는 2xx에서만 resolve, 에러면 catch로 빠지므로 여기까지 오면 성공
      window.alert('주문이 취소되었습니다.')
      showCancelConfirm.value = false
      close()
      emit('cancelled', props.docId)
      return
    } catch (e) {
      console.error('[HistoryModal] 주문 취소 오류:', e)
      cancelErrorMessage.value = e?.response?.data?.error?.message || '주문 취소 처리 중 오류가 발생했습니다.'
    }
  }
}

const getValidityDate = (dateStr) => {
  if (!dateStr) return ''
  const baseDate = new Date(dateStr); baseDate.setDate(baseDate.getDate() + 30)
  return baseDate.toISOString().split('T')[0]
}
</script>

<template>
  <teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="close">
      <section class="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-[var(--color-bg-base)] shadow-xl border border-[var(--color-border-card)]">
        <header class="flex items-center justify-between border-b border-[var(--color-border-divider)] bg-[var(--color-bg-sidebar)] px-5 py-3">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-semibold text-[var(--color-text-strong)]">{{ title }}</h3>
            <span class="font-mono text-sm text-[var(--color-text-sub)] bg-[var(--color-bg-section)] px-2 py-0.5 rounded border border-[var(--color-border-card)]">
              {{ docDetail?.displayCode || docDetail?.quotationCode || docDetail?.contractCode || docDetail?.requestCode || docId }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="showRFQCancelButton" type="button" class="rounded bg-[#C44536] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A3392D] transition-colors" @click="handleDelete">취소 및 삭제</button>
            <button v-if="showRewriteButton" type="button" class="rounded bg-[var(--color-orange)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-orange-dark)]" @click="handleRewrite">재작성</button>
            <button v-if="showQuotationCancelButton" type="button" class="rounded bg-[#C44536] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A3392D] transition-colors" @click="handleDelete">견적 취소</button>
            <button v-if="showContractDeleteButton" type="button" class="rounded bg-[#C44536] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A3392D] transition-colors" @click="handleDelete">계약 삭제</button>
            <button v-if="showOrderCancelButton" type="button"
                    class="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    :class="canOrderCancel ? 'bg-[var(--color-orange)] hover:bg-[var(--color-orange-dark)]' : 'bg-slate-400 cursor-not-allowed'"
                    :title="canOrderCancel ? '' : '이미 승인된 주문서라 취소가 불가합니다'"
                    :disabled="!canOrderCancel"
                    @click="canOrderCancel && (showCancelConfirm = true)">주문 취소</button>
            <button v-if="showDownload" type="button" class="rounded bg-[var(--color-olive)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-olive-dark)] transition-colors" @click="downloadDocument">
              <span v-if="isDownloading" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              {{ isDownloading ? 'PDF 생성 중...' : '다운로드' }}
            </button>
            <button v-if="showApprovalActions" type="button" class="rounded bg-[var(--color-olive)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-olive-dark)] transition-colors" @click="emit('approve')">{{ approvalActionLabel }}</button>
            <button v-if="showApprovalActions && showApprovalReject" type="button" class="rounded bg-[#C44536] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A3392D] transition-colors" @click="emit('reject')">반려</button>
            <button type="button" class="rounded px-2 py-1 text-xl text-[var(--color-text-sub)] hover:bg-[var(--color-bg-section)]" @click="close">×</button>
          </div>
        </header>

        <div class="flex flex-1 min-h-0 bg-[var(--color-bg-base)] overflow-hidden">
          <div class="flex-[1.2] flex flex-col bg-[#525659] border-r border-[var(--color-border-card)] overflow-hidden shadow-inner">
            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar flex justify-center bg-transparent">
              <div v-if="isLoading" class="flex flex-col items-center justify-center h-full gap-4">
                <div class="w-12 h-12 border-4 border-[var(--color-olive)] border-t-transparent rounded-full animate-spin"></div>
                <p class="text-[var(--color-text-body)] font-medium">문서를 준비하고 있습니다...</p>
              </div>
              <div v-else-if="docDetail" class="origin-top scale-[0.7] 2xl:scale-[0.8] transition-transform duration-500">
                <div class="current-pdf-template transform-gpu shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                  <!-- 견적서 -->
                  <div v-if="isQuotationDocument" class="bg-white px-12 pt-8 pb-12 h-[1110px] overflow-hidden shadow-2xl relative text-[11px] text-black w-[794px]" style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="text-center border-b-2 border-black pb-3 mb-8"><h1 class="text-3xl font-bold tracking-[10px]">견 적 서</h1></div>
                    <div class="flex justify-between items-start mb-8 text-[13px]">
                      <div class="space-y-2">
                        <p>수신: <span class="border-b border-black font-bold px-2 text-[15px]">{{ docDetail.clientName || docDetail.client?.name || '(빈값)' }}</span> 귀하</p>
                        <p>담당: <span class="px-2">{{ resolvedMemberName }}</span></p>
                        <p>견적 유효기간: <span class="font-bold border-b border-black px-1 text-black">{{ getValidityDate(docDetail.date || docDetail.createdAt) }}</span> (30일)</p>
                      </div>
                    </div>
                    <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[11px]">
                      <thead class="bg-[#F7F3EC]"><tr class="border-b-2 border-black"><th class="border-r border-black p-2">품종</th><th class="border-r border-black p-2">상품명</th><th class="border-r border-black p-2">수량</th><th class="border-r border-black p-2">단위</th><th class="border-r border-black p-2">단가</th><th class="p-2">금액</th></tr></thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-q-'+idx" class="border-b border-black no-break">
                        <td class="border-r border-black p-2">{{ item.variety || '-' }}</td>
                        <td class="border-r border-black p-2 text-left font-bold px-3">{{ item.name }}</td>
                        <td class="border-r border-black p-2">{{ item.quantity ?? item.count ?? 0 }}</td>
                        <td class="border-r border-black p-2">{{ item.unit }}</td>
                        <td class="border-r border-black p-2 text-right px-3">{{ Number(item.unitPrice ?? item.price ?? 0).toLocaleString() }}</td>
                        <td class="p-2 text-right font-bold px-3">{{ Number(item.amount ?? ((item.quantity ?? item.count ?? 0) * (item.unitPrice ?? item.price ?? 0))).toLocaleString() }}</td>
                      </tr>
                      </tbody>
                      <tfoot class="bg-[#FAF7F3] font-bold"><tr><td colspan="5" class="border-r border-black p-2 text-sm text-right px-3">합 계</td><td class="p-2 text-right font-mono px-3 text-lg">{{ Number(docDetail.totalAmount ?? docDetail.amount ?? 0).toLocaleString() }}</td></tr></tfoot>
                    </table>
                    <div class="absolute bottom-20 left-0 right-0 text-center space-y-4">
                      <p class="text-sm font-bold">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                      <p class="text-lg font-black tracking-[5px] border-t-2 border-black pt-5 mx-16">위와 같이 견적함 ( (주) 몬순 )</p>
                    </div>
                  </div>

                  <!-- 계약서 -->
                  <div v-else-if="isContractDocument" class="bg-white px-12 pt-8 pb-12 w-[794px] shadow-2xl relative text-[13px] text-black flex flex-col" style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="text-center border-b-2 border-black pb-3 mb-10"><h1 class="text-3xl font-bold tracking-widest">물 품 공 급 계 약 서</h1></div>
                    <div class="mb-8 space-y-3 leading-relaxed text-[15px]">
                      <p><strong>계약상대자 (갑):</strong> <span class="border-b border-black px-2 font-bold">{{ docDetail.clientName || docDetail.client?.name || '(빈값)' }}</span></p>
                      <p><strong>계약상대자 (을):</strong> (주) 몬순</p>
                      <p><strong>계약기간:</strong> <span class="font-mono text-base">{{ formatDate(docDetail.startDate) || '____-__-__' }} ~ {{ formatDate(docDetail.endDate) || '____-__-__' }}</span></p>
                      <p><strong>청구주기:</strong> <span class="border-b border-black px-2 font-bold">{{ docDetail.billingCycle }} 단위 청구</span></p>
                    </div>
                    <div class="mb-2"><strong class="text-sm border-b border-black pb-1">[공급 물품 명세]</strong></div>
                    <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[13px]">
                      <thead class="bg-[#F7F3EC]"><tr class="border-b-2 border-black"><th class="border-r border-black p-3">상품명</th><th class="border-r border-black p-3 w-16">수량</th><th class="border-r border-black p-3">단위</th><th class="border-r border-black p-3">단가</th><th class="p-3">금액</th></tr></thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-c-'+idx" class="border-b border-black no-break">
                        <td class="border-r border-black p-3 text-left font-bold px-4">{{ item.name }}</td>
                        <td class="border-r border-black p-3">{{ item.quantity ?? item.count ?? 0 }}</td>
                        <td class="border-r border-black p-3">{{ item.unit }}</td>
                        <td class="border-r border-black p-3 text-right font-mono">{{ Number(item.unitPrice ?? item.price ?? 0).toLocaleString() }}</td>
                        <td class="p-3 text-right font-bold px-4">{{ Number(item.amount ?? ((item.quantity ?? item.count ?? 0) * (item.unitPrice ?? item.price ?? 0))).toLocaleString() }}</td>
                      </tr>
                      <tr v-if="(docDetail.items || []).length > 0">
                        <td colspan="4" class="border-r border-black p-3 bg-[#FAF7F3] font-bold text-right px-4">합 계</td>
                        <td class="p-3 text-right font-extrabold text-blue-700 px-4 text-xl">{{ Number(docDetail.totalAmount ?? docDetail.amount ?? 0).toLocaleString() }}</td>
                      </tr>
                      </tbody>
                    </table>
                    <div v-if="docDetail.specialTerms" class="pt-20 no-break">
                      <strong class="text-sm border-b border-black pb-1">[특약 사항]</strong>
                      <p class="mt-3 border border-black p-5 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[13px] min-h-[80px]">{{ docDetail.specialTerms }}</p>
                    </div>
                    <div class="pt-8 pb-2 text-center flex flex-col items-center no-break">
                      <p class="text-[15px] font-bold mb-4">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                      <div class="w-full px-16"><div class="border-t-2 border-black pt-5"><p class="font-bold text-xl">위 계약의 내용을 증명하기 위해 기명 날인함</p></div></div>
                    </div>
                  </div>

                  <!-- 주문서 -->
                  <!-- ✅ 수정: resolvedOrderItems, resolvedClientName 사용 (contractDetailId → 상품명/단가 매핑) -->
                  <div v-else-if="isOrderDocument"
                       class="bg-white px-12 pt-8 pb-12 h-[1110px] overflow-hidden shadow-2xl relative text-[11px] text-black w-[794px]"
                       style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="text-center border-b-2 border-black pb-3 mb-8">
                      <h1 class="text-3xl font-bold tracking-[10px]">주 문 서</h1>
                    </div>
                    <div class="flex justify-between items-start mb-8 text-[13px]">
                      <div class="space-y-2">
                        <p>공급자: <span class="border-b border-black font-bold px-2 text-[15px]">(주) 몬순</span></p>
                        <p>주문자: <span class="border-b border-black font-bold px-2 text-[15px]">{{ resolvedClientName }}</span> 귀하</p>
                        <p>담당자: <span class="px-2">{{ resolvedMemberName }}</span></p>
                        <p>주문일: <span class="font-bold border-b border-black px-1">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</span></p>
                      </div>
                      <div class="w-16 h-16 border-2 border-black flex items-center justify-center font-bold text-sm">인</div>
                    </div>
                    <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[11px]">
                      <thead class="bg-[#F7F3EC]">
                      <tr class="border-b-2 border-black">
                        <th class="border-r border-black p-2">상품명</th>
                        <th class="border-r border-black p-2 w-16">수량</th>
                        <th class="border-r border-black p-2">단위</th>
                        <th class="border-r border-black p-2">단가</th>
                        <th class="p-2">금액</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr v-for="(item, idx) in resolvedOrderItems" :key="'pdf-o-'+idx" class="border-b border-black no-break">
                        <td class="border-r border-black p-2 text-left font-bold px-3">{{ item.name }}</td>
                        <td class="border-r border-black p-2">{{ item.quantity ?? 0 }}</td>
                        <td class="border-r border-black p-2">{{ item.unit }}</td>
                        <td class="border-r border-black p-2 text-right px-3">{{ Number(item.unitPrice ?? 0).toLocaleString() }}</td>
                        <td class="p-2 text-right font-bold px-3">{{ Number(item.amount ?? 0).toLocaleString() }}</td>
                      </tr>
                      <tr v-if="resolvedOrderItems.length === 0">
                        <td colspan="5" class="p-6 text-center text-[#777]">품목 정보가 없습니다.</td>
                      </tr>
                      </tbody>
                      <tfoot class="bg-[#FAF7F3] font-bold">
                      <tr>
                        <td colspan="4" class="border-r border-black p-2 text-sm text-right px-3">합 계</td>
                        <td class="p-2 text-right font-mono px-3 text-lg">{{ Number(docDetail.totalAmount ?? docDetail.amount ?? 0).toLocaleString() }}</td>
                      </tr>
                      </tfoot>
                    </table>
                    <div v-if="docDetail.memo || docDetail.deliveryRequest" class="mb-6">
                      <strong class="text-xs">[비고]</strong>
                      <p class="mt-2 min-h-[60px] border border-black p-4 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[12px]">{{ docDetail.memo || docDetail.deliveryRequest }}</p>
                    </div>
                    <div class="absolute bottom-20 left-0 right-0 text-center space-y-4">
                      <p class="text-sm font-bold">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                      <p class="text-lg font-black tracking-[5px] border-t-2 border-black pt-5 mx-16">위와 같이 주문함 ( (주) 몬순 )</p>
                    </div>
                  </div>

                  <!-- 명세서 -->
                  <div v-else-if="isStatementDocument"
                       class="bg-white px-12 pt-8 pb-12 h-[1110px] overflow-hidden shadow-2xl relative text-[11px] text-black w-[794px]"
                       style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="text-center border-b-2 border-black pb-3 mb-8">
                      <h1 class="text-3xl font-bold tracking-[10px]">명 세 서</h1>
                    </div>
                    <div class="mb-8 grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                      <p>명세서 번호: <span class="font-bold border-b border-black px-2">{{ docDetail.statementCode || docDetail.displayCode || docId }}</span></p>
                      <p>주문 코드: <span class="font-bold border-b border-black px-2">{{ docDetail.orderCode || '—' }}</span></p>
                      <p>계약 코드: <span class="font-bold border-b border-black px-2">{{ docDetail.contractCode || '—' }}</span></p>
                      <p>청구 주기: <span class="font-bold border-b border-black px-2">{{ docDetail.billingCycle || '—' }}</span></p>
                      <p>거래처: <span class="font-bold border-b border-black px-2">{{ docDetail.clientName || docDetail.client?.name || '—' }}</span></p>
                      <p>담당자: <span class="font-bold border-b border-black px-2">{{ resolvedMemberName }}</span></p>
                    </div>

                    <table class="w-full border-collapse border-2 border-black text-center mb-6 text-[11px]">
                      <thead class="bg-[#F7F3EC]">
                      <tr class="border-b-2 border-black">
                        <th class="border-r border-black p-2">품종</th>
                        <th class="border-r border-black p-2">상품명</th>
                        <th class="border-r border-black p-2 w-20">수량</th>
                        <th class="p-2 w-20">단위</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-s-'+idx" class="border-b border-black">
                        <td class="border-r border-black p-2">{{ item.variety || '-' }}</td>
                        <td class="border-r border-black p-2 text-left font-bold px-3">{{ item.name || '-' }}</td>
                        <td class="border-r border-black p-2">{{ item.quantity ?? 0 }}</td>
                        <td class="p-2">{{ item.unit || '-' }}</td>
                      </tr>
                      <tr v-if="(docDetail.items || []).length === 0">
                        <td colspan="4" class="p-6 text-center text-[#777]">품목 정보가 없습니다.</td>
                      </tr>
                      </tbody>
                    </table>

                    <div class="mb-6 grid grid-cols-3 border-2 border-black text-[12px]">
                      <div class="border-r border-black p-4">
                        <p class="text-[10px] text-gray-500">공급가</p>
                        <p class="mt-1 text-lg font-black">{{ statementAmounts.supplyAmount.toLocaleString() }}원</p>
                      </div>
                      <div class="border-r border-black p-4">
                        <p class="text-[10px] text-gray-500">부가세</p>
                        <p class="mt-1 text-lg font-black">{{ statementAmounts.vatAmount.toLocaleString() }}원</p>
                      </div>
                      <div class="p-4 bg-[#FAF7F3]">
                        <p class="text-[10px] text-gray-500">합계</p>
                        <p class="mt-1 text-lg font-black text-blue-700">{{ statementAmounts.totalAmount.toLocaleString() }}원</p>
                      </div>
                    </div>

                    <div class="border border-black p-4 bg-[#FAF7F3] text-[12px] leading-relaxed">
                      <p><strong>배송일:</strong> {{ formatKRDate(docDetail.deliveryDate) || '—' }}</p>
                      <p><strong>수령인:</strong> {{ docDetail.shippingName || '—' }}</p>
                      <p><strong>연락처:</strong> {{ docDetail.shippingPhone || '—' }}</p>
                      <p><strong>배송지:</strong> {{ [docDetail.shippingAddress, docDetail.shippingAddressDetail].filter(Boolean).join(' ') || '—' }}</p>
                      <p><strong>요청사항:</strong> {{ docDetail.deliveryRequest || '—' }}</p>
                    </div>
                  </div>

                  <!-- 청구서 -->
                  <!-- ✅ 수정: resolvedClientName, resolvedInvoiceStatements, invoiceTotals 사용 -->
                  <div v-else-if="isInvoiceDocument"
                       class="bg-white px-12 pt-8 pb-12 h-[1110px] overflow-hidden shadow-2xl relative text-[11px] text-black w-[794px]"
                       style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="text-center border-b-2 border-black pb-3 mb-8">
                      <h1 class="text-3xl font-bold tracking-[10px]">청 구 서</h1>
                    </div>
                    <div class="flex justify-between items-start mb-8 text-[13px]">
                      <div class="space-y-2">
                        <p>수 신 (갑): <span class="border-b border-black font-bold px-2 text-[15px]">{{ resolvedClientName }}</span> 귀하</p>
                        <p>발 신 (을): <span class="font-bold">(주) 몬순</span></p>
                        <p>담당: <span class="px-2">{{ resolvedMemberName }}</span></p>
                        <p>계약 코드: <span class="font-mono font-bold px-1">{{ docDetail.contractCode || (docDetail.contractId ? `CNT-${docDetail.contractId}` : '—') }}</span></p>
                        <p>청구 기간: <span class="font-mono px-1">{{ docDetail.startDate || '—' }} ~ {{ docDetail.endDate || '—' }}</span></p>
                        <p>청구일: <span class="font-bold border-b border-black px-1">{{ formatKRDate(docDetail.invoiceDate || docDetail.date || docDetail.createdAt) }}</span></p>
                        <p>납부기한: <span class="font-bold border-b border-black px-1 text-red-700">{{ formatKRDate(docDetail.dueDate || docDetail.paymentDueDate) }}</span></p>
                        <p>문서 번호: <span class="font-mono font-bold px-1">{{ docDetail.invoiceCode || docDetail.displayCode || docId }}</span></p>
                      </div>
                      <div class="w-16 h-16 border-2 border-black flex items-center justify-center font-bold text-sm">인</div>
                    </div>

                    <div class="mb-2"><strong class="text-sm">[명세서 목록]</strong></div>
                    <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[11px]">
                      <thead class="bg-[#F7F3EC]">
                      <tr class="border-b-2 border-black">
                        <th class="border-r border-black p-2 text-left px-3">명세서 번호</th>
                        <th class="border-r border-black p-2 text-right px-3">공급가액</th>
                        <th class="border-r border-black p-2 text-right px-3">부가세(10%)</th>
                        <th class="p-2 text-right px-3">합 계</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr v-for="(stmt, idx) in resolvedInvoiceStatements" :key="'pdf-inv-stmt-'+idx" class="border-b border-black">
                        <td class="border-r border-black p-2 text-left font-bold px-3">{{ stmt.statementCode || stmt.code || '-' }}</td>
                        <td class="border-r border-black p-2 text-right font-mono px-3">{{ stmt.supplyAmount.toLocaleString() }}</td>
                        <td class="border-r border-black p-2 text-right font-mono px-3">{{ stmt.vatAmount.toLocaleString() }}</td>
                        <td class="p-2 text-right font-bold px-3">{{ stmt.totalAmount.toLocaleString() }}</td>
                      </tr>
                      <tr v-if="resolvedInvoiceStatements.length === 0">
                        <td colspan="4" class="p-6 text-center text-[#777] italic">명세서 정보가 없습니다.</td>
                      </tr>
                      <tr v-if="resolvedInvoiceStatements.length > 0" class="bg-[#FAF7F3] font-bold">
                        <td colspan="3" class="border-r border-black p-2 text-right px-3">청구 합계 금액 (VAT 포함)</td>
                        <td class="p-2 text-right font-extrabold px-3 text-lg">{{ invoiceTotals.total.toLocaleString() }}</td>
                      </tr>
                      </tbody>
                    </table>

                    <div class="absolute bottom-20 left-0 right-0 text-center space-y-4">
                      <p class="text-sm font-bold">{{ formatKRDate(docDetail.invoiceDate || docDetail.date || docDetail.createdAt) }}</p>
                      <p class="text-lg font-black tracking-[5px] border-t-2 border-black pt-5 mx-16">위 청구 내용을 확인하기 위해 기명 날인함 ( (주) 몬순 )</p>
                    </div>
                  </div>

                  <!-- 결제 확인서 -->
                  <div v-else-if="isPaymentDocument"
                       class="bg-white px-12 pt-8 pb-12 h-[1110px] overflow-hidden shadow-2xl relative text-[11px] text-black w-[794px]"
                       style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">

                    <div class="text-center border-b-2 border-black pb-3 mb-10">
                      <h1 class="text-3xl font-bold tracking-[10px]">결 제 확 인 서</h1>
                    </div>

                    <div class="absolute top-16 right-12 w-24 h-24 border-4 border-green-600 rounded-full flex items-center justify-center rotate-[-15deg] opacity-80">
                      <span class="text-green-600 font-black text-lg tracking-widest">완 납</span>
                    </div>

                    <div class="mb-10 space-y-3 text-[13px]">
                      <p>수신: <span class="border-b border-black font-bold px-2 text-[15px]">{{ docDetail.clientName || '-' }}</span> 귀하</p>
                      <p>발신: <span class="font-bold">(주) 몬순</span></p>
                      <p>담당: <span class="px-2">{{ resolvedMemberName }}</span></p>
                    </div>

                    <table class="w-full border-collapse border-2 border-black text-[13px] mb-8">
                      <tbody>
                      <tr class="border-b border-black">
                        <th class="bg-[#F7F3EC] border-r border-black p-3 text-left w-40">결제 번호</th>
                        <td class="p-3 font-mono font-bold">{{ docDetail.paymentCode || docDetail.displayCode || '-' }}</td>
                      </tr>
                      <tr class="border-b border-black">
                        <th class="bg-[#F7F3EC] border-r border-black p-3 text-left">연결 청구서</th>
                        <td class="p-3 font-mono">{{ docDetail.invoiceCode || '-' }}</td>
                      </tr>
                      <tr class="border-b border-black">
                        <th class="bg-[#F7F3EC] border-r border-black p-3 text-left">결제 수단</th>
                        <td class="p-3 font-bold">{{ paymentMethodLabel }}</td>
                      </tr>
                      <tr class="border-b border-black">
                        <th class="bg-[#F7F3EC] border-r border-black p-3 text-left">결제 일시</th>
                        <td class="p-3">{{ formatKRDate(docDetail.paidAt || docDetail.createdAt) }}</td>
                      </tr>
                      <tr class="border-b border-black">
                        <th class="bg-[#F7F3EC] border-r border-black p-3 text-left">결제 상태</th>
                        <td class="p-3">
          <span class="bg-green-100 text-green-700 font-black px-3 py-1 rounded-full text-xs">
            {{ docDetail.status === 'COMPLETED' ? '결제 완료' : docDetail.status === 'PENDING' ? '처리 중' : docDetail.status }}
          </span>
                        </td>
                      </tr>
                      </tbody>
                    </table>

                    <div class="border-2 border-black p-6 bg-[#FAF7F3] mb-8">
                      <div v-if="docDetail.invoiceTotalAmount && docDetail.invoiceTotalAmount !== docDetail.paymentAmount"
                           class="flex justify-between text-[12px] text-gray-500 mb-2">
                        <span>청구 원금</span>
                        <span class="line-through">₩{{ Number(docDetail.invoiceTotalAmount ?? 0).toLocaleString() }}</span>
                      </div>
                      <div class="flex justify-between items-end">
                        <span class="text-base font-black">실 결제 금액</span>
                        <span class="text-3xl font-black text-blue-700">
        ₩{{ Number(docDetail.paymentAmount ?? docDetail.amount ?? 0).toLocaleString() }}
      </span>
                      </div>
                      <p class="text-[10px] text-gray-400 mt-2 text-right">VAT 포함 금액입니다.</p>
                    </div>

                    <div class="absolute bottom-20 left-0 right-0 text-center space-y-4">
                      <p class="text-sm font-bold">{{ formatKRDate(docDetail.paidAt || docDetail.createdAt) }}</p>
                      <p class="text-lg font-black tracking-[5px] border-t-2 border-black pt-5 mx-16">
                        위와 같이 결제 완료되었음을 확인합니다. ( (주) 몬순 )
                      </p>
                    </div>
                  </div>

                  <!-- 견적 요청서 -->
                  <div v-else-if="isQuotationRequest" class="bg-white p-12 h-[1110px] overflow-hidden shadow-2xl relative text-[11px] text-black w-[794px]" style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="mb-8 border-b-2 border-black pb-4 text-center"><h1 class="text-2xl font-bold tracking-widest">견 적 요 청 서</h1></div>
                    <div class="space-y-2 mb-8 text-[13px]"><p class="mb-2">귀하의 무궁한 발전을 기원합니다.</p><p>아래와 같이 견적을 요청하오니 검토 부탁드립니다.</p></div>
                    <table class="my-6 w-full border-collapse border-2 border-black text-center text-[11px]">
                      <thead class="bg-[#F7F3EC]"><tr class="border-b-2 border-black"><th class="border-r border-black p-2 grayscale">품종명</th><th class="border-r border-black p-2">상품명</th><th class="border-r border-black p-2 w-16">수량</th><th class="p-2">단위</th></tr></thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-r-' + idx" class="border-b border-black">
                        <td class="border-r border-black p-2">{{ item.variety || '-' }}</td>
                        <td class="border-r border-black p-2 text-left font-bold px-4">{{ item.name }}</td>
                        <td class="border-r border-black p-2 font-mono">{{ item.quantity ?? item.count ?? 0 }}</td>
                        <td class="p-2">{{ item.unit }}</td>
                      </tr>
                      </tbody>
                    </table>
                    <div class="mt-8"><strong class="text-xs">[요구사항]</strong><p class="mt-2 min-h-[100px] border border-black p-4 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[12px]">{{ docDetail.requirements || docDetail.memo || '별도 요구사항 없음' }}</p></div>
                    <div class="absolute bottom-20 left-0 right-0 text-right px-16 space-y-4"><p class="text-sm font-bold">작성일: {{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p><p class="mt-6 font-black text-lg">요청자: (주) 몬순 (인)</p></div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <div v-if="docDetail" class="w-[480px] flex flex-col bg-[var(--color-bg-base)] border-l border-[var(--color-border-card)] shadow-[0_0_50px_rgba(0,0,0,0.15)] z-20 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <article class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-olive)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">거래처 및 담당자</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">PARTNER INFO</span>
                </div>
                <div class="space-y-5">
                  <div class="flex flex-col gap-1.5"><label class="text-[10px] text-[var(--color-text-sub)] font-extrabold uppercase">상호명 / 법인명</label><div class="p-3 border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] text-base font-black text-[var(--color-text-strong)] shadow-inner">{{ resolvedClientName }}</div></div>
                  <div v-if="!isPaymentDocument" class="flex flex-col gap-2">
                    <label class="text-[10px] text-[var(--color-text-sub)] font-extrabold uppercase">담당 영업사원</label>
                    <div class="flex items-center justify-between p-3 border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] shadow-inner">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-[var(--color-olive)]/10 border border-[var(--color-olive)]/20 flex items-center justify-center text-[var(--color-olive)] font-black text-xs">{{ (resolvedMemberName || 'M')[0] }}</div>
                        <span class="text-sm font-bold text-[var(--color-text-strong)]">{{ resolvedMemberName }}</span>
                      </div>
                      <span class="text-[9px] bg-[var(--color-olive)] text-white px-2 py-1 rounded-lg font-black tracking-tighter">OFFICIAL</span>
                    </div>
                  </div>
                </div>
              </article>

              <!-- 결제확인서: 결제 정보 패널 -->
              <article v-if="isPaymentDocument" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-green-500 rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">결제 정보</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">PAYMENT INFO</span>
                </div>
                <div class="space-y-3">
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">결제 번호</p>
                    <p class="mt-1 font-bold font-mono text-[var(--color-text-strong)]">{{ docDetail.paymentCode || docDetail.displayCode || docId }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">연결 청구서</p>
                    <p class="mt-1 font-bold font-mono text-[var(--color-text-strong)]">{{ docDetail.invoiceCode || '—' }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">결제 수단</p>
                    <p class="mt-1 font-bold text-[var(--color-text-strong)]">{{ paymentMethodLabel }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">결제 일시</p>
                    <p class="mt-1 font-bold text-[var(--color-text-strong)]">{{ formatKRDate(docDetail.paidAt || docDetail.createdAt) }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">결제 상태</p>
                    <span class="inline-block mt-1 bg-green-100 text-green-700 font-black px-3 py-1 rounded-full text-xs">
                      {{ docDetail.status === 'COMPLETED' ? '결제 완료' : docDetail.status === 'PENDING' ? '처리 중' : docDetail.status }}
                    </span>
                  </div>
                </div>
                <!-- 결제 금액 강조 -->
                <div class="mt-4 space-y-2 bg-[var(--color-bg-input)]/50 p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <div v-if="docDetail.invoiceTotalAmount && docDetail.invoiceTotalAmount !== docDetail.paymentAmount" class="flex justify-between text-xs text-[var(--color-text-sub)]">
                    <span>청구 원금</span><span class="line-through">₩{{ Number(docDetail.invoiceTotalAmount ?? 0).toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between items-end pt-1">
                    <span class="text-[10px] font-black text-[var(--color-text-sub)] uppercase">실 결제 금액</span>
                    <span class="text-2xl font-black text-[var(--color-olive)]">₩{{ Number(docDetail.paymentAmount ?? docDetail.amount ?? 0).toLocaleString() }}</span>
                  </div>
                  <p class="text-[9px] font-bold text-[var(--color-text-sub)] text-right">VAT INCLUDED</p>
                </div>
              </article>

              <!-- 청구서: statements 기반 패널 -->
              <article v-if="isInvoiceDocument" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-orange)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">포함 명세서</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)] tracking-tighter">{{ resolvedInvoiceStatements.length }} STMTS</span>
                </div>
                <div class="max-h-72 overflow-y-auto border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] p-2 space-y-2 shadow-inner custom-scrollbar mb-5">
                  <div v-for="(stmt, idx) in resolvedInvoiceStatements" :key="'inv-stmt-'+idx" class="flex justify-between items-center p-3 rounded-lg border-b border-[var(--color-border-divider)] last:border-0 pb-3">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-xs font-bold text-[var(--color-text-strong)]">{{ stmt.statementCode || stmt.code }}</span>
                      <span class="text-[10px] text-[var(--color-text-sub)]">공급가 ₩{{ stmt.supplyAmount.toLocaleString() }}</span>
                    </div>
                    <div class="text-right flex flex-col gap-0.5">
                      <span class="text-[10px] font-bold text-[var(--color-olive)]">₩{{ stmt.totalAmount.toLocaleString() }}</span>
                      <span class="text-[9px] text-[var(--color-text-sub)]">VAT ₩{{ stmt.vatAmount.toLocaleString() }}</span>
                    </div>
                  </div>
                  <div v-if="resolvedInvoiceStatements.length === 0" class="p-4 text-center text-xs text-[var(--color-text-sub)]">명세서 정보가 없습니다.</div>
                </div>
                <div class="space-y-2 bg-[var(--color-bg-input)]/50 p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <div class="flex justify-between text-xs text-[var(--color-text-sub)]"><span>공급가액</span><span>₩{{ invoiceTotals.supply.toLocaleString() }}</span></div>
                  <div class="flex justify-between text-xs text-[var(--color-text-sub)]"><span>부가세 (10%)</span><span>₩{{ invoiceTotals.vat.toLocaleString() }}</span></div>
                  <div class="flex justify-between items-end pt-2 border-t border-[var(--color-border-divider)]">
                    <span class="text-[10px] font-black text-[var(--color-text-sub)] uppercase">Total</span>
                    <span class="text-2xl font-black text-[var(--color-olive)]">₩{{ invoiceTotals.total.toLocaleString() }}</span>
                  </div>
                  <p class="text-[9px] font-bold text-[var(--color-text-sub)] text-right">VAT INCLUDED</p>
                </div>
              </article>

              <!-- 청구서 외 문서: items 기반 패널 (결제확인서 제외) -->
              <article v-if="!isInvoiceDocument && !isPaymentDocument" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-orange)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">세부 품목 내역</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)] tracking-tighter">{{ (isOrderDocument ? resolvedOrderItems : (docDetail.items || [])).length }} ITEMS</span>
                </div>
                <div class="max-h-72 overflow-y-auto border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] p-2 space-y-2 shadow-inner custom-scrollbar mb-5">
                  <div v-for="(item, idx) in (isOrderDocument ? resolvedOrderItems : (docDetail.items || []))" :key="'data-sum-'+idx" class="flex justify-between items-center p-3 rounded-lg border-b border-[var(--color-border-divider)] last:border-0 pb-3">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-xs font-bold text-[var(--color-text-strong)]">{{ item.productName || item.name }}</span>
                      <span class="text-[10px] text-[var(--color-text-sub)]">{{ item.variety || item.productCode || '기본 품종' }} | {{ item.unit }}</span>
                    </div>
                    <div class="text-right flex flex-col gap-0.5">
                      <span class="text-xs font-black text-[var(--color-text-strong)]">{{ item.quantity || item.count }} {{ item.unit }}</span>
                      <span v-if="!isQuotationRequest" class="text-[10px] font-bold text-[var(--color-olive)]">₩{{ Number(item.amount || ((item.quantity||item.count)*(item.unitPrice||item.price||0))).toLocaleString() }}</span>
                    </div>
                  </div>
                  <div v-if="(isOrderDocument ? resolvedOrderItems : (docDetail.items || [])).length === 0" class="p-4 text-center text-xs text-[var(--color-text-sub)]">품목 정보가 없습니다.</div>
                </div>
                <div v-if="!isQuotationRequest" class="flex justify-between items-end bg-[var(--color-bg-input)]/50 p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-black text-[var(--color-text-sub)] uppercase">
                      {{ isOrderDocument ? '주문 합계' : isContractDocument ? '계약 금액' : isStatementDocument ? '명세 합계' : '견적 금액' }}
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-2xl font-black text-[var(--color-olive)]">₩{{ Number(docDetail.totalAmount || docDetail.amount || 0).toLocaleString() }}</span>
                    <p class="text-[9px] font-bold text-[var(--color-text-sub)] mt-1">VAT INCLUDED</p>
                  </div>
                </div>
              </article>
              <article v-if="isStatementDocument" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-status-info)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">명세서 상세</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">STATEMENT INFO</span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">주문 코드</p>
                    <p class="mt-1 font-bold text-[var(--color-text-strong)]">{{ docDetail.orderCode || '—' }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">계약 코드</p>
                    <p class="mt-1 font-bold text-[var(--color-text-strong)]">{{ docDetail.contractCode || '—' }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">상태</p>
                    <p class="mt-1 font-bold text-[var(--color-text-strong)]">{{ docDetail.status || '—' }}</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">청구 주기</p>
                    <p class="mt-1 font-bold text-[var(--color-text-strong)]">{{ docDetail.billingCycle || '—' }}</p>
                  </div>
                </div>
                <div class="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">공급가</p>
                    <p class="mt-1 font-black text-[var(--color-text-strong)]">{{ statementAmounts.supplyAmount.toLocaleString() }}원</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">부가세</p>
                    <p class="mt-1 font-black text-[var(--color-text-strong)]">{{ statementAmounts.vatAmount.toLocaleString() }}원</p>
                  </div>
                  <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <p class="text-[10px] font-bold text-[var(--color-text-sub)]">합계</p>
                    <p class="mt-1 font-black text-[var(--color-olive)]">{{ statementAmounts.totalAmount.toLocaleString() }}원</p>
                  </div>
                </div>
                <div class="mt-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-4 text-xs leading-relaxed text-[var(--color-text-strong)]">
                  <p><strong>배송일:</strong> {{ formatKRDate(docDetail.deliveryDate) || '—' }}</p>
                  <p><strong>수령인:</strong> {{ docDetail.shippingName || '—' }}</p>
                  <p><strong>전화번호:</strong> {{ docDetail.shippingPhone || '—' }}</p>
                  <p><strong>주소:</strong> {{ [docDetail.shippingAddress, docDetail.shippingAddressDetail].filter(Boolean).join(' ') || '—' }}</p>
                  <p><strong>요청사항:</strong> {{ docDetail.deliveryRequest || '—' }}</p>
                </div>
              </article>
              <article v-if="isStatementDocument" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-olive)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">최근 이력</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">{{ statementRecentLogs.length }} LOGS</span>
                </div>
                <div class="space-y-3">
                  <div v-for="item in statementRecentLogs" :key="item.key" class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-xs font-bold text-[var(--color-text-strong)]">{{ item.title }}</p>
                      <span class="text-[10px] text-[var(--color-text-sub)]">{{ formatKRDate(item.at) || '—' }}</span>
                    </div>
                    <p v-if="item.description" class="mt-1 text-[11px] text-[var(--color-text-sub)]">{{ item.description }}</p>
                  </div>
                  <p v-if="statementRecentLogs.length === 0" class="text-xs text-[var(--color-text-sub)]">표시할 recentLogs가 없습니다.</p>
                </div>
              </article>
              <article v-if="authStore.currentRole === ROLES.SALES_REP && isAuthor && docDetail.memo" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center gap-2 mb-5"><span class="w-1.5 h-4 bg-slate-400 rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">공지 및 내부 비고</h3></div>
                <div class="space-y-5">
                  <div v-if="!isQuotationRequest && authStore.currentRole === ROLES.SALES_REP && isAuthor && docDetail.memo" class="space-y-2"><p class="text-[10px] font-black text-[var(--color-text-sub)] uppercase flex items-center gap-1"><span class="w-1 h-1 bg-[var(--color-text-sub)] rounded-full"></span> 내부 비고</p><div class="bg-[var(--color-bg-section)] border border-[var(--color-border-divider)] p-4 rounded-xl text-xs text-[var(--color-text-strong)] shadow-inner italic whitespace-pre-wrap">"{{ docDetail.memo }}"</div></div>
                </div>
              </article>
              <article v-if="displayedRejectReason" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-orange)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">반려 사유서</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">REJECT NOTE</span>
                </div>
                <div class="space-y-5">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] text-[var(--color-text-sub)] font-extrabold uppercase">반려 사유</label>
                    <div class="bg-[var(--color-bg-input)] border border-[var(--color-border-card)] p-4 rounded-xl text-xs text-[var(--color-text-strong)] shadow-inner italic whitespace-pre-wrap">{{ displayedRejectReason }}</div>
                  </div>
                </div>
              </article>
              <article v-if="showApprovalInfoPanel" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-olive)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">승인 정보</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">APPROVAL INFO</span>
                </div>
                <dl class="space-y-3">
                  <div v-for="field in approvalInfoFields" :key="field.label" class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                    <dt class="text-[10px] font-bold text-[var(--color-text-sub)]">{{ field.label }}</dt>
                    <dd class="mt-1 text-sm font-semibold text-[var(--color-text-strong)]">{{ field.value }}</dd>
                  </div>
                </dl>
              </article>
              <article v-if="showApprovalTimelinePanel" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-orange)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">승인 타임라인</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">TIMELINE</span>
                </div>
                <ol class="space-y-4">
                  <li v-for="step in approvalTimeline" :key="step.id" class="flex gap-3">
                    <div class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :class="step.toneClass" />
                    <div class="min-w-0 flex-1 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-3">
                      <div class="flex items-start justify-between gap-3">
                        <strong class="text-sm text-[var(--color-text-strong)]">{{ step.title }}</strong>
                        <span class="rounded-full px-2 py-1 text-[10px] font-bold" :class="step.badgeClass">{{ step.statusLabel }}</span>
                      </div>
                      <dl class="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt class="text-[var(--color-text-sub)]">결정 상태</dt>
                          <dd class="mt-1 font-semibold text-[var(--color-text-strong)]">{{ step.decisionLabel }}</dd>
                        </div>
                        <div>
                          <dt class="text-[var(--color-text-sub)]">결정자 ID</dt>
                          <dd class="mt-1 font-semibold text-[var(--color-text-strong)]">{{ step.decidedBy }}</dd>
                        </div>
                        <div>
                          <dt class="text-[var(--color-text-sub)]">요청 시각</dt>
                          <dd class="mt-1 font-semibold text-[var(--color-text-strong)]">{{ step.requestedAt }}</dd>
                        </div>
                        <div>
                          <dt class="text-[var(--color-text-sub)]">처리 시각</dt>
                          <dd class="mt-1 font-semibold text-[var(--color-text-strong)]">{{ step.decidedAt }}</dd>
                        </div>
                      </dl>
                      <p v-if="step.reason" class="mt-3 text-xs text-[var(--color-orange-dark)]">반려 사유: {{ step.reason }}</p>
                    </div>
                  </li>
                </ol>
              </article>
            </div>
            <div class="px-6 py-4 bg-[var(--color-bg-sidebar)] border-t border-[var(--color-border-divider)] flex justify-between items-center text-[9px] font-bold text-[var(--color-text-sub)] uppercase tracking-widest"><span>SeedFlow+ Digital Asset</span><span>Proprietary & Confidential</span></div>
          </div>
        </div>
      </section>
    </div>
  </teleport>

  <ModalBase v-model="showCancelConfirm" :title="isOrderDocument && !isDeleteAction ? '주문 취소 확인' : '취소 확인'" width-class="max-w-md">
    <template v-if="isOrderDocument && !isDeleteAction && !canOrderCancel">
      <p class="text-sm font-semibold text-[#C44536]">이미 승인된 주문서라 취소가 불가합니다.</p>
    </template>
    <template v-else>
      <p class="text-sm text-slate-700">
        <template v-if="isOrderDocument && !isDeleteAction">주문을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.</template>
        <template v-else>해당 문서를 취소 및 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</template>
      </p>
    </template>
    <p v-if="cancelErrorMessage" class="mt-3 text-xs font-semibold text-[#C44536]">{{ cancelErrorMessage }}</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" @click="showCancelConfirm = false">닫기</button>
        <button v-if="canOrderCancel || isDeleteAction || !isOrderDocument" type="button" class="rounded px-3 py-1.5 text-sm font-semibold text-white" style="background-color: #C44536" @click="confirmCancel">확인</button>
      </div>
    </template>
  </ModalBase>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
.card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.no-break { break-inside: avoid; page-break-inside: avoid; }
.current-pdf-template { width: 210mm; min-height: 297mm; background-color: #FFFFFF !important; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); color: #1e293b; line-height: 1.5; }
</style>