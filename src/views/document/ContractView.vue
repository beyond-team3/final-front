<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useProductStore } from '@/stores/product'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/common/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const productStore = useProductStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

// --- 상태 관리 ---
const isProcessStarted = ref(false)
const isNewMode = ref(false)
const isViewMode = ref(false) // 상세 조회 모드 여부
const showStartModal = ref(false)
const showCorpModal = ref(false)
const showProductModal = ref(false)

// 원본 데이터 추적
const contractId = ref(null)
const contractCode = ref('')
const sourceQuotationId = ref(null)
const sourceHistoryId = ref(null)
const status = ref('')
const createdAt = ref('')

const NURSERY_TERMS = `제1조 (품질 보증 및 재배 책임)
1. '을'이 공급하는 종자의 품질 기준은 포장재 표시치를 기준으로 하되, 이는 '을'이 권장하는 표준 육묘 환경에서 재배되었을 때를 전제로 한다.
2. 육묘 과정에서의 환경 관리(온도, 습도, 광량), 상토의 오염, 약제 오남용 등 '갑'의 재배 공정상 과실로 인한 발아 불량 및 생육 이상에 대해서는 '을'이 책임지지 않는다.

제2조 (검수 및 조기 통보 의무)
1. '갑'은 물품 수령 즉시 외관 상태를 확인하고 7일 이내에 이의를 제기해야 한다.
2. 발아율 등 내부 품질 하자는 파종 후 '발아 완료 시점(최대 14일)' 이내에 서면으로 통보해야 한다. 모종이 성묘가 된 이후 또는 정식(밭에 심기) 이후에 제기되는 품질 클레임은 종자의 하자로 간주하지 않는다.
3. 품질 분쟁 시 공동 보관 샘플을 공인 기관에 의뢰하며, 감정 결과가 나오기 전까지 '갑'은 임의로 해당 종자나 묘를 폐기해서는 안 된다.

제3조 (손해배상의 제한 및 연쇄 책임 방어)
1. '을'의 손해배상 책임은 어떠한 경우에도 본 계약에 따라 지급된 당해 종자 구입 대금의 실 결제 금액을 한도로 한다.
2. '갑'이 생산한 모종을 구매한 제3자(농가)와의 분쟁 발생 시, '을'은 '갑'에 대해서만 책임을 지며 최종 소비자에 대한 직접 배상 의무는 없는 것으로 한다.

제4조 (지식재산권 및 무단 증식 금지)
1. 본 종자는 '을'의 지식재산권으로 보호되며, '갑'은 공급받은 종자를 이용하여 재채종을 하거나 묘(모종) 형태가 아닌 종자 상태 그대로 제3자에게 유상 양도할 수 없다.
2. 위반 시 '을'은 계약 해지권과 함께 '을'의 품종보호권 침해에 따른 전액 배상을 청구할 수 있다.

제5조 (효력 우선순위)
본 특약 사항의 내용이 본 계약서의 일반 조항과 상충할 경우, 본 특약 사항의 내용을 우선하여 적용한다.

제6조 (대금 청구 및 지급 방식)
1. '을'은 양 당사자가 별도 합의된 청구 주기의 말일 전에 청구서를 발행하여 '갑'에게 청구한다.
2. '갑'은 '을'이 청구한 대금을 해당 청구 주기의 말일까지 아래의 지정된 계좌로 현금 입금하여야 한다.

제7조 (입금 계좌 정보)
1. 은행명: 한국미래은행
2. 계좌번호: 113-738-97512
3. 예금주: (주)몬순`;

