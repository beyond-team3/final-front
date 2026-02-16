<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()

const selectedQuotationId = ref(route.query.quotationId || '')
const clientId = ref('')
const startDate = ref(new Date().toISOString().slice(0, 10))
const endDate = ref(new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10))
const billingCycle = ref('월')
const specialTerms = ref('')
const lineItems = ref([])

const selectedQuotation = computed(() => documentStore.getQuotationById(selectedQuotationId.value) || null)
const selectedClient = computed(() => documentStore.clientMaster.find((item) => item.id === clientId.value) || null)

watch(selectedQuotation, (quotation) => {
  if (!quotation) return
  clientId.value = quotation.client.id
  lineItems.value = quotation.items.map((item) => ({ ...item }))
}, { immediate: true })

const total = computed(() => lineItems.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))

const periodText = computed(() => `${startDate.value || '____-__-__'} ~ ${endDate.value || '____-__-__'}`)

const submit = () => {
  if (!selectedClient.value || lineItems.value.length === 0) {
    window.alert('견적서 정보와 품목을 확인해주세요.')
    return
  }

  const contract = documentStore.createContract({
    quotationId: selectedQuotation.value?.id,
    client: selectedClient.value,
    items: lineItems.value,
    startDate: startDate.value,
    endDate: endDate.value,
    billingCycle: billingCycle.value,
    specialTerms: specialTerms.value,
  })

  router.push(`/documents/order?contractId=${contract.id}`)
}
</script>

<template>
  <section>
    <div class="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
      <p class="text-sm text-slate-500">영업 문서 작성 &gt; <span class="font-semibold text-slate-800">계약서 작성</span></p>
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
          <h3 class="mb-3 text-base font-bold text-slate-800">선택된 정보 (거래처 및 견적)</h3>
          <div class="grid gap-2 md:grid-cols-2">
            <select v-model="selectedQuotationId" class="h-10 rounded border border-slate-300 px-2 text-sm md:col-span-2">
              <option value="">견적서 선택</option>
              <option v-for="quotation in documentStore.quotations" :key="quotation.id" :value="quotation.id">{{ quotation.id }} | {{ quotation.client.name }}</option>
            </select>
            <input :value="selectedClient?.code || '-'" readonly class="h-10 rounded border border-slate-300 bg-slate-50 px-2 text-sm">
            <input :value="selectedClient?.name || '-'" readonly class="h-10 rounded border border-slate-300 bg-slate-50 px-2 text-sm">
            <input :value="selectedClient?.contact || '-'" readonly class="h-10 rounded border border-slate-300 bg-slate-50 px-2 text-sm">
            <input :value="selectedQuotationId || '-'" readonly class="h-10 rounded border border-slate-300 bg-slate-50 px-2 text-sm">
          </div>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-base font-bold text-slate-800">계약 정보 설정</h3>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm text-slate-700">계약 시작일<input v-model="startDate" type="date" class="mt-1 h-10 w-full rounded border border-slate-300 px-2"></label>
            <label class="text-sm text-slate-700">계약 종료일<input v-model="endDate" type="date" class="mt-1 h-10 w-full rounded border border-slate-300 px-2"></label>
            <label class="text-sm text-slate-700 md:col-span-2">청구 주기
              <select v-model="billingCycle" class="mt-1 h-10 w-full rounded border border-slate-300 px-2">
                <option value="월">월 단위 청구</option>
                <option value="분기">분기 단위 청구</option>
                <option value="반기">반기 단위 청구</option>
              </select>
            </label>
            <label class="text-sm text-slate-700 md:col-span-2">특약 사항
              <textarea v-model="specialTerms" rows="3" class="mt-1 w-full rounded border border-slate-300 p-2"></textarea>
            </label>
          </div>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-base font-bold text-slate-800">계약 상품 명세</h3>
          <div class="overflow-hidden rounded border border-slate-300">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-slate-50 text-left text-slate-700">
                  <th class="px-2 py-2">상품명</th>
                  <th class="px-2 py-2">수량</th>
                  <th class="px-2 py-2">단위</th>
                  <th class="px-2 py-2">단가</th>
                  <th class="px-2 py-2">금액</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in lineItems" :key="`${item.productId}-${idx}`" class="border-t border-slate-100">
                  <td class="px-2 py-2">{{ item.name }}</td>
                  <td class="px-2 py-2">{{ item.quantity }}</td>
                  <td class="px-2 py-2">{{ item.unit }}</td>
                  <td class="px-2 py-2">{{ Number(item.unitPrice).toLocaleString() }}</td>
                  <td class="px-2 py-2">{{ Number(item.amount).toLocaleString() }}</td>
                </tr>
                <tr v-if="lineItems.length === 0">
                  <td colspan="5" class="px-3 py-8 text-center text-slate-400">상품이 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <button type="button" class="w-full rounded bg-emerald-500 px-4 py-4 text-base font-semibold text-white hover:bg-emerald-600" @click="submit">
          계약서 생성 완료
        </button>
      </section>

      <section class="rounded-lg bg-[#525659] p-4">
        <div class="relative min-h-[750px] rounded bg-white p-8 text-[11px] text-black shadow [font-family:serif]">
          <div class="mb-5 border-b-2 border-slate-700 pb-3 text-center">
            <h1 class="text-xl font-bold">물 품 공 급 계 약 서</h1>
          </div>

          <div class="mb-5 leading-7">
            <p><strong>계약상대자 (갑):</strong> <span class="border-b border-black">{{ selectedClient?.name || '(빈값)' }}</span></p>
            <p><strong>계약상대자 (을):</strong> (주) 종자월드</p>
            <p><strong>계약기간:</strong> {{ periodText }}</p>
            <p><strong>청구주기:</strong> {{ billingCycle }} 단위 청구</p>
          </div>

          <table class="my-4 w-full border-collapse text-center">
            <thead>
              <tr class="bg-slate-100">
                <th class="border border-slate-300 p-1.5">상품명</th>
                <th class="border border-slate-300 p-1.5">수량</th>
                <th class="border border-slate-300 p-1.5">단가</th>
                <th class="border border-slate-300 p-1.5">금액</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in lineItems" :key="`contract-preview-${idx}`">
                <td class="border border-slate-300 p-1.5">{{ item.name }}</td>
                <td class="border border-slate-300 p-1.5">{{ item.quantity }}</td>
                <td class="border border-slate-300 p-1.5">{{ Number(item.unitPrice).toLocaleString() }}</td>
                <td class="border border-slate-300 p-1.5">{{ Number(item.amount).toLocaleString() }}</td>
              </tr>
              <tr v-if="lineItems.length === 0">
                <td colspan="4" class="border border-slate-300 p-8 text-slate-400">품목 정보가 없습니다.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-slate-200 font-bold">
                <td colspan="3" class="border border-slate-300 p-1.5">총 계약 합계 (VAT 별도)</td>
                <td class="border border-slate-300 p-1.5 text-right">{{ total.toLocaleString() }}</td>
              </tr>
            </tfoot>
          </table>

          <div class="mt-5">
            <p><strong>[특약사항]</strong></p>
            <p class="mt-1 min-h-14 whitespace-pre-wrap italic">{{ specialTerms || '-' }}</p>
          </div>

          <div class="absolute bottom-10 left-0 right-0 text-center">
            <p>2026년 02월 13일</p>
            <p class="mt-4 text-sm font-bold">위 계약의 내용을 증명하기 위해 기명 날인함</p>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
