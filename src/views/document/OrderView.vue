<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import OrderModal from '@/components/document/OrderModal.vue'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const authStore = useAuthStore()

const showContractModal = ref(false)
const selectedContractId = ref(route.query.contractId || '')
const memo = ref('')
const deliveryDate = ref(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10))
const lineItems = ref([])

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)
const selectedContract = computed(() => documentStore.getContractById(selectedContractId.value) || null)

watch(selectedContract, (contract) => {
  if (!contract || isClient.value) {
    return
  }

  lineItems.value = contract.items.map((item) => ({ ...item }))
}, { immediate: true })

const total = computed(() => lineItems.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))

const selectContract = (contract) => {
  selectedContractId.value = contract.id
}

const addProduct = (product) => {
  const found = lineItems.value.find((item) => item.productId === product.id)
  if (found) {
    found.quantity += 1
    found.amount = found.quantity * found.unitPrice
    return
  }

  lineItems.value.push({
    productId: product.id,
    variety: product.variety,
    name: product.name,
    unit: product.unit,
    unitPrice: product.unitPrice,
    quantity: 1,
    amount: product.unitPrice,
  })
}

const updateQty = (item) => {
  item.quantity = Number(item.quantity || 1)
  if (item.quantity < 1) item.quantity = 1
  item.amount = item.quantity * item.unitPrice
}

const removeItem = (index) => {
  lineItems.value.splice(index, 1)
}

const submitOrder = () => {
  if (!isClient.value && (!selectedContract.value || lineItems.value.length === 0)) {
    window.alert('계약서를 선택해주세요.')
    return
  }

  if (isClient.value && lineItems.value.length === 0) {
    window.alert('상품을 1개 이상 선택해주세요.')
    return
  }

  const client = isClient.value
    ? documentStore.clientMaster[0]
    : selectedContract.value.client

  documentStore.createOrder({
    contractId: isClient.value ? null : selectedContract.value.id,
    client,
    items: lineItems.value,
    deliveryDate: deliveryDate.value,
    memo: memo.value,
  })

  router.push(isClient.value ? '/documents/history' : '/documents/invoice')
}
</script>

<template>
  <section>
    <PageHeader
      :title="isClient ? '주문서 작성' : '주문서'"
      :subtitle="isClient ? '필요 품목을 선택해 주문서를 작성합니다.' : '계약서 기반으로 주문서를 작성하거나 조회합니다.'"
    >
      <template #actions>
        <button
          v-if="isSalesRep"
          type="button"
          class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="showContractModal = true"
        >
          계약 선택
        </button>
      </template>
    </PageHeader>

    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <p class="text-xs font-semibold text-slate-500">선택 계약번호</p>
          <p class="mt-1 text-sm font-bold text-slate-800">{{ isClient ? '-' : (selectedContract?.id || '-') }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500">거래처</p>
          <p class="mt-1 text-sm font-bold text-slate-800">{{ isClient ? documentStore.clientMaster[0].name : (selectedContract?.client?.name || '-') }}</p>
        </div>
        <label class="text-sm font-semibold text-slate-700">
          납기일
          <input v-model="deliveryDate" type="date" class="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-sm font-normal" :disabled="!isSalesRep && !isClient" />
        </label>
      </div>

      <div v-if="isClient" class="mt-5 grid gap-2 md:grid-cols-2">
        <button
          v-for="product in documentStore.productMaster"
          :key="product.id"
          type="button"
          class="rounded border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50"
          @click="addProduct(product)"
        >
          <p class="font-semibold text-blue-700">{{ product.variety }}</p>
          <p class="font-bold text-slate-800">{{ product.name }}</p>
          <p class="text-xs text-slate-500">{{ product.unit }} / {{ product.unitPrice.toLocaleString() }}원</p>
        </button>
      </div>

      <div class="mt-5 overflow-hidden rounded-lg border border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-100 text-left text-slate-700">
            <tr>
              <th class="px-3 py-2">품종</th>
              <th class="px-3 py-2">상품명</th>
              <th class="px-3 py-2">수량</th>
              <th class="px-3 py-2">단가</th>
              <th class="px-3 py-2 text-right">금액</th>
              <th v-if="isClient" class="px-3 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in lineItems" :key="`${item.productId}-${index}`" class="border-t border-slate-100">
              <td class="px-3 py-2">{{ item.variety }}</td>
              <td class="px-3 py-2 font-semibold text-slate-800">{{ item.name }}</td>
              <td class="px-3 py-2">
                <template v-if="isClient">
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    class="h-8 w-20 rounded border border-slate-300 px-2"
                    @input="updateQty(item)"
                  >
                  {{ item.unit }}
                </template>
                <template v-else>
                  {{ item.quantity }}{{ item.unit }}
                </template>
              </td>
              <td class="px-3 py-2">{{ Number(item.unitPrice).toLocaleString() }}원</td>
              <td class="px-3 py-2 text-right">{{ Number(item.amount).toLocaleString() }}원</td>
              <td v-if="isClient" class="px-3 py-2">
                <button type="button" class="rounded bg-red-500 px-2 py-1 text-xs text-white" @click="removeItem(index)">삭제</button>
              </td>
            </tr>
            <tr v-if="lineItems.length === 0"><td :colspan="isClient ? 6 : 5" class="px-3 py-8 text-center text-slate-400">주문 품목이 없습니다.</td></tr>
          </tbody>
        </table>
      </div>

      <label class="mt-4 block text-sm font-semibold text-slate-700">
        메모
        <textarea v-model="memo" class="mt-1 h-20 w-full rounded border border-slate-300 p-2 text-sm font-normal" :disabled="!isSalesRep && !isClient" />
      </label>

      <div class="mt-5 flex items-center justify-between">
        <p class="text-sm font-bold text-slate-800">총 주문 금액: {{ total.toLocaleString() }}원</p>
        <button
          v-if="isSalesRep || isClient"
          type="button"
          class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="submitOrder"
        >
          주문서 생성
        </button>
      </div>
    </div>

    <OrderModal v-model="showContractModal" :contracts="documentStore.contracts" @select="selectContract" />
  </section>
</template>