const AGENCY_TERMS = `제1조 (품질 보증 및 범위)
1. '을'이 공급하는 종자의 품질 기준(발아율, 순도 등)은 포장재에 표시된 수치를 기준으로 하며, 이는 국립종자원의 표준 규격을 준수한다.
2. '을'의 품질 보증 책임은 '갑'이 '을'이 제공한 적정 보관 방법(저온, 건조 등) 및 취급 지침을 엄격히 준수하였을 경우에 한하여 적용된다.

제2조 (검수 및 유통 관리)
1. '갑'은 물품 수령 즉시 수량 및 외관 상태를 확인해야 하며, 이상이 있을 경우 수령 후 7일 이내에 서면으로 이의를 제기해야 한다.
2. '갑'은 종자의 선도 유지를 위해 '을'이 정한 보관 기준을 준수해야 하며, '갑'의 보관 부주의로 발생한 품질 저하에 대해서는 '을'이 책임지지 않는다.
3. 품질 분쟁 발생 시, '갑'과 '을'이 공동으로 보관한 샘플을 국립종자원 등 공인 기관에 의뢰하여 그 결과에 따르기로 한다.

제3조 (손해배상의 제한 및 재판매 책임)
1. 종자의 결함으로 인해 발생한 '을'의 손해배상 책임은 본 계약에 따라 지급된 당해 종자 구입 대금의 실 결제 금액을 한도로 한다.
2. '갑'이 최종 소비자(농가 등)에게 재판매하는 과정에서 발생한 설명 미비, 허위 광고, 보관 부실에 따른 분쟁은 '갑'의 비용과 책임으로 해결하며 '을'을 면책시킨다.

제4조 (지식재산권 및 재판매 금지)
1. 본 계약에 따라 공급된 종자는 '품종보호법'에 의해 보호받는 '을'의 자산이며, '갑'은 '을'의 사전 서면 동의 없이 본 종자를 증식(재채종)하거나 허가되지 않은 경로로 유통할 수 없다.
2. '갑'이 제1항을 위반할 경우, '을'은 본 계약을 즉시 해지할 수 있으며 '갑'은 이로 인해 발생한 '을'의 영업상 손해를 전액 배상해야 한다.

제5조 (효력 우선순위)
본 특약 사항의 내용이 본 계약서의 일반 조항과 상충할 경우, 본 특약 사항의 내용을 우선하여 적용한다.

제6조 (대금 청구 및 지급 방식)
1. '을'은 양 당사자가 별도 합의된 청구 주기의 말일 전에 청구서를 발행하여 '갑'에게 청구한다.
2. '갑'은 '을'이 청구한 대금을 해당 청구 주기의 말일까지 아래의 지정된 계좌로 현금 입금하여야 한다.

제7조 (입금 계좌 정보)
1. 은행명: 한국미래은행
2. 계좌번호: 113-738-97512
3. 예금주: (주)몬순`;

const conInCorpCode = ref('')
const conInCorp = ref('')
const conInName = ref('')
const conInNo = ref('')
const conStartDate = ref('')
const conEndDate = ref('')
const conBillingCycle = ref('월')
const conSpecialTerms = ref('')
const conInternalMemo = ref('')
const selectedItems = ref([])

const templateType = ref('')
const applyTemplate = (e) => {
  const val = e.target.value
  if (!val) return
  
  if (conSpecialTerms.value && conSpecialTerms.value.trim() !== '') {
    if (!window.confirm("현재 입력된 특약 사항이 삭제됩니다. 계속하시겠습니까?")) {
      templateType.value = ''
      return
    }
  }

  if (val === 'nursery') conSpecialTerms.value = NURSERY_TERMS
  else if (val === 'agency') conSpecialTerms.value = AGENCY_TERMS
  
  templateType.value = '' // 초기화하여 다시 선택 가능하게
}

const modalSearchInput = ref('')
const clientSearchInput = ref('')
const varietyFilter = ref('전체')
const isVarietyDropdownOpen = ref(false)
const varietyDropdownRef = ref(null)

const clickOutsideHandler = (e) => {
  if (varietyDropdownRef.value && !varietyDropdownRef.value.contains(e.target)) {
    isVarietyDropdownOpen.value = false
  }
}

onMounted(async () => {
  window.addEventListener('click', clickOutsideHandler)
  try {
    // 1. URL 쿼리에 id가 있는지 확인 (상세 조회 모드)
    const id = route.query.id
    if (id) {
      await loadContractDetail(id)
      return
    }

    // 2. 신규 작성 모드인 경우 데이터 로딩
    showStartModal.value = true
    if (documentStore.fetchApprovedQuotations) await documentStore.fetchApprovedQuotations()
    if (documentStore.fetchClientMaster) await documentStore.fetchClientMaster()
    if (documentStore.fetchProductMaster) await documentStore.fetchProductMaster()
    if (historyStore.ensureLoaded) await historyStore.ensureLoaded()
  } catch (e) {
    console.error("데이터 로딩 중 에러 발생:", e)
  }

  if (route.query.quotationId) {
    const q = documentStore.quotations?.find(item => item.id === route.query.quotationId)
    if (q) startContract(q)
  }
})

