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
  if (![ROLES.CLIENT, ROLES.SALES_REP].includes(authStore.currentRole)) return false
  return orderStatus.value === 'REQUESTED'
})

const isOrderCancelBlockedByApproval = computed(() => {
  if (!isOrderDocument.value) return false
  if (![ROLES.CLIENT, ROLES.SALES_REP].includes(authStore.currentRole)) return false
  return orderStatus.value === 'APPROVED'
})

const showOrderCancelButton = computed(() => {
  if (!isOrderDocument.value) return false
  if (orderStatus.value === 'CANCELED') return false
  return [ROLES.CLIENT, ROLES.SALES_REP].includes(authStore.currentRole)
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

  const opt = {
    margin: 10,
    filename: `${props.title || 'document'}_${props.docId}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  try {
    await window.html2pdf().set(opt).from(element).save()
  } catch (error) {
    console.error('PDF 다운로드 실패:', error)
    alert('PDF 생성 중 오류가 발생했습니다.')
  } finally {
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

</script>

<template>
  <teleport to="body">
    <a ref="downloadLink" class="hidden" aria-hidden="true" tabindex="-1" />
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        @click.self="close"
    >
      <section class="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <header class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
          <div class="flex items-center gap-2">
            <div v-if="showOrderCancelButton && isOrderCancelBlockedByApproval" class="text-xs font-semibold text-[#C44536]">
              관리자 승인 필요
            </div>
            <button
                v-if="canCancel"
                type="button"
                class="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                style="background-color: #C44536"
                @click="handleCancel"
            >
              취소
            </button>
            <button
                v-if="showOrderCancelButton"
                type="button"
                class="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style="background-color: #C44536"
                :disabled="!canOrderCancel"
                @click="handleCancel"
            >
              취소
            </button>
            <button
                v-if="showDownload"
                type="button"
                class="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                @click="downloadDocument"
            >
              <span v-if="isDownloading" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              {{ isDownloading ? 'PDF 생성 중...' : '다운로드' }}
            </button>
            <button type="button" class="rounded px-2 py-1 text-xl text-slate-500 hover:bg-slate-200" @click="close">
              ×
            </button>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 bg-slate-200">
          <div class="flex flex-1 items-start justify-center overflow-y-auto bg-slate-600 p-6 doc-preview-wrap">
            <div v-if="isLoading" class="flex flex-col items-center justify-center h-full text-white gap-3">
              <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <p>문서 정보를 가져오는 중입니다.</p>
            </div>

            <!-- 💡 유저 요청 1: 각 문서별 고유 디자인 적용 -->
            <div v-else-if="docDetail" class="pdf-container h-full w-full overflow-y-auto bg-[#525659] p-4 flex justify-center">
              <div class="current-pdf-template w-full max-w-[800px]">

                <!-- 1. 견적서 (Quotation) -->
                <div v-if="docDetail.type === 'quotation'" class="quotation-pdf bg-white p-8 min-h-[700px] shadow-2xl relative text-[11px] text-black pdf-serif">
                  <div class="text-center border-b-2 border-black pb-3 mb-5">
                    <h1 class="text-2xl font-bold tracking-widest">견 적 서</h1>
                  </div>
                  <div class="flex justify-between items-start mb-6 text-[12px]">
                    <div class="space-y-1">
                      <p>수신: <span class="border-b border-black font-bold px-2 text-[14px]">{{ docDetail.client?.name || docDetail.clientName || '(빈값)' }}</span> 귀하</p>
                      <p>담당: <span class="px-2">{{ docDetail.client?.contact || docDetail.clientContact || '(빈값)' }}</span></p>
                      <p>견적 유효기간: <span class="font-bold text-blue-700 underline">{{ formatKRDate(new Date(new Date(docDetail.date || docDetail.createdAt).getTime() + 1000 * 60 * 60 * 24 * 30)) }}</span> (30일)</p>
                    </div>
                    <div class="w-14 h-14 border border-black flex items-center justify-center font-bold text-xs">인</div>
                  </div>
                  <table class="w-full border-collapse border border-gray-400 text-center mb-5 text-[10px]">
                    <thead class="bg-gray-100 font-bold">
                    <tr>
                      <th class="border border-gray-400 p-1">품종</th>
                      <th class="border border-gray-400 p-1">상품명</th>
                      <th class="border border-gray-400 p-1">수량</th>
                      <th class="border border-gray-400 p-1">단위</th>
                      <th class="border border-gray-400 p-1">단가</th>
                      <th class="border border-gray-400 p-1">금액</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="(item, idx) in docDetail.items" :key="idx">
                      <td class="border border-gray-400 p-1">{{ item.variety || '-' }}</td>
                      <td class="border border-gray-400 p-1 text-left font-bold">{{ item.name }}</td>
                      <td class="border border-gray-400 p-1">{{ item.quantity || item.count }}</td>
                      <td class="border border-gray-400 p-1">{{ item.unit }}</td>
                      <td class="border border-gray-400 p-1 text-right">{{ Number(item.unitPrice || item.price || 0).toLocaleString() }}</td>
                      <td class="border border-gray-400 p-1 text-right font-bold">{{ Number(item.amount || (item.quantity * item.price) || 0).toLocaleString() }}</td>
                    </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 font-bold">
                    <tr>
                      <td colspan="5" class="border border-gray-400 p-1 text-sm text-right">합 계</td>
                      <td class="border border-gray-400 p-1 text-right font-mono">{{ Number(docDetail.totalAmount || docDetail.amount || 0).toLocaleString() }}</td>
                    </tr>
                    </tfoot>
                  </table>
                  <div class="absolute bottom-10 left-0 right-0 text-center space-y-4">
                    <p>{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                    <p class="text-sm font-bold tracking-widest border-t-2 border-slate-100 pt-4 mx-10">위와 같이 견적함 ( (주) 몬순 )</p>
                  </div>
                </div>

                <!-- 2. 주문서 (Order) -->
                <div v-else-if="docDetail.type === 'order'" class="order-pdf bg-white p-8 min-h-[750px] shadow-2xl relative text-[11px] text-black pdf-preview">
                  <div class="pdf-title">주 문 서</div>
                  <div class="pdf-meta-grid">
                    <div class="pdf-meta-row"><div class="label">주문 번호</div><div class="value">{{ docDetail.id }}</div></div>
                    <div class="pdf-meta-row"><div class="label">작성일</div><div class="value">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</div></div>
                    <div class="pdf-meta-row"><div class="label">거래처명</div><div class="value">{{ docDetail.client?.name || docDetail.clientName }}</div></div>
                    <div class="pdf-meta-row"><div class="label">계약 번호</div><div class="value">{{ docDetail.contractId || '-' }}</div></div>
                    <div class="pdf-meta-row"><div class="label">납기일</div><div class="value">{{ docDetail.deliveryDate || '-' }}</div></div>
                    <div class="pdf-meta-row"><div class="label">담당자</div><div class="value">{{ docDetail.client?.contact || docDetail.clientContact || '-' }}</div></div>
                  </div>

                  <div class="pdf-section-title">▪ 주문 상품 내역</div>
                  <table class="pdf-table w-full border-collapse mb-5 text-[10px]">
                    <thead>
                    <tr>
                      <th>상품명</th>
                      <th>단가</th>
                      <th>수량</th>
                      <th class="right">금액</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="item in docDetail.items" :key="item.id">
                      <td>{{ item.name }}</td>
                      <td>₩{{ Number(item.unitPrice || item.price || 0).toLocaleString() }}</td>
                      <td>{{ item.quantity || item.count }} {{ item.unit }}</td>
                      <td class="right">₩{{ Number(item.amount || (item.quantity * item.price) || 0).toLocaleString() }}</td>
                    </tr>
                    </tbody>
                    <tfoot>
                    <tr class="pdf-total-row">
                      <td colspan="3"><strong>합계</strong></td>
                      <td class="right">₩{{ Number(docDetail.totalAmount || docDetail.amount || 0).toLocaleString() }}</td>
                    </tr>
                    </tfoot>
                  </table>

                  <div class="pdf-section-title">▪ 배송 정보</div>
                  <div class="pdf-meta-grid">
                    <div class="pdf-meta-row"><div class="label">배송지</div><div class="value">{{ docDetail.deliveryAddress || '-' }}</div></div>
                    <div class="pdf-meta-row"><div class="label">수령인</div><div class="value">{{ docDetail.deliveryRecipient || '-' }}</div></div>
                    <div class="pdf-meta-row"><div class="label">연락처</div><div class="value">{{ docDetail.deliveryPhone || '-' }}</div></div>
                    <div class="pdf-meta-row"><div class="label">요청사항</div><div class="value">{{ docDetail.memo || docDetail.deliveryMemo || '없음' }}</div></div>
                  </div>

                  <div class="pdf-footer mt-10">
                    <div class="pdf-sign"><div class="sign-line"></div><div>거래처 확인</div></div>
                    <div class="pdf-sign"><div class="sign-line"></div><div>담당 영업자</div></div>
                  </div>
                </div>

                <!-- 3. 계약서 (Contract) -->
                <div v-else-if="docDetail.type === 'contract'" class="contract-pdf bg-white p-8 min-h-[750px] shadow-2xl relative text-[11px] text-black pdf-serif">
                  <div class="text-center border-b-2 border-black pb-3 mb-5">
                    <h1 class="text-2xl font-bold tracking-widest">물 품 공 급 계 약 서</h1>
                  </div>
                  <div class="mb-5 space-y-2 leading-relaxed text-sm">
                    <p><strong>계약상대자 (갑):</strong> <span class="border-b border-black px-2 font-bold">{{ docDetail.clientName || docDetail.client?.name || '(빈값)' }}</span></p>
                    <p><strong>계약상대자 (을):</strong> (주) 몬순</p>
                    <p><strong>계약기간:</strong> <span class="font-mono text-xs">{{ formatKRDate(docDetail.startDate) || '____-__-__' }} ~ {{ formatKRDate(docDetail.endDate) || '____-__-__' }}</span></p>
                    <p><strong>청구주기:</strong> <span class="border-b border-black px-2 font-bold">{{ docDetail.billingCycle || '-' }} 단위 청구</span></p>
                  </div>

                  <table class="w-full border-collapse border border-gray-400 text-center mb-5 text-[10px]">
                    <thead class="bg-gray-100 font-bold">
                    <tr>
                      <th class="border border-gray-400 p-1">상품명</th>
                      <th class="border border-gray-400 p-1">수량</th>
                      <th class="border border-gray-400 p-1">단위</th>
                      <th class="border border-gray-400 p-1">단가</th>
                      <th class="border border-gray-400 p-1">금액</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="(item, idx) in docDetail.items" :key="idx">
                      <td class="border border-gray-400 p-1 text-left font-medium">{{ item.name }}</td>
                      <td class="border border-gray-400 p-1">{{ item.quantity || item.count }}</td>
                      <td class="border border-gray-400 p-1">{{ item.unit }}</td>
                      <td class="border border-gray-400 p-1 text-right">{{ Number(item.unitPrice || item.price || 0).toLocaleString() }}</td>
                      <td class="border border-gray-400 p-1 text-right font-bold">{{ Number(item.amount || (item.quantity * item.price) || 0).toLocaleString() }}</td>
                    </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 font-bold">
                    <tr>
                      <td colspan="4" class="border border-gray-400 p-1 text-right">합 계</td>
                      <td class="border border-gray-400 p-1 text-right text-blue-700 font-extrabold">{{ Number(docDetail.totalAmount || docDetail.amount || 0).toLocaleString() }}</td>
                    </tr>
                    </tfoot>
                  </table>

                  <div v-if="docDetail.specialTerms" class="mt-6 border-t pt-3">
                    <p class="font-bold mb-1 ml-1">[특약 사항]</p>
                    <div class="whitespace-pre-wrap leading-relaxed px-2 text-[10px] text-gray-700">{{ docDetail.specialTerms }}</div>
                  </div>

                  <div class="absolute bottom-10 left-0 right-0 text-center">
                    <p class="mb-4 text-xs font-bold">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                    <p class="mt-4 font-bold text-sm border-t pt-4 mx-8">위 계약의 내용을 증명하기 위해 기명 날인함</p>
                  </div>
                </div>

                <!-- 4. 청구서 (Invoice) -->
                <div v-else-if="docDetail.type === 'invoice'" class="invoice-pdf bg-white p-8 min-h-[750px] shadow-2xl relative text-[11px] text-black pdf-serif">
                  <div class="mb-6 flex items-start justify-between border-b-2 border-slate-700 pb-4">
                    <div>
                      <h1 class="text-2xl font-black tracking-[4px]">청 구 서</h1>
                      <p class="mt-1 text-xs text-slate-500">{{ docDetail.id }}</p>
                    </div>
                    <div class="text-right text-xs leading-relaxed text-slate-500">
                      <p class="text-sm font-extrabold text-slate-800">㈜종자 코리아</p>
                      <p>서울특별시 서초구 반포대로 88</p>
                      <p>사업자등록번호: 123-45-67890</p>
                      <p>담당: 영업팀 &nbsp;|&nbsp; 02-1234-5678</p>
                    </div>
                  </div>

                  <table class="mb-5 w-full border-collapse text-xs">
                    <tr>
                      <td class="w-20 border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">수신처</td>
                      <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ docDetail.client?.name || docDetail.clientName }}</td>
                      <td class="w-20 border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">청구일</td>
                      <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ formatKRDate(docDetail.date || docDetail.createdAt) }}</td>
                    </tr>
                    <tr>
                      <td class="border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">계약 번호</td>
                      <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ docDetail.contractId || '-' }}</td>
                      <td class="border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">납부 기한</td>
                      <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ formatKRDate(new Date(new Date(docDetail.date || docDetail.createdAt).getTime() + 1000 * 60 * 60 * 24 * 14)) }}</td>
                    </tr>
                  </table>

                  <p class="my-3 border-l-4 border-blue-600 pl-2 text-xs font-extrabold text-slate-800">▪ 청구 명세 내역</p>
                  <table class="mb-3 w-full border-collapse text-xs pdf-table">
                    <thead>
                    <tr class="bg-slate-50 border-y border-slate-200">
                      <th>항목명</th>
                      <th class="right">공급가액</th>
                      <th class="right">부가세</th>
                      <th class="right">합계</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="(item, idx) in docDetail.items" :key="idx">
                      <td>{{ item.name || item.id }}</td>
                      <td class="right">₩{{ Number(item.supply || item.amount || 0).toLocaleString() }}</td>
                      <td class="right">₩{{ Math.round(Number(item.supply || item.amount || 0) * 0.1).toLocaleString() }}</td>
                      <td class="right font-bold">₩{{ (Number(item.supply || item.amount || 0) + Math.round(Number(item.supply || item.amount || 0) * 0.1)).toLocaleString() }}</td>
                    </tr>
                    </tbody>
                    <tfoot>
                    <tr class="pdf-total-row">
                      <td class="text-center">합 계</td>
                      <td class="right">₩{{ Number(docDetail.amount || docDetail.totalAmount || 0).toLocaleString() }}</td>
                      <td class="right">₩{{ Math.round(Number(docDetail.amount || docDetail.totalAmount || 0) * 0.1).toLocaleString() }}</td>
                      <td class="right font-extrabold">₩{{ (Number(docDetail.amount || docDetail.totalAmount || 0) + Math.round(Number(docDetail.amount || docDetail.totalAmount || 0) * 0.1)).toLocaleString() }}</td>
                    </tr>
                    </tfoot>
                  </table>

                  <div class="mt-8 flex justify-end gap-10 border-t border-slate-200 pt-4">
                    <div class="text-center text-[10px] text-slate-500"><div class="mx-auto mb-1.5 h-10 w-24 border-b border-slate-300"></div>거래처 확인</div>
                    <div class="text-center text-[10px] text-slate-500"><div class="mx-auto mb-1.5 h-10 w-24 border-b border-slate-300"></div>담당 영업자</div>
                    <div class="text-center text-[10px] text-slate-500"><div class="mx-auto mb-1.5 h-10 w-24 border-b border-slate-300"></div>팀장 결재</div>
                  </div>
                </div>

                <!-- 5. 견적요청서 (Quotation Request) -->
                <div v-else-if="docDetail.type === 'quotation-request' || docDetail.type === 'rfq'" class="rfq-pdf bg-white p-8 min-h-[700px] shadow-2xl relative text-[11px] text-black">
                  <div class="mb-5 border-b-2 border-slate-700 pb-3 text-center">
                    <h1 class="text-xl font-bold">견적 요청서</h1>
                  </div>
                  <p class="mb-2">귀하의 무궁한 발전을 기원합니다.</p>
                  <p>아래와 같이 견적을 요청하오니 검토 부탁드립니다.</p>

                  <table class="my-4 w-full border-collapse text-center">
                    <thead>
                    <tr>
                      <th class="border border-slate-300 p-1.5">품종명</th>
                      <th class="border border-slate-300 p-1.5">상품명</th>
                      <th class="border border-slate-300 p-1.5">수량</th>
                      <th class="border border-slate-300 p-1.5">단위</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="(item, idx) in docDetail.items" :key="idx">
                      <td class="border border-slate-300 p-1.5">{{ item.variety || '-' }}</td>
                      <td class="border border-slate-300 p-1.5 font-medium">{{ item.name }}</td>
                      <td class="border border-slate-300 p-1.5">{{ item.quantity || item.count }}</td>
                      <td class="border border-slate-300 p-1.5">{{ item.unit }}</td>
                    </tr>
                    <tr v-if="!docDetail.items || docDetail.items.length === 0">
                      <td colspan="4" class="border border-slate-300 p-10 text-slate-400">품목 정보가 없습니다.</td>
                    </tr>
                    </tbody>
                  </table>

                  <div class="mt-4">
                    <strong>[요구사항]</strong>
                    <p class="mt-1 min-h-12 border border-slate-200 p-2 whitespace-pre-wrap">{{ docDetail.memo || docDetail.requirements || '없음' }}</p>
                  </div>

                  <div class="mt-10 text-right space-y-2">
                    <p>작성일: {{ formatKRDate(docDetail.date || docDetail.createdAt) }}</p>
                    <p class="mt-2">요청자: {{ docDetail.clientName || docDetail.client?.name || '고객사' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="flex h-full w-full items-center justify-center bg-gray-100 text-slate-400">
              <div class="flex flex-col items-center gap-3">
                <svg v-if="isLoading" class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p>{{ isLoading ? '데이터를 불러오는 중입니다...' : '문서 데이터를 불러올 수 없습니다.' }}</p>
              </div>
            </div>
          </div>

          <aside v-if="showInfoPanel" class="w-full max-w-sm overflow-y-auto border-l border-slate-200 bg-white p-5">
            <section v-if="showRemark" class="mb-5">
              <h4 class="mb-2 text-sm font-semibold text-slate-700">문서 작성 시 비고</h4>
              <div class="whitespace-pre-wrap rounded border border-amber-300 bg-amber-50 p-3 text-sm text-slate-700">
                {{ remark || docDetail?.memo || '내용 없음' }}
              </div>
            </section>

            <section v-if="showRejectReason">
              <h4 class="mb-2 text-sm font-semibold text-red-600">반려 사유</h4>
              <div class="whitespace-pre-wrap rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {{ rejectReason || '사유 없음' }}
              </div>
            </section>

            <section class="mt-10 pt-5 border-t border-slate-100">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">문서 정보 요약</h4>
              <div class="space-y-3">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">유형</span>
                  <span class="font-semibold">{{ docDetail?.typeLabel || docType }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">작성자</span>
                  <span class="font-semibold">{{ resolvedAuthorName }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">ID</span>
                  <span class="font-mono text-[11px]">{{ docId }}</span>
                </div>
              </div>
            </section>
          </aside>
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
.doc-preview-wrap {
  perspective: 1000px;
}

/* 💡 유저 요청 1: 각 문서 전용 PDF 스타일 (Vibe & Tone 이식) */
.pdf-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px;
}

/* 1. 공통 PDF 컨테이너 스타일 */
.quotation-pdf, .order-pdf, .contract-pdf, .invoice-pdf, .rfq-pdf {
  width: 100%;
  max-width: 800px;
  background-color: white;
  transition: all 0.3s ease;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* 2. 주문서 전용 스타일 (OrderView 이식 - 100% 일치) */
.pdf-preview { font-family: serif; font-size: 12px; color: #1e293b; }
.pdf-title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 4px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 2px solid #1e293b; }
.pdf-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
.pdf-meta-row { display: contents; }
.pdf-meta-row .label { background: #f8fafc; padding: 8px 14px; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
.pdf-meta-row .value { padding: 8px 14px; font-size: 12px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
.pdf-section-title { font-size: 12px; font-weight: 800; color: #1e293b; margin: 16px 0 10px; padding-left: 8px; border-left: 3px solid #2563eb; }
.pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.pdf-table th { background: #f8fafc; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-align: left; border: 1px solid #e2e8f0; }
.pdf-table td { padding: 8px 12px; font-size: 12px; color: #334155; border: 1px solid #e2e8f0; }
.pdf-table td.right { text-align: right; font-weight: 700; }
.pdf-total-row td { background: #eff6ff; font-weight: 800; color: #1d4ed8; font-size: 13px; border: 1px solid #e2e8f0; }
.pdf-footer { display: flex; justify-content: flex-end; gap: 40px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
.pdf-sign { text-align: center; font-size: 12px; color: #64748b; }
.sign-line { width: 100px; height: 40px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }

/* 3. 기타 세부 연출 */
.pdf-title {
  color: #0f172a;
}

.pdf-sign {
  width: 80px;
}

thead th {
  background-color: #f8fafc;
}

/* 💡 스크롤바 미려하게 처리 */
.pdf-container::-webkit-scrollbar {
  width: 6px;
}
.pdf-container::-webkit-scrollbar-thumb {
  background-color: #94a3b8;
  border-radius: 3px;
}
.pdf-container::-webkit-scrollbar-track {
  background-color: #475569;
}

/* 글꼴 보정 */
.pdf-serif {
  font-family: 'Noto Serif KR', serif;
}

/* 견적서/계약서 등의 전통적 느낌 */
.quotation-pdf h1, .contract-pdf h1 {
  letter-spacing: 0.5em;
  margin-right: -0.5em;
}

.rfq-pdf strong {
  color: #334155;
}

@media (max-width: 640px) {
  .pdf-container {
    padding: 10px;
  }
}

/* 🖨️ 인쇄 시 프리뷰 전용 설정 */
@media print {
  /* 프리뷰 영역 외 모든 요소 숨김 */
  body * {
    visibility: hidden;
  }
  .pdf-container, .pdf-container * {
    visibility: visible;
  }
  .pdf-container {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    overflow: visible !important;
  }
  /* 모달 배경 등 그림자 제거 */
  .fixed, .bg-black\/60, .shadow-xl, .shadow-2xl {
    background: none !important;
    box-shadow: none !important;
  }
  /* 불필요한 여백/버튼 숨김 */
  .doc-preview-wrap, header, aside {
    display: none !important;
  }
}
</style>
