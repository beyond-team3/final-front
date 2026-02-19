<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useProductStore } from '@/stores/product'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const productStore = useProductStore()

// --- [상태 관리] ---
const isProcessStarted = ref(false)
const isNewMode = ref(false)
const showStartModal = ref(true)
const showCorpModal = ref(false)
const showProductModal = ref(false)

// 데이터 바인딩 필드
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

// 검색 및 필터 상태
const modalSearchInput = ref('')
const clientSearchInput = ref('')
const varietyFilter = ref('전체')

onMounted(async () => {
  try {
    if (documentStore.fetchDocuments) await documentStore.fetchDocuments()
    if (documentStore.fetchClientMaster) await documentStore.fetchClientMaster()
    else if (documentStore.fetchClients) await documentStore.fetchClients()

    if (productStore.fetchProducts) await productStore.fetchProducts()
  } catch (e) {
    console.error("데이터 로딩 중 에러 발생:", e)
  }

  if (route.query.quotationId) {
    const q = documentStore.quotations?.find(item => item.id === route.query.quotationId)
    if (q) startContract(q)
  }
})

// --- [핵심 로직] ---

const startContract = (q) => {
  isNewMode.value = false
  isProcessStarted.value = true
  showStartModal.value = false

  conInCorpCode.value = q.client?.code || ''
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

  conInCorpCode.value = ""
  conInCorp.value = ""
  conInName.value = ""
  conInNo.value = "신규 생성"
  selectedItems.value = []
}

const setCorp = (corp) => {
  conInCorpCode.value = corp.code
  conInCorp.value = corp.name
  conInName.value = corp.contact
  showCorpModal.value = false
  clientSearchInput.value = ''
}

