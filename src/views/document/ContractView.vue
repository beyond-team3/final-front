<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useProductStore } from '@/stores/product'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/common/StatusBadge.vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const productStore = useProductStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

// --- 상태 관리 ---
const isProcessStarted = ref(false)
const isNewMode = ref(false)
const showStartModal = ref(true)
const showCorpModal = ref(false)
const showProductModal = ref(false)

// 원본 데이터 추적
const sourceQuotationId = ref(null)
const sourceHistoryId = ref(null)

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
    if (documentStore.fetchDocumentsV2) await documentStore.fetchDocumentsV2()
    if (documentStore.fetchClientMaster) await documentStore.fetchClientMaster()
    if (documentStore.fetchProductMaster) await documentStore.fetchProductMaster()
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
  conInNo.value = q.id
  selectedItems.value = q.items?.map(item => ({
    uid: item.id || `${Date.now()}-${Math.random()}`,
    productId: item.productId || item.id,
    name: item.name,
    qty: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    unit: item.unit || '팩',
    price: Number(item.unitPrice || 0)
  })) || []
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
  let num = parseInt(val)
  item.qty = isNaN(num) || num < 1 ? 1 : num
}

const removeItem = (uid) => {
  selectedItems.value = selectedItems.value.filter(i => i.uid !== uid)
}

