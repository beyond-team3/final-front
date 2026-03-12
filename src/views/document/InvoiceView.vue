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
import {
  getInvoice,
  getInvoiceDetail,
  getInvoices,
  getStatements,
  getContract,
  toggleInvoiceStatement,
  createInvoice as apiCreateInvoice,
  publishInvoice as apiPublishInvoice,
} from '@/api/document'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

// ----------------------------------------------------------------
// 라우트 파라미터
// ----------------------------------------------------------------
const pageMode = ref(route.query.mode || 'new')  // 'new' | 'pending' | 'issued'
const invoiceId = ref(route.query.id || null)
const contractId = ref(route.query.contractId || null)
const clientId = ref(route.query.clientId || null)

const showCancelModal = ref(false)
const cancelErrorMessage = ref('')
const isSubmitting = ref(false)

// ----------------------------------------------------------------
// 상태 정규화 (DB enum: DRAFT / PUBLISHED / PAID / CANCELED)
// 프론트 표시: DRAFT→발행대기, PUBLISHED→발행완료, PAID→수납완료, CANCELED→취소
// ----------------------------------------------------------------
const normalizeInvoiceStatus = (status) => {
  const raw = String(status || '').trim().toUpperCase()
  if (raw === 'PUBLISHED') return 'PUBLISHED'
  if (raw === 'PAID') return 'PAID'
  if (raw === 'CANCELED') return 'CANCELED'
  return 'DRAFT'
}

// ----------------------------------------------------------------
// 권한
// ----------------------------------------------------------------
const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)

// ----------------------------------------------------------------
// 청구서 상세 데이터 (API fetch)
// ----------------------------------------------------------------
const currentInvoice = ref(null)
const isLoadingInvoice = ref(false)

async function loadInvoice(id) {
  isLoadingInvoice.value = true
  try {
    const res = await getInvoiceDetail(id)
    const data = res?.data?.data ?? res?.data ?? res
    currentInvoice.value = data
    const cid = data?.contractId
    if (cid && !contractId.value) contractId.value = String(cid)
    // contract 상세 직접 fetch (store에 없을 수 있음)
    if (cid) {
      try {
        const cr = await getContract(cid)
        fetchedContract.value = cr?.data?.data ?? cr?.data ?? null
      } catch (_) {}
    }
  } catch (e) {
    console.error('[InvoiceView] getInvoiceDetail error:', e)
    try {
      const res = await getInvoice(id)
      currentInvoice.value = res?.data?.data ?? res?.data ?? null
    } catch (_) {}
  } finally {
    isLoadingInvoice.value = false
  }
}

// ----------------------------------------------------------------
// 명세서 목록 직접 fetch (신규 발행 시: contractId 기준 필터)
// API: GET /api/v1/statements → orderId 기준으로 contractId 매칭
// ----------------------------------------------------------------
const fetchedStatements = ref([])
const isLoadingStatements = ref(false)

// statements 전체 pool (contractId 기반 필터용)
const allStatements = ref([])

async function loadStatements(resolvedContractId) {
  if (!resolvedContractId) return
  isLoadingStatements.value = true
  try {
    const res = await getStatements()
    const raw = res?.data?.data ?? res?.data ?? []
    const all = Array.isArray(raw) ? raw : []
    allStatements.value = all

    // invoices 목록에서 같은 contractId를 가진 invoiceId들 수집
    // → 그 invoice에 포함된 statementId Set 구성 (이미 청구된 명세서 판별용)
    const invoiceList = documentStore.invoices || []
    const sameContractInvoiceIds = invoiceList
        .filter(inv => String(inv.contractId || '') === String(resolvedContractId))
        .map(inv => inv.id || inv.invoiceId)
        .filter(Boolean)

    // invoices 목록의 statements는 없으니, store의 activeInvoiceStatementIds 활용
    // statements 목록 API → orderId 기반으로 contractId 연결
    // invoices[].contractId → 같은 contract의 orderId들을 orders에서 찾음
    const filtered = documentStore.getStatementsByContract?.(resolvedContractId, all) ?? []
    fetchedStatements.value = filtered
  } catch (e) {
    console.error('[InvoiceView] loadStatements error:', e)
    fetchedStatements.value = []
  } finally {
    isLoadingStatements.value = false
  }
}

