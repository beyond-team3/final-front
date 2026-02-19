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
  if (!search) return source
  return source.filter((item) => {
    const text = [item.id, item.orderId, item.client?.name].join(' ').toLowerCase()
    return text.includes(search)
  })
})

// ── 모달 상태 ──────────────────────────────────────────
const showModal = ref(false)
const modalStep = ref(1) // 1: 거래처 검색, 2: 계약 선택
const clientSearch = ref('')
const selectedClient = ref(null)

// 거래처 목록 (documentStore에서 가져오거나, store에 없으면 빈 배열)
const clientMaster = computed(() => documentStore.clientMaster || [])

const filteredClients = computed(() => {
  const q = clientSearch.value.trim().toLowerCase()
  if (!q) return clientMaster.value
  return clientMaster.value.filter((c) =>
      c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)
  )
})

// 선택된 거래처의 계약 목록
const contractsForClient = computed(() => {
  if (!selectedClient.value) return []
  return documentStore.contracts?.filter(
      (c) => c.client?.id === selectedClient.value.id
  ) || []
})

function openModal() {
  showModal.value = true
  modalStep.value = 1
  clientSearch.value = ''
  selectedClient.value = null
}

function closeModal() {
  showModal.value = false
}

function selectClient(client) {
  selectedClient.value = client
  modalStep.value = 2
}

function goBackToStep1() {
  modalStep.value = 1
  selectedClient.value = null
}

function selectContract(contract) {
  closeModal()
  router.push(`/documents/invoice/new?contractId=${contract.id}&clientId=${selectedClient.value.id}`)
}

function goToInvoiceDetail(invoice) {
  const mode = invoice.status === 'pending' ? 'pending' : 'issued'
  router.push(`/documents/invoice/new?mode=${mode}&id=${invoice.id}`)
}
</script>