onUnmounted(() => {
  window.removeEventListener('click', clickOutsideHandler)
})

// --- 핵심 로직 ---
const loadContractDetail = async (id) => {
  const data = await documentStore.fetchContractDetail(id)
  if (!data) {
    window.alert('계약서 정보를 불러오지 못했습니다.')
    router.push('/documents/all')
    return
  }

  isViewMode.value = true
  isProcessStarted.value = true
  contractId.value = data.id
  contractCode.value = data.contractCode || data.displayCode
  status.value = data.status
  createdAt.value = data.createdAt

  conInCorpCode.value = data.client?.code || data.clientId || ''
  conInCorp.value = data.client?.name || data.clientName || ''
  conInName.value = data.client?.contact || data.salesRepName || data.authorName || ''
  conInNo.value = contractCode.value
  conStartDate.value = data.startDate
  conEndDate.value = data.endDate

  // BillingCycle 변환 (백엔드 Enum -> 프론트 표시용)
  const cycleMap = { 'MONTHLY': '월', 'QUARTERLY': '분기', 'HALF_YEARLY': '반기' }
  conBillingCycle.value = cycleMap[data.billingCycle] || data.billingCycle || '월'

  conSpecialTerms.value = data.specialTerms
  conInternalMemo.value = data.memo

  selectedItems.value = (data.items || []).map(item => ({
    uid: item.detailId || Math.random(),
    productId: item.productId,
    variety: item.productCategory || item.variety || '-',
    name: item.productName || item.name || '',
    qty: Number(item.totalQuantity ?? item.quantity ?? 1),
    unit: item.unit || '립',
    price: Number(item.unitPrice ?? item.price ?? 0)
  }))
}

const startContract = (q) => {
  isNewMode.value = false
  isProcessStarted.value = true
  showStartModal.value = false

  sourceQuotationId.value = q.id

  const existingPipeline = historyStore.pipelines?.find(h =>
      h.documents?.some(d => String(d.id) === String(q.id))
  )
  sourceHistoryId.value = q.historyId || existingPipeline?.id || null

  conInCorpCode.value = q.clientId || q.client?.id || ''
  conInCorp.value = q.client?.name || ''
  conInName.value = q.client?.contact || ''
  conInNo.value = q.displayCode || q.quotationCode || q.id
  selectedItems.value = (q.items || []).map(item => ({
    uid: item.id || `${Date.now()}-${Math.random()}`,
    productId: item.productId || item.id,
    variety: item.productCategory || item.variety || '-',
    name: item.productName || item.name || '',
    qty: Number(item.quantity ?? item.qty ?? 1),
    unit: item.unit || '팩',
    price: Number(item.unitPrice ?? item.price ?? 0)
  }))
}

const startNewContract = () => {
  isNewMode.value = true
  isProcessStarted.value = true
  showStartModal.value = false

  sourceQuotationId.value = null
  sourceHistoryId.value = null

  conInCorpCode.value = ""
  conInCorp.value = ""
  conInName.value = ""
  conInNo.value = "신규 생성"
  selectedItems.value = []
}

const setCorp = (corp) => {
  conInCorpCode.value = corp.id
  conInCorp.value = corp.name
  conInName.value = corp.managerName || corp.contact
  showCorpModal.value = false
  clientSearchInput.value = ''
}

const addProduct = (p) => {
  const existing = selectedItems.value.find(item => item.productId === p.id)
  if (existing) {
    existing.qty++
  } else {
    selectedItems.value.push({
      uid: `${Date.now()}-${Math.random()}`,
      productId: p.id,
      variety: p.variety || p.category || '-',
      name: p.name,
      qty: 1,
      unit: p.unit || '립',
      price: Number(p.price || p.unitPrice || 0)
    })
  }
  showProductModal.value = false
}

