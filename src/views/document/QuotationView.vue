<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useProductStore } from '@/stores/product'
import { useHistoryStore } from '@/stores/history'

const router = useRouter()
const documentStore = useDocumentStore()
const productStore = useProductStore()
const historyStore = useHistoryStore()

// --- [상태 관리] ---
const isProcessStarted = ref(false)
const isNewMode = ref(false)
const showStartModal = ref(false)
const showCorpModal = ref(false)
const showProductModal = ref(false)

// 폼 데이터
const inCorpCode = ref('')
const inCorp = ref('')
const inName = ref('')
const internalMemo = ref('')
const selectedItems = ref([])
const modalSearchInput = ref('')
const clientSearchInput = ref('') // [추가] 거래처 검색어
const varietyFilter = ref('전체')

onMounted(async () => {
  try {
    if (documentStore.fetchDocuments) await documentStore.fetchDocuments()
    // 스토어 함수명이 fetchClientMaster일 수 있으니 확인이 필요함돠!
    // 일단 행님 코드의 fetchClients를 존중했슴돠.
    if (documentStore.fetchClientMaster) await documentStore.fetchClientMaster()
    else if (documentStore.fetchClients) await documentStore.fetchClients()

    if (productStore.fetchProducts) await productStore.fetchProducts()
    if (historyStore.ensureLoaded) await historyStore.ensureLoaded()

    showStartModal.value = true
  } catch (e) {
    console.error("데이터 로딩 실패임돠 행님:", e)
  }
})

// --- [핵심 로직] ---

const handleCloseModal = () => {
  showStartModal.value = false
  if (!isProcessStarted.value) {
    router.push('/documents/create')
  }
}

const startFromRequest = (req) => {
  isNewMode.value = false
  isProcessStarted.value = true
  showStartModal.value = false

  inCorp.value = req.client?.name || ''
  inName.value = req.client?.contact || ''
  inCorpCode.value = req.client?.code || ''

  selectedItems.value = req.items.map(i => ({
    uid: Date.now() + Math.random(),
    variety: i.variety || '일반',
    name: i.name,
    count: i.quantity || 1,    unit: i.unit || '립',
    price: i.unitPrice || 0
  }))
}

const startNewQuotation = () => {
  isNewMode.value = true
  isProcessStarted.value = true
  showStartModal.value = false

  inCorpCode.value = ''
  inCorp.value = ''
  inName.value = ''
  selectedItems.value = []
}

const setCorp = (corp) => {
  inCorpCode.value = corp.code
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
      uid: Date.now(),
      productId: p.id,
      variety: p.variety || p.category || '-',
      name: p.name,
      count: 1,
      unit: p.unit?.includes('kg') ? 'kg' : '립',
      price: Number(p.price || p.unitPrice || 0)
    })
  }
  showProductModal.value = false
}

const updateItem = (item, field, val) => {
  let num = parseInt(val)
  if (field === 'count' && (isNaN(num) || num < 1)) num = 1
  if (field === 'price' && (isNaN(num) || num < 0)) num = 0
  item[field] = num
}

const removeItem = (uid) => {
  selectedItems.value = selectedItems.value.filter(i => i.uid !== uid)
}

// --- [계산 속성] ---
const totalSum = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + (item.count * item.price), 0)
)

const varietyOptions = computed(() => {
  const varieties = productStore.products?.map(p => p.variety || p.category) || []
  return ['전체', ...new Set(varieties.filter(v => v))]
})

// [추가] 거래처 검색 필터
const filteredClients = computed(() => {
  const master = documentStore.clientMaster || []
  return master.filter(c =>
      c.name.toLowerCase().includes(clientSearchInput.value.toLowerCase()) ||
      c.code.toLowerCase().includes(clientSearchInput.value.toLowerCase())
  )
})

const filteredProducts = computed(() => {
  return productStore.products?.filter(p => {
    const matchVariety = varietyFilter.value === '전체' || (p.variety || p.category) === varietyFilter.value
    const matchKeyword = p.name.toLowerCase().includes(modalSearchInput.value.toLowerCase())
    return matchVariety && matchKeyword
  }) || []
})