// --- 계산 속성 ---
const filteredClients = computed(() => {
  const master = documentStore.clients || documentStore.clientMaster || []
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

const todayFormatted = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`
})

const contractCardStatus = computed(() => {
  if (!isProcessStarted.value) return 'DRAFT'
  if (!isNewMode.value && sourceQuotationId.value) return 'REQUESTED'
  return 'DRAFT'
})

const submitContract = async () => {
  if (!conInCorp.value) return window.alert("거래처 정보가 빠져있습니다.")
  if (selectedItems.value.length === 0) return window.alert("계약할 상품을 하나라도 추가해주세요")

  const currentUser = authStore.me || { id: 1, name: "김민수" }
  const contractId = `CT-${Date.now()}`
  const today = new Date().toISOString().split('T')[0]
  const usedHistoryId = sourceHistoryId.value || `H-${Date.now()}`

  const contractData = {
    id: contractId,
    type: "contract",
    refQuotationId: isNewMode.value ? null : conInNo.value,
    clientId: conInCorpCode.value,
    clientName: conInCorp.value,
    authorId: currentUser.id,
    authorName: currentUser.name,
    historyId: usedHistoryId,
    status: "체결",
    amount: totalSum.value,
    date: today,
    startDate: conStartDate.value,
    endDate: conEndDate.value,
    billingCycle: conBillingCycle.value,
    specialTerms: conSpecialTerms.value,
    memo: conInternalMemo.value,
    items: selectedItems.value.map(item => ({
      name: item.name,
      quantity: item.qty,
      unit: item.unit,
      unitPrice: item.price,
      amount: item.qty * item.price
    }))
  }

  const historyData = {
    id: usedHistoryId,
    clientId: conInCorpCode.value,
    clientName: conInCorp.value,
    pipelineStage: "계약",
    stageNumber: 3,
    status: "완료",
    documentId: contractId,
    documents: [{
      id: contractId,
      type: "contract",
      typeLabel: "계약서",
      stage: "계약",
      stageNumber: 3,
      status: "SIGNED",
      date: today,
      amount: totalSum.value
    }],
    amount: totalSum.value,
    nextAction: "승인 대기",
    updatedAt: today,
    startDate: today
  }

  try {
    await axios.post('http://localhost:3001/documents', contractData);

    if (sourceHistoryId.value) {
      const hRes = await axios.get(`http://localhost:3001/history/${sourceHistoryId.value}`);
      const history = hRes.data;

      const updatedHistory = {
        ...history,
        pipelineStage: "계약",
        stageNumber: 3,
        status: "완료",
        documentId: contractId,
        nextAction: "승인 대기",
        updatedAt: today,
        amount: Math.max(Number(history.amount || 0), totalSum.value)
      };

      if (Array.isArray(updatedHistory.documents)) {
        updatedHistory.documents.push({
          id: contractId,
          type: "contract",
          typeLabel: "계약서",
          stage: "계약",
          stageNumber: 3,
          status: "SIGNED",
          date: today,
          amount: totalSum.value
        });
      }
      await axios.put(`http://localhost:3001/history/${sourceHistoryId.value}`, updatedHistory);
    } else {
      await axios.post('http://localhost:3001/history', historyData);
    }

    if (sourceQuotationId.value) {
      await axios.patch(`http://localhost:3001/documents/${sourceQuotationId.value}`, {
        status: "CONTRACTED",
        historyId: usedHistoryId
      });
    }

    if (documentStore.fetchDocumentsV2) await documentStore.fetchDocumentsV2();
    if (historyStore.fetchPipelines) await historyStore.fetchPipelines();

    window.alert(`계약서 생성 완료`);
    router.push('/documents/all');
  } catch (error) {
    console.error("서버 저장 에러:", error);
    window.alert("서버 저장 에러");
  }
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm" style="color: #9A8C7E;">문서 작성 &gt; <span class="font-semibold" style="color: #3D3529;">계약서 작성</span></p>
        <button
            v-if="isProcessStarted"
            type="button"
            class="rounded px-3 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            style="border: 1px solid #DDD7CE; background-color: transparent; color: #6B5F50;"
            @click="router.push('/documents/create')"
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
                  v-if="isNewMode"
                  type="button"
                  class="rounded px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:opacity-90"
                  style="background-color: #C8622A !important;"
                  @click="showCorpModal = true"
              >
                거래처 선택
              </button>
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
                <input v-model="conStartDate" type="date" class="w-full p-2 border rounded text-sm mt-1 outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;">
              </div>
              <div>
                <label class="text-xs" style="color: #6B5F50;">계약 종료일</label>
                <input v-model="conEndDate" type="date" class="w-full p-2 border rounded text-sm mt-1 outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;">
              </div>
              <div class="col-span-2">
                <label class="text-xs" style="color: #6B5F50;">청구 주기</label>
                <select v-model="conBillingCycle" class="w-full p-2 border rounded text-sm mt-1 font-bold outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;">
                  <option value="월">월 단위 청구</option>
                  <option value="분기">분기 단위 청구</option>
                  <option value="반기">반기 단위 청구</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="text-xs" style="color: #6B5F50;">특약 사항</label>
                <textarea v-model="conSpecialTerms" class="w-full p-2 border rounded text-sm mt-1 resize-none outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" rows="3" placeholder="거래 시 특별 조건 입력"></textarea>
              </div>
            </div>
          </article>

          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold" style="color: #3D3529;">③ 공급 물품 명세</h3>
              <button
                  v-if="isNewMode"
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
                  <th class="px-3 py-2 text-left">상품명</th>
                  <th class="px-3 py-2 w-24 text-center">수량</th>
                  <th class="px-3 py-2 text-center">단위</th>
                  <th class="px-3 py-2 text-right">단가</th>
                  <th v-if="isNewMode" class="px-3 py-2 text-center">작업</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="item.uid" class="border-t transition-colors hover:bg-white/50" style="border-color: #E8E3D8; color: #3D3529;">
                  <td class="px-3 py-2 text-left font-medium">{{ item.name }}</td>
                  <td class="px-3 py-2 text-center">
                    <input v-if="isNewMode" type="number" min="1" class="w-20 p-1 border rounded text-center font-bold outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" :value="item.qty" @input="updateQty(item, $event.target.value)">
                    <span v-else class="font-bold">{{ item.qty }}</span>
                  </td>
                  <td class="px-3 py-2 text-center text-xs font-bold" style="color: #9A8C7E;">{{ item.unit }}</td>
                  <td class="px-3 py-2 text-right font-mono">{{ Number(item.price || 0).toLocaleString() }}</td>
                  <td v-if="isNewMode" class="px-3 py-2 text-center">
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
                <tr v-if="selectedItems.length === 0">
                  <td :colspan="isNewMode ? 5 : 4" class="px-3 py-10 text-center" style="color: #BFB3A5;">선택된 상품이 없습니다.</td>
                </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <h3 class="text-lg font-bold" style="color: #3D3529;">내부 비고</h3>
            <textarea v-model="conInternalMemo" class="w-full p-2 border border-l-4 rounded text-sm mt-3 resize-none outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; border-left-color: #C8622A; color: #3D3529;" rows="3" placeholder="내부 관리용 메모"></textarea>
          </article>

          <button
              type="button"
              class="w-full py-4 rounded-lg font-bold text-lg text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98]"
              style="background-color: #7A8C42 !important;"
              @click="submitContract"
          >
            계약 체결 및 승인 요청
          </button>
        </div>

        <aside class="w-full xl:w-[500px] sticky top-5 rounded-lg bg-[#525659] p-4 shadow-inner">
          <div class="bg-white p-8 min-h-[750px] shadow-2xl relative text-[11px] text-black" style="font-family: 'KoPub Dotum', sans-serif !important;">
            <div class="text-center border-b-2 border-black pb-3 mb-5">
              <h1 class="text-xl font-bold tracking-widest" style="font-family: 'KoPub Dotum', sans-serif !important;">물 품 공 급 계 약 서</h1>
            </div>
            <div class="mb-5 space-y-2 leading-relaxed text-[12px]">
              <p><strong>계약상대자 (갑):</strong> <span class="border-b border-black px-2 font-bold">{{ conInCorp || '(거래처 미선택)' }}</span></p>
              <p><strong>계약상대자 (을):</strong> (주) 몬순</p>
              <p><strong>계약기간:</strong> <span class="font-mono text-xs">{{ conStartDate || '____-__-__' }} ~ {{ conEndDate || '____-__-__' }}</span></p>
              <p><strong>청구주기:</strong> <span class="border-b border-black px-2 font-bold">{{ conBillingCycle }} 단위 청구</span></p>
            </div>

            <table class="w-full border-collapse border border-black text-center mb-5 text-[10px]">
              <thead class="bg-[#F7F3EC]">
              <tr class="border-b border-black">
                <th class="border-r border-black p-1.5">품종명</th>
                <th class="border-r border-black p-1.5">상품명</th>
                <th class="border-r border-black p-1.5 w-12">수량</th>
                <th class="border-r border-black p-1.5">단위</th>
                <th class="border-r border-black p-1.5">단가</th>
                <th class="p-1.5">금액</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in selectedItems" :key="'pdf-'+item.uid" class="border-b border-black">
                <td class="border-r border-black p-1.5 text-xs">{{ item.variety }}</td>
                <td class="border-r border-black p-1.5 text-left font-bold px-2">{{ item.name }}</td>
                <td class="border-r border-black p-1.5">{{ item.qty }}</td>
                <td class="border-r border-black p-1.5">{{ item.unit }}</td>
                <td class="border-r border-black p-1.5 text-right font-mono">{{ Number(item.price || 0).toLocaleString() }}</td>
                <td class="p-1.5 text-right font-bold">{{ (Number(item.qty || 0) * Number(item.price || 0)).toLocaleString() }}</td>
              </tr>
              <tr v-if="selectedItems.length > 0">
                <td colspan="4" class="border-r border-black p-1.5 bg-[#FAF7F3] font-bold text-right">합 계</td>
                <td class="p-1.5 text-right font-extrabold" style="color: #C8622A;">{{ totalSum.toLocaleString() }}</td>
              </tr>
              <tr v-else>
                <td colspan="5" class="p-10 italic text-slate-400">물품 목록을 구성해주세요.</td>
              </tr>
              </tbody>
            </table>

            <div v-if="conSpecialTerms" class="mt-6">
              <strong class="text-xs">[특약 사항]</strong>
              <p class="mt-2 min-h-[60px] border border-black p-3 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[11px]">{{ conSpecialTerms }}</p>
            </div>

            <div class="absolute bottom-10 left-0 right-0 text-center space-y-4">
              <p class="text-xs font-bold">{{ todayFormatted }}</p>
              <div class="mx-8 pt-4 border-t border-black font-bold text-sm tracking-tighter">
                위 계약의 내용을 증명하기 위해 기명 날인함
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
                <td class="p-3 font-mono font-bold" style="color: #C8622A;">{{ q.id }}</td>
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