const updateQty = (item, val) => {
  if (isViewMode.value) return
  let num = parseInt(val)
  item.qty = isNaN(num) || num < 1 ? 1 : num
}

const removeItem = (uid) => {
  if (isViewMode.value) return
  selectedItems.value = selectedItems.value.filter(i => i.uid !== uid)
}

// --- 계산 속성 ---
const filteredClients = computed(() => {
  const master = documentStore.clientMaster || []
  return master.filter(c =>
      c.name.toLowerCase().includes(clientSearchInput.value.toLowerCase()) ||
      String(c.code || '').toLowerCase().includes(clientSearchInput.value.toLowerCase())
  )
})

const varietyOptions = computed(() => {
  const varieties = documentStore.productMaster?.map(p => p.variety || p.category) || []
  return ['전체', ...new Set(varieties.filter(v => v))]
})

const filteredProducts = computed(() => {
  return documentStore.productMaster?.filter(p => {
    const matchVariety = varietyFilter.value === '전체' || (p.variety || p.category) === varietyFilter.value
    const matchKeyword = p.name.toLowerCase().includes(modalSearchInput.value.toLowerCase())
    return matchVariety && matchKeyword
  }) || []
})

const totalSum = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0)
)

const availableQuotations = computed(() => {
  return documentStore.quotations?.filter(q => q.status !== 'CONTRACTED') || []
})

const billingCycleDisplay = computed(() => {
  const map = { '월': '월 단위 청구', '분기': '분기 단위 청구', '반기': '반기 단위 청구' }
  return map[conBillingCycle.value] || `${conBillingCycle.value} 단위 청구`
})