// invoice detail의 statements는 금액 정보가 부족 (statementId, statementCode, totalAmount, included만 있음)
// → allStatements pool에서 statementId로 금액 보완
function enrichStatementFromPool(s) {
  const pool = allStatements.value
  if (!pool.length) return s
  const sid = String(s.statementId || s.id || '')
  const full = pool.find(p => String(p.statementId || p.id) === sid)
  if (!full) return s
  return { ...full, ...s }  // detail 필드(included 등) 우선, 금액은 pool에서 보완
}
const fetchedContract = ref(null)

const selectedContract = computed(() =>
    currentInvoice.value?.contract ||
    fetchedContract.value ||
    documentStore.getContractById?.(contractId.value || currentInvoice.value?.contractId) ||
    null
)

const selectedClientData = computed(() => {
  const c = selectedContract.value
  if (c?.clientName || c?.client_name) return { name: c.clientName || c.client_name }
  if (c?.client) return c.client
  return documentStore.clientMaster?.find(
      cl => String(cl.id || cl.clientId) === String(clientId.value || currentInvoice.value?.clientId)
  ) || currentInvoice.value?.client || null
})

// ----------------------------------------------------------------
// 명세서 목록: 계약에 속한 명세서 (store 기반)
// ERD: tbl_statement.status = 'ISSUED' | 'CANCELED'
//      청구가능 여부는 tbl_invoice_statement.is_included 로 판단
// ----------------------------------------------------------------
// ----------------------------------------------------------------
// 명세서 목록: 우선순위대로 소스 결정
// ERD: tbl_statement.status = 'ISSUED' | 'CANCELED'
//      청구가능 여부는 tbl_invoice_statement.is_included 로 판단
// ----------------------------------------------------------------
function normalizeStatement(s) {
  const total  = Number(s.totalAmount  ?? s.total_amount  ?? 0)
  const supply = Number(s.supplyAmount ?? s.supply_amount ?? (total > 0 ? Math.round(total / 1.1) : 0))
  const vat    = Number(s.vatAmount    ?? s.vat_amount    ?? Math.round(supply * 0.1))
  const sid    = String(s.statementId || s.statement_id || s.id || '')

  // status 3단계:
  // 'included'  → 현재 청구서에 포함됨 (included=true)
  // 'available' → 포함 가능 (included=false, 다른 active 청구서에 없음)
  // 'completed' → 다른 활성 청구서에 이미 포함됨
  let status = 'available'
  if (s.included === true) {
    status = 'included'
  } else if (s.included === false) {
    // 현재 청구서에서 제외됐지만 다른 청구서에 있는지 확인
    status = documentStore.activeInvoiceStatementIds?.has(sid) ? 'completed' : 'available'
  } else {
    // included 필드 없음 (신규 발행 전 statements pool)
    status = documentStore.activeInvoiceStatementIds?.has(sid) ? 'completed' : 'available'
  }

  return {
    id: s.statementId || s.statement_id || s.id,
    statementCode: s.statementCode || s.statement_code || sid,
    orderId: s.orderId || s.order_id,
    orderCode: s.orderCode || s.order_code || '',
    supply,
    vatAmount: vat,
    total,
    status,
    issueDate: s.createdAt || s.created_at,
  }
}

const statementList = computed(() => {
  // 1순위: 기존 청구서 열람 - invoice /detail API의 statements (included 필드 있음)
  const invoiceStatements = currentInvoice.value?.statements || []
  if (invoiceStatements.length > 0) {
    // detail statements는 금액 부족 → allStatements pool에서 보완
    return invoiceStatements.map(s => normalizeStatement(enrichStatementFromPool(s)))
  }

  // 2순위: 신규 발행 - contractId 기반으로 fetch한 statements
  if (fetchedStatements.value.length > 0) {
    return fetchedStatements.value.map(normalizeStatement)
  }

  return []
})

// ----------------------------------------------------------------
// 명세서 선택 상태
// ----------------------------------------------------------------
const remarks = ref('')
const togglingIds = ref(new Set())  // 개별 statement 로딩 상태

const filteredStatements = computed(() => statementList.value)

const availableFilteredStatements = computed(() =>
    statementList.value.filter((s) => s.status !== 'completed')
)

const allAvailableSelected = computed(() => {
  if (availableFilteredStatements.value.length === 0) return false
  return availableFilteredStatements.value.every((s) => s.status === 'included')
})

