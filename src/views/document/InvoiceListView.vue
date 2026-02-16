<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const router = useRouter()
const documentStore = useDocumentStore()
const authStore = useAuthStore()

const tab = ref('pending')
const keyword = ref('')

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)

const filteredInvoices = computed(() => {
  const source = tab.value === 'issued' ? documentStore.issuedInvoices : documentStore.pendingInvoices
  const search = keyword.value.trim().toLowerCase()

  if (!search) {
    return source
  }

  return source.filter((item) => {
    const text = [item.id, item.orderId, item.client?.name].join(' ').toLowerCase()
    return text.includes(search)
  })
})
</script>

<template>
  <section>
    <PageHeader title="청구서 관리" subtitle="청구서 목록을 조회하고 상태를 관리합니다.">
      <template #actions>
        <button
          v-if="isSalesRep"
          type="button"
          class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="router.push('/documents/invoice')"
        >
          신규 청구서
        </button>
      </template>
    </PageHeader>

    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" class="rounded px-3 py-2 text-sm font-semibold" :class="tab === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'" @click="tab = 'pending'">
          발행 대기 ({{ documentStore.pendingInvoices.length }})
        </button>
        <button type="button" class="rounded px-3 py-2 text-sm font-semibold" :class="tab === 'issued' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'" @click="tab = 'issued'">
          발행 완료 ({{ documentStore.issuedInvoices.length }})
        </button>
        <input v-model="keyword" type="text" class="ml-auto h-10 w-full rounded border border-slate-300 px-3 text-sm md:w-72" placeholder="청구번호/주문번호/거래처 검색" />
      </div>

      <div class="overflow-hidden rounded-lg border border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-100 text-left text-slate-700">
            <tr>
              <th class="px-3 py-2">청구번호</th>
              <th class="px-3 py-2">주문번호</th>
              <th class="px-3 py-2">거래처</th>
              <th class="px-3 py-2">상태</th>
              <th class="px-3 py-2">발행일</th>
              <th class="px-3 py-2 text-right">총 금액</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="border-t border-slate-100">
              <td class="px-3 py-2 font-semibold text-slate-800">{{ invoice.id }}</td>
              <td class="px-3 py-2">{{ invoice.orderId }}</td>
              <td class="px-3 py-2">{{ invoice.client?.name }}</td>
              <td class="px-3 py-2">{{ invoice.status }}</td>
              <td class="px-3 py-2">{{ invoice.createdAt }}</td>
              <td class="px-3 py-2 text-right">{{ invoice.totalAmount.toLocaleString() }}원</td>
            </tr>
            <tr v-if="filteredInvoices.length === 0"><td colspan="6" class="px-3 py-8 text-center text-slate-400">청구서 데이터가 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
