<script setup>
import { computed, onMounted, ref } from 'vue'
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

onMounted(async () => {
  try {
    if (documentStore.fetchDocuments) await documentStore.fetchDocuments()
    if (documentStore.fetchClientMaster) await documentStore.fetchClientMaster()
    if (productStore.fetchProducts) await productStore.fetchProducts()
  } catch (e) {
    console.error("데이터 로딩 중 에러 발생:", e)
  }

  if (route.query.quotationId) {
    const q = documentStore.quotations?.find(item => item.id === route.query.quotationId)
    if (q) startContract(q)
  }
})

// --- 핵심 로직 ---
const startContract = (q) => {
  isNewMode.value = false
  isProcessStarted.value = true
  showStartModal.value = false

  sourceQuotationId.value = q.id

  // 히스토리가 직접 연결되어 있지 않으면 전체 히스토리에서 해당 견적서가 포함된 건을 찾음
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
  conInCorpCode.value = corp.id // 코드가 아니라 numeric ID
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
      name: p.name,
      qty: 1,
      unit: p.unit || 'kg',
      price: Number(p.price || 0)
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
  const varieties = productStore.products?.map(p => p.variety || p.category) || []
  return ['전체', ...new Set(varieties.filter(v => v))]
})

const filteredProducts = computed(() => {
  return productStore.products?.filter(p => {
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
  // 1. 유효성 검사 (기존 동일)
  if (!conInCorp.value) return window.alert("거래처 정보가 빠져있습니다.")
  if (selectedItems.value.length === 0) return window.alert("계약할 상품을 하나라도 추가해주세요")

  // 로그인 유저 정보
  const currentUser = authStore.me || { id: 1, name: "김민수" }
  const contractId = `CT-${Date.now()}`
  const today = new Date().toISOString().split('T')[0]
  const usedHistoryId = sourceHistoryId.value || `H-${Date.now()}`

  // [JSON 서버 전송용 데이터 구성]
  const contractData = {
    id: contractId,
    type: "contract",
    refQuotationId: isNewMode.value ? null : conInNo.value,
    clientId: conInCorpCode.value,
    clientName: conInCorp.value,
    authorId: currentUser.id,
    authorName: currentUser.name,
    historyId: usedHistoryId, // 히스토리 아이디 명시적 저장!
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
    })),
    historyId: usedHistoryId
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

    // 1. documents 엔드포인트로 저장
    await axios.post('http://localhost:3001/documents', contractData);

    // 2. 히스토리 업데이트
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

    // 3. 원본 견적서 업데이트 (상태 + 히스토리 아이디 보강)
    if (sourceQuotationId.value) {
      await axios.patch(`http://localhost:3001/documents/${sourceQuotationId.value}`, {
        status: "CONTRACTED",
        historyId: usedHistoryId
      });
    }

    // 4. 스토어 상태도 동기화 (화면 갱신용)
    if (documentStore.fetchDocuments) await documentStore.fetchDocuments();
    if (historyStore.fetchPipelines) await historyStore.fetchPipelines();

    window.alert(`계약서 생성 완료`);
    router.push('/documents/all');
  } catch (error) {
    console.error("서버 저장 에러:", error);
    window.alert("3001번 서버 저장 에러");
  }
}
</script>

