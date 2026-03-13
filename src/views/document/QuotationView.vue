<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useProductStore } from '@/stores/product'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { PRODUCT_CATEGORY } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const productStore = useProductStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

// --- [상태 관리] ---
const isProcessStarted = ref(false)
const isNewMode = ref(false)
const isViewMode = ref(false) // 상세 조회 모드 여부
const showStartModal = ref(true) 
const showCorpModal = ref(false)
const showProductModal = ref(false)
const isVarietyDropdownOpen = ref(false)
const varietyDropdownRef = ref(null)

// 모달 설정
const currentTab = ref('pending-rfq') // 'pending-rfq', 'rejected-quo'

// 원본 데이터 추적
const quotationId = ref(null)
const sourceRequestId = ref(null)
const sourceHistoryId = ref(null)
const selectedClientId = ref(null)

// 폼 데이터
const quotationCode = ref('')
const inCorpCode = ref('')
const inCorp = ref('')
const inName = ref('')
const internalMemo = ref('')
const customerRequirements = ref('')
const currentRejectionReason = ref('')
const selectedItems = ref([])
const modalSearchInput = ref('')
const clientSearchInput = ref('')
const varietyFilter = ref('전체')
const createdAt = ref('')
const status = ref('')

const handleClickOutside = (event) => {
  if (varietyDropdownRef.value && !varietyDropdownRef.value.contains(event.target)) {
    isVarietyDropdownOpen.value = false
  }
}

// 상세 조회 데이터 로드
const loadQuotationDetail = async (id) => {
  const data = await documentStore.fetchQuotationDetail(id)
  if (!data) {
    window.alert('견적서 정보를 불러오지 못했습니다.')
    router.push('/documents/all')
    return
  }

  isViewMode.value = true
  isProcessStarted.value = true
  showStartModal.value = false
  quotationId.value = data.id
  quotationCode.value = data.quotationCode || data.displayCode
  selectedClientId.value = data.clientId
  inCorpCode.value = data.client?.code || data.clientId || ''
  inCorp.value = data.client?.name || data.clientName || ''
  inName.value = data.client?.contact || data.authorName || ''
  internalMemo.value = data.memo || ''
  currentRejectionReason.value = data.rejectionReason || ''
  createdAt.value = data.createdAt
  status.value = data.status

  selectedItems.value = (data.items || []).map(i => ({
    uid: Math.random(),
    productId: i.productId,
    variety: PRODUCT_CATEGORY[i.variety || i.productCategory] || (i.variety || i.productCategory || '-'),
    name: i.name || i.productName,
    count: i.quantity,
    unit: i.unit,
    price: i.unitPrice || i.price || 0
  }))
}

onMounted(async () => {
  window.addEventListener('click', handleClickOutside)
  try {
    // 마스터 데이터 로딩
    // 마스터 데이터 병렬 로딩 (로딩 속도 최적화)
    await Promise.all([
      documentStore.fetchDocumentsV2?.(),
      documentStore.fetchPendingQuotationRequests?.(),
      documentStore.fetchRejectedQuotations?.(),
      documentStore.fetchClientMaster?.(),
      documentStore.fetchProductMaster?.(),
      historyStore.ensureLoaded?.()
    ])

    // URL 쿼리에 id가 있는지 확인 (상세 조회 모드)
    const id = route.query.id
    if (id) {
      await loadQuotationDetail(id)
      return
    }

    if (route.query.rewrite === 'true') {
      if (route.query.requestId) {
        await startFromRequest({ id: route.query.requestId })
      } else {
        startNewQuotation()
      }
      return
    }
  } catch (e) {
    console.error("데이터 로딩 실패:", e)
  }
})

