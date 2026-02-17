<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useDocumentStore } from '@/stores/document'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

const selectedOrderId = ref(route.query.orderId || '')
const selectedHistoryId = ref('')
const remarks = ref('')

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const selectedOrder = computed(() => documentStore.getOrderById(selectedOrderId.value) || null)
const selectedInvoices = computed(() => documentStore.invoices.filter((item) => item.orderId === selectedOrderId.value))

const supplyAmount = computed(() => selectedOrder.value?.totalAmount || 0)
const taxAmount = computed(() => Math.round(supplyAmount.value * 0.1))
const totalAmount = computed(() => supplyAmount.value + taxAmount.value)

watch(selectedOrder, (order) => {
  if (!order) {
    return
  }

  selectedHistoryId.value = order.historyId || ''
  remarks.value = `주문번호 ${order.id} 기준 청구서`
}, { immediate: true })

const pipelineOptions = computed(() => {
  const clientId = selectedOrder.value?.client?.id
  if (!clientId) {
    return []
  }
  return historyStore.getPipelinesByClient(clientId)
})

onMounted(() => {
  void historyStore.ensureLoaded()
})

const createInvoice = () => {
  if (!selectedOrder.value) {
    window.alert('주문서를 먼저 선택해주세요.')
    return
  }
  if (!selectedHistoryId.value) {
    window.alert('연결할 파이프라인을 선택해주세요.')
    return
  }

  documentStore.createInvoice({
    orderId: selectedOrder.value.id,
    historyId: selectedHistoryId.value,
    client: selectedOrder.value.client,
    items: selectedOrder.value.items,
    remarks: remarks.value,
    mode: 'pending',
  })

  router.push('/documents/invoices')
}
</script>

<template>
  <section>
    <PageHeader title="청구서" subtitle="주문서 기반으로 청구서를 생성/조회합니다.">
      <template #actions>
        <button
          type="button"
          class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="router.push('/documents/invoices')"
        >
          청구서 목록
        </button>
      </template>
    </PageHeader>

    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-sm font-semibold text-slate-700">
          주문서 선택
          <select v-model="selectedOrderId" class="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-sm font-normal">
            <option value="">주문서 선택</option>
            <option v-for="order in documentStore.orders" :key="order.id" :value="order.id">{{ order.id }} | {{ order.client.name }}</option>
          </select>
        </label>

        <div>
          <p class="text-xs font-semibold text-slate-500">거래처</p>
          <p class="mt-1 text-sm font-bold text-slate-800">{{ selectedOrder?.client?.name || '-' }}</p>
        </div>
        <label class="text-sm font-semibold text-slate-700 md:col-span-2">
          연결 파이프라인
          <select v-model="selectedHistoryId" class="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-sm font-normal">
            <option value="">파이프라인 선택</option>
            <option v-for="pipeline in pipelineOptions" :key="pipeline.id" :value="pipeline.id">
              {{ pipeline.id }} | {{ pipeline.stage }} | {{ pipeline.clientName }}
            </option>
          </select>
        </label>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <article class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">공급가액</p>
          <p class="mt-1 text-lg font-bold text-slate-800">{{ supplyAmount.toLocaleString() }}원</p>
        </article>
        <article class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">부가세</p>
          <p class="mt-1 text-lg font-bold text-slate-800">{{ taxAmount.toLocaleString() }}원</p>
        </article>
        <article class="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p class="text-xs text-blue-600">총 금액</p>
          <p class="mt-1 text-lg font-bold text-blue-700">{{ totalAmount.toLocaleString() }}원</p>
        </article>
      </div>

      <label class="mt-5 block text-sm font-semibold text-slate-700">
        비고
        <textarea v-model="remarks" class="mt-1 h-20 w-full rounded border border-slate-300 p-2 text-sm font-normal" :readonly="!isSalesRep" />
      </label>

      <div class="mt-5 flex justify-end" v-if="isSalesRep">
        <button
          type="button"
          class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="createInvoice"
        >
          청구서 생성
        </button>
      </div>

      <div class="mt-6 overflow-hidden rounded-lg border border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-100 text-left text-slate-700">
            <tr>
              <th class="px-3 py-2">청구번호</th>
              <th class="px-3 py-2">상태</th>
              <th class="px-3 py-2">발행일</th>
              <th class="px-3 py-2 text-right">총 금액</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in selectedInvoices" :key="invoice.id" class="border-t border-slate-100">
              <td class="px-3 py-2 font-semibold text-slate-800">{{ invoice.id }}</td>
              <td class="px-3 py-2">{{ invoice.status }}</td>
              <td class="px-3 py-2">{{ invoice.createdAt }}</td>
              <td class="px-3 py-2 text-right">{{ invoice.totalAmount.toLocaleString() }}원</td>
            </tr>
            <tr v-if="selectedInvoices.length === 0"><td colspan="4" class="px-3 py-8 text-center text-slate-400">생성된 청구서가 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