const todayFormatted = computed(() => {
  if (isViewMode.value && createdAt.value) {
    const d = new Date(createdAt.value)
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`
  }
  const now = new Date()
  return `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`
})

const submitContract = async () => {
  if (isViewMode.value) return
  if (!conInCorp.value) return window.alert("거래처 정보가 빠져있습니다.")
  if (selectedItems.value.length === 0) return window.alert("계약할 상품을 하나라도 추가해주세요")

  try {
    await documentStore.createContract({
      quotationId: isNewMode.value ? null : sourceQuotationId.value,
      client: {
        id: conInCorpCode.value,
        name: conInCorp.value,
        managerName: conInName.value
      },
      items: selectedItems.value.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        price: item.price
      })),
      startDate: conStartDate.value,
      endDate: conEndDate.value,
      billingCycle: conBillingCycle.value,
      specialTerms: conSpecialTerms.value,
      memo: conInternalMemo.value,
      historyId: sourceHistoryId.value
    })

    window.alert(`계약서 생성 완료`);
    router.push('/documents/all');
  } catch (error) {
    console.error("서버 저장 에러:", error);
    window.alert("서버 저장 에러: " + (error.response?.data?.message || error.message));
  }
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm" style="color: #9A8C7E;">문서 관리 &gt; <span class="font-semibold" style="color: #3D3529;">계약서 {{ isViewMode ? '상세' : '작성' }}</span></p>
        <button
            type="button"
            class="rounded px-3 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            style="border: 1px solid #DDD7CE; background-color: transparent; color: #6B5F50;"
            @click="router.back()"
        >
          뒤로가기
        </button>
      </div>

      <div v-if="isProcessStarted" class="flex flex-col xl:flex-row gap-6 animate-in">
        <div class="flex-1 space-y-5 w-full">
          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold" style="color: #3D3529;">① 기본 정보</h3>
              <button
                  v-if="isNewMode && !isViewMode"
                  type="button"
                  class="rounded px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:opacity-90"
                  style="background-color: #C8622A !important;"
                  @click="showCorpModal = true"
              >
                거래처 선택
              </button>
              <StatusBadge type="CONTRACT" :status="status" />
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label class="text-[10px]" style="color: #9A8C7E;">거래처 코드</label>
                <input v-model="conInCorpCode" readonly class="w-full p-2 border rounded text-sm font-semibold outline-none" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;">
              </div>
              <div class="col-span-2">
                <label class="text-[10px]" style="color: #9A8C7E;">법인명</label>
                <input v-model="conInCorp" readonly class="w-full p-2 border rounded text-sm font-semibold outline-none" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;">
              </div>
              <div>
                <label class="text-[10px]" style="color: #9A8C7E;">담당자</label>
                <input v-model="conInName" readonly class="w-full p-2 border rounded text-sm font-semibold outline-none" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;">
              </div>
            </div>
          </article>

          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <h3 class="text-lg font-bold mb-4" style="color: #3D3529;">② 계약 조건 설정</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs" style="color: #6B5F50;">계약 시작일</label>
                <input v-model="conStartDate" :readonly="isViewMode" type="date" class="w-full p-2 border rounded text-sm mt-1 outline-none focus:ring-1 focus:ring-[#7A8C42]" :style="{ backgroundColor: isViewMode ? '#EFEADF' : '#FAF7F3', borderColor: '#DDD7CE', color: '#3D3529' }">
              </div>
              <div>
                <label class="text-xs" style="color: #6B5F50;">계약 종료일</label>
                <input v-model="conEndDate" :readonly="isViewMode" type="date" class="w-full p-2 border rounded text-sm mt-1 outline-none focus:ring-1 focus:ring-[#7A8C42]" :style="{ backgroundColor: isViewMode ? '#EFEADF' : '#FAF7F3', borderColor: '#DDD7CE', color: '#3D3529' }">
              </div>
              <div class="col-span-2">
                <label class="text-xs" style="color: #6B5F50;">청구 주기</label>
                <select v-if="!isViewMode" v-model="conBillingCycle" class="w-full p-2 border rounded text-sm mt-1 font-bold outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;">
                  <option value="월">월 단위 청구</option>
                  <option value="분기">분기 단위 청구</option>
                  <option value="반기">반기 단위 청구</option>
                </select>
                <input v-else v-model="conBillingCycle" readonly class="w-full p-2 border rounded text-sm mt-1 font-bold outline-none" style="background-color: #EFEADF; border-color: #DDD7CE; color: #3D3529;">
              </div>
              <div class="col-span-2">
                <div class="flex justify-between items-end mb-1">
                  <label class="text-xs" style="color: #6B5F50;">특약 사항</label>
                  <select 
                    v-if="!isViewMode"
                    v-model="templateType" 
                    class="text-[10px] p-1 border rounded bg-white outline-none focus:ring-1 focus:ring-[#7A8C42] cursor-pointer"
                    style="border-color: #DDD7CE; color: #6B5F50;"
                    @change="applyTemplate"
                  >
                    <option value="">서식 선택 안함</option>
                    <option value="nursery">서식: 육묘장용</option>
                    <option value="agency">서식: 대리점용</option>
                  </select>
                </div>
                <textarea v-model="conSpecialTerms" :readonly="isViewMode" class="w-full p-2 border rounded text-sm resize-none outline-none focus:ring-1 focus:ring-[#7A8C42]" :style="{ backgroundColor: isViewMode ? '#EFEADF' : '#FAF7F3', borderColor: '#DDD7CE', color: '#3D3529' }" rows="5" placeholder="거래 시 특별 조건 입력 (위 서식을 선택하면 자동 입력됩니다)"></textarea>
              </div>
            </div>
          </article>

          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold" style="color: #3D3529;">③ 공급 물품 명세</h3>
              <button
                  v-if="isNewMode && !isViewMode"
                  type="button"
                  class="rounded px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:opacity-90"
                  style="background-color: #C8622A !important;"
                  @click="showProductModal = true"
              >
                + 상품 검색
              </button>
            </div>
            <div class="max-h-[350px] overflow-y-auto border rounded shadow-inner" style="border-color: #DDD7CE;">
              <table class="w-full text-sm text-left border-collapse">
                <thead class="sticky top-0 z-10" style="background-color: #EFEADF; color: #6B5F50;">
                <tr>
                  <th class="px-3 py-2 text-left w-24">품종명</th>
                  <th class="px-3 py-2 text-left">상품명</th>
                  <th class="px-3 py-2 w-24 text-center">수량</th>
                  <th class="px-3 py-2 text-center">단위</th>
                  <th class="px-3 py-2 text-right">단가</th>
                  <th v-if="!isViewMode" class="px-3 py-2 text-center">작업</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="item.uid" class="border-t transition-colors hover:bg-white/50" style="border-color: #E8E3D8; color: #3D3529;">
                  <td class="px-3 py-2 text-left text-xs text-[#9A8C7E]">{{ item.variety }}</td>
                  <td class="px-3 py-2 text-left font-medium">{{ item.name }}</td>
                  <td class="px-3 py-2 text-center">
                    <input v-if="!isViewMode" type="number" min="1" class="w-20 p-1 border rounded text-center font-bold outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" :value="item.qty" @input="updateQty(item, $event.target.value)">
                    <span v-else class="font-bold">{{ item.qty }}</span>
                  </td>
                  <td class="px-3 py-2 text-center text-xs font-bold" style="color: #9A8C7E;">{{ item.unit }}</td>
                  <td class="px-3 py-2 text-right font-mono">{{ Number(item.price || 0).toLocaleString() }}</td>
                  <td v-if="!isViewMode" class="px-3 py-2 text-center">
                    <button
                        type="button"
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
                <tr v-if="selectedItems.length > 0" class="border-t font-bold" style="border-color: #E8E3D8; background-color: #FAF7F3;">
                  <td colspan="4" class="px-3 py-3 text-right" style="color: #6B5F50;">총 계 (VAT 포함)</td>
                  <td class="px-3 py-3 text-right font-mono text-lg" style="color: #C8622A;">{{ totalSum.toLocaleString() }}</td>
                  <td v-if="!isViewMode"></td>
                </tr>
                <tr v-if="selectedItems.length === 0">
                  <td :colspan="!isViewMode ? 6 : 5" class="px-3 py-10 text-center" style="color: #BFB3A5;">선택된 상품이 없습니다.</td>
                </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <h3 class="text-lg font-bold" style="color: #3D3529;">내부 비고</h3>
            <textarea v-model="conInternalMemo" :readonly="isViewMode" class="w-full p-2 border border-l-4 rounded text-sm mt-3 resize-none outline-none focus:ring-1 focus:ring-[#7A8C42]" :style="{ backgroundColor: isViewMode ? '#EFEADF' : '#FAF7F3', borderColor: '#DDD7CE', borderLeftColor: '#C8622A', color: '#3D3529' }" rows="3" placeholder="내부 관리용 메모"></textarea>
          </article>

          <button
              v-if="!isViewMode"
              type="button"
              class="w-full py-4 rounded-lg font-bold text-lg text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98]"
              style="background-color: #7A8C42 !important;"
              @click="submitContract"
          >
            계약 체결 및 승인 요청
          </button>
        </div>

        <aside class="w-full xl:w-[500px] sticky top-5 rounded-lg bg-[#525659] p-4 shadow-inner overflow-y-auto custom-scrollbar max-h-[90vh]">
          <div class="flex flex-col items-center">
            <!-- Adaptive Container: Remains 1 page but grows if needed -->
            <div class="bg-white px-12 pt-8 pb-12 w-[794px] min-h-[1115px] shadow-2xl relative text-[13px] text-black flex flex-col" style="font-family: 'KoPub Dotum', sans-serif !important; transform: scale(0.55); transform-origin: top center; margin-bottom: calc(-1115px * 0.45);">
              <div class="text-center border-b-2 border-black pb-3 mb-10">
                <h1 class="text-3xl font-bold tracking-widest">물 품 공 급 계 약 서</h1>
              </div>
              
              <div class="mb-8 space-y-3 leading-relaxed text-[15px]">
                <p><strong>계약상대자 (갑):</strong> <span class="border-b border-black px-2 font-bold">{{ conInCorp || '(빈값)' }}</span></p>
                <p><strong>계약상대자 (을):</strong> (주) 몬순</p>
                <p><strong>계약기간:</strong> <span class="font-mono text-base">{{ conStartDate || '____-__-__' }} ~ {{ conEndDate || '____-__-__' }}</span></p>
                <p><strong>청구주기:</strong> <span class="border-b border-black px-2 font-bold">{{ conBillingCycle }} 단위 청구</span></p>
              </div>

              <div class="mb-2">
                <strong class="text-sm">[공급 물품 명세]</strong>
              </div>
              <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[13px]">
                <thead class="bg-[#F7F3EC]">
                <tr class="border-b-2 border-black">
                  <th class="border-r border-black p-3">상품명</th>
                  <th class="border-r border-black p-3 w-16">수량</th>
                  <th class="border-r border-black p-3">단위</th>
                  <th class="border-r border-black p-3">단가</th>
                  <th class="p-3">금액</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(item, idx) in selectedItems" :key="'pdf-c-'+idx" class="border-b border-black">
                  <td class="border-r border-black p-3 text-left font-bold px-4">{{ item.name }}</td>
                  <td class="border-r border-black p-3">{{ item.qty || 0 }}</td>
                  <td class="border-r border-black p-3">{{ item.unit }}</td>
                  <td class="border-r border-black p-3 text-right font-mono">{{ Number(item.price || 0).toLocaleString() }}</td>
                  <td class="p-3 text-right font-bold px-4">{{ (Number(item.qty || 0) * Number(item.price || 0)).toLocaleString() }}</td>
                </tr>
                <tr v-if="selectedItems.length > 0">
                  <td colspan="4" class="border-r border-black p-3 bg-[#FAF7F3] font-bold text-right px-4">합 계</td>
                  <td class="p-3 text-right font-extrabold text-blue-700 px-4 text-xl">{{ totalSum.toLocaleString() }}</td>
                </tr>
                </tbody>
              </table>

              <div v-if="conSpecialTerms" class="mt-12">
                <strong class="text-sm border-b border-black pb-1">[특약 사항]</strong>
                <p class="mt-3 border border-black p-5 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[13px] min-h-[80px]">{{ conSpecialTerms }}</p>
              </div>

              <!-- Signature Section: Flows naturally at the end -->
              <div class="pt-8 pb-2 text-center flex flex-col items-center">
                <p class="text-[15px] font-bold mb-4">{{ todayFormatted }}</p>
                <div class="w-full px-16">
                  <div class="border-t-2 border-black pt-5">
                    <p class="font-bold text-xl">위 계약의 내용을 증명하기 위해 기명 날인함</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="showStartModal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-[750px] rounded-lg shadow-2xl border overflow-hidden" style="background-color: #F7F3EC; border-color: #DDD7CE;">
        <div class="text-white p-4 flex justify-between items-center font-bold" style="background-color: #C8622A !important;">
          <h3 style="color: white !important;">문서 작성 방식 선택</h3>
          <button @click="showStartModal = false; router.push('/documents/create')" class="text-2xl hover:text-gray-200 transition-colors" style="color: white !important;">&times;</button>
        </div>
        <div class="p-6">
          <p class="mb-4 text-sm font-bold" style="color: #6B5F50;">진행 중인 견적서 참조</p>
          <div class="max-h-[300px] overflow-y-auto border rounded mb-5 shadow-inner" style="background-color: #FAF7F3; border-color: #DDD7CE;">
            <table class="w-full text-sm text-center border-collapse">
              <thead class="sticky top-0 z-10" style="background-color: #EFEADF;">
              <tr>
                <th class="p-3 border-b" style="border-color: #DDD7CE;">견적번호</th>
                <th class="p-3 text-left border-b" style="border-color: #DDD7CE;">법인명</th>
                <th class="p-3 border-b" style="border-color: #DDD7CE;">담당자</th>
                <th class="p-3 border-b" style="border-color: #DDD7CE;">선택</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="q in availableQuotations" :key="q.id" class="border-b hover:bg-white/50 cursor-pointer" style="border-color: #E8E3D8;" @click="startContract(q)">
                <td class="p-3 font-mono font-bold" style="color: #C8622A;">{{ q.displayCode || q.quotationCode || q.id }}</td>
                <td class="p-3 text-left font-bold" style="color: #3D3529;">{{ q.client?.name }}</td>
                <td class="p-3" style="color: #6B5F50;">{{ q.client?.contact }}</td>
                <td class="p-3">
                  <button type="button" class="bg-[#7A8C42] text-white px-3 py-1 rounded text-xs font-bold transition-all hover:opacity-80">참조 작성</button>
                </td>
              </tr>
              <tr v-if="availableQuotations.length === 0">
                <td colspan="4" class="p-10 italic" style="color: #BFB3A5;">참조 가능한 견적서가 없습니다.</td>
              </tr>
              </tbody>
            </table>
          </div>
          <button
              type="button"
              class="w-full py-4 rounded-lg font-bold text-white shadow-lg transition-all hover:opacity-90"
              style="background-color: #7A8C42 !important;"
              @click="startNewContract"
          >
            + 계약서 신규 생성
          </button>
        </div>
      </div>
    </div>

    <!-- Corp Select Modal -->
    <div v-if="showCorpModal" class="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-[600px] rounded-lg shadow-2xl border overflow-hidden" style="background-color: #F7F3EC; border-color: #DDD7CE;">
        <div class="text-white p-4 flex justify-between items-center font-bold" style="background-color: #C8622A !important;">
          <h3 style="color: white !important;">거래처 선택</h3>
          <button @click="showCorpModal = false" class="text-2xl hover:text-white/80 transition-colors" style="color: white !important;">&times;</button>
        </div>
        <div class="p-5">
          <input
              v-model="clientSearchInput"
              type="text"
              placeholder="거래처명 또는 코드 검색..."
              class="w-full border p-2 rounded mb-4 text-sm outline-none focus:ring-1 focus:ring-[#7A8C42]"
              style="background-color: #FAF7F3; border-color: #DDD7CE;"
          >
          <div class="max-h-[400px] overflow-y-auto border rounded shadow-inner" style="background-color: #FAF7F3; border-color: #DDD7CE;">
            <table class="w-full text-sm text-center border-collapse">
              <thead class="sticky top-0" style="background-color: #EFEADF;">
              <tr class="font-bold" style="color: #6B5F50;">
                <th class="p-2 border-b" style="border-color: #DDD7CE;">코드</th>
                <th class="p-2 border-b" style="border-color: #DDD7CE;">법인명</th>
                <th class="p-2 border-b" style="border-color: #DDD7CE;">담당자</th>
                <th class="p-2 border-b" style="border-color: #DDD7CE;">선택</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="corp in filteredClients" :key="corp.id" class="border-b hover:bg-white transition-colors" style="border-color: #E8E3D8;">
                <td class="p-3 text-xs" style="color: #9A8C7E;">{{ corp.code || corp.id }}</td>
                <td class="p-3 font-bold" style="color: #3D3529;">{{ corp.name }}</td>
                <td class="p-3" style="color: #6B5F50;">{{ corp.managerName || corp.contact }}</td>
                <td class="p-3">
                  <button type="button" class="text-white px-3 py-1 rounded text-xs font-bold transition-all hover:opacity-90" style="background-color: #7A8C42 !important;" @click="setCorp(corp)">선택</button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Select Modal -->
    <div v-if="showProductModal" class="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-[800px] rounded-lg shadow-2xl border" style="background-color: #F7F3EC; border-color: #DDD7CE; overflow: visible;">
        <div class="text-white p-4 flex justify-between items-center font-bold rounded-t-lg" style="background-color: #C8622A !important; color: white !important;">
          <h3 style="color: white !important;">공급 물량 검색 및 추가</h3>
          <button @click="showProductModal = false" class="text-2xl hover:text-white/80 transition-colors" style="color: white !important;">&times;</button>
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
                placeholder="물품명으로 검색"
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
                <td class="p-3 text-xs font-bold" style="color: #9A8C7E !important; border-color: #E8E3D8;">{{ p.variety || p.category }}</td>
                <td class="p-3 font-bold text-left" style="color: #3D3529 !important; border-color: #E8E3D8;">{{ p.name }}</td>
                <td class="p-3 font-bold" style="color: #6B5F50 !important; border-color: #E8E3D8;">{{ p.unit }}</td>
                <td class="p-3 text-right font-bold text-[#7A8C42] px-4 font-mono" style="border-color: #E8E3D8;">{{ (p.price || p.unitPrice || 0).toLocaleString() }}원</td>
                <td class="p-3" style="border-color: #E8E3D8;">
                  <button
                      type="button"
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

/* Custom Dropdown Shadow */
.shadow-xl {
  box-shadow: 0 10px 25px -5px rgba(61, 53, 41, 0.1), 0 8px 10px -6px rgba(61, 53, 41, 0.1);
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
