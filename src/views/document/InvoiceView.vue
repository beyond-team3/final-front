<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'
import CedarCheckbox from '@/components/common/CedarCheckbox.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ModalBase from '@/components/common/ModalBase.vue'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

const pageMode = ref(route.query.mode || 'new')
const invoiceId = ref(route.query.id || null)
const contractId = ref(route.query.contractId || null)
const clientId = ref(route.query.clientId || null)
const showCancelModal = ref(false)
const cancelErrorMessage = ref('')

const normalizeInvoiceStatus = (status) => {
  const raw = String(status || '').trim().toUpperCase()
  if (['ISSUED', '발행', '발행완료'].includes(raw)) return 'ISSUED'
  if (['CANCELED', 'CANCELLED', 'CANCEL', '취소'].includes(raw)) return 'CANCELED'
  return 'DRAFT'
}

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const currentInvoice = computed(() =>
    invoiceId.value ? documentStore.getInvoiceById(String(invoiceId.value)) || null : null
)

const selectedContract = computed(() =>
    contractId.value ? documentStore.getContractById?.(contractId.value) || null : null
)

const selectedClientData = computed(() =>
    documentStore.clientMaster?.find((c) => c.id === clientId.value) || selectedContract.value?.client || null
)

const statementList = computed(() => {
  const resolvedContractId = contractId.value
      || documentStore.invoices?.find((inv) => String(inv.id) === String(invoiceId.value))?.contractId
      || null

  if (!resolvedContractId) return []

  return documentStore.statements
      ?.filter((s) => String(s.contractId) === String(resolvedContractId))
      .map((s) => ({
        id: s.id,
        orderId: s.order_id,
        supply: s.supply_amount,
        status: s.status === '확정' ? 'available' : 'completed',
        issueDate: s.statement_date,
      })) || []
})

const selectedIds = ref(new Set())
const currentFilter = ref('all')
const remarks = ref('')

const filteredStatements = computed(() => {
  const list = statementList.value
  if (currentFilter.value === 'all') return list
  return list.filter((s) => s.status === currentFilter.value)
})

const availableFilteredStatements = computed(() =>
    filteredStatements.value.filter((s) => s.status === 'available')
)

const allAvailableSelected = computed(() => {
  if (availableFilteredStatements.value.length === 0) return false
  return availableFilteredStatements.value.every((s) => selectedIds.value.has(s.id))
})

const isAllIndeterminate = computed(() => {
  if (availableFilteredStatements.value.length === 0) return false
  const selectedCount = availableFilteredStatements.value.filter((s) => selectedIds.value.has(s.id)).length
  return selectedCount > 0 && selectedCount < availableFilteredStatements.value.length
})

function toggleAll(checked) {
  availableFilteredStatements.value.forEach((s) => {
    if (checked) selectedIds.value.add(s.id)
    else selectedIds.value.delete(s.id)
  })
  selectedIds.value = new Set(selectedIds.value)
}

function toggleStatement(id, checked) {
  if (checked) selectedIds.value.add(id)
  else selectedIds.value.delete(id)
  selectedIds.value = new Set(selectedIds.value)
}

const selectedStatements = computed(() =>
    statementList.value.filter((s) => selectedIds.value.has(s.id))
)

const supplyAmount = computed(() => selectedStatements.value.reduce((sum, s) => sum + s.supply, 0))
const taxAmount = computed(() => Math.round(supplyAmount.value * 0.1))
const totalAmount = computed(() => supplyAmount.value + taxAmount.value)

const canCreate = computed(() => selectedStatements.value.length > 0)
const currentInvoiceStatus = computed(() => {
  if (currentInvoice.value) return normalizeInvoiceStatus(currentInvoice.value.status)
  if (pageMode.value === 'issued') return 'ISSUED'
  return 'DRAFT'
})
const canCancelInvoice = computed(() =>
    isSalesRep.value && Boolean(invoiceId.value) && currentInvoiceStatus.value !== 'CANCELED'
)
const invoiceStatusHistory = computed(() =>
    Array.isArray(currentInvoice.value?.statusHistory) ? currentInvoice.value.statusHistory : []
)

