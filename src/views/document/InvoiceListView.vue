<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const router = useRouter()
const documentStore = useDocumentStore()
const authStore = useAuthStore()

const normalizeInvoiceStatus = (status) => {
  const raw = String(status || '').trim().toUpperCase()
  if (raw === 'ISSUED') return 'ISSUED'
  if (raw === 'CANCELED') return 'CANCELED'
  return 'DRAFT'
}

onMounted(() => {
  void documentStore.fetchDocuments()
})

const tab = ref('draft')
const keyword = ref('')

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)

const filteredInvoices = computed(() => {
  const source = tab.value === 'issued'
      ? documentStore.issuedInvoices
      : tab.value === 'canceled'
          ? documentStore.canceledInvoices
          : documentStore.pendingInvoices
  const search = keyword.value.trim().toLowerCase()
  if (!search) return source
  return source.filter((item) => {
    const text = [item.id, item.orderId, item.client?.name].join(' ').toLowerCase()
    return text.includes(search)
  })
})

const showModal = ref(false)
const modalStep = ref(1)
const clientSearch = ref('')
const selectedClient = ref(null)

const clientMaster = computed(() => documentStore.clientMaster || [])

const filteredClients = computed(() => {
  const q = clientSearch.value.trim().toLowerCase()
  if (!q) return clientMaster.value
  return clientMaster.value.filter((c) =>
      c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)
  )
})

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
  const mode = normalizeInvoiceStatus(invoice.status) === 'ISSUED' ? 'issued' : 'pending'
  router.push(`/documents/invoice/new?mode=${mode}&id=${invoice.id}`)
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">

      <!-- 헤더 -->
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm font-semibold" style="color: #3D3529;">청구서 관리</p>
        <button
            v-if="isSalesRep"
            type="button"
            class="rounded px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 shadow-sm"
            style="background-color: #C8622A;"
            @click="openModal"
        >
          + 신규 청구서 발행
        </button>
      </div>

      <!-- 목록 카드 -->
      <div class="rounded-lg border p-5 animate-in" style="background-color: #F7F3EC; border-color: #DDD7CE;">

        <!-- 탭 + 검색 -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <button
              type="button"
              class="rounded px-3 py-2 text-sm font-semibold transition-colors"
              :style="tab === 'draft'
              ? 'background-color: #C8622A; color: white;'
              : 'background-color: #EFEADF; color: #6B5F50;'"
              @click="tab = 'draft'"
          >
            초안 ({{ documentStore.pendingInvoices.length }})
          </button>
          <button
              type="button"
              class="rounded px-3 py-2 text-sm font-semibold transition-colors"
              :style="tab === 'issued'
              ? 'background-color: #C8622A; color: white;'
              : 'background-color: #EFEADF; color: #6B5F50;'"
              @click="tab = 'issued'"
          >
            발행 완료 ({{ documentStore.issuedInvoices.length }})
          </button>
          <button
              type="button"
              class="rounded px-3 py-2 text-sm font-semibold transition-colors"
              :style="tab === 'canceled'
              ? 'background-color: #C8622A; color: white;'
              : 'background-color: #EFEADF; color: #6B5F50;'"
              @click="tab = 'canceled'"
          >
            취소 ({{ documentStore.canceledInvoices.length }})
          </button>
          <input
              v-model="keyword"
              type="text"
              class="ml-auto h-10 w-full rounded border px-3 text-sm outline-none md:w-72"
              style="border-color: #DDD7CE; background-color: #FAF7F3; color: #3D3529;"
              placeholder="청구번호/주문번호/거래처 검색"
          />
        </div>

        <!-- 목록 테이블 -->
        <div class="overflow-hidden rounded border" style="border-color: #DDD7CE;">
          <table class="min-w-full text-sm">
            <thead class="text-left" style="background-color: #EFEADF; color: #6B5F50;">
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
                class="cursor-pointer border-t transition-colors hover-row"
                style="border-color: #E8E3D8;"
                @click="goToInvoiceDetail(invoice)"
            >
              <td class="px-3 py-2 font-semibold" style="color: #C8622A;">{{ invoice.id }}</td>
              <td class="px-3 py-2" style="color: #6B5F50;">{{ invoice.orderId }}</td>
              <td class="px-3 py-2 font-semibold" style="color: #3D3529;">{{ invoice.client?.name }}</td>
              <td class="px-3 py-2">
                <span
                    class="rounded-full px-2 py-0.5 text-xs font-bold"
                    :style="normalizeInvoiceStatus(invoice.status) === 'CANCELED'
                    ? 'background-color: #E8E3D8; color: #9A8C7E;'
                    : normalizeInvoiceStatus(invoice.status) === 'ISSUED'
                      ? 'background-color: #C8D4A0; color: #3D3529;'
                      : 'background-color: #FAE8C8; color: #8C6B30;'"
                >
                  {{ normalizeInvoiceStatus(invoice.status) === 'CANCELED' ? '취소' : normalizeInvoiceStatus(invoice.status) === 'ISSUED' ? '발행 완료' : '초안' }}
                </span>
              </td>
              <td class="px-3 py-2" style="color: #9A8C7E;">{{ invoice.createdAt || '—' }}</td>
              <td class="px-3 py-2 text-right font-semibold" style="color: #3D3529;">{{ invoice.totalAmount?.toLocaleString() }}원</td>
              <td class="px-3 py-2" style="color: #BFB3A5;">›</td>
            </tr>
            <tr v-if="filteredInvoices.length === 0">
              <td colspan="7" class="px-3 py-8 text-center" style="color: #BFB3A5;">청구서 데이터가 없습니다.</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 신규 청구서 발행 모달 -->
    <Teleport to="body">
      <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          @click.self="closeModal"
      >
        <div class="flex w-full max-w-lg flex-col rounded-lg border shadow-2xl" style="background-color: #F7F3EC; border-color: #DDD7CE; max-height: calc(100vh - 80px);">

          <!-- 모달 헤더 -->
          <div class="flex items-start justify-between border-b px-6 py-5" style="border-color: #E8E3D8; background-color: #C8622A;">
            <div>
              <p class="text-lg font-extrabold text-white">신규 청구서 발행</p>
              <p class="mt-0.5 text-xs" style="color: rgba(255,255,255,0.75);">
                {{ modalStep === 1 ? '거래처를 먼저 선택하세요.' : '발행할 계약을 선택하세요.' }}
              </p>
            </div>
            <button type="button" class="rounded p-1 text-white hover:opacity-75 transition-opacity text-xl font-bold" @click="closeModal">×</button>
          </div>

          <!-- 스텝 인디케이터 -->
          <div class="flex items-center gap-0 border-b px-6 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
            <div class="flex items-center gap-2">
              <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white transition-colors"
                  :style="modalStep === 1 ? 'background-color: #C8622A;' : 'background-color: #7A8C42;'"
              >
                {{ modalStep === 1 ? '1' : '✓' }}
              </div>
              <span class="text-sm font-semibold" :style="modalStep === 1 ? 'color: #C8622A;' : 'color: #7A8C42;'">거래처 검색</span>
            </div>
            <div class="mx-3 h-px flex-1" style="background-color: #DDD7CE;"></div>
            <div class="flex items-center gap-2">
              <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors"
                  :style="modalStep === 2 ? 'background-color: #C8622A; color: white;' : 'background-color: #DDD7CE; color: #9A8C7E;'"
              >
                2
              </div>
              <span class="text-sm font-semibold" :style="modalStep === 2 ? 'color: #C8622A;' : 'color: #9A8C7E;'">계약 선택</span>
            </div>
          </div>

          <!-- 모달 바디 -->
          <div class="flex-1 overflow-y-auto px-6 py-5">

            <!-- STEP 1: 거래처 검색 -->
            <template v-if="modalStep === 1">
              <p class="mb-3 text-xs font-bold uppercase tracking-wider" style="color: #9A8C7E;">거래처 검색</p>
              <input
                  v-model="clientSearch"
                  type="text"
                  class="mb-4 h-10 w-full rounded border px-3 text-sm outline-none"
                  style="border-color: #DDD7CE; background-color: #FAF7F3; color: #3D3529;"
                  placeholder="거래처명을 입력하세요"
                  autofocus
              />

              <div class="overflow-hidden rounded border" style="border-color: #DDD7CE;">
                <div
                    v-for="client in filteredClients"
                    :key="client.id"
                    class="flex cursor-pointer items-center justify-between border-b px-4 py-3 last:border-b-0 transition-colors"
                    style="border-color: #E8E3D8;"
                    :style="'background-color: #FAF7F3;'"
                    @mouseenter="$event.currentTarget.style.backgroundColor='#EFEADF'"
                    @mouseleave="$event.currentTarget.style.backgroundColor='#FAF7F3'"
                    @click="selectClient(client)"
                >
                  <div>
                    <p class="text-sm font-bold" style="color: #3D3529;">{{ client.name }}</p>
                    <p class="mt-0.5 text-xs" style="color: #9A8C7E;">{{ client.code }} · {{ client.contact }}</p>
                  </div>
                  <span style="color: #BFB3A5;">›</span>
                </div>
                <div v-if="filteredClients.length === 0" class="px-4 py-8 text-center text-sm" style="color: #BFB3A5; background-color: #FAF7F3;">
                  검색 결과가 없습니다.
                </div>
              </div>
            </template>

            <!-- STEP 2: 계약 선택 -->
            <template v-if="modalStep === 2">
              <div class="mb-4 flex items-center gap-3 rounded border px-4 py-2.5" style="border-color: #DDD7CE; background-color: #EFEADF;">
                <span class="flex-1 text-sm font-bold" style="color: #3D3529;">{{ selectedClient?.name }}</span>
                <button type="button" class="text-xs font-semibold transition-colors hover:opacity-75" style="color: #C8622A;" @click="goBackToStep1">← 변경</button>
              </div>

              <p class="mb-3 text-xs font-bold uppercase tracking-wider" style="color: #9A8C7E;">계약 선택</p>

              <div class="flex flex-col gap-3">
                <div
                    v-for="contract in contractsForClient"
                    :key="contract.id"
                    class="cursor-pointer rounded border p-4 transition-all"
                    style="border-color: #DDD7CE; background-color: #FAF7F3;"
                    @mouseenter="$event.currentTarget.style.backgroundColor='#EFEADF'"
                    @mouseleave="$event.currentTarget.style.backgroundColor='#FAF7F3'"
                    @click="selectContract(contract)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-bold" style="color: #3D3529;">{{ contract.id }}</p>
                    <span class="rounded-full px-2 py-0.5 text-xs font-bold" style="background-color: #C8D4A0; color: #3D3529;">발행 가능</span>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" style="color: #9A8C7E;">
                    <span>기간 {{ contract.startDate }} ~ {{ contract.endDate }}</span>
                    <span>청구 주기 {{ contract.billingCycle }}</span>
                  </div>
                </div>

                <div v-if="contractsForClient.length === 0" class="py-8 text-center text-sm" style="color: #BFB3A5;">
                  이 거래처에 연결된 계약이 없습니다.
                </div>
              </div>
            </template>

          </div>

          <!-- 모달 푸터 -->
          <div class="flex justify-end border-t px-6 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
            <button
                type="button"
                class="rounded border px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90"
                style="border-color: #DDD7CE; background-color: transparent; color: #6B5F50;"
                @click="closeModal"
            >
              취소
            </button>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #F7F3EC; }
::-webkit-scrollbar-thumb { background: #DDD7CE; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #C8622A; }
input::placeholder { color: #9A8C7E; font-style: italic; }
button:active { transform: scale(0.98); }
</style>