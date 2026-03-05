<script setup>
import { computed, ref, watch } from 'vue'
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

const documentStore = useDocumentStore()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()

const docDetail = ref(null)
const isLoading = ref(false)

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

// 💡 유저 요청 3: 견적 요청서의 memo는 요구사항이므로 우측 비고란에서 제외
const isQuotationRequest = computed(() => {
  const type = String(props.docType || '').toLowerCase().replace(/\s+/g, '')
  const detailType = String(docDetail.value?.type || '').toLowerCase().replace(/\s+/g, '')
  const docId = String(props.docId || '').toUpperCase()

  const labels = ['견적요청', '견적요청서', 'quotationrequest', 'rfq']
  return labels.some(l => type.includes(l) || detailType.includes(l)) || docId.startsWith('RFQ')
})

// 💡 유저 요청: SALES_REP일 때만 비고 노출, CLIENT/ADMIN은 숨김
const showRemark = computed(() => {
  if (isQuotationRequest.value) return false
  return authStore.currentRole === ROLES.SALES_REP && showInfoPanel.value && !props.hideRemark && props.mode !== 'admin-rejected'
})

// 💡 유저 요청: 거래처(CLIENT)만 견적 요청 취소 가능 (견적서 작성 전까지만)
const canCancel = computed(() => {
  if (authStore.currentRole !== ROLES.CLIENT) return false
  if (!isQuotationRequest.value) return false
  if (!docDetail.value) return false

  // 상태가 'QUOTED'가 아니고 'CANCELLED'가 아닐 때만 취소 가능
  const status = String(docDetail.value.status).toUpperCase()
  return status !== 'QUOTED' && status !== 'CANCELLED'
})

const isOrderDocument = computed(() => {
  const type = String(docDetail.value?.type || props.docType || '').toLowerCase()
  return type === 'order' || type.includes('주문')
})

const orderStatus = computed(() => normalizeOrderStatus(docDetail.value?.status))

const canOrderCancel = computed(() => {
  if (!isOrderDocument.value) return false
  if (authStore.currentRole !== ROLES.CLIENT) return false
  return orderStatus.value === 'REQUESTED'
})

const isOrderCancelBlockedByApproval = computed(() => {
  if (!isOrderDocument.value) return false
  if (authStore.currentRole !== ROLES.CLIENT) return false
  return orderStatus.value === 'APPROVED'
})

const showOrderCancelButton = computed(() => {
  if (!isOrderDocument.value) return false
  if (orderStatus.value === 'CANCELED') return false
  // 주문서는 거래처인 본인만 취소 가능 (관련 로직 통합 가시성 확보)
  return authStore.currentRole === ROLES.CLIENT && isAuthor.value
})

const showRejectReason = computed(() => props.mode === 'sales-rejected' || props.mode === 'admin-rejected')
const downloadLink = ref(null)

// 💡 유저 요청 1: 작성자 이름 매핑 (강력한 버전)
const resolvedAuthorName = computed(() => {
  const doc = docDetail.value
  if (!doc) return '-'

  // 1. 이미 정상적인 작성자 이름이 있으면 우선 사용 (기본 '작성자' 텍스트는 무시)
  if (doc.authorName && doc.authorName !== '작성자') return doc.authorName
  if (doc.writerName && doc.writerName !== '작성자') return doc.writerName

  // 2. 작성자 ID 추출 (다양한 필드 대응)
  const authorId = doc.authorId || doc.author || doc.writerId || doc.userId
  if (!authorId) return doc.authorName || '-'

  // 3. 현재 로그인한 본인 정보와 대조
  const me = authStore.me
  if (me && (String(authorId) === String(me.id) || String(authorId) === String(me.refId))) {
    return me.targetPerson || me.name || me.loginId || '본인'
  }

  // 4. 사원 목록에서 대조
  const emp = authorId ? employeeStore.getEmployeeById(authorId) : null
  if (emp) return emp.name

  // 5. 최종 보루: doc 객체에 있는 모든 이름 가능성 탐색
  return doc.authorName || doc.writerName || doc.client?.managerName || doc.author || '-'
})

// 💡 유저 요청: 본인이 작성한 문서인지 여부 (취소 및 삭제 권한용)
const isAuthor = computed(() => {
  const doc = docDetail.value
  if (!doc) return false
  const authorId = doc.authorId || doc.author || doc.writerId || doc.userId
  if (!authorId) return false
  const me = authStore.me
  if (!me) return false
  return String(authorId) === String(me.id) || String(authorId) === String(me.refId)
})