watch(
    () => statementList.value,
    (list) => {
      if (pageMode.value === 'pending') {
        const ids = new Set(list.filter((s) => s.status === 'available').map((s) => s.id))
        selectedIds.value = ids
      }
    },
    { immediate: true }
)

watch(
    () => currentInvoice.value,
    (invoice) => {
      if (!invoice) return
      remarks.value = invoice.remarks || ''
      const selected = (invoice.items || []).map((item) => item.id).filter(Boolean)
      if (selected.length > 0) {
        selectedIds.value = new Set(selected)
      }
    },
    { immediate: true }
)

onMounted(async () => {
  void historyStore.ensureLoaded?.()

  // 기존 청구서 조회 시 상세 fetch
  if (invoiceId.value) {
    const detail = await documentStore.fetchInvoiceDetail(invoiceId.value)
    if (detail?.statements) {
      // 청구서에 포함된 명세서 목록으로 selectedIds 세팅
      const includedIds = new Set(
          detail.statements
              .filter(s => s.included)
              .map(s => s.statementId)
      )
      selectedIds.value = includedIds
    }
  }
})

const today = new Date()
const todayStr = today.toLocaleDateString('ko-KR')
const dueDate = new Date(today)
dueDate.setDate(dueDate.getDate() + 30)
const dueDateStr = dueDate.toLocaleDateString('ko-KR')
const invNo = computed(() =>
    `CINV-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`
)

const modeLabel = computed(() => {
  if (currentInvoiceStatus.value === 'CANCELED') return '취소된 청구서'
  if (currentInvoiceStatus.value === 'ISSUED') return '발행 완료'
  if (invoiceId.value) return '발행 대기'
  return '신규 청구서 발행'
})

const isReadOnly = computed(() => currentInvoiceStatus.value !== 'DRAFT')

const invoiceCardStatus = computed(() => {
  return currentInvoice.value?.status || 'DRAFT'
})

const statementCardStatus = computed(() => {
  if (currentInvoice.value?.status === 'CANCELED') return 'CANCELED'
  if (currentInvoice.value?.status === 'ISSUED') return 'ISSUED'
  if (invoiceId.value || selectedStatements.value.length > 0) return 'PUBLISHED'
  return 'DRAFT'
})

const showSuccess = ref(false)

function createInvoice() {
  if (!canCreate.value) return
  if (!selectedContract.value) {
    window.alert('계약 정보를 확인할 수 없습니다.')
    return
  }

  documentStore.createInvoice({
    contractId: selectedContract.value.id,
    client: selectedClientData.value,
    items: selectedStatements.value,
    remarks: remarks.value,
    mode: pageMode.value === 'pending' ? 'ISSUED' : 'DRAFT',
  })

  showSuccess.value = true
}

async function confirmInvoiceCancel() {
  cancelErrorMessage.value = ''
  if (!invoiceId.value) return

  const result = await documentStore.cancelInvoice(invoiceId.value)
  if (!result.success) {
    cancelErrorMessage.value = result.message || '청구서 취소에 실패했습니다.'
    return
  }

  showCancelModal.value = false
}

