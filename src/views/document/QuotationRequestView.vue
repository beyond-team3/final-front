<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES, PRODUCT_CATEGORY } from '@/utils/constants'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const requestStatus = ref('')

const router = useRouter()
const documentStore = useDocumentStore()
const authStore = useAuthStore()

// --- [상태 관리] ---
const requirements = ref('')
const selectedItems = ref([])
const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)

// 모달 및 필터 상태
const showProductModal = ref(false)
const modalSearchInput = ref('')
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

  // 상세 조회 모드인 경우
  const id = route.query.id
  if (id) {
    const data = await documentStore.fetchQuotationRequestDetail(id)
    if (data) {
      requestStatus.value = data.status
      // ... 기타 필요한 데이터 세팅
    }
  }

  // 💡 상품 및 거래처 목록 미리 로드
  if (documentStore.productMaster.length === 0) {
    void documentStore.fetchProductMaster('estimate')
  }
  if (documentStore.clientMaster.length === 0) {
    documentStore.fetchClientMaster()
  }
})

onUnmounted(() => {
  window.removeEventListener('click', clickOutsideHandler)
})

const todayText = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`
})

// --- [로직] ---

const varietyOptions = computed(() => {
  const varieties = documentStore.productMaster?.map(p => p.category) || []
  const uniqueVars = [...new Set(varieties.filter(v => v))]
  return ['전체', ...uniqueVars.map(v => PRODUCT_CATEGORY[v] || v)]
})

// 모달 내 상품 필터링
const filteredProducts = computed(() => {
  return documentStore.productMaster?.filter(p => {
    const pVar = PRODUCT_CATEGORY[p.category] || p.category
    const matchVariety = varietyFilter.value === '전체' || pVar === varietyFilter.value
    const matchKeyword = p.name.toLowerCase().includes(modalSearchInput.value.toLowerCase())
    return matchVariety && matchKeyword
  }) || []
})

/**
 * 상품 추가 로직
 */
const addProduct = (product) => {
  const found = selectedItems.value.find((item) => item.productId === product.id)
  if (found) {
    found.quantity += 1
    found.amount = found.quantity * (product.unitPrice || 0)
  } else {
    selectedItems.value.push({
      uid: Date.now() + product.id,
      productId: product.id,
      productCategory: PRODUCT_CATEGORY[product.category] || product.category,
      variety: PRODUCT_CATEGORY[product.variety || product.category] || (product.variety || product.category),
      name: product.name,
      unit: product.unit,
      unitPrice: product.unitPrice || 0,
      quantity: 1,
      amount: product.unitPrice || 0,
    })
  }

  // 상품 추가 후 모달 닫기 적용
  showProductModal.value = false
}

const updateQty = (item) => {
  item.quantity = Number(item.quantity || 1)
  if (item.quantity < 1) item.quantity = 1
  item.amount = item.quantity * item.unitPrice
}

const removeItem = (uid) => {
  selectedItems.value = selectedItems.value.filter((item) => item.uid !== uid)
}

const submit = () => {
  if (selectedItems.value.length === 0) {
    window.alert('상품을 1개 이상 선택해주세요.')
    return
  }

  const defaultClient = isClient.value
      ? documentStore.clientMaster.find((client) => client.name === (authStore.me?.clientName || authStore.me?.name))
      || documentStore.clientMaster.find((client) => String(authStore.me?.clientName || authStore.me?.name || '').includes(client.name))
      || documentStore.clientMaster[0]
      : documentStore.clientMaster[0]

  if (!defaultClient) {
    window.alert('거래처 정보를 찾을 수 없거나 아직 로드되지 않았습니다.')
    return
  }

  const request = documentStore.createQuotationRequest({
    client: defaultClient,
    items: selectedItems.value,
    requirements: requirements.value,
  })

  window.alert('견적 요청서가 정상적으로 제출되었습니다.')

  if (isClient.value) {
    router.push('/documents/create')
    return
  }

  router.push(`/documents/quotation?requestId=${request.id}`)
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm" style="color: #9A8C7E;">문서 작성 > <span class="font-semibold" style="color: #3D3529;">견적 요청서 작성</span></p>
        <button
            type="button"
            class="rounded px-3 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            style="border: 1px solid #DDD7CE; background-color: transparent; color: #6B5F50;"
            @click="router.push('/documents/create')"
        >
          뒤로가기
        </button>
      </div>

      <div class="grid gap-5 xl:grid-cols-[1.2fr_480px] animate-in">
        <section class="space-y-5">
          <article class="rounded-lg border p-5 shadow-sm" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-bold" style="color: #3D3529;">작성 품목</h3>
              <button
                  type="button"
                  class="rounded px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:opacity-90"
                  style="background-color: #C8622A !important;"
                  @click="showProductModal = true"
              >
                + 상품 검색 및 추가
              </button>
            </div>

            <div class="overflow-hidden rounded border" style="border-color: #DDD7CE;">
              <table class="w-full border-collapse text-sm">
                <thead>
                <tr style="background-color: #EFEADF; color: #6B5F50;">
                  <th class="px-3 py-2 text-left">품종명</th>
                  <th class="px-3 py-2 text-left">상품명</th>
                  <th class="px-3 py-2 text-center">수량</th>
                  <th class="px-3 py-2 text-center">단위</th>
                  <th class="px-3 py-2 text-center">작업</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in selectedItems" :key="item.uid" class="border-t" style="border-color: #E8E3D8; color: #3D3529;">
                  <td class="px-3 py-2 text-left">{{ item.variety }}</td>
                  <td class="px-3 py-2 text-left">{{ item.name }}</td>
                  <td class="px-3 py-2 text-center">
                    <input v-model.number="item.quantity" type="number" min="1" class="h-8 w-20 rounded border px-2 outline-none focus:ring-1 focus:ring-[#7A8C42]" style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;" @input="updateQty(item)">
                  </td>
                  <td class="px-3 py-2 text-center">{{ item.unit }}</td>
                  <td class="px-3 py-2 text-center">
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
                  <td colspan="5" class="px-3 py-8 text-center" style="color: #BFB3A5;">상품을 선택해주세요.</td>
                </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border p-5" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <h3 class="text-lg font-bold" style="color: #3D3529;">추가 요구사항</h3>
            <textarea
                v-model="requirements"
                class="mt-3 h-24 w-full rounded border p-3 text-sm outline-none focus:ring-1 focus:ring-[#7A8C42]"
                style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;"
                placeholder="기타 요구사항 입력"
            />
          </article>

          <button
              type="button"
              class="w-full rounded px-4 py-4 text-base font-semibold text-white transition-colors hover:opacity-90 shadow-md"
              style="background-color: #7A8C42 !important;"
              @click="submit"
          >
            견적 요청서 제출
          </button>
        </section>

        <section class="rounded-lg bg-[#525659] p-4 shadow-inner">
          <div class="min-h-[700px] rounded bg-white p-8 text-[11px] text-black shadow-2xl relative" style="font-family: 'KoPub Dotum', sans-serif !important;">
            <div class="mb-5 border-b-2 border-black pb-3 text-center">
              <h1 class="text-xl font-bold tracking-widest" style="font-family: 'KoPub Dotum', sans-serif !important;">견적 요청서</h1>
            </div>
            <p class="mb-2">귀하의 무궁한 발전을 기원합니다.</p>
            <p>아래와 같이 견적을 요청하오니 검토 부탁드립니다.</p>

            <table class="my-4 w-full border-collapse border border-black text-center text-[10px]">
              <thead class="bg-[#F7F3EC]">
              <tr class="border-b border-black">
                <th class="border-r border-black p-1.5">품종명</th>
                <th class="border-r border-black p-1.5">상품명</th>
                <th class="border-r border-black p-1.5">수량</th>
                <th class="p-1.5">단위</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in selectedItems" :key="`preview-${item.uid}`" class="border-b border-black">
                <td class="border-r border-black p-1.5">{{ item.variety }}</td>
                <td class="border-r border-black p-1.5 font-bold text-left px-2">{{ item.name }}</td>
                <td class="border-r border-black p-1.5">{{ item.quantity }}</td>
                <td class="p-1.5">{{ item.unit }}</td>
              </tr>
              <tr v-if="selectedItems.length === 0">
                <td colspan="4" class="p-10 italic text-slate-400">상품을 선택해주세요.</td>
              </tr>
              </tbody>
            </table>

            <div class="mt-6">
              <strong class="text-xs">[요구사항]</strong>
              <p class="mt-2 min-h-[100px] border border-black p-3 bg-[#FAF7F3] leading-relaxed whitespace-pre-wrap text-[12px]">{{ requirements || '별도 요구사항 없음' }}</p>
            </div>

            <div class="absolute bottom-10 left-0 right-0 text-center space-y-2">
              <p>작성일: {{ todayText }}</p>
              <p class="text-sm font-bold tracking-widest">요청자: (주) 몬순</p>
            </div>
          </div>
        </section>
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
                  <th class="p-2 border" style="border-color: #DDD7CE; color: #3D3529 !important;">선택</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="p in filteredProducts" :key="p.id" class="border-b transition-colors hover-row" style="border-color: #E8E3D8; color: #6B5F50 !important;">
                  <td class="p-3 text-xs font-bold" style="color: #9A8C7E !important; border-color: #E8E3D8;">{{ PRODUCT_CATEGORY[p.variety || p.category] || (p.variety || p.category) }}</td>
                  <td class="p-3 font-bold text-left" style="color: #3D3529 !important; border-color: #E8E3D8;">{{ p.name }}</td>
                  <td class="p-3 font-bold" style="color: #6B5F50 !important; border-color: #E8E3D8;">{{ p.unit }}</td>
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
                  <td colspan="4" class="p-10 italic text-center" style="color: #9A8C7E;">검색 결과가 없습니다.</td>
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

/* Custom Dropdown Shadow */
.shadow-xl {
  box-shadow: 0 10px 25px -5px rgba(61, 53, 41, 0.1), 0 8px 10px -6px rgba(61, 53, 41, 0.1);
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