const isAllIndeterminate = computed(() => {
  if (availableFilteredStatements.value.length === 0) return false
  const selectedCount = availableFilteredStatements.value.filter(s => s.status === 'included').length
  return selectedCount > 0 && selectedCount < availableFilteredStatements.value.length
})

async function toggleStatement(statementId, checked) {
  if (togglingIds.value.has(statementId)) return

  if (!invoiceId.value) {
    // 신규: 로컬 토글
    if (!currentInvoice.value) return
    const stmts = (currentInvoice.value.statements || []).map(s =>
        String(s.statementId || s.id) === String(statementId)
            ? { ...s, included: checked }
            : s
    )
    currentInvoice.value = { ...currentInvoice.value, statements: stmts }
    return
  }

  togglingIds.value = new Set([...togglingIds.value, statementId])
  try {
    const res = await toggleInvoiceStatement(invoiceId.value, statementId)
    const updated = res?.data?.data ?? res?.data
    if (updated?.statements) {
      currentInvoice.value = { ...currentInvoice.value, ...updated }
    }
  } catch (e) {
    console.error('[InvoiceView] toggle error:', e)
    window.alert('명세서 포함/제외 처리 중 오류가 발생했습니다.')
  } finally {
    const next = new Set(togglingIds.value)
    next.delete(statementId)
    togglingIds.value = next
  }
}

async function toggleAll(checked) {
  const targets = availableFilteredStatements.value.filter(s =>
      checked ? s.status !== 'included' : s.status === 'included'
  )
  await Promise.all(targets.map(s => toggleStatement(s.id, checked)))
}

const selectedStatements = computed(() =>
    statementList.value.filter((s) => s.status === 'included')
)

// ----------------------------------------------------------------
// 금액 계산
// ----------------------------------------------------------------
const supplyAmount = computed(() => selectedStatements.value.reduce((sum, s) => sum + s.supply, 0))
const taxAmount = computed(() => Math.round(supplyAmount.value * 0.1))
const totalAmount = computed(() => supplyAmount.value + taxAmount.value)

// ----------------------------------------------------------------
// 현재 청구서 상태
// ----------------------------------------------------------------
const currentInvoiceStatus = computed(() => {
  if (currentInvoice.value) return normalizeInvoiceStatus(currentInvoice.value.status)
  if (pageMode.value === 'issued') return 'PUBLISHED'
  return 'DRAFT'
})

// DRAFT만 편집 가능
const isReadOnly = computed(() => currentInvoiceStatus.value !== 'DRAFT')
// 신규 생성: contractId만 있으면 됨 (백엔드가 statements 자동 연결)
// 발행 확정: invoiceId 있고 DRAFT 상태
const canCreate = computed(() => {
  if (isSubmitting.value) return false
  if (invoiceId.value) return currentInvoiceStatus.value === 'DRAFT'  // 발행 확정 버튼
  return !!(contractId.value || currentInvoice.value?.contractId)     // 신규 생성 버튼
})
// 취소는 DRAFT 상태에서만 가능 (PUBLISHED/PAID는 취소 불가)
// 취소 시 포함된 명세서는 다음 빌링 사이클에 자동 재포함됨
const canCancelInvoice = computed(() =>
    isSalesRep.value && Boolean(invoiceId.value) && currentInvoiceStatus.value === 'DRAFT'
)

const invoiceStatusHistory = computed(() =>
    Array.isArray(currentInvoice.value?.statusHistory) ? currentInvoice.value.statusHistory : []
)

// ----------------------------------------------------------------
// 뷰 레이블 / 카드 상태
// DB enum: DRAFT / PUBLISHED / PAID / CANCELED
// ----------------------------------------------------------------
const modeLabel = computed(() => {
  if (currentInvoiceStatus.value === 'CANCELED')  return '취소된 청구서'
  if (currentInvoiceStatus.value === 'PAID')       return '수납 완료'
  if (currentInvoiceStatus.value === 'PUBLISHED')  return '발행 완료'
  if (invoiceId.value)                             return '발행 대기'
  return '신규 청구서 발행'
})

const invoiceCardStatus = computed(() => {
  if (currentInvoiceStatus.value === 'CANCELED')  return 'CANCELED'
  if (currentInvoiceStatus.value === 'PUBLISHED' || currentInvoiceStatus.value === 'PAID') return 'APPROVED'
  return 'DRAFT'
})

