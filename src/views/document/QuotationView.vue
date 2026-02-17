<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useHistoryStore } from '@/stores/history'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const historyStore = useHistoryStore()

const selectedRequestId = ref(route.query.requestId || '')
const selectedHistoryId = ref('')
const clientId = ref('')
const memo = ref('')
const lineItems = ref([])

const selectedRequest = computed(() => documentStore.getRequestById(selectedRequestId.value) || null)
const selectedClient = computed(() => documentStore.clientMaster.find((item) => item.id === clientId.value) || null)

watch(selectedRequest, (request) => {
  if (!request) return
  clientId.value = request.client.id
  selectedHistoryId.value = request.historyId || ''
  memo.value = request.requirements || ''
  lineItems.value = request.items.map((item) => ({ ...item }))
}, { immediate: true })

const pipelineOptions = computed(() => historyStore.getPipelinesByClient(clientId.value))

onMounted(() => {
  void historyStore.ensureLoaded()
})

const addItem = (product) => {
  lineItems.value.push({
    productId: product.id,
    variety: product.variety,
    name: product.name,
    quantity: 1,
    unit: product.unit,
    unitPrice: product.unitPrice,
    amount: product.unitPrice,
  })
}

const updateItem = (item) => {
  item.quantity = Number(item.quantity || 1)
  if (item.quantity < 1) item.quantity = 1
  item.unitPrice = Number(item.unitPrice || 0)
  item.amount = item.quantity * item.unitPrice
}

const removeItem = (index) => lineItems.value.splice(index, 1)

const total = computed(() => lineItems.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))

