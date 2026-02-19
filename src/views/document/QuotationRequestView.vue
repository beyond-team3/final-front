<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

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

const todayText = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`
})

// --- [로직] ---

// 품종 옵션 추출
const varietyOptions = computed(() => {
  const varieties = documentStore.productMaster?.map(p => p.variety) || []
  return ['전체', ...new Set(varieties.filter(v => v))]
})

// 모달 내 상품 필터링
const filteredProducts = computed(() => {
  return documentStore.productMaster?.filter(p => {
    const matchVariety = varietyFilter.value === '전체' || p.variety === varietyFilter.value
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
      variety: product.variety,
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
      ? documentStore.clientMaster.find((client) => client.name === authStore.me?.name)
      || documentStore.clientMaster.find((client) => String(authStore.me?.name || '').includes(client.name))
      || documentStore.clientMaster[0]
      : documentStore.clientMaster[0]

  if (!defaultClient) {
    window.alert('거래처 정보를 찾을 수 없습니다.')
    return
  }

  const request = documentStore.createQuotationRequest({
    client: defaultClient,
    items: selectedItems.value,
    requirements: requirements.value,
  })

  if (isClient.value) {
    router.push('/documents/create')
    return
  }

  router.push(`/documents/quotation?requestId=${request.id}`)
}
</script>

<template>
  <section>
    <div class="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
      <p class="text-sm text-slate-500">영업 문서 작성 &gt; <span class="font-semibold text-slate-800">견적 요청서 작성</span></p>
      <button
          type="button"
          class="rounded bg-slate-500 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          @click="router.push('/documents/create')"
      >
        뒤로가기
      </button>
    </div>

    <div class="grid gap-5 xl:grid-cols-[1.2fr_480px]">
      <section class="space-y-5">
        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-bold text-slate-800">작성 품목</h3>
            <button
                type="button"
                class="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 shadow-sm"
                @click="showProductModal = true"
            >
              + 상품 검색 및 추가
            </button>
          </div>

          <div class="overflow-hidden rounded border border-slate-300">
            <table class="w-full border-collapse text-sm">
              <thead>
              <tr class="bg-slate-50 text-left text-slate-700">
                <th class="px-3 py-2">품종명</th>
                <th class="px-3 py-2">상품명</th>
                <th class="px-3 py-2">수량</th>
                <th class="px-3 py-2">작업</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in selectedItems" :key="item.uid" class="border-t border-slate-100">
                <td class="px-3 py-2">{{ item.variety }}</td>
                <td class="px-3 py-2">{{ item.name }}</td>
                <td class="px-3 py-2">
                  <input v-model.number="item.quantity" type="number" min="1" class="h-8 w-20 rounded border border-slate-300 px-2" @input="updateQty(item)">
                </td>
                <td class="px-3 py-2">
                  <button type="button" class="rounded bg-red-500 px-2 py-1 text-xs text-white" @click="removeItem(item.uid)">삭제</button>
                </td>
              </tr>
              <tr v-if="selectedItems.length === 0">
                <td colspan="4" class="px-3 py-8 text-center text-slate-400">상품을 선택해주세요.</td>
              </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="text-lg font-bold text-slate-800">추가 요구사항</h3>
          <textarea
              v-model="requirements"
              class="mt-3 h-24 w-full rounded border border-slate-300 p-3 text-sm"
              placeholder="기타 요구사항 입력"
          />
        </article>

        <button
            type="button"
            class="w-full rounded bg-emerald-500 px-4 py-4 text-base font-semibold text-white hover:bg-emerald-600"
            @click="submit"
        >
          견적 요청서 제출
        </button>
      </section>

      <section class="rounded-lg bg-[#525659] p-4">
        <div class="min-h-[700px] rounded bg-white p-8 text-[11px] text-black shadow">
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
            <tr v-for="item in selectedItems" :key="`preview-${item.uid}`">
              <td class="border border-slate-300 p-1.5">{{ item.variety }}</td>
              <td class="border border-slate-300 p-1.5">{{ item.name }}</td>
              <td class="border border-slate-300 p-1.5">{{ item.quantity }}</td>
              <td class="border border-slate-300 p-1.5">{{ item.unit }}</td>
            </tr>
            <tr v-if="selectedItems.length === 0">
              <td colspan="4" class="border border-slate-300 p-10 text-slate-400">상품을 선택해주세요.</td>
            </tr>
            </tbody>
          </table>

          <div class="mt-4">
            <strong>[요구사항]</strong>
            <p class="mt-1 min-h-12 border border-slate-200 p-2">{{ requirements || '없음' }}</p>
          </div>

          <div class="mt-8 text-right">
            <p>작성일: {{ todayText }}</p>
            <p class="mt-2">요청자: (주) 그린상사</p>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showProductModal" class="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white w-[800px] rounded-lg shadow-2xl overflow-hidden border">
        <div class="bg-[#2c3e50] text-white p-4 flex justify-between items-center font-bold">
          <h3>상품 검색 및 선택</h3>
          <button @click="showProductModal = false" class="text-2xl hover:text-gray-200 transition-colors">&times;</button>
        </div>
        <div class="p-5">
          <div class="flex gap-3 mb-4">
            <select v-model="varietyFilter" class="border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 font-bold">
              <option v-for="opt in varietyOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input
                v-model="modalSearchInput"
                type="text"
                placeholder="상품명으로 검색"
                class="flex-1 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-300"
            >
          </div>
          <div class="max-h-[450px] overflow-y-auto border rounded bg-white">
            <table class="w-full text-sm text-center">
              <thead class="bg-gray-100 sticky top-0 font-bold text-slate-600">
              <tr>
                <th class="p-2 border">품종</th>
                <th class="p-2 border">상품명</th>
                <th class="p-2 border">단위</th>
                <th class="p-2 border">선택</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="p in filteredProducts" :key="p.id" class="border-b hover:bg-slate-50 transition-colors">
                <td class="p-3 text-xs text-slate-500 font-bold">{{ p.variety }}</td>
                <td class="p-3 font-bold text-slate-800 text-left">{{ p.name }}</td>
                <td class="p-3 text-slate-600 font-bold">{{ p.unit }}</td>
                <td class="p-3">
                  <button
                      class="bg-[#3498db] text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-600 shadow-sm"
                      @click="addProduct(p)"
                  >
                    추가
                  </button>
                </td>
              </tr>
              <tr v-if="filteredProducts.length === 0">
                <td colspan="4" class="p-10 text-gray-400 italic text-center">검색 결과가 없습니다.</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>