const statementCardStatus = computed(() => {
  if (currentInvoiceStatus.value === 'CANCELED')  return 'CANCELED'
  if (currentInvoiceStatus.value === 'PUBLISHED' || currentInvoiceStatus.value === 'PAID') return 'APPROVED'
  if (invoiceId.value || selectedStatements.value.length > 0) return 'REQUESTED'
  return 'DRAFT'
})

// ----------------------------------------------------------------
// 날짜 (PDF 미리보기용)
// ----------------------------------------------------------------
const today = new Date()
const todayStr = today.toLocaleDateString('ko-KR')
const dueDate = new Date(today)
dueDate.setDate(dueDate.getDate() + 30)
const dueDateStr = dueDate.toLocaleDateString('ko-KR')

// invoice_code (PDF 표시용)
const invNo = computed(() =>
    currentInvoice.value?.invoiceCode ||
    currentInvoice.value?.invoice_code ||
    currentInvoice.value?.id ||
    `CINV-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`
)

// ----------------------------------------------------------------
// watch: remarks 동기화
// ----------------------------------------------------------------
watch(
    () => currentInvoice.value,
    (invoice) => {
      if (!invoice) return
      remarks.value = invoice.memo || invoice.remarks || ''
    },
    { immediate: true }
)

// ----------------------------------------------------------------
// onMounted: 기존 청구서면 API fetch
// ----------------------------------------------------------------
onMounted(async () => {
  void historyStore.ensureLoaded?.()

  // allStatements 항상 먼저 로드 (invoice detail statements 금액 보완용)
  if (!allStatements.value.length) {
    try {
      const res = await getStatements()
      const raw = res?.data?.data ?? res?.data ?? []
      allStatements.value = Array.isArray(raw) ? raw : []
    } catch (e) {
      console.error('[InvoiceView] getStatements error:', e)
    }
  }

  if (invoiceId.value) {
    // 기존 청구서 열람: /detail API → contractId + statements[included] 포함
    await loadInvoice(invoiceId.value)
    // detail에 statements가 없는 경우에만 contractId로 별도 fetch
    if (!(currentInvoice.value?.statements?.length > 0)) {
      const cid = contractId.value || currentInvoice.value?.contractId
      if (cid) await loadStatements(String(cid))
    }
  } else if (contractId.value) {
    // 신규 발행: contractId 기준으로 명세서 fetch
    await loadStatements(contractId.value)
  }
})

// ----------------------------------------------------------------
// 청구서 생성 (신규: PENDING 상태로 저장)
// ----------------------------------------------------------------
const showSuccess = ref(false)

async function handleCreateInvoice() {
  const cid = contractId.value || currentInvoice.value?.contractId
  if (!cid) {
    window.alert('계약 정보를 확인할 수 없습니다.')
    return
  }
  isSubmitting.value = true
  try {
    // POST /api/v1/invoices: { contractId, startDate, endDate, memo }
    // 백엔드가 해당 기간의 statements를 자동 연결해서 DRAFT 청구서 생성
    const payload = {
      contractId: Number(cid),
      startDate: selectedContract.value?.startDate || null,
      endDate: selectedContract.value?.endDate || null,
      memo: remarks.value || null,
    }
    const res = await apiCreateInvoice(payload)
    const created = res?.data?.data ?? res?.data ?? res
    const newInvoiceId = created?.invoiceId ?? created?.id
    if (newInvoiceId) {
      invoiceId.value = String(newInvoiceId)
      // /detail API로 로드 → statements[included] 포함
      await loadInvoice(newInvoiceId)
    }
    showSuccess.value = true
  } catch (e) {
    console.error('[InvoiceView] createInvoice error:', e)
    window.alert('청구서 생성 중 오류가 발생했습니다.')
  } finally {
    isSubmitting.value = false
  }
}

// ----------------------------------------------------------------
// 발행 확정 (PENDING → ISSUED)
// ----------------------------------------------------------------
async function handlePublishInvoice() {
  if (!invoiceId.value) return
  isSubmitting.value = true
  try {
    await apiPublishInvoice(invoiceId.value)
    await loadInvoice(invoiceId.value)
    showSuccess.value = true
  } catch (e) {
    console.error('[InvoiceView] publishInvoice error:', e)
    window.alert('발행 확정 중 오류가 발생했습니다.')
  } finally {
    isSubmitting.value = false
  }
}