const validityDate = computed(() => {
  const today = new Date()
  today.setDate(today.getDate() + 30)
  return today.toISOString().split('T')[0]
})

const submitDoc = () => {
  if (!inCorp.value) return window.alert("거래처 정보를 완성해주십쇼 행님!")
  if (selectedItems.value.length === 0) return window.alert("품목을 하나라도 추가하셔야 함돠!")

  documentStore.createQuotation({
    client: { name: inCorp.value, code: inCorpCode.value, contact: inName.value },
    items: selectedItems.value,
    totalAmount: totalSum.value,
    memo: internalMemo.value
  })

  window.alert("견적서가 정상적으로 발행되었슴돠!")
  router.push('/documents/all')
}
</script>

<template>
  <div class="content-wrapper p-6">
    <div class="screen-content bg-white rounded-lg p-6 shadow-sm min-h-[500px]">

      <div class="flex justify-between items-center mb-5">
        <h2 class="text-2xl font-bold text-[#2c3e50]">{{ isProcessStarted ? '견적서 작성' : '문서 작성' }}</h2>
        <button v-if="isProcessStarted" class="bg-[#95a5a6] text-white px-4 py-2 rounded text-sm font-bold" @click="isProcessStarted = false; showStartModal = true">뒤로가기</button>
      </div>

      <div v-if="isProcessStarted" class="flex flex-col xl:flex-row gap-6 items-start animate-in fade-in duration-300">
        <div class="flex-1 space-y-5 w-full">
          <div class="card bg-white border border-[#eee] p-5 rounded-lg shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base font-bold text-slate-800">거래처 정보</h3>
              <button v-if="isNewMode" class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold" @click="showCorpModal = true">거래처 선택</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input v-model="inCorpCode" readonly class="p-2 border rounded bg-gray-50 text-sm font-semibold" placeholder="거래처 코드">
              <input v-model="inCorp" readonly class="p-2 border rounded bg-gray-50 text-sm font-semibold" placeholder="법인명">
              <input v-model="inName" readonly class="p-2 border rounded bg-gray-50 text-sm font-semibold" placeholder="담당자">
            </div>
          </div>

          <div class="card bg-white border border-[#eee] p-5 rounded-lg shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base font-bold text-slate-800">작성 품목</h3>
              <button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold" @click="showProductModal = true">+ 상품 검색</button>
            </div>
            <div class="max-h-[350px] overflow-y-auto border rounded bg-white">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 sticky top-0 z-10 border-b">
                <tr>
                  <th class="p-3 w-[15%]">품종명</th><th class="p-3 w-[25%]">상품명</th>
                  <th class="p-3 w-[15%] text-center">수량</th><th class="p-3 w-[15%] text-center">단위</th>
                  <th class="p-3 w-[20%] text-right">단가</th><th class="p-3 w-[10%] text-center">작업</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="item.uid" class="border-b hover:bg-slate-50 transition-colors">
                  <td class="p-3 text-slate-500 text-xs">{{ item.variety }}</td>
                  <td class="p-3 font-bold text-slate-800">{{ item.name }}</td>
                  <td class="p-3 text-center">
                    <input type="number" min="1" class="w-full border border-blue-300 rounded text-center p-1 font-bold text-blue-700" :value="item.count" @input="updateItem(item, 'count', $event.target.value)">
                  </td>
                  <td class="p-3 text-center">
                    <select class="w-full border border-slate-200 rounded p-1 text-xs" v-model="item.unit">
                      <option value="립">립</option><option value="kg">kg</option>
                    </select>
                  </td>
                  <td class="p-3">
                    <input type="number" min="0" class="w-full border border-emerald-300 rounded text-right p-1 font-mono" :value="item.price" @input="updateItem(item, 'price', $event.target.value)">
                  </td>
                  <td class="p-3 text-center">
                    <button class="bg-[#e74c3c] text-white px-2 py-1 rounded text-[10px] font-bold" @click="removeItem(item.uid)">삭제</button>
                  </td>
                </tr>
                <tr v-if="selectedItems.length === 0"><td colspan="6" class="p-10 text-center text-gray-400 italic">상품 정보를 입력해 주세요.</td></tr>
                </tbody>
              </table>
            </div>
            <div class="mt-4 text-right font-bold text-lg text-[#2c3e50]">총 합계: {{ totalSum.toLocaleString() }} 원</div>
          </div>

          <div class="card bg-white border border-[#eee] p-5 rounded-lg shadow-sm">
            <h3 class="text-base font-bold text-slate-800">내부 비고</h3>
            <textarea v-model="internalMemo" rows="3" class="w-full border border-slate-200 rounded p-3 mt-3 text-sm resize-none focus:ring-2 focus:ring-blue-100 outline-none" placeholder="비고는 PDF에 표시되지 않습니다."></textarea>
          </div>

          <button class="w-full bg-[#2ecc71] text-white py-4 rounded-lg font-bold text-lg hover:bg-emerald-600 shadow-md transition-all" @click="submitDoc">견적서 발행 완료</button>
        </div>

        <div class="w-full xl:w-[500px] sticky top-5">
          <div class="bg-[#525659] p-4 rounded-lg shadow-inner">
            <div class="bg-white p-8 min-h-[700px] shadow-2xl relative text-[11px] text-black [font-family:serif]">
              <div class="text-center border-b-2 border-black pb-3 mb-5">
                <h1 class="text-2xl font-bold tracking-widest">견 적 서</h1>
              </div>
              <div class="flex justify-between items-start mb-6 text-[12px]">
                <div class="space-y-1">
                  <p>수신: <span class="border-b border-black font-bold px-2 text-[14px]">{{ inCorp || '(빈값)' }}</span> 귀하</p>
                  <p>담당: <span class="px-2">{{ inName || '(빈값)' }}</span></p>
                  <p>견적 유효기간: <span class="font-bold text-blue-700 underline">{{ validityDate }}</span> (30일)</p>
                </div>
                <div class="w-14 h-14 border border-black flex items-center justify-center font-bold text-xs">인</div>
              </div>
              <table class="w-full border-collapse border border-gray-400 text-center mb-5 text-[10px]">
                <thead class="bg-gray-100">
                <tr><th class="border border-gray-400 p-1">품종</th><th class="border border-gray-400 p-1">상품명</th><th class="border border-gray-400 p-1">수량</th><th class="border border-gray-400 p-1">단위</th><th class="border border-gray-400 p-1">단가</th><th class="border border-gray-400 p-1">금액</th></tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="'pdf-'+item.uid">
                  <td class="border border-gray-400 p-1">{{ item.variety }}</td>
                  <td class="border border-gray-400 p-1 text-left font-bold">{{ item.name }}</td>
                  <td class="border border-gray-400 p-1">{{ item.count }}</td>
                  <td class="border border-gray-400 p-1">{{ item.unit }}</td>
                  <td class="border border-gray-400 p-1 text-right">{{ item.price.toLocaleString() }}</td>
                  <td class="border border-gray-400 p-1 text-right font-bold">{{ (item.count * item.price).toLocaleString() }}</td>
                </tr>
                </tbody>
                <tfoot class="bg-gray-50 font-bold">
                <tr><td colspan="5" class="border border-gray-400 p-1 text-sm text-right">합 계</td><td class="border border-gray-400 p-1 text-right font-mono">{{ totalSum.toLocaleString() }}</td></tr>
                </tfoot>
              </table>
              <div class="absolute bottom-10 left-0 right-0 text-center space-y-4">
                <p>2026년 02월 19일</p>
                <p class="text-sm font-bold tracking-widest border-t-2 border-slate-100 pt-4 mx-10">위와 같이 견적함 ( (주) 몬순 )</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showStartModal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white w-[750px] rounded-lg shadow-2xl overflow-hidden border">
        <div class="bg-[#2c3e50] text-white p-4 flex justify-between items-center font-bold">
          <h3>기존 견적 요청 건 선택</h3>
          <button @click="handleCloseModal" class="text-2xl hover:text-gray-300 transition-colors">&times;</button>
        </div>
        <div class="p-6">
          <div class="max-h-[300px] overflow-y-auto border rounded bg-white mb-5">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 border-b sticky top-0">
              <tr><th>법인명</th><th>담당자</th><th>요청 날짜</th><th>상태</th><th>선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="req in documentStore.quotationRequests" :key="req.id" class="border-b hover:bg-blue-50 transition-colors cursor-pointer" @click="startFromRequest(req)">
                <td class="p-3 font-bold text-slate-800">{{ req.client?.name }}</td>
                <td class="p-3">{{ req.client?.contact }}</td>
                <td class="p-3 text-slate-500">{{ req.date }}</td>
                <td class="p-3 text-orange-500 font-bold">{{ req.status }}</td>
                <td class="p-3"><button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs shadow-sm">선택</button></td>
              </tr>
              </tbody>
            </table>
          </div>
          <button class="w-full bg-[#2ecc71] text-white py-3 rounded-lg font-bold shadow-lg hover:bg-emerald-600 transition-all" @click="startNewQuotation">+ 견적서 신규 생성</button>
        </div>
      </div>
    </div>

    <div v-if="showCorpModal" class="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white w-[600px] rounded-lg shadow-2xl overflow-hidden border">
        <div class="bg-[#2c3e50] text-white p-4 flex justify-between items-center font-bold">
          <h3>거래처 선택</h3>
          <button @click="showCorpModal = false" class="text-2xl hover:text-gray-200 transition-colors">&times;</button>
        </div>
        <div class="p-5">
          <input v-model="clientSearchInput" type="text" placeholder="거래처명 또는 코드 검색..." class="w-full border p-2 rounded mb-4 text-sm outline-none focus:ring-2 focus:ring-blue-300">
          <div class="max-h-[400px] overflow-y-auto border rounded">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 sticky top-0">
              <tr><th class="p-2">코드</th><th class="p-2">법인명</th><th class="p-2">담당자</th><th class="p-2">선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="corp in filteredClients" :key="corp.id" class="border-b hover:bg-slate-50 transition-colors">
                <td class="p-3 text-slate-500 font-mono text-xs">{{ corp.code }}</td>
                <td class="p-3 font-bold text-slate-800">{{ corp.name }}</td>
                <td class="p-3 text-slate-600">{{ corp.contact }}</td>
                <td class="p-3"><button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold" @click="setCorp(corp)">선택</button></td>
              </tr>
              <tr v-if="filteredClients.length === 0"><td colspan="4" class="p-10 text-gray-400 italic">검색 결과가 없슴돠!</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showProductModal" class="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white w-[850px] rounded-lg shadow-2xl overflow-hidden border">
        <div class="bg-[#2c3e50] text-white p-4 flex justify-between items-center font-bold">
          <h3>상품 검색</h3>
          <button @click="showProductModal = false" class="text-2xl hover:text-gray-200 transition-colors">&times;</button>
        </div>
        <div class="p-5">
          <div class="flex gap-3 mb-4">
            <select v-model="varietyFilter" class="border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-300">
              <option v-for="opt in varietyOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-model="modalSearchInput" type="text" placeholder="상품명으로 검색" class="flex-1 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-300">
          </div>
          <div class="max-h-[450px] overflow-y-auto border rounded">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 sticky top-0">
              <tr><th class="p-2">품종</th><th class="p-2">상품명</th><th class="p-2">단위</th><th class="p-2 text-right">표준 단가</th><th class="p-2">선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="p in filteredProducts" :key="p.id" class="border-b hover:bg-slate-50 transition-colors">
                <td class="p-3 text-xs text-slate-500">{{ p.variety || p.category }}</td>
                <td class="p-3 font-bold text-slate-800 text-left">{{ p.name }}</td>
                <td class="p-3 text-slate-600">{{ p.unit }}</td>
                <td class="p-3 text-right font-mono text-emerald-600 pr-4">{{ (p.price || p.unitPrice || 0).toLocaleString() }}원</td>
                <td class="p-3"><button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-600" @click="addProduct(p)">추가</button></td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>