<template>
  <div class="content-wrapper p-6">
    <div class="screen-content">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-2xl font-bold text-[#2c3e50]">
          {{ isProcessStarted ? (isNewMode ? '영업 문서 작성 > 계약서 (신규 생성)' : '영업 문서 작성 > 계약서 (견적 참조)') : '문서 작성' }}
        </h2>
        <button v-if="isProcessStarted" class="bg-[#95a5a6] text-white px-4 py-2 rounded text-sm font-bold hover:bg-slate-500" @click="isProcessStarted = false; showStartModal = true">뒤로가기</button>
      </div>

      <div v-if="isProcessStarted" class="flex flex-col xl:flex-row gap-6 items-start">
        <div class="flex-1 space-y-5 w-full">
          <div class="card relative bg-white border p-5 rounded-lg shadow-sm">
            <StatusBadge class="absolute right-4 top-4" :status="contractCardStatus" />
            <div class="flex justify-between items-center mb-4 text-sm font-bold text-slate-800">
              <h3>① 선택된 정보 (거래처 및 견적)</h3>
              <button v-if="isNewMode" class="bg-[#3498db] text-white px-3 py-1 rounded text-xs hover:bg-blue-600 shadow-sm font-bold" @click="showCorpModal = true">거래처 선택</button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label class="text-[10px] text-gray-400">거래처 코드</label><input v-model="conInCorpCode" readonly class="w-full p-2 border rounded bg-gray-50 text-sm font-semibold"></div>
              <div class="col-span-2"><label class="text-[10px] text-gray-400">법인명</label><input v-model="conInCorp" readonly class="w-full p-2 border rounded bg-gray-50 text-sm font-semibold"></div>
              <div><label class="text-[10px] text-gray-400">담당자</label><input v-model="conInName" readonly class="w-full p-2 border rounded bg-gray-50 text-sm font-semibold"></div>
            </div>
          </div>

          <div class="card bg-white border p-5 rounded-lg shadow-sm">
            <h3 class="text-base font-bold mb-4 text-slate-800">② 계약 정보 설정</h3>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="text-xs text-gray-500">계약 시작일</label><input v-model="conStartDate" type="date" class="w-full p-2 border rounded text-sm mt-1"></div>
              <div><label class="text-xs text-gray-500">계약 종료일</label><input v-model="conEndDate" type="date" class="w-full p-2 border rounded text-sm mt-1"></div>
              <div class="col-span-2"><label class="text-xs text-gray-500">청구 주기</label>
                <select v-model="conBillingCycle" class="w-full p-2 border rounded text-sm mt-1 font-bold">
                  <option value="월">월 단위 청구</option><option value="분기">분기 단위 청구</option><option value="반기">반기 단위 청구</option>
                </select>
              </div>
              <div class="col-span-2"><label class="text-xs text-gray-500">특약 사항</label><textarea v-model="conSpecialTerms" class="w-full p-2 border rounded text-sm mt-1 resize-none" rows="3"></textarea></div>
            </div>
          </div>

          <div class="card bg-white border p-5 rounded-lg shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base font-bold text-slate-800">③ 계약 상품 명세</h3>
              <button v-if="isNewMode" class="bg-[#3498db] text-white px-3 py-1 rounded text-xs hover:bg-blue-600 shadow-sm font-bold" @click="showProductModal = true">+ 상품 검색</button>
            </div>
            <div class="max-h-[350px] overflow-y-auto border rounded bg-white shadow-inner">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 sticky top-0 border-b z-10">
                <tr><th class="p-3">상품명</th><th class="p-3 w-24 text-center">수량</th><th class="p-3">단위</th><th class="p-3 text-right">단가</th><th v-if="isNewMode" class="p-3 text-center">삭제</th></tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="item.uid" class="border-b hover:bg-slate-50 transition-colors">
                  <td class="p-3 font-medium text-slate-800">{{ item.name }}</td>
                  <td class="p-3 text-center">
                    <input v-if="isNewMode" type="number" min="1" class="w-full p-1 border border-blue-400 rounded text-center font-bold text-blue-600" :value="item.qty" @input="updateQty(item, $event.target.value)">
                    <span v-else class="font-bold text-slate-700">{{ item.qty }}</span>
                  </td>
                  <td class="p-3 text-gray-500 text-xs font-bold">{{ item.unit }}</td>
                  <td class="p-3 text-right font-mono text-slate-600">{{ Number(item.price || 0).toLocaleString() }}</td>
                  <td v-if="isNewMode" class="p-3 text-center">
                    <button class="bg-[#e74c3c] text-white px-2 py-1 rounded text-[10px] hover:bg-red-600 font-bold" @click="removeItem(item.uid)">X</button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card bg-white border p-5 rounded-lg shadow-sm">
            <h3 class="text-base font-bold text-slate-800">비고</h3>
            <textarea v-model="conInternalMemo" class="w-full p-2 border border-slate-300 border-l-4 border-l-[#e74c3c] rounded text-sm mt-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" rows="3" placeholder="내부용 메모"></textarea>
          </div>

          <button class="w-full bg-[#2ecc71] text-white py-4 rounded-lg font-bold text-lg hover:bg-emerald-600 shadow-md transition-all active:scale-[0.98]" @click="submitContract">계약서 생성 완료</button>
        </div>

        <div class="w-full xl:w-[500px] sticky top-5">
          <div class="bg-[#525659] p-4 rounded-lg shadow-inner">
            <div class="bg-white p-8 min-h-[750px] shadow-2xl relative text-[11px] text-black [font-family:serif]">
              <div class="text-center border-b-2 border-black pb-3 mb-5">
                <h1 class="text-2xl font-bold tracking-widest">물 품 공 급 계 약 서</h1>
              </div>
              <div class="mb-5 space-y-2 leading-relaxed text-sm">
                <p><strong>계약상대자 (갑):</strong> <span class="border-b border-black px-2 font-bold">{{ conInCorp || '(빈값)' }}</span></p>
                <p><strong>계약상대자 (을):</strong> (주) 몬순</p>
                <p><strong>계약기간:</strong> <span class="font-mono text-xs">{{ conStartDate || '____-__-__' }} ~ {{ conEndDate || '____-__-__' }}</span></p>
                <p><strong>청구주기:</strong> <span class="border-b border-black px-2 font-bold">{{ conBillingCycle }} 단위 청구</span></p>
              </div>

              <table class="w-full border-collapse border border-gray-400 text-center mb-5">
                <thead class="bg-gray-100">
                <tr class="text-[10px]">
                  <th class="border border-gray-400 p-1">상품명</th>
                  <th class="border border-gray-400 p-1">수량</th>
                  <th class="border border-gray-400 p-1">단위</th>
                  <th class="border border-gray-400 p-1">단가</th>
                  <th class="border border-gray-400 p-1">금액</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="'pdf-'+item.uid">
                  <td class="border border-gray-400 p-1 text-left">{{ item.name }}</td>
                  <td class="border border-gray-400 p-1">{{ item.qty }}</td>
                  <td class="border border-gray-400 p-1">{{ item.unit }}</td>
                  <td class="border border-gray-400 p-1 text-right">{{ Number(item.price || 0).toLocaleString() }}</td>
                  <td class="border border-gray-400 p-1 text-right font-bold">{{ (Number(item.qty || 0) * Number(item.price || 0)).toLocaleString() }}</td>
                </tr>
                <tr v-if="selectedItems.length > 0">
                  <td colspan="4" class="border border-gray-400 p-1 bg-gray-50 font-bold">합 계</td>
                  <td class="border border-gray-400 p-1 text-right font-extrabold text-blue-700">{{ totalSum.toLocaleString() }}</td>
                </tr>
                </tbody>
              </table>

              <div v-if="conSpecialTerms" class="mt-6 border-t pt-3">
                <p class="font-bold mb-1">[특약 사항]</p>
                <div class="whitespace-pre-wrap leading-relaxed text-[10px] text-gray-700">{{ conSpecialTerms }}</div>
              </div>

              <div class="absolute bottom-10 left-0 right-0 text-center">
                <p class="mb-4 text-xs font-bold">{{ todayFormatted }}</p>
                <p class="mt-4 font-bold text-sm border-t pt-4 mx-8">위 계약의 내용을 증명하기 위해 기명 날인함</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showStartModal" class="modal-overlay z-[2000] p-4">
      <div class="modal w-[750px] max-w-[95vw] overflow-hidden">
        <div class="modal-header">
          <h3 class="modal-title text-base">작성 방식 선택</h3>
          <button type="button" class="modal-close" aria-label="닫기" @click="showStartModal = false; router.push('/documents/create')" />
        </div>
        <div class="modal-body">
          <div class="max-h-[300px] overflow-y-auto border rounded mb-5 bg-white shadow-inner">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 border-b sticky top-0 font-bold">
              <tr><th class="p-3">견적번호</th><th class="p-3 text-left">법인명</th><th class="p-3">담당자</th><th class="p-3">선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="q in availableQuotations" :key="q.id" class="border-b hover:bg-blue-50 cursor-pointer" @click="startContract(q)">
                <td class="p-3 font-mono text-blue-600 font-bold">{{ q.id }}</td>
                <td class="p-3 text-left font-bold text-slate-800">{{ q.client?.name }}</td>
                <td class="p-3">{{ q.client?.contact }}</td>
                <td class="p-3"><button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold">선택</button></td>
              </tr>
              </tbody>
            </table>
          </div>
          <button class="w-full bg-[#2ecc71] text-white py-4 rounded-lg font-bold shadow-lg hover:bg-emerald-600" @click="startNewContract">+ 계약서 신규 생성</button>
        </div>
      </div>
    </div>

    <div v-if="showCorpModal" class="modal-overlay z-[2100] p-4">
      <div class="modal w-[600px] max-w-[95vw] overflow-hidden">
        <div class="modal-header">
          <h3 class="modal-title text-base">거래처 선택</h3>
          <button type="button" class="modal-close" aria-label="닫기" @click="showCorpModal = false" />
        </div>
        <div class="modal-body">
          <input v-model="clientSearchInput" type="text" placeholder="거래처명 또는 코드 검색..." class="w-full border p-2 rounded mb-4 text-sm focus:ring-2 focus:ring-blue-300 outline-none">
          <div class="max-h-[400px] overflow-y-auto border rounded bg-white">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 sticky top-0">
              <tr class="font-bold text-slate-600"><th>코드</th><th>법인명</th><th>담당자</th><th>선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="corp in filteredClients" :key="corp.id" class="border-b hover:bg-slate-50">
                <td class="p-3 text-slate-500 text-xs">{{ corp.code || corp.id }}</td>
                <td class="p-3 font-bold text-slate-800">{{ corp.name }}</td>
                <td class="p-3 text-slate-600">{{ corp.managerName || corp.contact }}</td>
                <td><button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold" @click="setCorp(corp)">선택</button></td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showProductModal" class="modal-overlay z-[2100] p-4">
      <div class="modal w-[850px] max-w-[95vw] overflow-hidden">
        <div class="modal-header">
          <h3 class="modal-title text-base">상품 검색</h3>
          <button type="button" class="modal-close" aria-label="닫기" @click="showProductModal = false" />
        </div>
        <div class="modal-body">
          <div class="flex gap-3 mb-4">
            <select v-model="varietyFilter" class="border rounded p-2 text-sm font-bold outline-none">
              <option v-for="opt in varietyOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-model="modalSearchInput" type="text" placeholder="상품명으로 검색" class="flex-1 border p-2 rounded text-sm focus:ring-2 focus:ring-blue-300 outline-none">
          </div>
          <div class="max-h-[450px] overflow-y-auto border rounded bg-white">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 sticky top-0 font-bold text-slate-600">
              <tr><th>품종</th><th>상품명</th><th>단위</th><th>표준 단가</th><th>선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="p in filteredProducts" :key="p.id" class="border-b hover:bg-slate-50">
                <td class="p-3 text-xs text-slate-500 font-bold">{{ p.variety || p.category }}</td>
                <td class="p-3 font-bold text-slate-800 text-left">{{ p.name }}</td>
                <td class="p-3 text-slate-600">{{ p.unit }}</td>
                <td class="p-3 text-right font-bold text-blue-600">{{ (p.price || 0).toLocaleString() }}원</td>
                <td><button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold" @click="addProduct(p)">추가</button></td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