const addProduct = (p) => {
  const existing = selectedItems.value.find(item => item.productId === p.id)
  if (existing) {
    existing.qty++
  } else {
    selectedItems.value.push({
      uid: p.id || `${Date.now()}-${Math.random()}`,
      productId: p.id,
      variety: p.variety || p.category || '-',
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
  if (isNaN(num) || num < 1) num = 1
  item.qty = num
}

const removeItem = (uid) => {
  selectedItems.value = selectedItems.value.filter(i => i.uid !== uid)
}

// --- [계산 속성] ---

const filteredClients = computed(() => {
  const master = documentStore.clientMaster || []
  return master.filter(c =>
      c.name.toLowerCase().includes(clientSearchInput.value.toLowerCase()) ||
      c.code.toLowerCase().includes(clientSearchInput.value.toLowerCase())
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

const todayFormatted = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`
})

const submitContract = () => {
  if (!conInCorp.value) return window.alert("거래처 정보가 빠져있습니다.")
  if (selectedItems.value.length === 0) return window.alert("계약할 상품을 하나라도 추가해주세요")
  window.alert("계약서 작성이 완료되었습니다")
  router.push('/documents/all')
}
</script>

<template>
  <div class="content-wrapper p-6">
    <div class="screen-content bg-white rounded-lg p-6 shadow-sm min-h-[500px]">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-2xl font-bold text-[#2c3e50]">
          {{ isProcessStarted ? (isNewMode ? '영업 문서 작성 > 계약서 (신규 생성)' : '영업 문서 작성 > 계약서 (견적 참조)') : '문서 작성' }}
        </h2>
        <button v-if="isProcessStarted" class="bg-[#95a5a6] text-white px-4 py-2 rounded text-sm font-bold hover:bg-slate-500" @click="isProcessStarted = false; showStartModal = true">뒤로가기</button>
      </div>

      <div v-if="isProcessStarted" class="flex flex-col xl:flex-row gap-6 items-start">
        <div class="flex-1 space-y-5 w-full">
          <div class="card bg-white border p-5 rounded-lg shadow-sm">
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
                    <button class="bg-[#e74c3c] text-white px-2 py-1 rounded text-[10px] hover:bg-red-600 shadow-sm font-bold" @click="removeItem(item.uid)">X</button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card bg-white border p-5 rounded-lg shadow-sm">
            <h3 class="text-base font-bold text-slate-800">비고</h3>
            <textarea v-model="conInternalMemo" class="w-full p-2 border border-slate-300 border-l-4 border-l-[#e74c3c] rounded text-sm mt-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" rows="3" placeholder="pdf에는 표시가 안됩니다."></textarea>
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
              </div>
              <table class="w-full border-collapse border border-gray-400 text-center mb-5">
                <thead class="bg-gray-100">
                <tr class="text-[10px]">
                  <th class="border border-gray-400 p-1">상품명</th>
                  <th class="border border-gray-400 p-1">수량</th>
                  <th class="border border-gray-400 p-1">금액</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="'pdf-'+item.uid">
                  <td class="border border-gray-400 p-1 text-left">{{ item.name }}</td>
                  <td class="border border-gray-400 p-1">{{ item.qty }}</td>
                  <td class="border border-gray-400 p-1 text-right font-bold">{{ (Number(item.qty || 0) * Number(item.price || 0)).toLocaleString() }}</td>
                </tr>
                </tbody>
              </table>
              <div class="absolute bottom-10 left-0 right-0 text-center">
                <p class="mb-4 text-xs font-bold">{{ todayFormatted }}</p>
                <p class="mt-4 font-bold text-sm border-t pt-4 mx-8">위 계약의 내용을 증명하기 위해 기명 날인함</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showStartModal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white w-[750px] rounded-lg shadow-2xl overflow-hidden border">
        <div class="bg-[#2c3e50] text-white p-4 flex justify-between items-center font-bold">
          <h3>작성 방식 선택</h3>
          <button @click="showStartModal = false; router.push('/documents/create')" class="text-2xl hover:text-gray-300">&times;</button>
        </div>
        <div class="p-6">
          <div class="max-h-[300px] overflow-y-auto border rounded mb-5 bg-white shadow-inner">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 border-b sticky top-0 font-bold">
              <tr><th class="p-3">견적번호</th><th class="p-3 text-left">법인명</th><th class="p-3">담당자</th><th class="p-3">선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="q in documentStore.quotations" :key="q.id" class="border-b hover:bg-blue-50 cursor-pointer" @click="startContract(q)">
                <td class="p-3 font-mono text-blue-600 font-bold">{{ q.id }}</td>
                <td class="p-3 text-left font-bold text-slate-800">{{ q.client?.name }}</td>
                <td class="p-3">{{ q.client?.contact }}</td>
                <td class="p-3"><button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold shadow-sm">선택</button></td>
              </tr>
              </tbody>
            </table>
          </div>
          <button class="w-full bg-[#2ecc71] text-white py-4 rounded-lg font-bold shadow-lg hover:bg-emerald-600" @click="startNewContract">+ 계약서 신규 생성</button>
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
          <div class="max-h-[400px] overflow-y-auto border rounded bg-white">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 sticky top-0">
              <tr class="font-bold text-slate-600">
                <th class="p-2 border">코드</th><th class="p-2 border">법인명</th><th class="p-2 border">담당자</th><th class="p-2 border">선택</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="corp in filteredClients" :key="corp.id" class="border-b hover:bg-slate-50 transition-colors">
                <td class="p-3 text-slate-500 font-mono text-xs">{{ corp.code }}</td>
                <td class="p-3 font-bold text-slate-800">{{ corp.name }}</td>
                <td class="p-3 text-slate-600 font-bold">{{ corp.contact }}</td>
                <td class="p-3">
                  <button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold shadow-sm" @click="setCorp(corp)">선택</button>
                </td>
              </tr>
              <tr v-if="filteredClients.length === 0"><td colspan="4" class="p-10 text-gray-400 italic font-bold text-center">검색 결과가 없슴돠!</td></tr>
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
            <select v-model="varietyFilter" class="border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 font-bold">
              <option v-for="opt in varietyOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-model="modalSearchInput" type="text" placeholder="상품명으로 검색" class="flex-1 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-300">
          </div>
          <div class="max-h-[450px] overflow-y-auto border rounded bg-white">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 sticky top-0 font-bold text-slate-600">
              <tr><th class="p-2 border">품종</th><th class="p-2 border">상품명</th><th class="p-2 border">단위</th><th class="p-2 border text-right pr-5">표준 단가</th><th class="p-2 border">선택</th></tr>
              </thead>
              <tbody>
              <tr v-for="p in filteredProducts" :key="p.id" class="border-b hover:bg-slate-50 transition-colors">
                <td class="p-3 text-xs text-slate-500 font-bold">{{ p.variety || p.category }}</td>
                <td class="p-3 font-bold text-slate-800 text-left">{{ p.name }}</td>
                <td class="p-3 text-slate-600 font-bold">{{ p.unit }}</td>
                <td class="p-3 text-right font-mono text-blue-600 font-bold pr-5">{{ (p.price || p.unitPrice || 0).toLocaleString() }}원</td>
                <td class="p-3">
                  <button class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-600 shadow-sm" @click="addProduct(p)">추가</button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>