function onSuccessConfirm() {
  showSuccess.value = false
  router.push('/documents/invoices')
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">

      <!-- 브레드크럼 + 뒤로가기 -->
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm" style="color: #9A8C7E;">
          문서 작성 &gt;
          <router-link to="/documents/invoices" style="color: #C8622A;">청구서 관리</router-link>
          &gt;
          <span class="font-semibold" style="color: #3D3529;">{{ modeLabel }}</span>
        </p>
        <button
            type="button"
            class="rounded px-3 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            style="border: 1px solid #DDD7CE; background-color: transparent; color: #6B5F50;"
            @click="router.push('/documents/invoices')"
        >
          뒤로가기
        </button>
      </div>

      <!-- 모드 배너 -->
      <div class="mb-5 rounded border px-4 py-2.5 text-sm font-semibold" style="border-color: #DDD7CE; background-color: #F7F3EC; color: #6B5F50;">
        <span v-if="currentInvoiceStatus === 'CANCELED'">취소 완료 — 취소된 청구서입니다.</span>
        <span v-else-if="currentInvoiceStatus === 'ISSUED'">발행 완료 — 발행 완료된 청구서입니다. 수정할 수 없습니다.</span>
        <span v-else-if="invoiceId">발행 대기 — 명세서를 확인하고 청구서를 발행 확정하세요.</span>
        <span v-else>신규 청구서 발행 — 발행할 명세서를 선택하고 청구서를 생성하세요.</span>
      </div>

      <!-- 분할 레이아웃 -->
      <div class="grid gap-5 xl:grid-cols-[1.2fr_480px] animate-in">

        <!-- 왼쪽 패널 -->
        <section class="space-y-4">

          <!-- 계약 요약 카드 -->
          <article class="relative rounded-lg border p-5" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <StatusBadge class="absolute right-4 top-4" type="INVOICE" :status="invoiceCardStatus" />
            <div class="mb-3">
              <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">선택된 계약</p>
            </div>
            <div class="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">계약 번호</p>
                <p class="text-sm font-bold" style="color: #C8622A;">{{ selectedContract?.id || contractId || '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">거래처명</p>
                <p class="text-sm font-bold" style="color: #3D3529;">{{ selectedClientData?.name || '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">청구 주기</p>
                <p class="text-sm font-bold" style="color: #3D3529;">{{ selectedContract?.billingCycle || '—' }}</p>
              </div>
            </div>
          </article>

          <!-- 명세서 목록 -->
          <article class="relative overflow-hidden rounded-lg border" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <StatusBadge class="absolute right-4 top-3 z-10" type="INVOICE" :status="statementCardStatus" />
            <div class="flex items-center gap-2 border-b px-5 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
              <span class="text-sm font-bold" style="color: #3D3529;">명세서 목록</span>
              <span v-if="isReadOnly" class="ml-auto rounded border px-2 py-0.5 text-xs font-semibold" style="border-color: #DDD7CE; color: #9A8C7E; background-color: #FAF7F3;">읽기 전용</span>
              <span v-else-if="invoiceId" class="ml-auto rounded px-2 py-0.5 text-xs font-bold" style="background-color: #C8D4A0; color: #3D3529;">자동 선택됨</span>
            </div>

            <!-- 필터 -->
            <div class="flex items-center gap-2 border-b px-5 py-2.5" style="border-color: #E8E3D8; background-color: #F7F3EC;">
              <span class="text-xs font-semibold" style="color: #9A8C7E;">상태 필터</span>
              <button
                  v-for="f in [['all','전체'], ['available','청구 가능'], ['completed','청구 완료']]"
                  :key="f[0]"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                  :style="currentFilter === f[0]
                  ? 'border-color: #C8622A; background-color: #C8622A; color: white;'
                  : 'border-color: #DDD7CE; background-color: #FAF7F3; color: #6B5F50;'"
                  @click="currentFilter = f[0]"
              >
                {{ f[1] }}
                <span class="ml-1 font-bold">
                  {{ f[0] === 'all' ? statementList.length : statementList.filter(s => s.status === f[0]).length }}
                </span>
              </button>
            </div>

            <!-- 명세서 테이블 -->
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-left text-xs font-bold uppercase tracking-wider" style="background-color: #EFEADF; color: #6B5F50;">
                <tr>
                  <th class="w-10 px-4 py-2.5">
                    <CedarCheckbox
                        aria-label="명세서 전체 선택"
                        :disabled="isReadOnly"
                        :model-value="allAvailableSelected"
                        :indeterminate="isAllIndeterminate"
                        @update:model-value="toggleAll"
                    />
                  </th>
                  <th class="px-4 py-2.5">명세서 번호</th>
                  <th class="px-4 py-2.5">주문 번호</th>
                  <th class="px-4 py-2.5 text-right">공급가액</th>
                  <th class="px-4 py-2.5 text-center">상태</th>
                  <th class="px-4 py-2.5">발행일</th>
                </tr>
                </thead>
                <tbody>
                <tr
                    v-for="stmt in filteredStatements"
                    :key="stmt.id"
                    :id="`row_${stmt.id}`"
                    class="border-t"
                    style="border-color: #E8E3D8;"
                    :style="stmt.status === 'completed' ? 'opacity: 0.5;' : ''"
                >
                  <td class="px-4 py-3">
                    <CedarCheckbox
                        :aria-label="`${stmt.id} 선택`"
                        :disabled="isReadOnly || stmt.status === 'completed'"
                        :model-value="selectedIds.has(stmt.id)"
                        @update:model-value="(checked) => toggleStatement(stmt.id, checked)"
                    />
                  </td>
                  <td class="px-4 py-3">
                    <p class="font-bold" style="color: #3D3529;">{{ stmt.id }}</p>
                  </td>
                  <td class="px-4 py-3" style="color: #9A8C7E;">{{ stmt.orderId }}</td>
                  <td class="px-4 py-3 text-right font-semibold" style="color: #6B5F50;">
                    ₩{{ stmt.supply.toLocaleString() }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                        class="rounded-full px-2 py-0.5 text-xs font-bold"
                        :style="stmt.status === 'available'
                        ? 'background-color: #C8D4A0; color: #3D3529;'
                        : 'background-color: #E8E3D8; color: #9A8C7E;'"
                    >
                      {{ stmt.status === 'available' ? '청구 가능' : '청구 완료' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-xs" style="color: #9A8C7E;">{{ stmt.issueDate }}</td>
                </tr>
                <tr v-if="filteredStatements.length === 0">
                  <td colspan="6" class="px-4 py-10 text-center" style="color: #BFB3A5;">
                    조건에 맞는 명세서가 없습니다.
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </article>

          <!-- 상태 변경 이력 -->
          <article v-if="invoiceId" class="overflow-hidden rounded-lg border" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex items-center gap-2 border-b px-5 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
              <span class="text-sm font-bold" style="color: #3D3529;">상태 변경 이력</span>
            </div>
            <div class="p-5">
              <ul v-if="invoiceStatusHistory.length > 0" class="space-y-2 text-sm" style="color: #6B5F50;">
                <li
                    v-for="entry in invoiceStatusHistory"
                    :key="`${entry.timestamp}-${entry.actor}-${entry.previousStatus}`"
                    class="rounded border px-3 py-2"
                    style="border-color: #DDD7CE; background-color: #FAF7F3;"
                >
                  {{ new Date(entry.timestamp).toLocaleString('ko-KR') }} · {{ entry.actor }} · 이전 상태 {{ entry.previousStatus }}
                </li>
              </ul>
              <p v-else class="text-sm" style="color: #BFB3A5;">기록된 상태 변경 이력이 없습니다.</p>
            </div>
          </article>

          <!-- 선택 명세서 요약 -->
          <article class="overflow-hidden rounded-lg border" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex items-center gap-2 border-b px-5 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
              <span class="text-sm font-bold" style="color: #3D3529;">선택 명세서 요약</span>
              <span class="ml-auto text-xs" style="color: #9A8C7E;">실시간 계산</span>
            </div>
            <div class="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
              <div class="rounded border p-3" style="border-color: #DDD7CE; background-color: #FAF7F3;">
                <p class="text-[10px] font-bold uppercase tracking-wider" style="color: #9A8C7E;">선택된 명세서</p>
                <p class="mt-1 text-xl font-extrabold" style="color: #3D3529;">{{ selectedStatements.length }}<span class="text-sm font-bold"> 건</span></p>
              </div>
              <div class="rounded border p-3" style="border-color: #DDD7CE; background-color: #FAF7F3;">
                <p class="text-[10px] font-bold uppercase tracking-wider" style="color: #9A8C7E;">공급가액 합계</p>
                <p class="mt-1 text-xl font-extrabold" style="color: #3D3529;"><span class="text-sm font-bold">₩</span>{{ supplyAmount.toLocaleString() }}</p>
              </div>
              <div class="rounded border p-3" style="border-color: #DDD7CE; background-color: #FAF7F3;">
                <p class="text-[10px] font-bold uppercase tracking-wider" style="color: #9A8C7E;">부가세 (10%)</p>
                <p class="mt-1 text-xl font-extrabold" style="color: #3D3529;"><span class="text-sm font-bold">₩</span>{{ taxAmount.toLocaleString() }}</p>
              </div>
              <div class="rounded border p-3" style="border-color: #C8622A; background-color: #FAF7F3;">
                <p class="text-[10px] font-bold uppercase tracking-wider" style="color: #C8622A;">총 청구 금액</p>
                <p class="mt-1 text-xl font-extrabold" style="color: #C8622A;"><span class="text-sm font-bold">₩</span>{{ totalAmount.toLocaleString() }}</p>
              </div>
            </div>
          </article>

          <!-- 비고 -->
          <article class="overflow-hidden rounded-lg border" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <div class="flex items-center gap-2 border-b px-5 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
              <span class="text-sm font-bold" style="color: #3D3529;">비고 (Remarks)</span>
              <span class="ml-auto text-xs" style="color: #9A8C7E;">영업 히스토리 자동 기록</span>
            </div>
            <div class="p-5">
              <textarea
                  v-model="remarks"
                  :readonly="isReadOnly"
                  maxlength="500"
                  rows="3"
                  class="w-full resize-vertical rounded border p-3 text-sm outline-none transition"
                  style="border-color: #DDD7CE; background-color: #FAF7F3; color: #3D3529;"
                  :style="isReadOnly ? 'cursor: not-allowed; opacity: 0.6;' : ''"
                  placeholder="청구 관련 특이사항을 입력해 주세요."
                  @focus="$event.target.style.borderColor='#7A8C42'"
                  @blur="$event.target.style.borderColor='#DDD7CE'"
              />
              <div class="mt-2 flex items-center text-xs" style="color: #9A8C7E;">
                <span>작성된 비고는 영업 히스토리에 자동 기록됩니다.</span>
                <span class="ml-auto">{{ remarks.length }} / 500</span>
              </div>
            </div>
          </article>

          <!-- 액션 바 -->
          <div v-if="!isReadOnly && isSalesRep" class="flex items-center justify-between rounded-lg border px-6 py-4" style="background-color: #F7F3EC; border-color: #DDD7CE;">
            <p class="text-sm" style="color: #9A8C7E;">
              선택된 명세서 <strong style="color: #6B5F50;">{{ selectedStatements.length }}건</strong>
              &nbsp;·&nbsp; 총 <strong style="color: #6B5F50;">₩{{ totalAmount.toLocaleString() }}</strong>
            </p>
            <div class="flex gap-2">
              <button
                  type="button"
                  class="rounded border px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90"
                  style="border-color: #DDD7CE; background-color: transparent; color: #6B5F50;"
                  @click="router.push('/documents/invoices')"
              >
                취소
              </button>
              <button
                  v-if="canCancelInvoice"
                  type="button"
                  class="rounded px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                  style="background-color: #B85C5C;"
                  @click="showCancelModal = true"
              >
                청구서 취소
              </button>
              <button
                  type="button"
                  class="rounded px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style="background-color: #7A8C42;"
                  :disabled="!canCreate"
                  @click="createInvoice"
              >
                {{ pageMode === 'pending' ? '청구서 발행 확정' : '청구서 생성' }}
              </button>
            </div>
          </div>

          <!-- 발행 완료 안내 -->
          <div v-if="isReadOnly" class="flex items-center justify-between rounded-lg border px-6 py-4 text-sm" style="background-color: #F7F3EC; border-color: #DDD7CE; color: #9A8C7E;">
            <span>{{ currentInvoiceStatus === 'CANCELED' ? '취소된 청구서입니다.' : '발행 완료된 청구서입니다. 수정 및 재발행이 불가합니다.' }}</span>
            <button
                v-if="canCancelInvoice"
                type="button"
                class="rounded px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                style="background-color: #B85C5C;"
                @click="showCancelModal = true"
            >
              청구서 취소
            </button>
          </div>

        </section>

        <!-- 오른쪽 패널: PDF 미리보기 -->
        <section class="rounded-lg p-4 shadow-inner" style="background-color: #525659;">
          <div class="relative min-h-[750px] rounded bg-white p-8 shadow-2xl" style="font-family: 'KoPub Dotum', sans-serif; font-size: 11px; color: #1a1a1a;">

            <!-- PDF 헤더 -->
            <div class="mb-5 border-b-2 border-black pb-4">
              <h1 class="text-center text-xl font-black tracking-[4px]">청 구 서</h1>
              <p class="mt-1 text-center text-xs" style="color: #9A8C7E;">{{ invNo }}</p>
            </div>

            <!-- 메타 정보 테이블 -->
            <table class="mb-4 w-full border-collapse text-[10px]">
              <tr>
                <td class="border border-black px-3 py-1.5 font-bold" style="background-color: #F7F3EC; color: #3D3529; width: 60px;">수신처</td>
                <td class="border border-black px-3 py-1.5">{{ selectedClientData?.name || '—' }}</td>
                <td class="border border-black px-3 py-1.5 font-bold" style="background-color: #F7F3EC; color: #3D3529; width: 60px;">청구일</td>
                <td class="border border-black px-3 py-1.5">{{ todayStr }}</td>
              </tr>
              <tr>
                <td class="border border-black px-3 py-1.5 font-bold" style="background-color: #F7F3EC; color: #3D3529;">계약 번호</td>
                <td class="border border-black px-3 py-1.5">{{ selectedContract?.id || contractId || '—' }}</td>
                <td class="border border-black px-3 py-1.5 font-bold" style="background-color: #F7F3EC; color: #3D3529;">납부 기한</td>
                <td class="border border-black px-3 py-1.5">{{ dueDateStr }}</td>
              </tr>
            </table>

            <!-- 명세서 내역 -->
            <p class="my-3 text-[11px] font-extrabold" style="color: #1a1a1a;">▪ 청구 명세서 내역</p>
            <table class="mb-3 w-full border-collapse text-[10px]">
              <thead>
              <tr style="background-color: #F7F3EC;">
                <th class="border border-black px-3 py-1.5 text-left" style="color: #3D3529;">명세서 번호</th>
                <th class="border border-black px-3 py-1.5 text-left" style="color: #3D3529;">발행일</th>
                <th class="border border-black px-3 py-1.5 text-right" style="color: #3D3529;">공급가액</th>
                <th class="border border-black px-3 py-1.5 text-right" style="color: #3D3529;">부가세</th>
                <th class="border border-black px-3 py-1.5 text-right" style="color: #3D3529;">합계</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="stmt in selectedStatements" :key="stmt.id">
                <td class="border border-black px-3 py-1.5">{{ stmt.id }}</td>
                <td class="border border-black px-3 py-1.5">{{ stmt.issueDate }}</td>
                <td class="border border-black px-3 py-1.5 text-right">₩{{ stmt.supply.toLocaleString() }}</td>
                <td class="border border-black px-3 py-1.5 text-right">₩{{ Math.round(stmt.supply * 0.1).toLocaleString() }}</td>
                <td class="border border-black px-3 py-1.5 text-right">₩{{ (stmt.supply + Math.round(stmt.supply * 0.1)).toLocaleString() }}</td>
              </tr>
              <tr v-if="selectedStatements.length === 0">
                <td colspan="5" class="border border-black py-8 text-center" style="color: #BFB3A5; font-style: italic;">
                  왼쪽에서 청구할 명세서를 선택해주세요.
                </td>
              </tr>
              <tr v-if="selectedStatements.length > 0" style="background-color: #EFEADF;">
                <td colspan="2" class="border border-black px-3 py-1.5 font-bold" style="color: #3D3529;">합 계</td>
                <td class="border border-black px-3 py-1.5 text-right font-bold" style="color: #3D3529;">₩{{ supplyAmount.toLocaleString() }}</td>
                <td class="border border-black px-3 py-1.5 text-right font-bold" style="color: #3D3529;">₩{{ taxAmount.toLocaleString() }}</td>
                <td class="border border-black px-3 py-1.5 text-right font-bold" style="color: #3D3529;">₩{{ totalAmount.toLocaleString() }}</td>
              </tr>
              </tbody>
            </table>

            <!-- 금액 박스 -->
            <table class="mt-2 w-full border-collapse text-[10px]">
              <tr>
                <td class="border border-black px-3 py-1.5 font-bold" style="background-color: #F7F3EC; color: #3D3529;">공급가액</td>
                <td class="border border-black px-3 py-1.5 text-right font-semibold">₩{{ supplyAmount.toLocaleString() }}</td>
                <td class="border border-black px-3 py-1.5 font-bold" style="background-color: #F7F3EC; color: #3D3529;">부가세 (10%)</td>
                <td class="border border-black px-3 py-1.5 text-right font-semibold">₩{{ taxAmount.toLocaleString() }}</td>
                <td class="border border-black px-3 py-1.5 font-bold" style="background-color: #F7F3EC; color: #3D3529;">합계금액</td>
                <td class="border border-black px-3 py-1.5 text-right font-semibold">₩{{ totalAmount.toLocaleString() }}</td>
              </tr>
            </table>

            <!-- 서명란 -->
            <div class="mt-8 flex justify-end gap-10 border-t border-black pt-4">
              <div class="text-center text-[10px]" style="color: #6B5F50;">
                <div class="mx-auto mb-1.5 h-10 w-24 border-b border-black"></div>
                거래처 확인
              </div>
              <div class="text-center text-[10px]" style="color: #6B5F50;">
                <div class="mx-auto mb-1.5 h-10 w-24 border-b border-black"></div>
                담당 영업자
              </div>
              <div class="text-center text-[10px]" style="color: #6B5F50;">
                <div class="mx-auto mb-1.5 h-10 w-24 border-b border-black"></div>
                팀장 결재
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>

    <!-- 청구 완료 오버레이 -->
    <Teleport to="body">
      <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="rounded-lg border px-12 py-10 text-center shadow-2xl" style="background-color: #F7F3EC; border-color: #DDD7CE;">
          <p class="text-xl font-extrabold" style="color: #3D3529;">청구서가 생성되었습니다</p>
          <p class="mt-2 text-sm" style="color: #9A8C7E;">
            {{ selectedStatements.length }}건의 명세서가 처리되었습니다.<br>
            총 청구 금액: <strong style="color: #3D3529;">₩{{ totalAmount.toLocaleString() }}</strong>
          </p>
          <button
              type="button"
              class="mt-6 rounded px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style="background-color: #7A8C42;"
              @click="onSuccessConfirm"
          >
            확인
          </button>
        </div>
      </div>
    </Teleport>

    <ModalBase
        v-model="showCancelModal"
        title="청구서 취소 확인"
        width-class="max-w-md"
    >
      <p class="text-sm" style="color: #3D3529;">이 청구서를 취소하시겠습니까?</p>
      <p v-if="cancelErrorMessage" class="mt-2 text-xs font-semibold" style="color: #B85C5C;">
        {{ cancelErrorMessage }}
      </p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
              type="button"
              class="rounded border px-3 py-1.5 text-sm font-semibold transition-colors hover:opacity-90"
              style="border-color: #DDD7CE; background-color: transparent; color: #6B5F50;"
              @click="showCancelModal = false"
          >
            닫기
          </button>
          <button
              type="button"
              class="rounded px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style="background-color: #B85C5C;"
              @click="confirmInvoiceCancel"
          >
            취소 확정
          </button>
        </div>
      </template>
    </ModalBase>

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
textarea::placeholder { color: #9A8C7E; font-style: italic; }
button:active { transform: scale(0.98); }
</style>