// ----------------------------------------------------------------
// 버튼 핸들러: 모드에 따라 생성 or 발행 확정
// DRAFT + invoiceId 존재 → 발행 확정 (DRAFT → PUBLISHED)
// DRAFT + invoiceId 없음 → 청구서 신규 생성 (DRAFT 상태)
// ----------------------------------------------------------------
function onActionButton() {
  if (invoiceId.value && currentInvoiceStatus.value === 'DRAFT') {
    handlePublishInvoice()
  } else {
    handleCreateInvoice()
  }
}

const actionButtonLabel = computed(() => {
  if (isSubmitting.value) return '처리 중...'
  if (invoiceId.value && currentInvoiceStatus.value === 'DRAFT') return '청구서 발행 확정'
  return '청구서 생성 (발행 대기)'
})

// ----------------------------------------------------------------
// 청구서 취소
// ----------------------------------------------------------------
async function confirmInvoiceCancel() {
  cancelErrorMessage.value = ''
  if (!invoiceId.value) return

  try {
    // cancelInvoice는 document store 또는 직접 API 호출
    const result = await documentStore.cancelInvoice(invoiceId.value)
    if (!result?.success) {
      cancelErrorMessage.value = result?.message || '청구서 취소에 실패했습니다.'
      return
    }
    showCancelModal.value = false
    await loadInvoice(invoiceId.value)
  } catch (e) {
    console.error('[InvoiceView] cancelInvoice error:', e)
    cancelErrorMessage.value = '청구서 취소 중 오류가 발생했습니다.'
  }
}