const isDeleteAction = ref(false)
const handleDelete = () => {
  isDeleteAction.value = true
  showCancelConfirm.value = true
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

const loadDetail = async () => {
  const currentId = props.docId
  if (!currentId) {
    docDetail.value = null
    return
  }

  // 💡 0. 로딩 시작 시 이전 데이터를 밀어버리고 사원 목록도 미리 긁어옴
  docDetail.value = null
  isLoading.value = true

  try {
    if (employeeStore.employees.length === 0) {
      await employeeStore.fetchEmployees()
    }

    // 💡 1. 타입 매핑
    const typeMap = {
      '견적': 'quotation',
      '견 적': 'quotation',
      '견적서': 'quotation',
      'quotation': 'quotation',
      '주문': 'order',
      '주 문': 'order',
      '주문서': 'order',
      'order': 'order',
      '계약': 'contract',
      '계 약': 'contract',
      '계약서': 'contract',
      'contract': 'contract',
      '청구': 'invoice',
      '청 구': 'invoice',
      '청구서': 'invoice',
      'invoice': 'invoice',
      '견적요청': 'quotation-request',
      '견적 요청': 'quotation-request',
      '견적 요청서': 'quotation-request',
      '견적요청서': 'quotation-request',
      'quotation-request': 'quotation-request',
      'rfq': 'quotation-request'
    }

    const normalizedType = String(props.docType || '').toLowerCase().replace(/\s+/g, '')
    const typeKey = typeMap[normalizedType] || normalizedType

    // 💡 2. 스토어 캐시에서 긁어오기 (String 변환으로 ID 타입 차이 극복)
    let detail = null
    if (typeKey === 'quotation') detail = documentStore.getQuotationById(currentId)
    else if (typeKey === 'order') detail = documentStore.getOrderById(currentId)
    else if (typeKey === 'contract') detail = documentStore.getContractById(currentId)
    else if (typeKey === 'invoice') detail = documentStore.getInvoiceById(currentId)
    else if (['quotation-request', 'rfq', '견적요청'].includes(typeKey)) detail = documentStore.getRequestById(currentId)

    // 💡 3. 캐시에 없거나(summary만 있는 경우) 품목 정보가 없으면 서버에서 강제로 가져옴
    if (!detail || !detail.items || detail.items.length === 0) {
      const fetched = await documentStore.fetchDocumentDetail(currentId)
      if (fetched) detail = fetched
    }

    docDetail.value = detail
  } catch (e) {
    console.error('[HistoryModal] 상세 로드 중 오류 발생:', e)
  } finally {
    isLoading.value = false
  }
}

// 💡 modelValue가 true가 되거나 docId가 바뀔 때 로드
watch([() => props.modelValue, () => props.docId], ([show, id]) => {
  if (show && id) loadDetail()
}, { immediate: true })

const isDownloading = ref(false)

const downloadDocument = async () => {
  if (!docDetail.value) return

  const element = document.querySelector('.current-pdf-template')
  if (!element) return

  isDownloading.value = true

  // 1. [시각적 무영 격리 렌더링] 사용자에게 보이지 않는 화면 밖 독립 컨테이너 생성
  // (SyntaxError 방지, 풀스크린 좌표 오차 무력화 + 사용자 경험 개선)
  const overlay = document.createElement('div')
  overlay.id = 'pdf-render-overlay'
  overlay.style.position = 'fixed'
  overlay.style.left = '-10000px' // 사용자에게 노출되지 않도록 화면 밖으로 이동
  overlay.style.top = '0'
  overlay.style.width = '794px'
  overlay.style.height = '1115px'
  overlay.style.backgroundColor = '#ffffff'
  overlay.style.zIndex = '-999999' // 화면 아래에 배치
  overlay.style.overflow = 'hidden'

  // 템플릿 복제 및 오버레이의 (0,0)에 배치
  const clone = element.cloneNode(true)
  clone.style.transform = 'none'
  clone.style.margin = '0'
  clone.style.padding = '0'
  clone.style.width = '794px'
  clone.style.height = '1115px'
  clone.style.display = 'block'
  clone.style.position = 'absolute'
  clone.style.top = '0'
  clone.style.left = '0'
  clone.style.boxShadow = 'none'

  const innerDoc = clone.firstElementChild
  if (innerDoc) {
    innerDoc.style.width = '794px'
    innerDoc.style.height = '1115px'
    innerDoc.style.margin = '0'
    innerDoc.style.padding = '48px'
    innerDoc.style.boxSizing = 'border-box'
    innerDoc.style.background = 'white'
    innerDoc.style.boxShadow = 'none'
    innerDoc.style.transform = 'none'
  }

  overlay.appendChild(clone)
  document.body.appendChild(overlay)

  const opt = {
    margin: 0,
    filename: `${props.docId}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      width: 794,
      height: 1115,
      scrollY: 0,
      scrollX: 0,
      x: 0,
      y: 0,
      windowWidth: 794,
      devicePixelRatio: 1, // 시스템 배율 설정 무시
      logging: false,
      backgroundColor: '#ffffff'
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  try {
    // 렌더링 안정화 대기
    await new Promise(resolve => setTimeout(resolve, 1000))
    // 오버레이 위의 클론을 직접 소스로 지정
    await window.html2pdf().set(opt).from(clone).save()
  } catch (error) {
    console.error('PDF 다운로드 실패:', error)
    alert('PDF 생성 중 오류가 발생했습니다.')
  } finally {
    if (overlay.parentNode) {
      document.body.removeChild(overlay)
    }
    isDownloading.value = false
  }
}

const handleCancel = async () => {
  cancelErrorMessage.value = ''

  if (showOrderCancelButton.value) {
    if (!canOrderCancel.value) return
    showCancelConfirm.value = true
    return
  }

  if (canCancel.value) {
    showCancelConfirm.value = true
  }
}

const confirmCancel = async () => {
  cancelErrorMessage.value = ''

  // 💡 본인 작성 문서 삭제 요청인 경우
  if (isDeleteAction.value) {
    const success = await documentStore.deleteDocument(props.docId)
    if (success) {
      showCancelConfirm.value = false
      isDeleteAction.value = false
      close()
      return
    }
    cancelErrorMessage.value = '문서 삭제에 실패했습니다. 이미 처리된 문서이거나 권한이 없을 수 있습니다.'
    return
  }

  if (showOrderCancelButton.value) {
    const result = await documentStore.cancelOrder(props.docId)
    if (result.success) {
      showCancelConfirm.value = false
      await loadDetail()
      return
    }
    cancelErrorMessage.value = result.message || '주문 취소 처리에 실패했습니다.'
    return
  }

  const success = await documentStore.cancelQuotationRequest(props.docId)
  if (success) {
    showCancelConfirm.value = false
    close()
    return
  }

  cancelErrorMessage.value = '삭제 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'
}

const formatISO = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toISOString().split('T')[0]
}

const getValidityDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const baseDate = new Date(dateStr)
  baseDate.setDate(baseDate.getDate() + 30)
  return baseDate.toISOString().split('T')[0]
}

</script>

<template>
  <teleport to="body">
    <a ref="downloadLink" class="hidden" aria-hidden="true" tabindex="-1" />
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        @click.self="close"
    >
      <section class="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-[var(--color-bg-base)] shadow-xl border border-[var(--color-border-card)]">
        <header class="flex items-center justify-between border-b border-[var(--color-border-divider)] bg-[var(--color-bg-sidebar)] px-5 py-3">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-semibold text-[var(--color-text-strong)]">{{ title }}</h3>
            <span class="font-mono text-sm text-[var(--color-text-sub)] bg-[var(--color-bg-section)] px-2 py-0.5 rounded border border-[var(--color-border-card)]">{{ docId }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div v-if="showOrderCancelButton && isOrderCancelBlockedByApproval" class="text-xs font-semibold text-[#C44536]">
              관리자 승인 필요
            </div>
            <button
                v-if="canCancel"
                type="button"
                class="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors bg-[var(--color-orange)] hover:bg-[var(--color-orange-dark)]"
                @click="handleCancel"
            >
              취소
            </button>
            <button
                v-if="showOrderCancelButton"
                type="button"
                class="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors bg-[var(--color-orange)] hover:bg-[var(--color-orange-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canOrderCancel"
                @click="handleCancel"
            >
              취소
            </button>
            <button
                v-if="isAuthor && !isOrderDocument"
                type="button"
                class="rounded bg-[#C44536] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A3392D] transition-colors"
                @click="handleDelete"
            >
              취소 및 삭제
            </button>
            <button
                v-if="showDownload"
                type="button"
                class="rounded bg-[var(--color-olive)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-olive-dark)] transition-colors"
                @click="downloadDocument"
            >
              <span v-if="isDownloading" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              {{ isDownloading ? 'PDF 생성 중...' : '다운로드' }}
            </button>
            <button type="button" class="rounded px-2 py-1 text-xl text-[var(--color-text-sub)] hover:bg-[var(--color-bg-section)]" @click="close">
              ×
            </button>
          </div>
        </header>

        <div class="flex flex-1 min-h-0 bg-[var(--color-bg-base)] overflow-hidden">
          <!-- ── 왼쪽 패널: PDF 미리보기 (비율 조정) ── -->
          <div class="flex-[1.2] flex flex-col bg-[#525659] border-r border-[var(--color-border-card)] overflow-hidden shadow-inner">
            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar flex justify-center bg-transparent">
              <div v-if="isLoading" class="flex flex-col items-center justify-center h-full gap-4">
                <div class="w-12 h-12 border-4 border-[var(--color-olive)] border-t-transparent rounded-full animate-spin"></div>
                <p class="text-[var(--color-text-body)] font-medium">문서를 준비하고 있습니다...</p>
              </div>

              <!-- PDF 스케일 조절 (컨테이너 크기에 맞춰 자동 축소) -->
              <div v-else-if="docDetail" class="origin-top scale-[0.7] 2xl:scale-[0.8] transition-transform duration-500">
                <div class="current-pdf-template transform-gpu shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                  <!-- AGENT_DEBUG: PDF_TEMPLATE_START -->
                  <!-- 1. 견적서 (QuotationView.vue 1:1 Mirror) -->
                  <div v-if="docDetail.type === 'quotation' || docDetail.type === '견적서' || docId.startsWith('QT')" class="bg-white p-12 h-[1115px] overflow-hidden shadow-2xl relative text-[11px] text-black pdf-document-font w-[794px]">
                    <div class="text-center border-b-2 border-black pb-3 mb-8">
                      <h1 class="text-3xl font-bold tracking-[10px]" style="font-family: 'KoPub Dotum', sans-serif !important;">견 적 서</h1>
                    </div>
                    <div class="flex justify-between items-start mb-10 text-[13px]">
                      <div class="space-y-2">
                        <p>수신: <span class="border-b border-black font-bold px-2 text-[15px]">{{ docDetail.clientName || docDetail.client?.name || '(빈값)' }}</span> 귀하</p>
                        <p>담당: <span class="px-2">{{ docDetail.clientContact || docDetail.client?.contact || '(빈값)' }}</span></p>
                        <p>견적 유효기간: <span class="font-bold border-b border-black px-1 text-black">{{ getValidityDate(docDetail.date || docDetail.createdAt) }}</span> (30일)</p>
                      </div>
                      <div class="w-16 h-16 border-2 border-black flex items-center justify-center font-bold text-sm">인</div>
                    </div>
                    <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[11px]">
                      <thead class="bg-[#F7F3EC]">
                      <tr class="border-b-2 border-black"><th class="border-r border-black p-2">품종</th><th class="border-r border-black p-2">상품명</th><th class="border-r border-black p-2">수량</th><th class="border-r border-black p-2">단위</th><th class="border-r border-black p-2">단가</th><th class="p-2">금액</th></tr>
                      </thead>
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
                      <tfoot class="bg-[#FAF7F3] font-bold">
                      <tr><td colspan="5" class="border-r border-black p-2 text-sm text-right px-3">합 계</td><td class="p-2 text-right font-mono px-3 text-lg">{{ Number(docDetail.totalAmount ?? docDetail.amount ?? 0).toLocaleString() }}</td></tr>
                      </tfoot>
                    </table>
                    <div class="absolute bottom-20 left-0 right-0 text-center space-y-6">
                      <p class="text-sm font-bold">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                      <p class="text-lg font-black tracking-[5px] border-t-2 border-black pt-6 mx-16">위와 같이 견적함 ( (주) 몬순 )</p>
                    </div>
                  </div>


                  <div v-else-if="docDetail.type === 'contract' || docDetail.type === '계약서' || docId.startsWith('CT')" class="bg-white p-12 h-[1115px] overflow-hidden shadow-2xl relative text-[11px] text-black pdf-document-font w-[794px]">
                    <div class="text-center border-b-2 border-black pb-3 mb-8">
                      <h1 class="text-2xl font-bold tracking-widest" style="font-family: 'KoPub Dotum', sans-serif !important;">물 품 공 급 계 약 서</h1>
                    </div>
                    <div class="mb-8 space-y-2 leading-relaxed text-[13px]">
                      <p><strong>계약상대자 (갑):</strong> <span class="border-b border-black px-2 font-bold">{{ docDetail.clientName || docDetail.client?.name || '(빈값)' }}</span></p>
                      <p><strong>계약상대자 (을):</strong> (주) 몬순</p>
                      <p><strong>계약기간:</strong> <span class="font-mono text-xs">{{ formatDate(docDetail.startDate) || '____-__-__' }} ~ {{ formatDate(docDetail.endDate) || '____-__-__' }}</span></p>
                      <p><strong>청구주기:</strong> <span class="border-b border-black px-2 font-bold">{{ docDetail.billingCycle }} 단위 청구</span></p>
                    </div>

                    <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[11px]">
                      <thead class="bg-[#F7F3EC]">
                      <tr class="border-b-2 border-black">
                        <th class="border-r border-black p-2">상품명</th>
                        <th class="border-r border-black p-2 w-12">수량</th>
                        <th class="border-r border-black p-2">단위</th>
                        <th class="border-r border-black p-2">단가</th>
                        <th class="p-2">금액</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-c-'+idx" class="border-b border-black">
                        <td class="border-r border-black p-2 text-left font-bold px-3">{{ item.name }}</td>
                        <td class="border-r border-black p-2">{{ item.quantity ?? item.count ?? 0 }}</td>
                        <td class="border-r border-black p-2">{{ item.unit }}</td>
                        <td class="border-r border-black p-2 text-right font-mono">{{ Number(item.unitPrice ?? item.price ?? 0).toLocaleString() }}</td>
                        <td class="p-2 text-right font-bold px-3">{{ Number(item.amount ?? ((item.quantity ?? item.count ?? 0) * (item.unitPrice ?? item.price ?? 0))).toLocaleString() }}</td>
                      </tr>
                      <tr v-if="(docDetail.items || []).length > 0">
                        <td colspan="4" class="border-r border-black p-2 bg-[#FAF7F3] font-bold text-right px-3">합 계</td>
                        <td class="p-2 text-right font-extrabold text-blue-700 px-3 text-lg">{{ Number(docDetail.totalAmount ?? docDetail.amount ?? 0).toLocaleString() }}</td>
                      </tr>
                      </tbody>
                    </table>

                    <div v-if="docDetail.specialTerms" class="mt-6">
                      <strong class="text-xs">[특약 사항]</strong>
                      <p class="mt-2 min-h-[60px] border border-black p-3 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[11px]">{{ docDetail.specialTerms }}</p>
                    </div>

                    <div class="absolute bottom-20 left-0 right-0 text-center">
                      <p class="mb-5 text-sm font-bold">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                      <p class="mt-6 font-bold text-base border-t-2 border-black pt-6 mx-16">위 계약의 내용을 증명하기 위해 기명 날인함</p>
                    </div>
                  </div>


                  <div v-else-if="docDetail.type === 'order' || docDetail.type === '주문서' || docId.startsWith('OR')" class="bg-white p-12 h-[1115px] overflow-hidden shadow-2xl relative text-[11px] text-black pdf-document-font w-[794px]" style="font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="pdf-title text-3xl font-black mb-10 pb-6 border-b-4" style="font-family: 'KoPub Dotum', sans-serif !important;">주 문 서</div>
                    <div class="pdf-meta-grid mb-10 border-2">
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">주문 번호</div><div class="value font-mono">{{ docDetail.id }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">작성일</div><div class="value font-bold">{{ formatDate(docDetail.date || docDetail.createdAt) }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">거래처명</div><div class="value font-black">{{ docDetail.clientName || docDetail.client?.name || '-' }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">계약 번호</div><div class="value font-mono">{{ docDetail.contractId || '-' }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">납기일</div><div class="value font-bold text-blue-700">{{ formatDate(docDetail.deliveryDate) }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">담당자</div><div class="value font-bold">{{ docDetail.clientContact || docDetail.client?.contact || '-' }}</div>
                      </div>
                    </div>

                    <div class="pdf-section-title text-sm mb-4 border-l-4">▪ 주문 상품 내역</div>
                    <table class="pdf-table border-2 mb-10 text-[11px]">
                      <thead>
                      <tr class="bg-slate-50">
                        <th class="p-2 border-2">상품명</th>
                        <th class="p-2 border-2">단가</th>
                        <th class="p-2 border-2">수량</th>
                        <th class="p-2 border-2 text-right">금액</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-o-' + idx">
                        <td class="p-2 border-2 font-bold">{{ item.name }}</td>
                        <td class="p-2 border-2 text-right">₩{{ Number(item.unitPrice ?? item.price ?? 0).toLocaleString() }}</td>
                        <td class="p-2 border-2 text-center">{{ item.quantity ?? item.count ?? 0 }} {{ item.unit }}</td>
                        <td class="p-2 border-2 text-right font-bold">₩{{ (Number(item.quantity ?? item.count ?? 0) * Number(item.unitPrice ?? item.price ?? 0)).toLocaleString() }}</td>
                      </tr>
                      </tbody>
                      <tfoot>
                      <tr class="pdf-total-row bg-blue-50">
                        <td colspan="3" class="p-3 border-2 font-black text-right">총 합계금액</td>
                        <td class="p-3 border-2 text-right font-black text-xl text-blue-700">₩{{ Number(docDetail.totalAmount ?? docDetail.amount ?? 0).toLocaleString() }}</td>
                      </tr>
                      </tfoot>
                    </table>

                    <div class="pdf-section-title text-sm mb-4 border-l-4">▪ 배송 및 요청사항</div>
                    <div class="pdf-meta-grid border-2">
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">배송지</div><div class="value">{{ docDetail.deliveryAddress || '-' }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">수령인</div><div class="value font-bold">{{ docDetail.deliveryRecipient || '-' }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">연락처</div><div class="value">{{ docDetail.deliveryPhone || '-' }}</div>
                      </div>
                      <div class="pdf-meta-row">
                        <div class="label bg-slate-100 font-black">요청사항</div><div class="value italic">{{ docDetail.deliveryMemo || docDetail.memo || '없음' }}</div>
                      </div>
                    </div>

                    <div class="absolute bottom-16 left-0 right-0 text-center font-black text-sm tracking-widest opacity-20">
                      SEEDFLOW+ OFFICIAL ORDER DOCUMENT
                    </div>
                  </div>


                  <div v-else-if="docDetail.type === 'invoice' || docDetail.type === '청구서' || docId.startsWith('INV')" class="bg-white p-12 h-[1115px] overflow-hidden shadow-2xl relative text-[11px] text-black pdf-document-font w-[794px]" style="font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="mb-8 flex items-start justify-between border-b-4 border-slate-800 pb-6">
                      <div>
                        <h1 class="text-4xl font-black tracking-[8px]" style="font-family: 'KoPub Dotum', sans-serif !important;">청 구 서</h1>
                        <p class="mt-2 text-sm font-mono text-slate-500">{{ docDetail.id }}</p>
                      </div>
                      <div class="text-right text-xs leading-relaxed text-slate-500 space-y-1">
                        <p class="text-base font-black text-slate-800">㈜몬순</p>
                        <p>서울특별시 우성로 123 몬순빌딩 15층</p>
                        <p>사업자등록번호: 220-81-12345</p>
                        <p>담당: 경영지원팀 &nbsp;|&nbsp; 02-555-1234</p>
                      </div>
                    </div>
                    <table class="mb-8 w-full border-collapse border-2 border-slate-800 text-sm">
                      <tr>
                        <td class="w-24 border border-slate-300 bg-slate-100 px-4 py-2 font-black">수신처</td>
                        <td class="border border-slate-300 px-4 py-2 font-bold">{{ docDetail.clientName || docDetail.client?.name || '—' }}</td>
                        <td class="w-24 border border-slate-300 bg-slate-100 px-4 py-2 font-black">청구일</td>
                        <td class="border border-slate-300 px-4 py-2 font-bold">{{ formatDate(docDetail.date || docDetail.createdAt) }}</td>
                      </tr>
                      <tr>
                        <td class="border border-slate-300 bg-slate-100 px-4 py-2 font-black">계약 번호</td>
                        <td class="border border-slate-300 px-4 py-2 font-bold">{{ docDetail.contractId || '—' }}</td>
                        <td class="border border-slate-300 bg-slate-100 px-4 py-2 font-black text-blue-700">납부 기한</td>
                        <td class="border border-slate-300 px-4 py-2 font-black text-blue-700 underline">{{ formatDate(new Date(new Date(docDetail.date || docDetail.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000)) }}</td>
                      </tr>
                    </table>
                    <p class="my-4 border-l-4 border-blue-600 pl-3 text-sm font-black text-slate-800">▪ 청구 명세 요약</p>
                    <table class="mb-6 w-full border-collapse border-2 border-slate-800">
                      <thead>
                      <tr class="bg-slate-100">
                        <th class="border border-slate-300 px-4 py-2 text-left">항목 / 내용</th>
                        <th class="border border-slate-300 px-4 py-2 text-right">공급가액</th>
                        <th class="border border-slate-300 px-4 py-2 text-right">부가세(10%)</th>
                        <th class="border border-slate-300 px-4 py-2 text-right">소계</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-i-'+idx">
                        <td class="border border-slate-300 px-4 py-2 font-bold">{{ item.id || item.name }}</td>
                        <td class="border border-slate-300 px-4 py-2 text-right">₩{{ Number(item.amount ?? 0).toLocaleString() }}</td>
                        <td class="border border-slate-300 px-4 py-2 text-right text-slate-500">₩{{ Math.round(Number(item.amount ?? 0) * 0.1).toLocaleString() }}</td>
                        <td class="border border-slate-300 px-4 py-2 text-right font-black">₩{{ (Number(item.amount ?? 0) + Math.round(Number(item.amount ?? 0) * 0.1)).toLocaleString() }}</td>
                      </tr>
                      </tbody>
                    </table>
                    <table class="mt-10 w-full border-collapse border-4 border-slate-800">
                      <tr class="bg-slate-50">
                        <td class="w-1/3 border border-slate-300 p-4 text-center font-black bg-slate-100">총 청구 금액 (Total)</td>
                        <td class="p-4 text-right">
                          <span class="text-xs text-slate-500 block mb-1">VAT Included</span>
                          <span class="text-3xl font-black text-blue-800">₩{{ (Number(docDetail.totalAmount ?? docDetail.amount ?? 0) + Math.round(Number(docDetail.totalAmount ?? docDetail.amount ?? 0) * 0.1)).toLocaleString() }}</span>
                        </td>
                      </tr>
                    </table>

                    <div class="absolute bottom-20 left-0 right-0 text-center space-y-4">
                      <div class="text-sm font-black text-slate-800">입금계좌: 신한은행 110-123-456789 (예금주: ㈜몬순)</div>
                      <p class="text-lg font-black tracking-widest pt-10 border-t-2 border-slate-200 mx-16">위와 같이 청구합니다.</p>
                    </div>
                  </div>


                  <div v-else-if="docDetail.type === 'quotation-request' || docDetail.type === 'rfq' || docDetail.type === '견적요청서' || docId.startsWith('RFQ')" class="bg-white p-12 h-[1115px] overflow-hidden shadow-2xl relative text-[11px] text-black pdf-document-font w-[794px]" style="font-family: 'KoPub Dotum', sans-serif !important;">
                    <div class="mb-8 border-b-2 border-black pb-4 text-center">
                      <h1 class="text-2xl font-bold tracking-widest" style="font-family: 'KoPub Dotum', sans-serif !important;">견 적 요 청 서</h1>
                    </div>
                    <div class="space-y-2 mb-8 text-[13px]">
                      <p class="mb-2">귀하의 무궁한 발전을 기원합니다.</p>
                      <p>아래와 같이 견적을 요청하오니 검토 부탁드립니다.</p>
                    </div>

                    <table class="my-6 w-full border-collapse border-2 border-black text-center text-[11px]">
                      <thead class="bg-[#F7F3EC]">
                      <tr class="border-b-2 border-black">
                        <th class="border-r border-black p-2 grayscale">품종명</th>
                        <th class="border-r border-black p-2">상품명</th>
                        <th class="border-r border-black p-2 w-16">수량</th>
                        <th class="p-2">단위</th>
                      </tr>
                      </thead>
                      <tbody>
                      <tr v-for="(item, idx) in docDetail.items" :key="'pdf-r-' + idx" class="border-b border-black">
                        <td class="border-r border-black p-2">{{ item.variety || '-' }}</td>
                        <td class="border-r border-black p-2 text-left font-bold px-4">{{ item.name }}</td>
                        <td class="border-r border-black p-2 font-mono">{{ item.quantity ?? item.count ?? 0 }}</td>
                        <td class="p-2">{{ item.unit }}</td>
                      </tr>
                      <tr v-if="(docDetail.items || []).length === 0">
                        <td colspan="4" class="p-10 text-slate-400 italic">상품을 선택해주세요.</td>
                      </tr>
                      </tbody>
                    </table>

                    <div class="mt-8">
                      <strong class="text-xs">[요구사항]</strong>
                      <p class="mt-2 min-h-[100px] border border-black p-4 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[12px]">
                        {{ docDetail.requirements || docDetail.memo || '별도 요구사항 없음' }}
                      </p>
                    </div>

                    <div class="absolute bottom-20 left-0 right-0 text-right px-16 space-y-4">
                      <p class="text-sm font-bold">작성일: {{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                      <p class="mt-6 font-black text-lg">요청자: (주) 몬순 (인)</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <!-- ── 오른쪽 패널: 핵심 데이터 요약 (Client, Items, Writer, Remarks) ── -->
          <div v-if="docDetail" class="w-[480px] flex flex-col bg-[var(--color-bg-base)] border-l border-[var(--color-border-card)] shadow-[0_0_50px_rgba(0,0,0,0.15)] z-20 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

              <!-- 섹션 1: 거래처 정보 -->
              <article class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-4 bg-[var(--color-olive)] rounded-full"></span>
                    <h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">거래처 및 담당자</h3>
                  </div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)]">PARTNER INFO</span>
                </div>
                <div class="space-y-5">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] text-[var(--color-text-sub)] font-extrabold uppercase">상호명 / 법인명</label>
                    <div class="p-3 border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] text-base font-black text-[var(--color-text-strong)] shadow-inner">
                      {{ docDetail.clientName || docDetail.client?.name }}
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-[10px] text-[var(--color-text-sub)] font-extrabold uppercase">SeedFlow+ 담당 직원</label>
                    <div class="flex items-center justify-between p-3 border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] shadow-inner">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-[var(--color-olive)]/10 border border-[var(--color-olive)]/20 flex items-center justify-center text-[var(--color-olive)] font-black text-xs">
                          {{ (docDetail.authorName || docDetail.employee?.name || 'M')[0] }}
                        </div>
                        <span class="text-sm font-bold text-[var(--color-text-strong)]">
                          {{ docDetail.authorName || (docDetail.employee?.name + ' ' + (docDetail.employee?.position || '')) }}
                        </span>
                      </div>
                      <span class="text-[9px] bg-[var(--color-olive)] text-white px-2 py-1 rounded-lg font-black tracking-tighter">OFFICIAL</span>
                    </div>
                  </div>
                </div>
              </article>

              <!-- 섹션 2: 상품 내역 요약 -->
              <article class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between mb-5 border-b border-[var(--color-border-divider)] pb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-4 bg-[var(--color-orange)] rounded-full"></span>
                    <h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">세부 품목 내역</h3>
                  </div>
                  <span class="text-[10px] font-bold text-[var(--color-text-sub)] tracking-tighter">{{ (docDetail.items || []).length }} ITEMS</span>
                </div>
                <div class="max-h-72 overflow-y-auto border border-[var(--color-border-card)] rounded-xl bg-[var(--color-bg-input)] p-2 space-y-2 shadow-inner custom-scrollbar mb-5">
                  <div v-for="(item, idx) in docDetail.items" :key="'data-sum-'+idx" class="flex justify-between items-center p-3 rounded-lg hover:bg-[var(--color-bg-card)] transition-colors border-b border-[var(--color-border-divider)] last:border-0 pb-3">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-xs font-bold text-[var(--color-text-strong)]">{{ item.name }}</span>
                      <span class="text-[10px] text-[var(--color-text-sub)]">{{ item.variety || '기본 품종' }} | {{ item.unit }}</span>
                    </div>
                    <div class="text-right flex flex-col gap-0.5">
                      <span class="text-xs font-black text-[var(--color-text-strong)]">{{ item.quantity || item.count }} {{ item.unit }}</span>
                      <span class="text-[10px] font-bold text-[var(--color-olive)]">₩{{ Number(item.amount || ((item.quantity||item.count)*(item.unitPrice||item.price))).toLocaleString() }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex justify-between items-end bg-[var(--color-bg-input)]/50 p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-black text-[var(--color-text-sub)] uppercase">Final Quote</span>
                    <span class="text-xs font-medium text-[var(--color-text-sub)] line-through">₩{{ Number((docDetail.totalAmount || docDetail.amount || 0) * 1.1).toLocaleString() }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-2xl font-black text-[var(--color-olive)]">₩{{ Number(docDetail.totalAmount || docDetail.amount || 0).toLocaleString() }}</span>
                    <p class="text-[9px] font-bold text-[var(--color-text-sub)] mt-1">VAT INCLUDED</p>
                  </div>
                </div>
              </article>

              <!-- 섹션 3: 비고 / 반려 사유 -->
              <article v-if="docDetail.memo || docDetail.requirements || remark || showRejectReason" class="card bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-6 rounded-2xl shadow-sm">
                <div class="flex items-center gap-2 mb-5">
                  <span class="w-1.5 h-4 bg-slate-400 rounded-full"></span>
                  <h3 class="text-sm font-black text-[var(--color-text-strong)] uppercase tracking-tight">공지 및 비고</h3>
                </div>
                <div class="space-y-5">
                  <div v-if="showRejectReason" class="space-y-2">
                    <p class="text-[10px] font-black text-[var(--color-status-error)] uppercase flex items-center gap-1">
                      <span class="w-1 h-1 bg-[var(--color-status-error)] rounded-full"></span> 반려 사유
                    </p>
                    <div class="bg-[var(--color-status-error)]/5 border border-[var(--color-status-error)]/30 p-4 rounded-xl text-xs text-[var(--color-status-error)] font-bold whitespace-pre-wrap leading-relaxed shadow-sm">
                      {{ rejectReason || '관리자에 의해 반려된 문서입니다. 사유 미기재.' }}
                    </div>
                  </div>
                  <div v-if="docDetail.memo || docDetail.requirements" class="space-y-2">
                    <p class="text-[10px] font-black text-[var(--color-text-sub)] uppercase flex items-center gap-1">
                      <span class="w-1 h-1 bg-[var(--color-text-sub)] rounded-full"></span> 전달 사항
                    </p>
                    <div class="bg-[var(--color-bg-section)] border border-[var(--color-border-divider)] p-4 rounded-xl text-xs text-[var(--color-text-strong)] whitespace-pre-wrap leading-relaxed shadow-inner italic">
                      "{{ docDetail.memo || docDetail.requirements }}"
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <!-- 푸터 바 -->
            <div class="px-6 py-4 bg-[var(--color-bg-sidebar)] border-t border-[var(--color-border-divider)] flex justify-between items-center text-[9px] font-bold text-[var(--color-text-sub)] uppercase tracking-widest">
              <span>SeedFlow+ Digital Asset</span>
              <span>Proprietary & Confidential</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </teleport>

  <ModalBase
      v-model="showCancelConfirm"
      title="취소 확인"
      width-class="max-w-md"
  >
    <p class="text-sm text-slate-700">
      {{ showOrderCancelButton ? '해당 주문서를 취소하시겠습니까?' : '해당 문서를 취소하시겠습니까?' }}
    </p>
    <p v-if="cancelErrorMessage" class="mt-3 text-xs font-semibold text-[#C44536]">
      {{ cancelErrorMessage }}
    </p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button
            type="button"
            class="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            @click="showCancelConfirm = false"
        >
          닫기
        </button>
        <button
            type="button"
            class="rounded px-3 py-1.5 text-sm font-semibold text-white"
            style="background-color: #C44536"
            @click="confirmCancel"
        >
          취소 확정
        </button>
      </div>
    </template>
  </ModalBase>
</template>

<style scoped>
/* ── 레이아웃 & 스크롤바 ── */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ── 카드 애니메이션 & 공통 스타일 ── */
.card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* ── PDF 프리뷰 공통 스타일 (작성 화면 1:1 미러링 전용) ── */
.current-pdf-template {
  width: 210mm;
  min-height: 297mm;
  background-color: #FFFFFF !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  color: #1e293b;
  line-height: 1.5;
}

/* 💡 모든 문서 폰트를 '문서 작성' 화면과 동일하게 KoPub Dotum으로 통일 (31차 사용자 요청) */
.pdf-document-font {
  font-family: 'KoPub Dotum', 'Cormorant Garamond', sans-serif !important;
}

.pdf-document-font,
.pdf-document-font * {
  font-family: 'KoPub Dotum', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif !important;
}

/* Serif 폰트 강제 적용 (클래식 디자인용 - 이제 거의 사용 안 함) */
.pdf-font-serif {
  font-family: 'Times New Roman', Times, serif, 'Noto Serif KR', serif !important;
}

/* 주문서/청구서 전용 그리드 & 테이블 스타일 */
.pdf-preview { background: white; padding: 32px; width: 210mm; height: 296mm; overflow: hidden; border-radius: 4px; font-family: 'KoPub Dotum', sans-serif; font-size: 12px; color: #1e293b; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.pdf-title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 4px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 2px solid #1e293b; }
.pdf-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
.pdf-meta-row { display: contents; }
.pdf-meta-row .label { background: #f8fafc; padding: 8px 14px; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
.pdf-meta-row .value { padding: 8px 14px; font-size: 12px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
.pdf-section-title { font-size: 12px; font-weight: 800; color: #1e293b; margin: 16px 0 10px; padding-left: 8px; border-left: 3px solid #2563eb; }
.pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.pdf-table th { background: #f8fafc; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-align: left; border: 1px solid #e2e8f0; }
.pdf-table td { padding: 8px 12px; font-size: 12px; color: #334155; border: 1px solid #e2e8f0; }
.pdf-table td.pdf-right { text-align: right; font-weight: 700; }
.pdf-total-row td { background: #eff6ff; font-weight: 800; color: #1d4ed8; font-size: 13px; }
.pdf-empty { text-align: center; color: #94a3b8; padding: 32px; }
.pdf-footer { display: flex; justify-content: flex-end; gap: 40px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
.pdf-sign { text-align: center; font-size: 12px; color: #64748b; }
.sign-line { width: 100px; height: 40px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }

/* 상태 배지 (History 리스트용) */
.status-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-badge.quotation { background: var(--color-orange-light); color: var(--color-orange-dark); }
.status-badge.contract { background: var(--color-olive-light); color: var(--color-olive-dark); }
.status-badge.complete { background: var(--color-olive-light); color: var(--color-olive-dark); }
.status-badge.rejected { background: #F0D4D4; color: var(--color-status-error); }

/* 🖨️ 인쇄 설정 (html2pdf 대응) */
@media print {
  body * { visibility: hidden; }
  .current-pdf-template, .current-pdf-template * { visibility: visible; }
  .current-pdf-template {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
}
</style>
