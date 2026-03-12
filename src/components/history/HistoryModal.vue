<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { searchApprovals } from '@/api/approval'
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
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const documentStore = useDocumentStore()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()

const docDetail = ref(null)
const isLoading = ref(false)
const approvalRejectReason = ref('')

const showInfoPanel = computed(() => props.mode !== 'readonly')
const showCancelConfirm = ref(false)
const cancelErrorMessage = ref('')

const normalizeOrderStatus = (status) => {
  const raw = String(status || '').trim().toUpperCase()
  if (['ORDERED', 'PENDING', 'REQUESTED', '처리중', '대기'].includes(raw)) return 'REQUESTED'
  if (['APPROVED', 'ACTIVE', '승인', '완료'].includes(raw)) return 'APPROVED'
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

  return authorIds.some(aid => myIds.includes(aid)) || isNameMatch
})

// 💡 표시할 멤버 이름 (작성자/담당자)
const resolvedMemberName = computed(() => {
  const doc = docDetail.value
  if (!doc) return '-'

  if (isQuotationRequest.value || isOrderDocument.value) {
    return doc.managerName || doc.client?.contact || doc.authorName || doc.writerName || '담당자 미지정'
  } else {
    return doc.salesRepName || doc.authorName || doc.writerName || '영업 담당자 미지정'
  }
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
const isRejectedDocument = computed(() => {
  const rawStatus = String(docDetail.value?.status || '').trim().toUpperCase()
  return rawStatus.includes('REJECT') || rawStatus.includes('반려') || Boolean(displayedRejectReason.value)
})
const showRewriteButton = computed(() => (
  isRejectedDocument.value
  && authStore.currentRole === ROLES.SALES_REP
  && isAuthor.value
  && Boolean(rewriteSourceId.value)
  && (showQuotationCancelButton.value || showContractDeleteButton.value)
))

const orderStatus = computed(() => normalizeOrderStatus(docDetail.value?.status))
const canOrderCancel = computed(() => isOrderDocument.value && authStore.currentRole === ROLES.CLIENT && orderStatus.value === 'REQUESTED' && authStore.currentRole !== ROLES.ADMIN)
const showOrderCancelButton = computed(() => isOrderDocument.value && orderStatus.value !== 'CANCELED' && authStore.currentRole === ROLES.CLIENT && isAuthor.value && authStore.currentRole !== ROLES.ADMIN)

const isDeleteAction = ref(false)
const handleDelete = () => {
  isDeleteAction.value = true
  showCancelConfirm.value = true
}

const handleRewrite = async () => {
  try {
    if (isQuotationDocument.value) {
      const latestDetail = await documentStore.fetchQuotationDetail(props.docId)
      const sourceId = latestDetail?.requestId || latestDetail?.quotationRequestId || null

      if (!sourceId) {
        window.alert('상위 견적요청서가 연결된 견적서만 재작성할 수 있습니다.')
        return
      }

      const deleted = await documentStore.deleteDocument(props.docId, props.docType)
      if (!deleted) {
        return
      }

      close()
      await router.push({
        path: '/documents/quotation',
        query: {
          requestId: String(sourceId),
          rewrite: 'true',
        },
      })
      return
    }

    if (isContractDocument.value) {
      const latestDetail = await documentStore.fetchContractDetail(props.docId)
      const sourceId = latestDetail?.quotationId || null

      if (!sourceId) {
        window.alert('상위 견적서가 연결된 계약서만 재작성할 수 있습니다.')
        return
      }

      const deleted = await documentStore.deleteContract(props.docId)
      if (!deleted) {
        return
      }

      close()
      await router.push({
        path: '/documents/contract',
        query: {
          quotationId: String(sourceId),
          rewrite: 'true',
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
    if (authStore.currentRole !== ROLES.CLIENT && employeeStore.employees.length === 0) {
      try { await employeeStore.fetchEmployees() } catch (e) {}
    }

    const normalizedType = String(props.docType || '').toLowerCase().trim()
    const typeMap = {
      '견적': 'quotation', '견적서': 'quotation', 'quotation': 'quotation', 'quo': 'quotation',
      '주문': 'order', '주문서': 'order', 'order': 'order', 'ord': 'order',
      '계약': 'contract', '계약서': 'contract', 'contract': 'contract', 'cnt': 'contract',
      '청구': 'invoice', '청구서': 'invoice', 'invoice': 'invoice', 'inv': 'invoice',
      '견적요청': 'quotation-request', '견적요청서': 'quotation-request', 'quotation-request': 'quotation-request', 'rfq': 'quotation-request'
    }
    const typeKey = typeMap[normalizedType] || normalizedType

    let detail = null
    if (typeKey === 'quotation') detail = documentStore.getQuotationById(currentId)
    else if (typeKey === 'order') detail = documentStore.getOrderById(currentId)
    else if (typeKey === 'contract') detail = documentStore.getContractById(currentId)
    else if (typeKey === 'invoice') detail = documentStore.getInvoiceById(currentId)
    else if (['quotation-request', 'rfq'].includes(typeKey)) detail = documentStore.getRequestById(currentId)

    const requiresFreshDetail = isQuotationDocument.value || isContractDocument.value

    if (requiresFreshDetail || !detail || !detail.items || detail.items.length === 0) {
      let fetched = null
      if (['quotation-request', 'rfq'].includes(typeKey)) fetched = await documentStore.fetchQuotationRequestDetail(currentId)
      else if (typeKey === 'quotation') fetched = await documentStore.fetchQuotationDetail(currentId)
      else if (typeKey === 'contract') fetched = await documentStore.fetchContractDetail(currentId)
      else if (typeKey === 'order') fetched = await documentStore.fetchOrderDetail(currentId)
      else if (typeKey === 'invoice') fetched = await documentStore.fetchInvoiceDetail(currentId)
      else fetched = await documentStore.fetchDocumentDetail(currentId)
      if (fetched) detail = fetched
    }

    docDetail.value = detail
    if (docDetail.value && !docDetail.value.type) docDetail.value.type = typeKey
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
      paper.style.minHeight = '1110px';
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
      scale: isContract ? 2 : 3, // 견적서는 고화질(3), 계약서는 긴 문서 대응을 위해 2 적용
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      y: 0,
      scrollY: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: isContract ? ['avoid-all', 'css', 'legacy'] : 'avoid-all' }
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
    const result = await documentStore.cancelOrder(props.docId)
    if (result.success) { showCancelConfirm.value = false; await loadDetail(); return }
    cancelErrorMessage.value = result.message || '주문 취소 처리에 실패했습니다.'
    return
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
            <button v-if="showOrderCancelButton" type="button" class="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors bg-[var(--color-orange)] hover:bg-[var(--color-orange-dark)] disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canOrderCancel" @click="showCancelConfirm = true">주문 취소</button>
            <button v-if="showDownload" type="button" class="rounded bg-[var(--color-olive)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-olive-dark)] transition-colors" @click="downloadDocument">
              <span v-if="isDownloading" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              {{ isDownloading ? 'PDF 생성 중...' : '다운로드' }}
            </button>
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
                      <div class="w-16 h-16 border-2 border-black flex items-center justify-center font-bold text-sm">인</div>
                    </div>
                    <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[11px]">
                      <thead class="bg-[#F7F3EC]"><tr class="border-b-2 border-black"><th class="border-r border-black p-2">품종</th><th class="border-r border-black p-2">상품명</th><th class="border-r border-black p-2">수량</th><th class="border-r border-black p-2">단위</th><th class="border-r border-black p-2">단가</th><th class="p-2">금액</th></tr></thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-q-'+idx" class="border-b border-black">
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
                  <div v-else-if="isContractDocument" class="bg-white px-12 pt-8 pb-12 w-[794px] min-h-[1110px] shadow-2xl relative text-[13px] text-black flex flex-col" style="box-sizing: border-box !important; font-family: 'KoPub Dotum', sans-serif !important;">
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
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-c-'+idx" class="border-b border-black">
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
                    <div v-if="docDetail.specialTerms" class="pt-20">
                      <strong class="text-sm border-b border-black pb-1">[특약 사항]</strong>
                      <p class="mt-3 border border-black p-5 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[13px] min-h-[80px]">{{ docDetail.specialTerms }}</p>
                    </div>
                    <div class="pt-8 pb-2 text-center flex flex-col items-center">
                      <p class="text-[15px] font-bold mb-4">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                      <div class="w-full px-16"><div class="border-t-2 border-black pt-5"><p class="font-bold text-xl">위 계약의 내용을 증명하기 위해 기명 날인함</p></div></div>
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
                  <div class="flex flex-col gap-1.5"><label class="text-[10px] text-[var(--color-text-sub)] font-extrabold uppercase">상호명 / 법인명</label><div class="p-3 border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] text-base font-black text-[var(--color-text-strong)] shadow-inner">{{ docDetail.clientName || docDetail.client?.name }}</div></div>
                  <div class="flex flex-col gap-2"><label class="text-[10px] text-[var(--color-text-sub)] font-extrabold uppercase">{{ (isQuotationRequest || isOrderDocument) ? '고객사 담당자' : 'SeedFlow+ 담당 영업사원' }}</label><div class="flex items-center justify-between p-3 border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] shadow-inner"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[var(--color-olive)]/10 border border-[var(--color-olive)]/20 flex items-center justify-center text-[var(--color-olive)] font-black text-xs">{{ (resolvedMemberName || 'M')[0] }}</div><span class="text-sm font-bold text-[var(--color-text-strong)]">{{ resolvedMemberName }}</span></div><span class="text-[9px] bg-[var(--color-olive)] text-white px-2 py-1 rounded-lg font-black tracking-tighter">OFFICIAL</span></div></div>
                </div>
              </article>
              <article class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2"><span class="w-1.5 h-4 bg-[var(--color-orange)] rounded-full"></span><h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">세부 품목 내역</h3></div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)] tracking-tighter">{{ (docDetail.items || []).length }} ITEMS</span>
                </div>
                <div class="max-h-72 overflow-y-auto border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] p-2 space-y-2 shadow-inner custom-scrollbar mb-5"><div v-for="(item, idx) in docDetail.items" :key="'data-sum-'+idx" class="flex justify-between items-center p-3 rounded-lg border-b border-[var(--color-border-divider)] last:border-0 pb-3"><div class="flex flex-col gap-0.5"><span class="text-xs font-bold text-[var(--color-text-strong)]">{{ item.name }}</span><span class="text-[10px] text-[var(--color-text-sub)]">{{ item.variety || '기본 품종' }} | {{ item.unit }}</span></div><div class="text-right flex flex-col gap-0.5"><span class="text-xs font-black text-[var(--color-text-strong)]">{{ item.quantity || item.count }} {{ item.unit }}</span><span v-if="!isQuotationRequest" class="text-[10px] font-bold text-[var(--color-olive)]">₩{{ Number(item.amount || ((item.quantity||item.count)*(item.unitPrice||item.price))).toLocaleString() }}</span></div></div></div>
                <div v-if="!isQuotationRequest" class="flex justify-between items-end bg-[var(--color-bg-input)]/50 p-4 rounded-xl border border-[var(--color-border-divider)]"><div class="flex flex-col"><span class="text-[10px] font-black text-[var(--color-text-sub)] uppercase">Final Quote</span><span class="text-xs font-medium text-[var(--color-text-sub)] line-through">₩{{ Number((docDetail.totalAmount || docDetail.amount || 0) * 1.1).toLocaleString() }}</span></div><div class="text-right"><span class="text-2xl font-black text-[var(--color-olive)]">₩{{ Number(docDetail.totalAmount || docDetail.amount || 0).toLocaleString() }}</span><p class="text-[9px] font-bold text-[var(--color-text-sub)] mt-1">VAT INCLUDED</p></div></div>
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
            </div>
            <div class="px-6 py-4 bg-[var(--color-bg-sidebar)] border-t border-[var(--color-border-divider)] flex justify-between items-center text-[9px] font-bold text-[var(--color-text-sub)] uppercase tracking-widest"><span>SeedFlow+ Digital Asset</span><span>Proprietary & Confidential</span></div>
          </div>
        </div>
      </section>
    </div>
  </teleport>

  <ModalBase v-model="showCancelConfirm" title="취소 확인" width-class="max-w-md">
    <p class="text-sm text-slate-700">해당 문서를 취소 및 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
    <p v-if="cancelErrorMessage" class="mt-3 text-xs font-semibold text-[#C44536]">{{ cancelErrorMessage }}</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" @click="showCancelConfirm = false">닫기</button>
        <button type="button" class="rounded px-3 py-1.5 text-sm font-semibold text-white" style="background-color: #C44536" @click="confirmCancel">확인</button>
      </div>
    </template>
  </ModalBase>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
.card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.current-pdf-template { width: 210mm; min-height: 297mm; background-color: #FFFFFF !important; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); color: #1e293b; line-height: 1.5; }
</style>