// ----------------------------------------------------------------
// 성공 확인 후 목록으로
// ----------------------------------------------------------------
function onSuccessConfirm() {
  showSuccess.value = false
  router.push('/documents')
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

      <!-- 로딩 -->
      <div v-if="isLoadingInvoice || isLoadingStatements" class="py-20 text-center text-sm" style="color: #9A8C7E;">
        {{ isLoadingInvoice ? '청구서 정보를 불러오는 중...' : '명세서 목록을 불러오는 중...' }}
      </div>

      <template v-else>
        <!-- 모드 배너 -->
        <div class="mb-5 rounded border px-4 py-2.5 text-sm font-semibold" style="border-color: #DDD7CE; background-color: #F7F3EC; color: #6B5F50;">
          <span v-if="currentInvoiceStatus === 'CANCELED'">취소 완료 — 취소된 청구서입니다.</span>
          <span v-else-if="currentInvoiceStatus === 'PAID'">수납 완료 — 수납이 완료된 청구서입니다.</span>
          <span v-else-if="currentInvoiceStatus === 'PUBLISHED'">발행 완료 — 발행 완료된 청구서입니다. 수정할 수 없습니다.</span>
          <span v-else-if="invoiceId">발행 대기 — 명세서를 확인하고 청구서를 발행 확정하세요.</span>
          <span v-else>신규 청구서 발행 — 발행할 명세서를 선택하고 청구서를 생성하세요.</span>
        </div>

        <!-- 분할 레이아웃 -->
        <div class="grid gap-5 xl:grid-cols-[1.2fr_480px] animate-in">

          <!-- 왼쪽 패널 -->
          <section class="space-y-4">

            <!-- 계약 요약 카드 -->
            <article class="relative rounded-lg border p-5" style="background-color: #F7F3EC; border-color: #DDD7CE;">
              <StatusBadge class="absolute right-4 top-4" :status="invoiceCardStatus" />
              <div class="mb-3">
                <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">선택된 계약</p>
              </div>
              <div class="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">계약 코드</p>
                  <p class="text-sm font-bold" style="color: #C8622A;">
                    {{ selectedContract?.contractCode || selectedContract?.code || selectedContract?.displayCode || (contractId ? `계약 #${contractId}` : '—') }}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">거래처명</p>
                  <p class="text-sm font-bold" style="color: #3D3529;">
                    {{ selectedClientData?.name || selectedClientData?.clientName || selectedContract?.clientName || currentInvoice?.clientName || '—' }}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest" style="color: #9A8C7E;">청구 날짜</p>
                  <p class="text-sm font-bold" style="color: #3D3529;">
                    {{ currentInvoice?.invoiceDate ? new Date(currentInvoice.invoiceDate).toLocaleDateString('ko-KR') : (currentInvoice?.startDate ? `${currentInvoice.startDate} ~ ${currentInvoice.endDate}` : '—') }}
                  </p>
                </div>
              </div>
            </article>

            <!-- 명세서 목록 -->
            <article class="relative overflow-hidden rounded-lg border" style="background-color: #F7F3EC; border-color: #DDD7CE;">
              <StatusBadge class="absolute right-4 top-3 z-10" :status="statementCardStatus" />
              <div class="flex items-center gap-2 border-b px-5 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
                <span class="text-sm font-bold" style="color: #3D3529;">명세서 목록</span>
                <span v-if="isReadOnly" class="ml-auto rounded border px-2 py-0.5 text-xs font-semibold" style="border-color: #DDD7CE; color: #9A8C7E; background-color: #FAF7F3;">읽기 전용</span>
                <span v-else-if="invoiceId" class="ml-auto rounded px-2 py-0.5 text-xs font-bold" style="background-color: #C8D4A0; color: #3D3529;">자동 선택됨</span>
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
                      class="border-t"
                      style="border-color: #E8E3D8;"
                      :style="stmt.status === 'completed' ? 'opacity: 0.45;' : ''"
                  >
                    <td class="px-4 py-3">
                      <CedarCheckbox
                          :aria-label="`${stmt.statementCode} 선택`"
                          :disabled="isReadOnly || stmt.status === 'completed' || togglingIds.has(stmt.id)"
                          :model-value="stmt.status === 'included'"
                          @update:model-value="(checked) => toggleStatement(stmt.id, checked)"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <p class="font-bold" style="color: #3D3529;">{{ stmt.statementCode }}</p>
                    </td>
                    <td class="px-4 py-3" style="color: #9A8C7E;">{{ stmt.orderCode || stmt.orderId || '—' }}</td>
                    <td class="px-4 py-3 text-right font-semibold" style="color: #6B5F50;">
                      ₩{{ stmt.supply.toLocaleString() }}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span
                            class="rounded-full px-2 py-0.5 text-xs font-bold"
                            :style="stmt.status === 'included'
                            ? 'background-color: #C8622A; color: white;'
                            : stmt.status === 'available'
                            ? 'background-color: #C8D4A0; color: #3D3529;'
                            : 'background-color: #E8E3D8; color: #9A8C7E;'"
                        >
                          {{ stmt.status === 'included' ? '포함' : stmt.status === 'available' ? '청구 가능' : '이미 발급' }}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-xs" style="color: #9A8C7E;">
                      {{ stmt.issueDate ? new Date(stmt.issueDate).toLocaleDateString('ko-KR') : '—' }}
                    </td>
                  </tr>
                  <tr v-if="filteredStatements.length === 0">
                    <td colspan="6" class="px-4 py-10 text-center" style="color: #BFB3A5;">
                      {{ statementList.length === 0 ? '이 계약에 연결된 명세서가 없습니다.' : '조건에 맞는 명세서가 없습니다.' }}
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
                      :key="`${entry.timestamp}-${entry.actor}`"
                      class="rounded border px-3 py-2"
                      style="border-color: #DDD7CE; background-color: #FAF7F3;"
                  >
                    {{ new Date(entry.timestamp).toLocaleString('ko-KR') }} · {{ entry.actor }} · {{ entry.previousStatus }} → {{ entry.newStatus || currentInvoiceStatus }}
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

            <!-- 액션 바 (PENDING 상태 - 영업사원) -->
            <div
                v-if="!isReadOnly && isSalesRep"
                class="flex items-center justify-between rounded-lg border px-6 py-4"
                style="background-color: #F7F3EC; border-color: #DDD7CE;"
            >
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
                  목록으로
                </button>
                <!-- 취소: PENDING 상태에서만 노출, 취소 시 명세서는 다음 빌링 사이클에 재포함 -->
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
                    @click="onActionButton"
                >
                  {{ actionButtonLabel }}
                </button>
              </div>
            </div>

            <!-- 발행 완료 / 취소됨 안내 바 (읽기 전용) -->
            <div
                v-if="isReadOnly"
                class="flex items-center justify-between rounded-lg border px-6 py-4 text-sm"
                style="background-color: #F7F3EC; border-color: #DDD7CE; color: #9A8C7E;"
            >
              <span v-if="currentInvoiceStatus === 'CANCELED'">
                취소된 청구서입니다. 포함된 명세서는 다음 빌링 사이클에 재포함됩니다.
              </span>
              <span v-else>발행 완료된 청구서입니다. 수정 및 재발행이 불가합니다.</span>
            </div>

          </section>

          <!-- 오른쪽 패널: PDF 미리보기 -->
          <section class="rounded-lg p-4 shadow-inner" style="background-color: #525659;">
            <div class="relative min-h-[750px] rounded bg-white p-8 shadow-2xl" style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 11px; color: #000;">

              <!-- PDF 헤더 -->
              <div class="mb-6 flex items-end justify-between border-b-2 border-black pb-4">
                <h1 class="text-2xl font-black tracking-[8px]">청 구 서</h1>
                <div class="text-right text-[10px]">
                  <p class="font-bold">문서번호: {{ invNo }}</p>
                  <p>발행일: {{ currentInvoice?.invoiceDate ? new Date(currentInvoice.invoiceDate).toLocaleDateString('ko-KR') : todayStr }}</p>
                </div>
              </div>

              <!-- 수신처 / 발신처 2단 -->
              <div class="mb-5 grid grid-cols-2 gap-4 text-[10px]">
                <table class="w-full border-collapse">
                  <tbody>
                  <tr>
                    <td class="border border-gray-400 px-2 py-1 font-bold w-16" style="background-color: #f0f0f0;">수 신</td>
                    <td class="border border-gray-400 px-2 py-1 font-bold">
                      {{ selectedClientData?.name || selectedClientData?.clientName || selectedContract?.clientName || currentInvoice?.clientName || '—' }}
                    </td>
                  </tr>
                  <tr>
                    <td class="border border-gray-400 px-2 py-1 font-bold" style="background-color: #f0f0f0;">계약번호</td>
                    <td class="border border-gray-400 px-2 py-1">
                      {{ selectedContract?.contractCode || selectedContract?.code || (contractId ? `계약 #${contractId}` : '—') }}
                    </td>
                  </tr>
                  <tr>
                    <td class="border border-gray-400 px-2 py-1 font-bold" style="background-color: #f0f0f0;">청구기간</td>
                    <td class="border border-gray-400 px-2 py-1">
                      {{ currentInvoice?.startDate || '—' }} ~ {{ currentInvoice?.endDate || '—' }}
                    </td>
                  </tr>
                  </tbody>
                </table>
                <table class="w-full border-collapse">
                  <tbody>
                  <tr>
                    <td class="border border-gray-400 px-2 py-1 font-bold w-16" style="background-color: #f0f0f0;">발 신</td>
                    <td class="border border-gray-400 px-2 py-1 font-bold">CEDAR</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-400 px-2 py-1 font-bold" style="background-color: #f0f0f0;">납부기한</td>
                    <td class="border border-gray-400 px-2 py-1">{{ currentInvoice?.dueDate || dueDateStr }}</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-400 px-2 py-1 font-bold" style="background-color: #f0f0f0;">담당자</td>
                    <td class="border border-gray-400 px-2 py-1">{{ currentInvoice?.employeeName || '—' }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <!-- 명세서 내역 -->
              <table class="mb-0 w-full border-collapse text-[10px]">
                <thead>
                <tr style="background-color: #222; color: white;">
                  <th class="border border-gray-600 px-2 py-1.5 text-left">명세서 번호</th>
                  <th class="border border-gray-600 px-2 py-1.5 text-left">주문 번호</th>
                  <th class="border border-gray-600 px-2 py-1.5 text-left">발행일</th>
                  <th class="border border-gray-600 px-2 py-1.5 text-right">공급가액</th>
                  <th class="border border-gray-600 px-2 py-1.5 text-right">부가세(10%)</th>
                  <th class="border border-gray-600 px-2 py-1.5 text-right">합 계</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(stmt, i) in selectedStatements" :key="stmt.id"
                    :style="i % 2 === 0 ? '' : 'background-color: #f9f9f9;'">
                  <td class="border border-gray-300 px-2 py-1.5">{{ stmt.statementCode }}</td>
                  <td class="border border-gray-300 px-2 py-1.5">{{ stmt.orderCode || '—' }}</td>
                  <td class="border border-gray-300 px-2 py-1.5">{{ stmt.issueDate ? new Date(stmt.issueDate).toLocaleDateString('ko-KR') : '—' }}</td>
                  <td class="border border-gray-300 px-2 py-1.5 text-right">{{ stmt.supply.toLocaleString() }}</td>
                  <td class="border border-gray-300 px-2 py-1.5 text-right">{{ stmt.vatAmount.toLocaleString() }}</td>
                  <td class="border border-gray-300 px-2 py-1.5 text-right font-semibold">{{ stmt.total.toLocaleString() }}</td>
                </tr>
                <tr v-if="selectedStatements.length === 0">
                  <td colspan="6" class="border border-gray-300 py-6 text-center" style="color: #999;">
                    명세서를 선택하면 여기에 표시됩니다.
                  </td>
                </tr>
                <!-- 합계 행 -->
                <tr v-if="selectedStatements.length > 0" style="background-color: #f0f0f0; font-weight: bold;">
                  <td colspan="3" class="border border-gray-400 px-2 py-1.5">합 계 ({{ selectedStatements.length }}건)</td>
                  <td class="border border-gray-400 px-2 py-1.5 text-right">{{ supplyAmount.toLocaleString() }}</td>
                  <td class="border border-gray-400 px-2 py-1.5 text-right">{{ taxAmount.toLocaleString() }}</td>
                  <td class="border border-gray-400 px-2 py-1.5 text-right">{{ totalAmount.toLocaleString() }}</td>
                </tr>
                <!-- 청구금액 행 -->
                <tr v-if="selectedStatements.length > 0" style="background-color: #222; color: white; font-weight: bold;">
                  <td colspan="5" class="border border-gray-600 px-2 py-2 text-right text-[11px]">청구 합계 금액 (VAT 포함)</td>
                  <td class="border border-gray-600 px-2 py-2 text-right text-[12px]">₩ {{ totalAmount.toLocaleString() }}</td>
                </tr>
                </tbody>
              </table>

              <!-- 비고 -->
              <div v-if="remarks" class="mt-4 border px-3 py-2 text-[10px]" style="border-color: #ccc;">
                <p class="font-bold mb-1">비고</p>
                <p>{{ remarks }}</p>
              </div>

              <!-- 서명란 -->
              <div class="mt-6 flex justify-end gap-6 border-t border-black pt-4">
                <div class="text-center text-[10px]">
                  <div class="mx-auto mb-1.5 h-12 w-20 border border-gray-400"></div>
                  거래처 확인
                </div>
                <div class="text-center text-[10px]">
                  <div class="mx-auto mb-1.5 h-12 w-20 border border-gray-400"></div>
                  담당 영업자
                </div>
                <div class="text-center text-[10px]">
                  <div class="mx-auto mb-1.5 h-12 w-20 border border-gray-400"></div>
                  팀장 결재
                </div>
              </div>

            </div>
          </section>

        </div>
      </template>
    </div>

    <!-- 성공 오버레이 -->
    <Teleport to="body">
      <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="rounded-lg border px-12 py-10 text-center shadow-2xl" style="background-color: #F7F3EC; border-color: #DDD7CE;">
          <p class="text-xl font-extrabold" style="color: #3D3529;">
            {{ invoiceId && currentInvoiceStatus === 'PUBLISHED' ? '청구서가 발행 완료되었습니다' : '청구서가 발행 대기로 저장되었습니다' }}
          </p>
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

    <!-- 취소 확인 모달 -->
    <ModalBase
        v-model="showCancelModal"
        title="청구서 취소 확인"
        width-class="max-w-md"
    >
      <p class="text-sm font-semibold" style="color: #3D3529;">이 청구서를 취소하시겠습니까?</p>
      <div class="mt-3 rounded border px-4 py-3 text-xs leading-relaxed" style="border-color: #DDD7CE; background-color: #FAE8C8; color: #8C6B30;">
        <p class="font-bold mb-1">⚠ 취소 후 처리 안내</p>
        <p>이 청구서에 포함된 명세서는 <strong>취소 처리</strong>되며,</p>
        <p>다음 빌링 사이클 도래 시 자동 생성되는 청구서에 <strong>재포함</strong>됩니다.</p>
      </div>
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