<template>
  <section>
    <PageHeader title="청구서 관리" subtitle="청구서 목록을 조회하고 상태를 관리합니다.">
      <template #actions>
        <button
            v-if="isSalesRep"
            type="button"
            class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            @click="openModal"
        >
          + 신규 청구서 발행
        </button>
      </template>
    </PageHeader>

    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <!-- 탭 + 검색 -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <button
            type="button"
            class="rounded px-3 py-2 text-sm font-semibold"
            :class="tab === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'"
            @click="tab = 'pending'"
        >
          발행 대기 ({{ documentStore.pendingInvoices.length }})
        </button>
        <button
            type="button"
            class="rounded px-3 py-2 text-sm font-semibold"
            :class="tab === 'issued' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'"
            @click="tab = 'issued'"
        >
          발행 완료 ({{ documentStore.issuedInvoices.length }})
        </button>
        <input
            v-model="keyword"
            type="text"
            class="ml-auto h-10 w-full rounded border border-slate-300 px-3 text-sm md:w-72"
            placeholder="청구번호/주문번호/거래처 검색"
        />
      </div>

      <!-- 목록 테이블 -->
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
            <th class="px-3 py-2"></th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              @click="goToInvoiceDetail(invoice)"
          >
            <td class="px-3 py-2 font-semibold text-blue-600">{{ invoice.id }}</td>
            <td class="px-3 py-2">{{ invoice.orderId }}</td>
            <td class="px-3 py-2">{{ invoice.client?.name }}</td>
            <td class="px-3 py-2">
                <span
                    class="rounded-full px-2 py-0.5 text-xs font-bold"
                    :class="invoice.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'"
                >
                  {{ invoice.status === 'pending' ? '발행 대기' : '발행 완료' }}
                </span>
            </td>
            <td class="px-3 py-2">{{ invoice.createdAt || '—' }}</td>
            <td class="px-3 py-2 text-right">{{ invoice.totalAmount?.toLocaleString() }}원</td>
            <td class="px-3 py-2 text-slate-300">›</td>
          </tr>
          <tr v-if="filteredInvoices.length === 0">
            <td colspan="7" class="px-3 py-8 text-center text-slate-400">청구서 데이터가 없습니다.</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         신규 청구서 발행 모달
    ══════════════════════════════════════════ -->
    <Teleport to="body">
      <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          @click.self="closeModal"
      >
        <div class="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" style="max-height: calc(100vh - 80px)">

          <!-- 모달 헤더 -->
          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p class="text-lg font-extrabold text-slate-900">신규 청구서 발행</p>
              <p class="mt-0.5 text-xs text-slate-400">
                {{ modalStep === 1 ? '거래처를 먼저 선택하세요.' : '발행할 계약을 선택하세요.' }}
              </p>
            </div>
            <button type="button" class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" @click="closeModal">✕</button>
          </div>

          <!-- 스텝 인디케이터 -->
          <div class="flex items-center gap-0 border-b border-slate-100 bg-slate-50 px-6 py-3">
            <div class="flex items-center gap-2">
              <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors"
                  :class="modalStep === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'"
              >
                {{ modalStep === 1 ? '1' : '✓' }}
              </div>
              <span class="text-sm font-semibold" :class="modalStep === 1 ? 'text-blue-600' : 'text-green-600'">거래처 검색</span>
            </div>
            <div class="mx-3 h-px flex-1 bg-slate-200"></div>
            <div class="flex items-center gap-2">
              <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors"
                  :class="modalStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'"
              >
                2
              </div>
              <span class="text-sm font-semibold" :class="modalStep === 2 ? 'text-blue-600' : 'text-slate-400'">계약 선택</span>
            </div>
          </div>

          <!-- 모달 바디 -->
          <div class="flex-1 overflow-y-auto px-6 py-5">

            <!-- STEP 1: 거래처 검색 -->
            <template v-if="modalStep === 1">
              <p class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">거래처 검색</p>
              <div class="relative mb-4">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input
                    v-model="clientSearch"
                    type="text"
                    class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="거래처명을 입력하세요"
                    autofocus
                />
              </div>

              <div class="overflow-hidden rounded-xl border border-slate-200">
                <div
                    v-for="client in filteredClients"
                    :key="client.id"
                    class="flex cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-blue-50"
                    @click="selectClient(client)"
                >
                  <div>
                    <p class="text-sm font-bold text-slate-800">{{ client.name }}</p>
                    <p class="mt-0.5 text-xs text-slate-400">{{ client.code }} · {{ client.contact }}</p>
                  </div>
                  <span class="text-slate-300 transition-transform group-hover:translate-x-1">›</span>
                </div>
                <div v-if="filteredClients.length === 0" class="px-4 py-8 text-center text-sm text-slate-400">
                  검색 결과가 없습니다.
                </div>
              </div>
            </template>

            <!-- STEP 2: 계약 선택 -->
            <template v-if="modalStep === 2">
              <!-- 선택된 거래처 배너 -->
              <div class="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                <span class="text-lg">🏢</span>
                <span class="flex-1 text-sm font-bold text-blue-700">{{ selectedClient?.name }}</span>
                <button type="button" class="text-xs font-semibold text-blue-500 hover:text-blue-700" @click="goBackToStep1">← 변경</button>
              </div>

              <p class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">계약 선택</p>

              <div class="flex flex-col gap-3">
                <div
                    v-for="contract in contractsForClient"
                    :key="contract.id"
                    class="cursor-pointer rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm"
                    @click="selectContract(contract)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-bold text-slate-800">{{ contract.id }}</p>
                    <span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-600">발행 가능</span>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                    <span>기간 {{ contract.startDate }} ~ {{ contract.endDate }}</span>
                    <span>청구 주기 {{ contract.billingCycle }}</span>
                  </div>
                </div>

                <div v-if="contractsForClient.length === 0" class="py-8 text-center text-sm text-slate-400">
                  이 거래처에 연결된 계약이 없습니다.
                </div>
              </div>
            </template>

          </div>

          <!-- 모달 푸터 -->
          <div class="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" @click="closeModal">
              취소
            </button>
          </div>

        </div>
      </div>
    </Teleport>
  </section>
</template>