const validityText = computed(() => {
  const now = new Date()
  now.setDate(now.getDate() + 30)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

const submit = () => {
  if (!selectedClient.value || lineItems.value.length === 0) {
    window.alert('거래처/상품을 확인해주세요.')
    return
  }

  if (!selectedRequest.value && !selectedHistoryId.value) {
    window.alert('연결할 파이프라인을 선택해주세요.')
    return
  }

  const quotation = documentStore.createQuotation({
    requestId: selectedRequest.value?.id,
    historyId: selectedRequest.value?.historyId || selectedHistoryId.value || null,
    client: selectedClient.value,
    items: lineItems.value,
    memo: memo.value,
  })

  router.push(`/documents/contract?quotationId=${quotation.id}`)
}
</script>

<template>
  <section>
    <div class="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
      <p class="text-sm text-slate-500">영업 문서 작성 &gt; <span class="font-semibold text-slate-800">견적서 작성</span></p>
      <button
        type="button"
        class="rounded bg-slate-500 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        @click="router.push('/documents/create')"
      >
        뒤로가기
      </button>
    </div>

    <div class="grid gap-5 xl:grid-cols-[1.2fr_500px]">
      <section class="space-y-5">
        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-base font-bold text-slate-800">거래처 정보</h3>
          <div class="grid gap-3 md:grid-cols-3">
            <select v-model="selectedRequestId" class="h-10 rounded border border-slate-300 px-2 text-sm">
              <option value="">요청서 없음(신규)</option>
              <option v-for="request in documentStore.quotationRequests" :key="request.id" :value="request.id">
                {{ request.id }} | {{ request.client.name }}
              </option>
            </select>
            <select v-model="clientId" class="h-10 rounded border border-slate-300 px-2 text-sm">
              <option value="">거래처 선택</option>
              <option v-for="client in documentStore.clientMaster" :key="client.id" :value="client.id">{{ client.name }}</option>
            </select>
            <select v-model="selectedHistoryId" class="h-10 rounded border border-slate-300 px-2 text-sm">
              <option value="">파이프라인 선택</option>
              <option v-for="pipeline in pipelineOptions" :key="pipeline.id" :value="pipeline.id">
                {{ pipeline.id }} | {{ pipeline.stage }} | {{ pipeline.clientName }}
              </option>
            </select>
            <input v-model="memo" type="text" class="h-10 rounded border border-slate-300 px-2 text-sm" placeholder="내부 비고">
          </div>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-800">작성 품목</h3>
          </div>

          <div class="mb-4 grid gap-2 md:grid-cols-3">
            <button
              v-for="product in documentStore.productMaster"
              :key="product.id"
              type="button"
              class="rounded border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50"
              @click="addItem(product)"
            >
              {{ product.name }} ({{ product.unitPrice.toLocaleString() }}원/{{ product.unit }})
            </button>
          </div>

          <div class="overflow-hidden rounded border border-slate-300">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-slate-50 text-left text-slate-700">
                  <th class="px-2 py-2">품종명</th>
                  <th class="px-2 py-2">상품명</th>
                  <th class="px-2 py-2">수량</th>
                  <th class="px-2 py-2">단위</th>
                  <th class="px-2 py-2">단가</th>
                  <th class="px-2 py-2">작업</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in lineItems" :key="`${item.productId}-${index}`" class="border-t border-slate-100">
                  <td class="px-2 py-2">{{ item.variety }}</td>
                  <td class="px-2 py-2">{{ item.name }}</td>
                  <td class="px-2 py-2"><input v-model.number="item.quantity" min="1" type="number" class="h-8 w-16 rounded border border-slate-300 px-2" @input="updateItem(item)"></td>
                  <td class="px-2 py-2">{{ item.unit }}</td>
                  <td class="px-2 py-2"><input v-model.number="item.unitPrice" min="0" type="number" class="h-8 w-24 rounded border border-slate-300 px-2" @input="updateItem(item)"></td>
                  <td class="px-2 py-2"><button type="button" class="rounded bg-red-500 px-2 py-1 text-xs text-white" @click="removeItem(index)">삭제</button></td>
                </tr>
                <tr v-if="lineItems.length === 0">
                  <td colspan="6" class="px-3 py-8 text-center text-slate-400">상품 정보를 입력해 주세요.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="mt-4 text-right text-base font-bold text-slate-800">총 합계: {{ total.toLocaleString() }} 원</p>
        </article>

        <button type="button" class="w-full rounded bg-emerald-500 px-4 py-4 text-base font-semibold text-white hover:bg-emerald-600" @click="submit">
          견적서 발행 완료
        </button>
      </section>

      <section class="rounded-lg bg-[#525659] p-4">
        <div class="min-h-[700px] rounded bg-white p-8 text-[11px] text-black shadow [font-family:serif]">
          <div class="mb-5 border-b-2 border-slate-700 pb-3 text-center">
            <h1 class="text-xl font-bold">견 적 서</h1>
          </div>

          <div class="mb-5 flex items-start justify-between">
            <div>
              <p class="mb-1 text-[13px]">수신: <span class="border-b border-black font-bold">{{ selectedClient?.name || '(빈값)' }}</span> 귀하</p>
              <p>담당: <span>{{ selectedClient?.contact || '(빈값)' }}</span></p>
              <p>견적 유효기간: <span class="font-bold text-blue-700">{{ validityText }}</span> (30일)</p>
            </div>
            <div class="h-14 w-14 border border-black pt-2 text-center">인</div>
          </div>

          <table class="my-4 w-full border-collapse text-center">
            <thead>
              <tr class="bg-slate-100">
                <th class="border border-slate-300 p-1.5">품종</th>
                <th class="border border-slate-300 p-1.5">상품명</th>
                <th class="border border-slate-300 p-1.5">수량</th>
                <th class="border border-slate-300 p-1.5">단위</th>
                <th class="border border-slate-300 p-1.5">단가</th>
                <th class="border border-slate-300 p-1.5">금액</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in lineItems" :key="`preview-${index}`">
                <td class="border border-slate-300 p-1.5">{{ item.variety }}</td>
                <td class="border border-slate-300 p-1.5">{{ item.name }}</td>
                <td class="border border-slate-300 p-1.5">{{ item.quantity }}</td>
                <td class="border border-slate-300 p-1.5">{{ item.unit }}</td>
                <td class="border border-slate-300 p-1.5">{{ Number(item.unitPrice).toLocaleString() }}</td>
                <td class="border border-slate-300 p-1.5">{{ Number(item.amount).toLocaleString() }}</td>
              </tr>
              <tr v-if="lineItems.length === 0">
                <td colspan="6" class="border border-slate-300 p-8 text-slate-400">상품 정보를 입력해 주세요.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-slate-200 font-bold">
                <td colspan="5" class="border border-slate-300 p-1.5">합 계</td>
                <td class="border border-slate-300 p-1.5 text-right">{{ total.toLocaleString() }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>
