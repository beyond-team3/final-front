<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'
import { getInvoices, getContractsByClient } from '@/api/document'

const router = useRouter()
const documentStore = useDocumentStore()
const authStore = useAuthStore()

const normalizeInvoiceStatus = (status) => {
  const raw = String(status || '').trim().toUpperCase()
  if (raw === 'PUBLISHED') return 'PUBLISHED'
  if (raw === 'PAID')      return 'PAID'
  if (raw === 'CANCELED')  return 'CANCELED'
  return 'DRAFT'
}

// ─── 청구서 목록 로드 ────────────────────────────────────────────
const isLoading  = ref(false)
const invoices   = ref([])
const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const isAdmin    = computed(() => authStore.currentRole === ROLES.ADMIN)
const canCreateInvoice = computed(() => isSalesRep.value || isAdmin.value)
const manualDraftSubmittingId = ref(null)
const modalError = ref('')

async function fetchInvoices() {
  isLoading.value = true
  try {
    const res = await getInvoices()
    const raw  = res?.data?.data ?? res?.data ?? []
    const list = Array.isArray(raw) ? raw : []

    invoices.value = list.map((inv) => ({
      ...inv,
      id:          inv.invoiceId ?? inv.id,
      status:      normalizeInvoiceStatus(inv.status),
      // ✅ InvoiceListResponse 필드 그대로 사용 (from() 오버로드 수정 후 채워짐)
      contractCode: inv.contractCode ?? null,
      clientName:   inv.clientName   ?? null,
      contractId:   inv.contractId   ?? null,
      clientId:     inv.clientId     ?? null,
      totalAmount:  inv.totalAmount  != null ? Number(inv.totalAmount) : null,
      issueDate:    inv.invoiceDate   ?? inv.createdAt ?? null,
    }))
  } catch (e) {
    console.error('[InvoiceListView] fetchInvoices error:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchInvoices())

// ─── 탭 / 검색 ──────────────────────────────────────────────────
const tab     = ref('pending')
const keyword = ref('')

const pendingInvoices  = computed(() => invoices.value.filter(i => i.status === 'DRAFT'))
const issuedInvoices   = computed(() => invoices.value.filter(i => i.status === 'PUBLISHED' || i.status === 'PAID'))
const canceledInvoices = computed(() => invoices.value.filter(i => i.status === 'CANCELED'))

const filteredInvoices = computed(() => {
  const source = tab.value === 'issued'
      ? issuedInvoices.value
      : [...pendingInvoices.value, ...canceledInvoices.value]

  const search = keyword.value.trim().toLowerCase()
  if (!search) return source
  return source.filter(item =>
      [item.invoiceCode, item.contractCode, item.clientName].join(' ').toLowerCase().includes(search)
  )
})

// ─── 상세 이동 ──────────────────────────────────────────────────
function goToInvoiceDetail(invoice) {
  const mode = (invoice.status === 'PUBLISHED' || invoice.status === 'PAID') ? 'issued' : 'pending'
  router.push(
      `/documents/invoice/new?mode=${mode}&id=${invoice.id}` +
      (invoice.contractId ? `&contractId=${invoice.contractId}` : '') +
      (invoice.clientId   ? `&clientId=${invoice.clientId}`     : '')
  )
}

// ─── 신규 청구서 모달 ────────────────────────────────────────────
const showModal                  = ref(false)
const modalStep                  = ref(1)
const clientSearch               = ref('')
const selectedClient             = ref(null)
const contractsForSelectedClient = ref([])
const isLoadingContracts         = ref(false)
const alreadyIssuedContractId    = ref(null)

const clientMaster    = computed(() => documentStore.clientMaster || [])
const filteredClients = computed(() => {
  const q = clientSearch.value.trim().toLowerCase()
  if (!q) return clientMaster.value
  return clientMaster.value.filter(
      c => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)
  )
})

function openModal() {
  showModal.value = true
  modalStep.value = 1
  clientSearch.value = ''
  selectedClient.value = null
  contractsForSelectedClient.value = []
  alreadyIssuedContractId.value = null
  modalError.value = ''
}
function closeModal() { showModal.value = false }
function goBackToStep1() {
  modalStep.value = 1
  selectedClient.value = null
  contractsForSelectedClient.value = []
  alreadyIssuedContractId.value = null
  modalError.value = ''
}

async function selectClient(client) {
  selectedClient.value = client
  modalStep.value = 2
  isLoadingContracts.value = true
  try {
    const res = await getContractsByClient(client.id)
    const raw = res?.data?.data ?? res?.data ?? []
    contractsForSelectedClient.value = Array.isArray(raw) ? raw : []
    modalError.value = ''
  } catch (e) {
    console.error('[InvoiceListView] getContractsByClient error:', e)
    contractsForSelectedClient.value = []
    modalError.value = '계약 정보를 불러오지 못했습니다.'
  } finally {
    isLoadingContracts.value = false
  }
}

function selectContract(contract) {
  if (!isSalesRep.value) {
    return
  }

  const hasActive = invoices.value.some(inv =>
      String(inv.contractId) === String(contract.id) &&
      (inv.status === 'DRAFT' || inv.status === 'PUBLISHED')
  )
  if (hasActive) { alreadyIssuedContractId.value = contract.id; return }
  alreadyIssuedContractId.value = null
  closeModal()
  router.push(`/documents/invoice/new?contractId=${contract.id}&clientId=${selectedClient.value.id}`)
}

function nextIssueDateLabel(contract) {
  if (contract.nextIssueDate) return contract.nextIssueDate
  if (contract.billingDay)    return `매월 ${contract.billingDay}일`
  return '—'
}

async function createManualDraft(contract, event) {
  event?.stopPropagation?.()

  if (!isAdmin.value || manualDraftSubmittingId.value) {
    return
  }

  manualDraftSubmittingId.value = contract.id
  modalError.value = ''

  try {
    const created = await documentStore.createManualInvoiceDraft(contract.id)
    await fetchInvoices()

    if (!created) {
      throw new Error('청구서 초안 생성 결과가 없습니다.')
    }

    closeModal()
    window.alert(`수동 청구서 초안이 생성되었습니다. (${created.invoiceCode || created.displayCode || created.id})`)
    router.push(
      `/documents/invoice/new?mode=pending&id=${created.invoiceId || created.id}` +
      (created.contractId ? `&contractId=${created.contractId}` : '') +
      (created.clientId ? `&clientId=${created.clientId}` : '')
    )
  } catch (e) {
    console.error('[InvoiceListView] createManualDraft error:', e)
    modalError.value = documentStore.error || e?.response?.data?.message || e?.message || '수동 청구서 초안 생성에 실패했습니다.'
  } finally {
    manualDraftSubmittingId.value = null
  }
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">

      <!-- 헤더 -->
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm font-semibold" style="color: #3D3529;">청구서 관리</p>
        <button
            v-if="canCreateInvoice"
            type="button"
            class="rounded px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 shadow-sm"
            style="background-color: #C8622A;"
            @click="openModal"
        >
          {{ isAdmin ? '+ 청구서 테스트' : '+ 신규 청구서 발행' }}
        </button>
      </div>

      <!-- 목록 카드 -->
      <div class="rounded-lg border p-5 animate-in" style="background-color: #F7F3EC; border-color: #DDD7CE;">

        <div class="mb-4 flex flex-wrap items-center gap-2">
          <button type="button"
                  class="rounded px-3 py-2 text-sm font-semibold transition-colors"
                  :style="tab==='pending' ? 'background-color:#C8622A;color:white;' : 'background-color:#EFEADF;color:#6B5F50;'"
                  @click="tab='pending'">
            발행 대기 ({{ pendingInvoices.length + canceledInvoices.length }})
          </button>
          <button type="button"
                  class="rounded px-3 py-2 text-sm font-semibold transition-colors"
                  :style="tab==='issued' ? 'background-color:#C8622A;color:white;' : 'background-color:#EFEADF;color:#6B5F50;'"
                  @click="tab='issued'">
            발행 완료 ({{ issuedInvoices.length }})
          </button>
          <input v-model="keyword" type="text"
                 class="ml-auto h-10 w-full rounded border px-3 text-sm outline-none md:w-72"
                 style="border-color:#DDD7CE;background-color:#FAF7F3;color:#3D3529;"
                 placeholder="청구번호/계약코드/거래처 검색" />
        </div>

        <div v-if="isLoading" class="py-12 text-center text-sm" style="color: #9A8C7E;">불러오는 중...</div>

        <div v-else class="overflow-hidden rounded border" style="border-color: #DDD7CE;">
          <table class="min-w-full text-sm">
            <thead class="text-left" style="background-color:#EFEADF;color:#6B5F50;">
            <tr>
              <th class="px-3 py-2">청구번호</th>
              <th class="px-3 py-2">계약코드</th>
              <th class="px-3 py-2">거래처</th>
              <th class="px-3 py-2">상태</th>
              <th class="px-3 py-2">발행일</th>
              <th class="px-3 py-2 text-right">총 금액</th>
              <th class="px-3 py-2"></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="invoice in filteredInvoices" :key="invoice.id"
                class="cursor-pointer border-t transition-colors hover-row"
                style="border-color: #E8E3D8;"
                @click="goToInvoiceDetail(invoice)">
              <td class="px-3 py-2 font-semibold" style="color:#C8622A;">
                {{ invoice.invoiceCode || '—' }}
              </td>
              <td class="px-3 py-2" style="color:#6B5F50;">
                {{ invoice.contractCode || '—' }}
              </td>
              <td class="px-3 py-2 font-semibold" style="color:#3D3529;">
                {{ invoice.clientName || '—' }}
              </td>
              <td class="px-3 py-2">
                  <span class="rounded-full px-2 py-0.5 text-xs font-bold"
                        :style="invoice.status==='CANCELED'
                          ? 'background-color:#E8E3D8;color:#9A8C7E;'
                          : (invoice.status==='PUBLISHED'||invoice.status==='PAID')
                          ? 'background-color:#C8D4A0;color:#3D3529;'
                          : 'background-color:#FAE8C8;color:#8C6B30;'">
                    {{ invoice.status==='CANCELED' ? '취소'
                      : invoice.status==='PAID'      ? '수납 완료'
                          : invoice.status==='PUBLISHED' ? '발행 완료' : '발행 대기' }}
                  </span>
              </td>
              <td class="px-3 py-2" style="color:#9A8C7E;">{{ invoice.issueDate || '—' }}</td>
              <td class="px-3 py-2 text-right font-semibold" style="color:#3D3529;">
                {{ invoice.totalAmount != null ? invoice.totalAmount.toLocaleString() + '원' : '—' }}
              </td>
              <td class="px-3 py-2" style="color:#BFB3A5;">›</td>
            </tr>
            <tr v-if="filteredInvoices.length === 0">
              <td colspan="7" class="px-3 py-8 text-center" style="color:#BFB3A5;">청구서 데이터가 없습니다.</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 신규 청구서 모달 -->
    <Teleport to="body">
      <div v-if="showModal"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
           @click.self="closeModal">
        <div class="flex w-full max-w-lg flex-col rounded-lg border shadow-2xl"
             style="background-color:#F7F3EC;border-color:#DDD7CE;max-height:calc(100vh - 80px);">

          <!-- 모달 헤더 -->
          <div class="flex items-start justify-between border-b px-6 py-5"
               style="border-color:#E8E3D8;background-color:#C8622A;">
            <div>
              <p class="text-lg font-extrabold text-white">{{ isAdmin ? '수동 청구서 초안 생성' : '신규 청구서 발행' }}</p>
              <p class="mt-0.5 text-xs" style="color:rgba(255,255,255,0.75);">
                {{ modalStep === 1 ? '거래처를 먼저 선택하세요.' : (isAdmin ? '초안을 생성할 계약을 선택하세요.' : '발행할 계약을 선택하세요.') }}
              </p>
            </div>
            <button type="button"
                    class="rounded p-1 text-white hover:opacity-75 transition-opacity text-xl font-bold"
                    @click="closeModal">×</button>
          </div>

          <!-- 스텝 인디케이터 -->
          <div class="flex items-center border-b px-6 py-3"
               style="border-color:#E8E3D8;background-color:#EFEADF;">
            <div class="flex items-center gap-2">
              <div class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                   :style="modalStep===1 ? 'background-color:#C8622A;' : 'background-color:#7A8C42;'">
                {{ modalStep === 1 ? '1' : '✓' }}
              </div>
              <span class="text-sm font-semibold"
                    :style="modalStep===1 ? 'color:#C8622A;' : 'color:#7A8C42;'">거래처 검색</span>
            </div>
            <div class="mx-3 h-px flex-1" style="background-color:#DDD7CE;"></div>
            <div class="flex items-center gap-2">
              <div class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                   :style="modalStep===2 ? 'background-color:#C8622A;color:white;' : 'background-color:#DDD7CE;color:#9A8C7E;'">
                2
              </div>
              <span class="text-sm font-semibold"
                    :style="modalStep===2 ? 'color:#C8622A;' : 'color:#9A8C7E;'">계약 선택</span>
            </div>
          </div>

          <!-- 모달 바디 -->
          <div class="flex-1 overflow-y-auto px-6 py-5">

            <template v-if="modalStep === 1">
              <p class="mb-3 text-xs font-bold uppercase tracking-wider" style="color:#9A8C7E;">거래처 검색</p>
              <input v-model="clientSearch" type="text" autofocus
                     class="mb-4 h-10 w-full rounded border px-3 text-sm outline-none"
                     style="border-color:#DDD7CE;background-color:#FAF7F3;color:#3D3529;"
                     placeholder="거래처명을 입력하세요" />
              <div class="overflow-hidden rounded border" style="border-color:#DDD7CE;">
                <div v-for="client in filteredClients" :key="client.id"
                     class="flex cursor-pointer items-center justify-between border-b px-4 py-3 last:border-b-0 transition-colors"
                     style="border-color:#E8E3D8;background-color:#FAF7F3;"
                     @mouseenter="$event.currentTarget.style.backgroundColor='#EFEADF'"
                     @mouseleave="$event.currentTarget.style.backgroundColor='#FAF7F3'"
                     @click="selectClient(client)">
                  <div>
                    <p class="text-sm font-bold" style="color:#3D3529;">{{ client.name }}</p>
                    <p class="mt-0.5 text-xs" style="color:#9A8C7E;">{{ client.code }} · {{ client.contact }}</p>
                  </div>
                  <span style="color:#BFB3A5;">›</span>
                </div>
                <div v-if="filteredClients.length === 0"
                     class="px-4 py-8 text-center text-sm"
                     style="color:#BFB3A5;background-color:#FAF7F3;">검색 결과가 없습니다.</div>
              </div>
            </template>

            <template v-if="modalStep === 2">
              <div class="mb-4 flex items-center gap-3 rounded border px-4 py-2.5"
                   style="border-color:#DDD7CE;background-color:#EFEADF;">
                <span class="flex-1 text-sm font-bold" style="color:#3D3529;">{{ selectedClient?.name }}</span>
                <button type="button" class="text-xs font-semibold hover:opacity-75"
                        style="color:#C8622A;" @click="goBackToStep1">← 변경</button>
              </div>

              <p class="mb-3 text-xs font-bold uppercase tracking-wider" style="color:#9A8C7E;">계약 선택</p>
              <p v-if="isAdmin" class="mb-3 rounded border px-3 py-2 text-xs font-semibold" style="border-color:#F2D3BF;background-color:#FFF3EB;color:#C8622A;">
                관리자 전용: billingCycle 대기 없이 수동 청구서 초안을 즉시 생성할 수 있습니다.
              </p>
              <p v-if="modalError" class="mb-3 rounded border px-3 py-2 text-xs font-semibold" style="border-color:#E1B4B4;background-color:#F8E3E3;color:#9D4B4B;">
                {{ modalError }}
              </p>

              <div v-if="isLoadingContracts" class="py-8 text-center text-sm" style="color:#9A8C7E;">
                계약 정보를 불러오는 중...
              </div>

              <div v-else class="flex flex-col gap-3">
                <div v-for="contract in contractsForSelectedClient" :key="contract.id"
                     class="rounded border p-4 transition-all"
                     :style="alreadyIssuedContractId === contract.id
                       ? 'border-color:#B85C5C;background-color:#FAE8C8;cursor:not-allowed;'
                       : `border-color:#DDD7CE;background-color:#FAF7F3;${isSalesRep ? 'cursor:pointer;' : 'cursor:default;'}`"
                     @mouseenter="isSalesRep && alreadyIssuedContractId !== contract.id && ($event.currentTarget.style.backgroundColor='#EFEADF')"
                     @mouseleave="isSalesRep && alreadyIssuedContractId !== contract.id && ($event.currentTarget.style.backgroundColor='#FAF7F3')"
                     @click="isSalesRep && selectContract(contract)">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-bold" style="color:#3D3529;">
                      {{ contract.contractCode || contract.code || `계약 #${contract.id}` }}
                    </p>
                    <span v-if="alreadyIssuedContractId === contract.id"
                          class="rounded-full px-2 py-0.5 text-xs font-bold"
                          style="background-color:#B85C5C;color:white;">이미 발행됨</span>
                    <span v-else class="rounded-full px-2 py-0.5 text-xs font-bold"
                          :style="isAdmin ? 'background-color:#D6DDE6;color:#35526B;' : 'background-color:#C8D4A0;color:#3D3529;'">
                      {{ isAdmin ? '초안 생성 가능' : '발행 가능' }}
                    </span>
                  </div>
                  <p v-if="alreadyIssuedContractId === contract.id"
                     class="mt-2 text-xs font-semibold" style="color:#B85C5C;">
                    이 계약에는 이미 발행 대기 또는 발행 완료된 청구서가 있어 신규 발행이 불가합니다.
                  </p>
                  <div v-else class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" style="color:#9A8C7E;">
                    <span>기간 {{ contract.startDate }} ~ {{ contract.endDate }}</span>
                    <span>청구 주기 {{ contract.billingCycle }}</span>
                    <span>다음 발행일 {{ nextIssueDateLabel(contract) }}</span>
                  </div>
                  <p v-if="isSalesRep && alreadyIssuedContractId !== contract.id"
                     class="mt-3 text-xs font-semibold" style="color:#6B5F50;">
                    계약을 클릭하면 청구서 작성 화면으로 이동합니다.
                  </p>
                  <div v-if="isAdmin && alreadyIssuedContractId !== contract.id" class="mt-3 flex justify-end">
                    <button
                      type="button"
                      class="rounded px-3 py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90"
                      style="background-color:#7A8C42;"
                      :disabled="manualDraftSubmittingId === contract.id"
                      @click="createManualDraft(contract, $event)"
                    >
                      {{ manualDraftSubmittingId === contract.id ? '생성 중...' : '수동 청구서 초안 생성' }}
                    </button>
                  </div>
                </div>
                <div v-if="contractsForSelectedClient.length === 0"
                     class="py-8 text-center text-sm" style="color:#BFB3A5;">
                  이 거래처에 연결된 활성 계약이 없습니다.
                </div>
              </div>
            </template>
          </div>

          <!-- 모달 푸터 -->
          <div class="flex justify-end border-t px-6 py-3"
               style="border-color:#E8E3D8;background-color:#EFEADF;">
            <button type="button"
                    class="rounded border px-4 py-2 text-sm font-semibold hover:opacity-90"
                    style="border-color:#DDD7CE;background-color:transparent;color:#6B5F50;"
                    @click="closeModal">닫기</button>
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
  to   { opacity: 1; transform: translateY(0); }
}
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #F7F3EC; }
::-webkit-scrollbar-thumb { background: #DDD7CE; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #C8622A; }
input::placeholder { color: #9A8C7E; font-style: italic; }
button:active { transform: scale(0.98); }
.hover-row:hover { background-color: #EFEADF; }
</style>