// 모달이 열릴 때 최신 리스트로 갱신 (반려 건 재작성 시 목록 동기화)
import { watch } from 'vue'
watch(showStartModal, async (isOpen) => {
  if (isOpen) {
    try {
      await Promise.all([
        documentStore.fetchPendingQuotationRequests?.(),
        documentStore.fetchRejectedQuotations?.()
      ])
    } catch (e) {
      console.error("모달 데이터 갱신 실패:", e)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

const handleCloseModal = () => {
  showStartModal.value = false
  if (!isProcessStarted.value) {
    router.push('/documents/create')
  }
}

const startFromRequest = async (reqSummary) => {
  if (!reqSummary.id) {
    window.alert('견적 요청서의 유효한 ID가 없습니다.')
    return
  }

  isProcessStarted.value = true
  const req = await documentStore.fetchQuotationRequestDetail(reqSummary.id)
  if (!req) {
    window.alert('견적 요청서 상세 정보를 불러오지 못했습니다.')
    isProcessStarted.value = false
    return
  }

  isNewMode.value = false
  showStartModal.value = false

  sourceRequestId.value = req.id
  sourceHistoryId.value = req.historyId || null

  selectedClientId.value = req.clientId
  inCorpCode.value = req.clientCode || req.clientId || ''
  inCorp.value = req.clientName || ''
  inName.value = req.managerName || ''

  customerRequirements.value = req.requirements || req.memo || '별도 요구사항이 없습니다.'

  selectedItems.value = (req.items || []).map(i => {
    const masterProduct = documentStore.productMaster?.find(p =>
        (i.productId && Number(p.id) === Number(i.productId)) ||
        (p.name === (i.productName || i.name))
    )
    const finalPrice = i.unitPrice || masterProduct?.unitPrice || masterProduct?.price || 0

    return {
      uid: Date.now() + Math.random(),
      productId: i.productId || masterProduct?.id,
      variety: PRODUCT_CATEGORY[masterProduct?.variety || masterProduct?.category || i.productCategory] || (masterProduct?.variety || masterProduct?.category || i.productCategory || '일반'),
      name: i.productName || i.name,
      count: i.quantity || 1,
      unit: i.unit || masterProduct?.unit || '립',
      price: finalPrice
    }
  })
}

const startNewQuotation = () => {
  isNewMode.value = true
  isProcessStarted.value = true
  showStartModal.value = false

  sourceRequestId.value = null
  sourceHistoryId.value = null

  inCorpCode.value = ''
  inCorp.value = ''
  inName.value = ''
  customerRequirements.value = ''
  currentRejectionReason.value = ''
  selectedItems.value = []
}

const startFromRejectedQuotation = (quo) => {
  isProcessStarted.value = true
  isNewMode.value = false
  showStartModal.value = false

  // 원본이 견적 요청서 기반인지 확인
  sourceRequestId.value = quo.requestId || null
  sourceHistoryId.value = quo.historyId || null

  selectedClientId.value = quo.clientId
  inCorpCode.value = quo.client?.code || quo.clientId || ''
  inCorp.value = quo.client?.name || quo.clientName || ''
  inName.value = quo.client?.contact || quo.authorName || ''

  internalMemo.value = quo.memo || ''
  customerRequirements.value = quo.requirements || quo.memo || ''
  currentRejectionReason.value = quo.rejectionReason || ''

  selectedItems.value = (quo.items || []).map(i => ({
    uid: Date.now() + Math.random(),
    productId: i.productId,
    variety: i.variety,
    name: i.name,
    count: i.quantity,
    unit: i.unit,
    price: i.unitPrice
  }))
}

const setCorp = (corp) => {
  selectedClientId.value = corp.id
  inCorpCode.value = corp.id
  inCorp.value = corp.name
  inName.value = corp.contact
  showCorpModal.value = false
}

const addProduct = (p) => {
  const existItem = selectedItems.value.find(item => item.name === p.name)
  if (existItem) {
    existItem.count++
  } else {
    selectedItems.value.push({
      uid: Date.now() + Math.random(),
      productId: p.id,
      variety: PRODUCT_CATEGORY[p.variety || p.category] || (p.variety || p.category || '-'),
      name: p.name,
      count: 1,
      unit: p.unit || (p.unit?.includes('kg') ? 'kg' : '립'),
      price: Number(p.price || p.unitPrice || 0)
    })
  }
  showProductModal.value = false
}

const updateItem = (item, field, val) => {
  if (isViewMode.value) return
  let num = parseInt(val)
  if (field === 'count' && (isNaN(num) || num < 1)) num = 1
  if (field === 'price' && (isNaN(num) || num < 0)) num = 0
  item[field] = num
}

const removeItem = (uid) => {
  if (isViewMode.value) return
  selectedItems.value = selectedItems.value.filter(i => i.uid !== uid)
}

// --- [계산 속성] ---
const totalSum = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + (item.count * item.price), 0)
)

const varietyOptions = computed(() => {
  const varieties = documentStore.productMaster?.map(p => p.variety || p.category) || []
  const uniqueVars = [...new Set(varieties.filter(v => v))]
  return ['전체', ...uniqueVars.map(v => PRODUCT_CATEGORY[v] || v)]
})

const filteredClients = computed(() => {
  const master = documentStore.clientMaster || []
  return master.filter(c =>
      c.name.toLowerCase().includes(clientSearchInput.value.toLowerCase()) ||
      c.code.toLowerCase().includes(clientSearchInput.value.toLowerCase())
  )
})

const filteredProducts = computed(() => {
  return documentStore.productMaster?.filter(p => {
    const pVar = PRODUCT_CATEGORY[p.variety || p.category] || (p.variety || p.category)
    const matchVariety = varietyFilter.value === '전체' || pVar === varietyFilter.value
    const matchKeyword = p.name.toLowerCase().includes(modalSearchInput.value.toLowerCase())
    return matchVariety && matchKeyword
  }) || []
})

const validityDate = computed(() => {
  const baseDate = (isViewMode.value && createdAt.value) ? new Date(createdAt.value) : new Date()
  baseDate.setDate(baseDate.getDate() + 30)
  return baseDate.toISOString().split('T')[0]
})

const displayDate = computed(() => {
  const d = (isViewMode.value && createdAt.value) ? new Date(createdAt.value) : new Date()
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`
})

const submitDoc = async () => {
  if (isViewMode.value) return
  if (!inCorp.value) return window.alert("거래처 정보가 누락되었습니다.")
  if (selectedItems.value.length === 0) return window.alert("품목을 하나라도 추가해주세요")

  try {
    const payload = {
      requestId: sourceRequestId.value,
      historyId: sourceHistoryId.value,
      client: {
        id: selectedClientId.value,
        name: inCorp.value,
        contact: inName.value
      },
      items: selectedItems.value.map(item => ({
        productId: item.productId,
        name: item.name,
        variety: item.variety,
        quantity: item.count,
        unit: item.unit,
        unitPrice: item.price
      })),
      memo: internalMemo.value
    }

    const result = await documentStore.createQuotation(payload)
    if (result) {
      // 작성 후 참조 목록 최신화 (이미 사용한 요청서 제거)
      await documentStore.fetchPendingQuotationRequests()
      window.alert(`견적서 발행 완료`);
      // 실제 번호(docCode)가 있으면 검색어로 전달, 없으면 ID라도 전달
      const keyword = result.docCode || result.id
      router.push({
        path: '/documents/all',
        query: { keyword, type: 'QUO' }
      });
    }
  } catch (error) {
    console.error("서버 저장 에러:", error);
    // documentStore.error에는 getErrorMessage에 의해 정제된 한글 메시지가 담겨 있습니다.
    window.alert(documentStore.error || "견적서 저장 중 오류가 발생했습니다.");
  }
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm" style="color: #9A8C7E;">문서 작성 > <span class="font-semibold" style="color: #3D3529;">견적서 {{ isViewMode ? '상세' : '작성' }}</span></p>
      </div>
      <div v-if="isProcessStarted" class="flex flex-col xl:flex-row gap-6 items-start animate-in">
        <div class="flex-1 space-y-5 w-full">
          <div class="card relative border p-5 rounded-lg shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base font-bold" style="color: #3D3529;">거래처 정보</h3>
              <button
                  v-if="isNewMode && !isViewMode"
                  class="text-white px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors hover:opacity-90"
                  style="background-color: #C8622A !important;"
                  @click="showCorpModal = true"
              >
                거래처 선택
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input v-model="inCorpCode" readonly class="p-2 border rounded text-sm font-semibold outline-none" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" placeholder="거래처 코드">
              <input v-model="inCorp" readonly class="p-2 border rounded text-sm font-semibold outline-none" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" placeholder="법인명">
              <input v-model="inName" readonly class="p-2 border rounded text-sm font-semibold outline-none" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" placeholder="담당자">
            </div>
          </div>

          <div class="card border p-5 rounded-lg shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base font-bold" style="color: #3D3529;">{{ isViewMode ? '견적 품목' : '작성 품목' }}</h3>
              <button
                  v-if="!isViewMode"
                  class="text-white px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors hover:opacity-90"
                  style="background-color: #C8622A !important;"
                  @click="showProductModal = true"
              >
                + 상품 검색
              </button>
            </div>
            <div class="max-h-[350px] overflow-y-auto border rounded" style="background-color: #F7F3EC; border-color: #DDD7CE;">
              <table class="w-full text-sm text-left border-collapse">
                <thead class="sticky top-0 z-10" style="background-color: #EFEADF; color: #6B5F50; border-bottom: 1px solid #DDD7CE;">
                <tr>
                  <th class="p-3 w-[15%] text-left">품종명</th>
                  <th class="p-3 w-[25%] text-left">상품명</th>
                  <th class="p-3 w-[15%] text-center">수량</th>
                  <th class="p-3 w-[15%] text-center">단위</th>
                  <th class="p-3 w-[20%] text-right">단가</th>
                  <th v-if="!isViewMode" class="p-3 w-[10%] text-center">작업</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="item.uid" class="border-b transition-colors hover:bg-[#EFEADF]" style="border-color: #E8E3D8; color: #3D3529;">
                  <td class="p-3 text-xs text-left" style="color: #6B5F50;">{{ item.variety }}</td>
                  <td class="p-3 font-bold text-left" style="color: #3D3529;">{{ item.name }}</td>
                  <td class="p-3 text-center">
                    <input v-if="!isViewMode" type="number" min="1" class="w-full rounded text-center p-1 font-bold outline-none border focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" :value="item.count" @input="updateItem(item, 'count', $event.target.value)">
                    <span v-else>{{ item.count }}</span>
                  </td>
                  <td class="p-3 text-center">
                    <input v-if="!isViewMode" type="text" class="w-full rounded p-1 text-xs text-center outline-none border focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" v-model="item.unit">
                    <span v-else>{{ item.unit }}</span>
                  </td>
                  <td class="p-3 text-right">
                    <input v-if="!isViewMode" type="number" min="0" class="w-full rounded text-right p-1 font-mono outline-none border focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" :value="item.price" @input="updateItem(item, 'price', $event.target.value)">
                    <span v-else class="font-mono">{{ item.price.toLocaleString() }}</span>
                  </td>
                  <td v-if="!isViewMode" class="p-3 text-center">
                    <button
                        class="inline-flex items-center justify-center rounded-lg p-2 text-white transition-all hover:bg-[#A64D4D] active:scale-95 shadow-sm"
                        style="background-color: #B85C5C;"
                        title="삭제"
                        @click="removeItem(item.uid)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </td>
                </tr>
                <tr v-if="selectedItems.length === 0"><td colspan="6" class="p-10 text-center italic" style="color: #9A8C7E;">상품 정보를 입력해 주세요.</td></tr>
                </tbody>
              </table>
            </div>
            <div class="mt-4 text-right font-bold text-lg" style="color: #3D3529;">총 합계: {{ totalSum.toLocaleString() }} 원</div>
          </div>

          <div v-if="!isNewMode && customerRequirements" class="card border p-5 rounded-lg shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex items-center gap-2 mb-3">
              <h3 class="text-base font-bold" style="color: #3D3529;">견적 요청서 요구사항</h3>
            </div>
            <div class="border p-3 rounded text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]" style="background-color: #EFEADF; border-color: #DDD7CE; color: #6B5F50;">
              {{ customerRequirements }}
            </div>
            <p class="text-[11px] mt-2 font-medium" style="color: #9A8C7E;">* 위 내용은 참고용이며, 발행되는 PDF 견적서에는 포함되지 않습니다.</p>
          </div>

          <div v-if="currentRejectionReason" class="card border p-5 rounded-lg shadow-sm" style="background-color: #FDF4F1; border-color: #F8D7CC;">
            <div class="flex items-center gap-2 mb-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-[#B85C5C]">반려 사유</span>
              <h3 class="text-base font-bold" style="color: #3D3529;">반려 사유 내용</h3>
            </div>
            <div class="border p-3 rounded text-sm leading-relaxed whitespace-pre-wrap min-h-[40px]" style="background-color: #FFF9F7; border-color: #F8D7CC; color: #B85C5C; font-weight: 500;">
              {{ currentRejectionReason }}
            </div>
          </div>

          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <h3 class="text-lg font-bold" style="color: #3D3529;">내부 비고</h3>
            <textarea v-model="internalMemo" :readonly="isViewMode" rows="3" class="w-full p-2 border border-l-4 rounded text-sm mt-3 resize-none outline-none focus:ring-1 focus:ring-[#7A8C42]" :style="{ backgroundColor: isViewMode ? '#EFEADF' : '#FAF7F3', borderColor: '#DDD7CE', borderLeftColor: '#C8622A', color: '#3D3529' }" placeholder="내부 관리용 메모"></textarea>
          </article>

          <button
              v-if="!isViewMode"
              class="w-full text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:opacity-90"
              style="background-color: #7A8C42 !important;"
              @click="submitDoc"
          >
            견적서 발행 완료
          </button>
        </div>

        <div class="w-full xl:w-[500px] sticky top-5">
          <div class="bg-[#525659] p-4 rounded-lg shadow-inner">
            <div class="bg-white p-8 min-h-[700px] shadow-2xl relative text-[11px] text-black" style="font-family: 'KoPub Dotum', sans-serif !important;">
              <div class="text-center border-b-2 border-black pb-3 mb-5">
                <h1 class="text-2xl font-bold tracking-widest" style="font-family: 'KoPub Dotum', sans-serif !important;">견 적 서</h1>
                <p v-if="quotationCode" class="text-[10px] mt-1 text-right">No. {{ quotationCode }}</p>
              </div>
              <div class="flex justify-between items-start mb-6 text-[12px]">
                <div class="space-y-1">
                  <p>수신: <span class="border-b border-black font-bold px-2 text-[14px]">{{ inCorp || '(빈값)' }}</span> 귀하</p>
                  <p>담당: <span class="px-2">{{ inName || '(빈값)' }}</span></p>
                  <p>견적 유효기간: <span class="font-bold border-b border-black px-1">{{ validityDate }}</span> (발행일로부터 30일)</p>
                </div>
                <div class="w-14 h-14 border border-black flex items-center justify-center font-bold text-xs">인</div>
              </div>
              <table class="w-full border-collapse border border-black text-center mb-5 text-[10px]">
                <thead class="bg-[#F7F3EC]">
                <tr class="border-b border-black"><th class="border-r border-black p-1">품종</th><th class="border-r border-black p-1">상품명</th><th class="border-r border-black p-1">수량</th><th class="border-r border-black p-1">단위</th><th class="border-r border-black p-1">단가</th><th class="p-1">금액</th></tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="'pdf-'+item.uid" class="border-b border-black">
                  <td class="border-r border-black p-1">{{ item.variety }}</td>
                  <td class="border-r border-black p-1 text-left font-bold px-2">{{ item.name }}</td>
                  <td class="border-r border-black p-1">{{ item.count }}</td>
                  <td class="border-r border-black p-1">{{ item.unit }}</td>
                  <td class="border-r border-black p-1 text-right px-2">{{ item.price.toLocaleString() }}</td>
                  <td class="p-1 text-right font-bold px-2">{{ (item.count * item.price).toLocaleString() }}</td>
                </tr>
                </tbody>
                <tfoot class="bg-[#FAF7F3] font-bold">
                <tr><td colspan="5" class="border-r border-black p-1 text-sm text-right px-2">합 계</td><td class="p-1 text-right font-mono px-2">{{ totalSum.toLocaleString() }}</td></tr>
                </tfoot>
              </table>
              <div class="absolute bottom-10 left-0 right-0 text-center space-y-4">
                <p>{{ displayDate }}</p>
                <p class="text-sm font-bold tracking-widest border-t-2 border-slate-100 pt-4 mx-10">위와 같이 견적함 ( (주) 몬순 )</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Start Modal -->
      <div v-if="showStartModal" class="modal-overlay z-[2000] p-4">
        <div class="modal w-[750px] max-w-[95vw] shadow-2xl relative" style="background-color: #F7F3EC; border: 1px solid #DDD7CE;">
          <div class="modal-header border-b" style="background-color: #C8622A; border-color: rgba(255,255,255,0.1);">
            <h3 class="modal-title text-base font-bold text-white">문서 작성 방식 선택</h3>
            <button type="button" class="modal-close" style="filter: brightness(0) invert(1);" aria-label="닫기" @click="handleCloseModal" />
          </div>
          <div class="modal-body p-6">
            <!-- Tab UI -->
            <div class="flex border-b mb-6" style="border-color: #DDD7CE;">
              <button
                  type="button"
                  class="px-4 py-2 text-sm font-bold transition-all"
                  :style="{
                    color: currentTab === 'pending-rfq' ? '#C8622A' : '#9A8C7E',
                    borderBottom: currentTab === 'pending-rfq' ? '2px solid #C8622A' : 'none'
                  }"
                  @click="currentTab = 'pending-rfq'"
              >
                신규 요청서
              </button>
              <button
                  type="button"
                  class="px-4 py-2 text-sm font-bold transition-all"
                  :style="{
                    color: currentTab === 'rejected-quo' ? '#C8622A' : '#9A8C7E',
                    borderBottom: currentTab === 'rejected-quo' ? '2px solid #C8622A' : 'none'
                  }"
                  @click="currentTab = 'rejected-quo'"
              >
                반려된 견적서 복사
              </button>
            </div>

            <div v-if="currentTab === 'pending-rfq'">
              <p class="mb-4 text-sm font-bold" style="color: #6B5F50;">진행 중인 견적 요청서 참조</p>
              <div class="max-h-[300px] overflow-y-auto border rounded mb-6" style="background-color: #FAF7F3; border-color: #DDD7CE;">
                <table class="w-full text-sm text-center border-collapse">
                  <thead class="sticky top-0 z-10" style="background-color: #EFEADF; color: #6B5F50; border-bottom: 1px solid #DDD7CE;">
                  <tr><th class="p-3">법인명</th><th class="p-3">담당자</th><th class="p-3">요청 날짜</th><th class="p-3">상태</th><th class="p-3">선택</th></tr>
                  </thead>
                  <tbody>
                  <tr v-for="req in documentStore.pendingQuotationRequests" :key="req.id" class="border-b transition-colors hover:bg-[#EFEADF]" style="border-color: #E8E3D8; color: #3D3529;" @click="startFromRequest(req)">
                    <td class="p-3 font-bold">{{ req.client?.name || req.clientName }}</td>
                    <td class="p-3">{{ req.client?.contact || req.managerName || '-' }}</td>
                    <td class="p-3 text-xs" style="color: #6B5F50;">{{ req.date || req.createdAt }}</td>
                    <td class="p-3">
                      <StatusBadge type="RFQ" :status="req.status" />
                    </td>
                    <td class="p-3">
                      <button class="text-white px-3 py-1 rounded text-xs shadow-sm" style="background-color: #7A8C42;">선택</button>
                    </td>
                  </tr>
                  <tr v-if="!documentStore.pendingQuotationRequests || documentStore.pendingQuotationRequests.length === 0">
                    <td colspan="5" class="p-10 italic" style="color: #9A8C7E;">대기 중인 요청서가 없습니다.</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-else-if="currentTab === 'rejected-quo'">
              <p class="mb-4 text-sm font-bold" style="color: #6B5F50;">이전 반려/만료된 견적서의 내용을 가져옵니다.</p>
              <div class="max-h-[300px] overflow-y-auto border rounded mb-6" style="background-color: #FAF7F3; border-color: #DDD7CE;">
                <table class="w-full text-sm text-center border-collapse">
                  <thead class="sticky top-0 z-10" style="background-color: #EFEADF; color: #6B5F50; border-bottom: 1px solid #DDD7CE;">
                  <tr><th class="p-3">코드</th><th class="p-3">법인명</th><th class="p-3">상태</th><th class="p-3">선택</th></tr>
                  </thead>
                  <tbody>
                  <tr v-for="quo in documentStore.rejectedQuotations" :key="quo.id" class="border-b transition-colors hover:bg-[#EFEADF]" style="border-color: #E8E3D8; color: #3D3529;" @click="startFromRejectedQuotation(quo)">
                    <td class="p-3 text-xs">
                      <div>{{ quo.displayCode }}</div>
                    </td>
                    <td class="p-3 font-bold">{{ quo.client?.name || quo.clientName }}</td>
                    <td class="p-3">
                      <StatusBadge type="QUO" :status="quo.status" />
                    </td>
                    <td class="p-3">
                      <button class="text-white px-3 py-1 rounded text-xs shadow-sm" style="background-color: #7A8C42;">복사</button>
                    </td>
                  </tr>
                  <tr v-if="!documentStore.rejectedQuotations || documentStore.rejectedQuotations.length === 0">
                    <td colspan="4" class="p-10 italic" style="color: #9A8C7E;">복사 가능한 견적서가 없습니다.</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <button
                class="w-full text-white py-4 rounded-lg font-bold shadow-lg transition-all hover:opacity-90"
                style="background-color: #7A8C42 !important;"
                @click="startNewQuotation"
            >
              + 견적서 신규 생성
            </button>
          </div>
        </div>
      </div>

      <!-- Corp Modal -->
      <div v-if="showCorpModal" class="modal-overlay z-[2100] p-4">
        <div class="modal w-[600px] max-w-[95vw] shadow-2xl relative" style="background-color: #F7F3EC; border: 1px solid #DDD7CE;">
          <div class="modal-header border-b" style="background-color: #C8622A; border-color: rgba(255,255,255,0.1);">
            <h3 class="modal-title text-base font-bold text-white">거래처 선택</h3>
            <button type="button" class="modal-close" style="filter: brightness(0) invert(1);" aria-label="닫기" @click="showCorpModal = false" />
          </div>
          <div class="modal-body p-6">
            <input
                v-model="clientSearchInput"
                type="text"
                placeholder="거래처명 또는 코드 검색..."
                class="w-full border p-3 rounded mb-4 text-sm outline-none focus:ring-1 focus:ring-[#7A8C42]"
                style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;"
            >
            <div class="max-h-[400px] overflow-y-auto border rounded" style="background-color: #FAF7F3; border-color: #DDD7CE;">
              <table class="w-full text-sm text-center border-collapse">
                <thead class="sticky top-0 z-10" style="background-color: #EFEADF; color: #6B5F50; border-bottom: 1px solid #DDD7CE;">
                <tr><th class="p-3">코드</th><th class="p-3">법인명</th><th class="p-3">담당자</th><th class="p-3">선택</th></tr>
                </thead>
                <tbody>
                <tr v-for="corp in filteredClients" :key="corp.id" class="border-b transition-colors hover:bg-[#EFEADF]" style="border-color: #E8E3D8; color: #3D3529;">
                  <td class="p-3 text-xs" style="color: #6B5F50;">{{ corp.code }}</td>
                  <td class="p-3 font-bold">{{ corp.name }}</td>
                  <td class="p-3">{{ corp.contact }}</td>
                  <td class="p-3">
                    <button class="text-white px-3 py-1 rounded text-xs font-bold transition-colors hover:opacity-90" style="background-color: #C8622A;" @click="setCorp(corp)">선택</button>
                  </td>
                </tr>
                <tr v-if="filteredClients.length === 0"><td colspan="4" class="p-10 italic" style="color: #9A8C7E;">검색 결과가 없습니다.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showProductModal" class="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="w-[800px] rounded-lg shadow-2xl border" style="background-color: #F7F3EC; border-color: #DDD7CE;">
          <div class="text-white p-4 flex justify-between items-center font-bold rounded-t-lg" style="background-color: #C8622A !important; color: white !important;">
            <h3 style="color: white !important;">상품 검색 및 선택</h3>
            <button @click="showProductModal = false" class="text-2xl hover:text-gray-200 transition-colors" style="color: white !important;">&times;</button>
          </div>
          <div class="p-5">
            <div class="flex gap-3 mb-4 relative z-50">
              <!-- Custom Variety Dropdown -->
              <div ref="varietyDropdownRef" class="relative w-32">
                <button
                    type="button"
                    class="flex w-full items-center justify-between rounded border p-2 text-sm font-bold shadow-sm outline-none transition-all focus:ring-1 focus:ring-[#7A8C42]"
                    style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;"
                    @click="isVarietyDropdownOpen = !isVarietyDropdownOpen"
                >
                  <span>{{ varietyFilter }}</span>
                  <span class="ml-2 transform text-xs transition-transform" :class="{ 'rotate-180': isVarietyDropdownOpen }">▼</span>
                </button>
                <ul
                    v-if="isVarietyDropdownOpen"
                    class="absolute left-0 z-[2200] mt-1 m-0 p-0 w-full rounded border shadow-lg overflow-y-auto max-h-60 list-none"
                    style="background-color: #FAF7F3; border-color: #DDD7CE;"
                >
                  <li
                      v-for="opt in varietyOptions"
                      :key="opt"
                      class="cursor-pointer px-3 py-2 text-sm transition-colors"
                      :class="[varietyFilter === opt ? 'bg-[#C8D4A0] font-bold' : 'hover:bg-[#EFEADF]']"
                      style="color: #3D3529;"
                      @click="varietyFilter = opt; isVarietyDropdownOpen = false"
                  >
                    {{ opt }}
                  </li>
                </ul>
              </div>

              <input
                  v-model="modalSearchInput"
                  type="text"
                  placeholder="상품명으로 검색"
                  class="search-input flex-1 border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-[#7A8C42] shadow-sm"
                  style="background-color: #FAF7F3 !important; border-color: #DDD7CE; color: #3D3529 !important;"
              >
            </div>
            <div class="max-h-[450px] overflow-y-auto border rounded" style="background-color: #F7F3EC; border-color: #DDD7CE;">
              <table class="w-full text-sm text-center border-collapse">
                <thead class="sticky top-0 font-bold" style="color: #3D3529 !important;">
                <tr style="background-color: #EFEADF !important;">
                  <th class="p-2 border" style="border-color: #DDD7CE; color: #3D3529 !important;">품종</th>
                  <th class="p-2 border" style="border-color: #DDD7CE; color: #3D3529 !important;">상품명</th>
                  <th class="p-2 border" style="border-color: #DDD7CE; color: #3D3529 !important;">단위</th>
                  <th class="p-2 border" style="border-color: #DDD7CE; color: #3D3529 !important;">단가</th>
                  <th class="p-2 border" style="border-color: #DDD7CE; color: #3D3529 !important;">선택</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="p in filteredProducts" :key="p.id" class="border-b transition-colors hover-row" style="border-color: #E8E3D8; color: #6B5F50 !important;">
                  <td class="p-3 text-xs font-bold" style="color: #9A8C7E !important; border-color: #E8E3D8;">{{ PRODUCT_CATEGORY[p.variety || p.category] || (p.variety || p.category) }}</td>
                  <td class="p-3 font-bold text-left" style="color: #3D3529 !important; border-color: #E8E3D8;">{{ p.name }}</td>
                  <td class="p-3 font-bold" style="color: #6B5F50 !important; border-color: #E8E3D8;">{{ p.unit }}</td>
                  <td class="p-3 text-right font-mono" style="color: #7A8C42 !important; border-color: #E8E3D8;">{{ (p.price || p.unitPrice || 0).toLocaleString() }}원</td>
                  <td class="p-3" style="border-color: #E8E3D8;">
                    <button
                        class="text-white px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors hover:opacity-90"
                        style="background-color: #C8622A !important;"
                        @click="addProduct(p)"
                    >
                      추가
                    </button>
                  </td>
                </tr>
                <tr v-if="filteredProducts.length === 0">
                  <td colspan="5" class="p-10 italic text-center" style="color: #9A8C7E;">검색 결과가 없습니다.</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal Animations */
.animate-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #F7F3EC;
}
::-webkit-scrollbar-thumb {
  background: #DDD7CE;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #C8622A;
}

/* Input/Textarea Styles */
input::placeholder, textarea::placeholder {
  color: #9A8C7E;
  font-style: italic;
}

/* Hover Effects */
.hover-row:hover {
  background-color: #EFEADF !important;
}

/* Table Sticky Header Shadow */
thead th {
  box-shadow: 0 1px 0 #DDD7CE;
}

/* Button & Tooltip effects */
button:active {
  transform: scale(0.98);
}
</style>
