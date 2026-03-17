<script setup>
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDocumentStore } from '@/stores/document'
import { ROLES } from '@/utils/constants'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import { navigateToDocumentLoading } from '@/utils/documentLoading'
import {
  getInvoiceDetail,
  getInvoice,
  toggleInvoiceStatement,
  createInvoice as apiCreateInvoice,
  publishInvoice as apiPublishInvoice,
  cancelInvoice as apiCancelInvoice,
} from '@/api/document'

const route  = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const invoiceId  = ref(route.query.id         || null)
const contractId = ref(route.query.contractId || null)
const clientId   = ref(route.query.clientId   || null)

const isLoadingInvoice      = ref(false)
const isSubmitting          = ref(false)
const showSuccess           = ref(false)
const successMessage        = ref('')
const showCancelModal       = ref(false)
const cancelErrorMsg        = ref('')
const remarks               = ref('')
const showAccessDeniedModal = ref(false)

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const isAdmin    = computed(() => authStore.currentRole === ROLES.ADMIN)

// ─── 핵심 데이터 ────────────────────────────────────────────────
const invoice    = ref(null)
const statements = ref([])

function parseStatements(data) {
  const raw = data?.statements ?? []
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.map(s => ({
    id:            Number(s.statementId),
    statementCode: s.statementCode ?? String(s.statementId),
    supply:        Number(s.supplyAmount ?? 0),
    vatAmount:     Number(s.vatAmount    ?? 0),
    total:         Number(s.totalAmount  ?? 0),
    orderCode:     s.orderCode ?? s.orderId ?? null,
    issueDate:     s.issueDate ?? s.createdAt ?? null,
    _checked:      s.included === true,
  }))
}

async function loadInvoice(id) {
  isLoadingInvoice.value = true
  showAccessDeniedModal.value = false
  try {
    let data = null
    if (isSalesRep.value) {
      try {
        const res = await getInvoiceDetail(id)
        data = res?.data?.data ?? res?.data ?? null
      } catch (err) {
        if (err?.response?.status === 403 || err?.response?.status === 401) {
          showAccessDeniedModal.value = true
          return
        }
        const res = await getInvoice(id)
        data = res?.data?.data ?? res?.data ?? null
      }
    } else {
      try {
        const res = await getInvoice(id)
        data = res?.data?.data ?? res?.data ?? null
      } catch (err) {
        if (err?.response?.status === 403 || err?.response?.status === 401) {
          showAccessDeniedModal.value = true
          return
        }
        throw err
      }
    }
    if (!data) return
    invoice.value = data
    remarks.value = data.memo ?? ''
    if (data.contractId && !contractId.value) contractId.value = String(data.contractId)
    if (data.clientId   && !clientId.value)   clientId.value   = String(data.clientId)
    statements.value = parseStatements(data)
  } catch (e) {
    console.error('[InvoiceView] loadInvoice error:', e)
    if (e?.response?.status === 403 || e?.response?.status === 401) {
      showAccessDeniedModal.value = true
    }
  } finally {
    isLoadingInvoice.value = false
  }
}

onMounted(async () => {
  if (invoiceId.value) await loadInvoice(invoiceId.value)
})

// ─── 상태 ────────────────────────────────────────────────────────
const invoiceStatus = computed(() => {
  const raw = String(invoice.value?.status ?? '').trim().toUpperCase()
  if (raw === 'PUBLISHED') return 'PUBLISHED'
  if (raw === 'PAID')      return 'PAID'
  if (raw === 'CANCELED')  return 'CANCELED'
  return 'DRAFT'
})

const canEditDraftInvoice = computed(() => {
  if (!isSalesRep.value) return false
  if (invoiceId.value)   return invoiceStatus.value === 'DRAFT'
  return true
})

const canPublishDraftInvoice = computed(() =>
    isSalesRep.value && !!invoiceId.value && invoiceStatus.value === 'DRAFT'
)

const isReadOnly = computed(() => !canEditDraftInvoice.value)

const modeLabel = computed(() => {
  if (invoiceStatus.value === 'CANCELED')  return '취소된 청구서'
  if (invoiceStatus.value === 'PAID')      return '수납 완료'
  if (invoiceStatus.value === 'PUBLISHED') return '발행 완료'
  if (invoiceId.value && isAdmin.value)    return '수동 생성 초안'
  if (invoiceId.value)                     return '발행 대기'
  return '신규 청구서 발행'
})

const canCreate = computed(() => {
  if (isSubmitting.value) return false
  if (invoiceId.value)    return canPublishDraftInvoice.value
  return isSalesRep.value && !!contractId.value
})

const canCancelInvoice = computed(() =>
    isSalesRep.value && !!invoiceId.value && invoiceStatus.value === 'DRAFT'
)

const readOnlyReason = computed(() => {
  if (invoiceStatus.value === 'CANCELED')
    return '취소된 청구서입니다. 포함된 명세서는 다음 빌링 사이클에 재포함됩니다.'
  if (invoiceStatus.value === 'PUBLISHED' || invoiceStatus.value === 'PAID')
    return '발행 완료된 청구서입니다. 수정 및 재발행이 불가합니다.'
  if (isAdmin.value && invoiceId.value)
    return '관리자는 수동 생성된 청구서를 조회만 할 수 있으며 발행은 담당 영업사원만 가능합니다.'
  return '읽기 전용 청구서입니다.'
})

// ─── 계약/거래처 표시 ────────────────────────────────────────────
const displayContractCode = computed(() =>
    invoice.value?.contractCode ?? (contractId.value ? `계약 #${contractId.value}` : '—')
)
const displayClientName  = computed(() => invoice.value?.clientName ?? '—')
const displayInvoiceDate = computed(() => {
  const d = invoice.value?.invoiceDate ?? invoice.value?.startDate
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ko-KR')
})

// ─── 체크박스 ────────────────────────────────────────────────────
// togglingIds: 배열로 관리 (Set은 Vue 반응성 추적 불안정)
const togglingIds = ref([])

const selectedStatements = computed(() => statements.value.filter(s => s._checked))
const allSelected = computed(() =>
    statements.value.length > 0 && statements.value.every(s => s._checked)
)
const isIndeterminate = computed(() => {
  const cnt = statements.value.filter(s => s._checked).length
  return cnt > 0 && cnt < statements.value.length
})

async function toggleStatement(stmtId, checked) {
  const numId = Number(stmtId)
  if (togglingIds.value.includes(numId)) return

  const idx = statements.value.findIndex(s => s.id === numId)
  if (idx === -1) return

  // Optimistic update — 배열 통째 교체로 Vue 반응성 보장
  statements.value = statements.value.map(s =>
      s.id === numId ? { ...s, _checked: checked } : s
  )

  if (!invoiceId.value || !canEditDraftInvoice.value) return

  togglingIds.value = [...togglingIds.value, numId]
  try {
    const res = await toggleInvoiceStatement(invoiceId.value, numId)
    const responseData = res?.data?.data ?? res?.data ?? null
    if (responseData?.statements) {
      statements.value = parseStatements(responseData)
    }
  } catch (e) {
    statements.value = statements.value.map(s =>
        s.id === numId ? { ...s, _checked: !checked } : s
    )
    console.error('[InvoiceView] toggle error:', e)
    if (e?.response?.status === 403 || e?.response?.status === 401) {
      showAccessDeniedModal.value = true
    } else {
      alert('명세서 포함/제외 처리 중 오류가 발생했습니다.')
    }
  } finally {
    togglingIds.value = togglingIds.value.filter(id => id !== numId)
  }
}

async function toggleAll(checked) {
  const targets = statements.value.filter(s => s._checked !== checked)
  if (targets.length === 0) return

  // 1. UI 먼저 일괄 업데이트
  statements.value = statements.value.map(s =>
      targets.some(t => t.id === s.id) ? { ...s, _checked: checked } : s
  )

  if (!invoiceId.value || !canEditDraftInvoice.value) return

  // 2. API 병렬 호출
  const results = await Promise.allSettled(
      targets.map(s => toggleInvoiceStatement(invoiceId.value, s.id))
  )

  // 3. 실패한 것만 롤백
  const failedIds = targets
      .filter((_, i) => results[i].status === 'rejected')
      .map(s => s.id)

  if (failedIds.length > 0) {
    statements.value = statements.value.map(s =>
        failedIds.includes(s.id) ? { ...s, _checked: !checked } : s
    )
    alert(`${failedIds.length}건 처리 중 오류가 발생했습니다.`)
    return
  }

  // 4. 마지막 성공 응답으로 서버 기준 재동기화
  const lastSuccess = results.findLast(r => r.status === 'fulfilled')
  const responseData = lastSuccess?.value?.data?.data ?? lastSuccess?.value?.data ?? null
  if (responseData?.statements) {
    statements.value = parseStatements(responseData)
  }
}

// ─── 뒤로가기/이탈 시 DRAFT 자동 취소 ──────────────────────────
onBeforeRouteLeave(async (to, from, next) => {
  if (invoiceId.value && invoiceStatus.value === 'DRAFT' && !showSuccess.value) {
    try {
      await apiCancelInvoice(invoiceId.value)
    } catch (e) {
      console.error('[InvoiceView] auto cancel on leave error:', e)
    }
  }
  next()
})

// ─── 금액 계산 ────────────────────────────────────────────────
const supplyAmount = computed(() => selectedStatements.value.reduce((sum, s) => sum + s.supply, 0))
const taxAmount    = computed(() => Math.round(supplyAmount.value * 0.1))
const totalAmount  = computed(() => supplyAmount.value + taxAmount.value)

// ─── 카드 배지 ────────────────────────────────────────────────
const invoiceCardStatus = computed(() => {
  if (invoiceStatus.value === 'CANCELED')                                    return 'CANCELED'
  if (invoiceStatus.value === 'PUBLISHED' || invoiceStatus.value === 'PAID') return 'APPROVED'
  return 'DRAFT'
})
const statementCardStatus = computed(() => {
  if (invoiceStatus.value === 'CANCELED')                                    return 'CANCELED'
  if (invoiceStatus.value === 'PUBLISHED' || invoiceStatus.value === 'PAID') return 'APPROVED'
  if (invoiceId.value || selectedStatements.value.length > 0)                return 'REQUESTED'
  return 'DRAFT'
})

// ─── PDF 미리보기용 ──────────────────────────────────────────
const today    = new Date()
const todayStr = today.toLocaleDateString('ko-KR')
const todayFormatted = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`
const dueDate  = new Date(today)
dueDate.setDate(dueDate.getDate() + 30)
const dueDateStr = dueDate.toLocaleDateString('ko-KR')

const invNo = computed(() =>
    invoice.value?.invoiceCode || invoice.value?.id ||
    `CINV-${today.toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9000)+1000}`
)

// ─── 청구서 생성 ─────────────────────────────────────────────
async function handleCreateInvoice() {
  if (!isSalesRep.value) { alert('청구서 생성은 영업사원만 가능합니다.'); return }
  if (!contractId.value) { alert('계약 정보를 확인할 수 없습니다.'); return }
  isSubmitting.value = true
  try {
    const res     = await apiCreateInvoice({ contractId: Number(contractId.value), startDate: null, endDate: null, memo: remarks.value || null })
    const created = res?.data?.data ?? res?.data ?? res
    const newId   = created?.invoiceId ?? created?.id
    if (newId) {
      invoiceId.value = String(newId)
      await loadInvoice(newId)
      await documentStore.fetchInvoices()
    }
    await navigateToDocumentLoading(router, {
      to: {
        name: 'document-all',
        query: { keyword: invoice.value?.invoiceCode || created?.invoiceCode || newId || undefined, type: 'INV' },
      },
      title: '청구서를 생성했습니다',
      description: '최신 청구서 목록을 불러오고 있습니다.',
    })
  } catch (e) {
    console.error('[InvoiceView] createInvoice error:', e)
    if (e?.response?.status === 403 || e?.response?.status === 401) {
      showAccessDeniedModal.value = true
    } else {
      alert(e?.response?.data?.message || '청구서 생성 중 오류가 발생했습니다.')
    }
  } finally {
    isSubmitting.value = false
  }
}

// ─── 발행 확정 ───────────────────────────────────────────────
async function handlePublishInvoice() {
  if (!canPublishDraftInvoice.value) return
  isSubmitting.value = true
  try {
    await apiPublishInvoice(invoiceId.value)
    await loadInvoice(invoiceId.value)
    await documentStore.fetchInvoices()
    successMessage.value = '청구서가 발행 완료되었습니다'
    showSuccess.value = true
  } catch (e) {
    console.error('[InvoiceView] publishInvoice error:', e)
    if (e?.response?.status === 403 || e?.response?.status === 401) {
      showAccessDeniedModal.value = true
    } else {
      alert(e?.response?.data?.error?.message || e?.response?.data?.message || '발행 확정 중 오류가 발생했습니다.')
    }
  } finally {
    isSubmitting.value = false
  }
}

function onActionButton() {
  if (invoiceId.value && canPublishDraftInvoice.value) handlePublishInvoice()
  else handleCreateInvoice()
}

const actionButtonLabel = computed(() => {
  if (isSubmitting.value) return '처리 중...'
  if (invoiceId.value && canPublishDraftInvoice.value) return '청구서 발행 확정'
  return '청구서 생성 (발행 대기)'
})

// ─── 청구서 취소 ─────────────────────────────────────────────
async function confirmInvoiceCancel() {
  cancelErrorMsg.value = ''
  if (!invoiceId.value) return
  try {
    await apiCancelInvoice(invoiceId.value)
    showCancelModal.value = false
    await loadInvoice(invoiceId.value)
  } catch (e) {
    cancelErrorMsg.value = e?.response?.data?.message || '청구서 취소 중 오류가 발생했습니다.'
  }
}

function onSuccessConfirm() {
  showSuccess.value = false
  router.push('/documents/invoices')
}

function onAccessDeniedConfirm() {
  showAccessDeniedModal.value = false
  router.push('/documents/invoices')
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">

      <!-- 브레드크럼 -->
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-sm" style="color: #9A8C7E;">
          문서 작성 &gt;
          <router-link to="/documents/invoices" style="color: #C8622A;">청구서 관리</router-link>
          &gt;
          <span class="font-semibold" style="color: #3D3529;">{{ modeLabel }}</span>
        </p>
        <button type="button"
                class="rounded px-3 py-2 text-sm font-semibold hover:opacity-90"
                style="border:1px solid #DDD7CE;background-color:transparent;color:#6B5F50;"
                @click="router.push('/documents/invoices')">뒤로가기</button>
      </div>

      <div v-if="isLoadingInvoice" class="py-20 text-center text-sm" style="color: #9A8C7E;">
        청구서 정보를 불러오는 중...
      </div>

      <template v-else>
        <!-- 모드 배너 -->
        <div class="mb-5 rounded border px-4 py-2.5 text-sm font-semibold"
             style="border-color:#DDD7CE;background-color:#F7F3EC;color:#6B5F50;">
          <span v-if="invoiceStatus==='CANCELED'">취소 완료 — 취소된 청구서입니다.</span>
          <span v-else-if="invoiceStatus==='PAID'">수납 완료 — 수납이 완료된 청구서입니다.</span>
          <span v-else-if="invoiceStatus==='PUBLISHED'">발행 완료 — 발행 완료된 청구서입니다. 수정할 수 없습니다.</span>
          <span v-else-if="invoiceId && isAdmin">관리자 조회 전용 — 수동 생성된 초안이며 담당 영업사원이 발행해야 합니다.</span>
          <span v-else-if="invoiceId">발행 대기 — 명세서를 확인하고 청구서를 발행 확정하세요.</span>
          <span v-else>신규 청구서 발행 — 발행할 명세서를 선택하고 청구서를 생성하세요.</span>
        </div>

        <div class="grid gap-5 xl:grid-cols-[1.2fr_480px] animate-in">

          <!-- 왼쪽 패널 -->
          <section class="space-y-4">

            <!-- 계약 요약 카드 -->
            <article class="relative rounded-lg border p-5" style="background-color:#F7F3EC;border-color:#DDD7CE;">
              <StatusBadge class="absolute right-4 top-4" :status="invoiceCardStatus" />
              <p class="mb-3 text-[10px] font-bold uppercase tracking-widest" style="color:#9A8C7E;">선택된 계약</p>
              <div class="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest" style="color:#9A8C7E;">계약 코드</p>
                  <p class="text-sm font-bold" style="color:#C8622A;">{{ displayContractCode }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest" style="color:#9A8C7E;">거래처명</p>
                  <p class="text-sm font-bold" style="color:#3D3529;">{{ displayClientName }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest" style="color:#9A8C7E;">청구 날짜</p>
                  <p class="text-sm font-bold" style="color:#3D3529;">{{ displayInvoiceDate }}</p>
                </div>
              </div>
            </article>

            <!-- 명세서 목록 -->
            <article class="relative overflow-hidden rounded-lg border" style="background-color:#F7F3EC;border-color:#DDD7CE;">
              <StatusBadge class="absolute right-4 top-3 z-10" :status="statementCardStatus" />
              <div class="flex items-center gap-2 border-b px-5 py-3"
                   style="border-color:#E8E3D8;background-color:#EFEADF;">
                <span class="text-sm font-bold" style="color:#3D3529;">명세서 목록</span>
                <span v-if="isReadOnly"
                      class="ml-auto rounded border px-2 py-0.5 text-xs font-semibold"
                      style="border-color:#DDD7CE;color:#9A8C7E;background-color:#FAF7F3;">읽기 전용</span>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="text-left text-xs font-bold uppercase tracking-wider"
                         style="background-color:#EFEADF;color:#6B5F50;">
                  <tr>
                    <th class="w-10 px-4 py-2.5">
                      <input
                          type="checkbox"
                          aria-label="명세서 전체 선택"
                          :disabled="isReadOnly || statements.length === 0"
                          :checked="allSelected"
                          :ref="el => { if (el) el.indeterminate = isIndeterminate }"
                          style="width:16px;height:16px;cursor:pointer;accent-color:#C8622A;"
                          @change="toggleAll($event.target.checked)"
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
                  <tr v-for="stmt in statements" :key="stmt.id"
                      class="border-t" style="border-color:#E8E3D8;">
                    <td class="px-4 py-3">
                      <input
                          type="checkbox"
                          :aria-label="`${stmt.statementCode} 선택`"
                          :disabled="isReadOnly || togglingIds.includes(stmt.id)"
                          :checked="stmt._checked"
                          style="width:16px;height:16px;cursor:pointer;accent-color:#C8622A;"
                          :style="(isReadOnly || togglingIds.includes(stmt.id)) ? 'cursor:not-allowed;opacity:0.5;' : ''"
                          @change="toggleStatement(stmt.id, $event.target.checked)"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <p class="font-bold" style="color:#3D3529;">{{ stmt.statementCode }}</p>
                    </td>
                    <td class="px-4 py-3" style="color:#9A8C7E;">
                      {{ stmt.orderCode || '—' }}
                    </td>
                    <td class="px-4 py-3 text-right font-semibold" style="color:#6B5F50;">
                      ₩{{ stmt.supply.toLocaleString() }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="rounded-full px-2 py-0.5 text-xs font-bold"
                            :style="stmt._checked
                              ? 'background-color:#C8622A;color:white;'
                              : 'background-color:#C8D4A0;color:#3D3529;'">
                        {{ stmt._checked ? '포함' : '청구 가능' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs" style="color:#9A8C7E;">
                      {{ stmt.issueDate ? new Date(stmt.issueDate).toLocaleDateString('ko-KR') : '—' }}
                    </td>
                  </tr>
                  <tr v-if="statements.length === 0">
                    <td colspan="6" class="px-4 py-10 text-center" style="color:#BFB3A5;">
                      이 계약에 연결된 명세서가 없습니다.
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <!-- 선택 명세서 요약 -->
            <article class="overflow-hidden rounded-lg border" style="background-color:#F7F3EC;border-color:#DDD7CE;">
              <div class="flex items-center gap-2 border-b px-5 py-3"
                   style="border-color:#E8E3D8;background-color:#EFEADF;">
                <span class="text-sm font-bold" style="color:#3D3529;">선택 명세서 요약</span>
                <span class="ml-auto text-xs" style="color:#9A8C7E;">실시간 계산</span>
              </div>
              <div class="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
                <div class="rounded border p-3" style="border-color:#DDD7CE;background-color:#FAF7F3;">
                  <p class="text-[10px] font-bold uppercase tracking-wider" style="color:#9A8C7E;">선택된 명세서</p>
                  <p class="mt-1 text-xl font-extrabold" style="color:#3D3529;">
                    {{ selectedStatements.length }}<span class="text-sm font-bold"> 건</span>
                  </p>
                </div>
                <div class="rounded border p-3" style="border-color:#DDD7CE;background-color:#FAF7F3;">
                  <p class="text-[10px] font-bold uppercase tracking-wider" style="color:#9A8C7E;">공급가액 합계</p>
                  <p class="mt-1 text-xl font-extrabold" style="color:#3D3529;">
                    <span class="text-sm font-bold">₩</span>{{ supplyAmount.toLocaleString() }}
                  </p>
                </div>
                <div class="rounded border p-3" style="border-color:#DDD7CE;background-color:#FAF7F3;">
                  <p class="text-[10px] font-bold uppercase tracking-wider" style="color:#9A8C7E;">부가세 (10%)</p>
                  <p class="mt-1 text-xl font-extrabold" style="color:#3D3529;">
                    <span class="text-sm font-bold">₩</span>{{ taxAmount.toLocaleString() }}
                  </p>
                </div>
                <div class="rounded border p-3" style="border-color:#C8622A;background-color:#FAF7F3;">
                  <p class="text-[10px] font-bold uppercase tracking-wider" style="color:#C8622A;">총 청구 금액</p>
                  <p class="mt-1 text-xl font-extrabold" style="color:#C8622A;">
                    <span class="text-sm font-bold">₩</span>{{ totalAmount.toLocaleString() }}
                  </p>
                </div>
              </div>
            </article>

            <!-- 비고 -->
            <article class="overflow-hidden rounded-lg border" style="background-color:#F7F3EC;border-color:#DDD7CE;">
              <div class="flex items-center gap-2 border-b px-5 py-3"
                   style="border-color:#E8E3D8;background-color:#EFEADF;">
                <span class="text-sm font-bold" style="color:#3D3529;">비고 (Remarks)</span>
                <span class="ml-auto text-xs" style="color:#9A8C7E;">영업 히스토리 자동 기록</span>
              </div>
              <div class="p-5">
                <textarea v-model="remarks" :readonly="isReadOnly" maxlength="500" rows="3"
                          class="w-full resize-vertical rounded border p-3 text-sm outline-none transition"
                          style="border-color:#DDD7CE;background-color:#FAF7F3;color:#3D3529;"
                          :style="isReadOnly ? 'cursor:not-allowed;opacity:0.6;' : ''"
                          placeholder="청구 관련 특이사항을 입력해 주세요."
                          @focus="$event.target.style.borderColor='#7A8C42'"
                          @blur="$event.target.style.borderColor='#DDD7CE'" />
                <div class="mt-2 flex items-center text-xs" style="color:#9A8C7E;">
                  <span>작성된 비고는 영업 히스토리에 자동 기록됩니다.</span>
                  <span class="ml-auto">{{ remarks.length }} / 500</span>
                </div>
              </div>
            </article>

            <!-- 액션 바 -->
            <div v-if="!isReadOnly && isSalesRep"
                 class="flex items-center justify-between rounded-lg border px-6 py-4"
                 style="background-color:#F7F3EC;border-color:#DDD7CE;">
              <p class="text-sm" style="color:#9A8C7E;">
                선택된 명세서 <strong style="color:#6B5F50;">{{ selectedStatements.length }}건</strong>
                &nbsp;·&nbsp; 총 <strong style="color:#6B5F50;">₩{{ totalAmount.toLocaleString() }}</strong>
              </p>
              <div class="flex gap-2">
                <button type="button"
                        class="rounded border px-4 py-2 text-sm font-semibold hover:opacity-90"
                        style="border-color:#DDD7CE;background-color:transparent;color:#6B5F50;"
                        @click="router.push('/documents/invoices')">목록으로</button>
                <button type="button"
                        class="rounded px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        style="background-color:#7A8C42;"
                        :disabled="!canCreate"
                        @click="onActionButton">{{ actionButtonLabel }}</button>
              </div>
            </div>

            <!-- 읽기 전용 안내 바 -->
            <div v-if="isReadOnly"
                 class="flex items-center rounded-lg border px-6 py-4 text-sm"
                 style="background-color:#F7F3EC;border-color:#DDD7CE;color:#9A8C7E;">
              <span>{{ readOnlyReason }}</span>
            </div>

          </section>

          <!-- 오른쪽 패널: PDF 미리보기 -->
          <aside class="w-full xl:w-[500px] sticky top-5 rounded-lg bg-[#525659] p-4 shadow-inner overflow-y-auto custom-scrollbar max-h-[90vh]">
            <div class="flex flex-col items-center">
              <div class="bg-white px-12 pt-8 pb-12 w-[794px] min-h-[1115px] shadow-2xl relative text-[13px] text-black flex flex-col"
                   style="font-family: var(--font-sans) !important; transform: scale(0.55); transform-origin: top center; margin-bottom: calc(-1115px * 0.45);">

                <!-- 제목 -->
                <div class="text-center border-b-2 border-black pb-3 mb-10">
                  <h1 class="text-3xl font-bold tracking-widest">청 구 서</h1>
                </div>

                <!-- 기본 정보 -->
                <div class="mb-8 space-y-3 leading-relaxed text-[15px]">
                  <p><strong>수 신 (갑):</strong> <span class="border-b border-black px-2 font-bold">{{ displayClientName }}</span></p>
                  <p><strong>발 신 (을):</strong> (주) 몬순</p>
                  <p><strong>계약 코드:</strong> <span class="font-mono text-base">{{ displayContractCode }}</span></p>
                  <p><strong>청구 기간:</strong> <span class="font-mono text-base">{{ invoice?.startDate || '—' }} ~ {{ invoice?.endDate || '—' }}</span></p>
                  <p><strong>발 행 일:</strong> <span class="font-mono text-base">{{ invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('ko-KR') : todayStr }}</span></p>
                  <p><strong>납부 기한:</strong> <span class="font-mono text-base">{{ invoice?.dueDate || dueDateStr }}</span></p>
                  <p><strong>문서 번호:</strong> <span class="font-mono text-base">{{ invNo }}</span></p>
                </div>

                <!-- 명세서 테이블 -->
                <div class="mb-2">
                  <strong class="text-sm">[명세서 목록]</strong>
                </div>
                <table class="w-full border-collapse border-2 border-black text-center mb-8 text-[13px]">
                  <thead style="background-color:#F7F3EC;">
                  <tr class="border-b-2 border-black">
                    <th class="border-r border-black p-3 text-left px-4">명세서 번호</th>
                    <th class="border-r border-black p-3 text-right px-4">공급가액</th>
                    <th class="border-r border-black p-3 text-right px-4">부가세(10%)</th>
                    <th class="p-3 text-right px-4">합 계</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(stmt, i) in selectedStatements" :key="stmt.id" class="border-b border-black">
                    <td class="border-r border-black p-3 text-left font-bold px-4">{{ stmt.statementCode }}</td>
                    <td class="border-r border-black p-3 text-right font-mono px-4">{{ stmt.supply.toLocaleString() }}</td>
                    <td class="border-r border-black p-3 text-right font-mono px-4">{{ stmt.vatAmount.toLocaleString() }}</td>
                    <td class="p-3 text-right font-bold font-mono px-4">{{ stmt.total.toLocaleString() }}</td>
                  </tr>
                  <tr v-if="selectedStatements.length === 0">
                    <td colspan="4" class="p-10 italic text-center" style="color:#9A8C7E;">명세서를 선택하면 여기에 표시됩니다.</td>
                  </tr>
                  <tr v-if="selectedStatements.length > 0">
                    <td colspan="3" class="border-r border-black p-3 bg-[#FAF7F3] font-bold text-right px-4">청구 합계 금액 (VAT 포함)</td>
                    <td class="p-3 text-right font-extrabold px-4 text-xl">{{ totalAmount.toLocaleString() }}</td>
                  </tr>
                  </tbody>
                </table>

                <!-- 날짜 + 서명 문구 -->
                <div class="pt-8 pb-2 text-center flex flex-col items-center">
                  <p class="text-[15px] font-bold mb-4">{{ todayFormatted }}</p>
                  <div class="w-full px-16">
                    <div class="border-t-2 border-black pt-5">
                      <p class="font-bold text-xl">위 청구 내용을 확인하기 위해 기명 날인함</p>
                      <p class="mt-2 text-[15px]">발행처: (주) 몬순</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </aside>
        </div>
      </template>
    </div>

    <!-- 권한 없음 모달 -->
    <Teleport to="body">
      <div v-if="showAccessDeniedModal"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="rounded-lg border px-10 py-8 text-center shadow-2xl"
             style="background-color:#F7F3EC;border-color:#DDD7CE;max-width:400px;width:90%;">
          <div class="mb-3 flex justify-center">
            <span class="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                  style="background-color:#FAE8C8;color:#C8622A;">⚠</span>
          </div>
          <p class="text-base font-extrabold" style="color:#3D3529;">접근 권한이 없습니다</p>
          <p class="mt-2 text-sm leading-relaxed" style="color:#9A8C7E;">
            이 청구서는 담당 영업사원만 조회할 수 있습니다.<br>
            본인이 담당하지 않는 거래처의 청구서입니다.
          </p>
          <button type="button"
                  class="mt-6 rounded px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  style="background-color:#C8622A;"
                  @click="onAccessDeniedConfirm">청구서 목록으로</button>
        </div>
      </div>
    </Teleport>

    <!-- 성공 오버레이 -->
    <Teleport to="body">
      <div v-if="showSuccess"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="rounded-lg border px-12 py-10 text-center shadow-2xl"
             style="background-color:#F7F3EC;border-color:#DDD7CE;">
          <p class="text-xl font-extrabold" style="color:#3D3529;">{{ successMessage }}</p>
          <p class="mt-2 text-sm" style="color:#9A8C7E;">
            {{ selectedStatements.length }}건의 명세서가 처리되었습니다.<br>
            총 청구 금액: <strong style="color:#3D3529;">₩{{ totalAmount.toLocaleString() }}</strong>
          </p>
          <button type="button"
                  class="mt-6 rounded px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  style="background-color:#7A8C42;"
                  @click="onSuccessConfirm">확인</button>
        </div>
      </div>
    </Teleport>

    <!-- 취소 확인 모달 -->
    <ModalBase v-model="showCancelModal" title="청구서 취소 확인" width-class="max-w-md">
      <p class="text-sm font-semibold" style="color:#3D3529;">이 청구서를 취소하시겠습니까?</p>
      <div class="mt-3 rounded border px-4 py-3 text-xs leading-relaxed"
           style="border-color:#DDD7CE;background-color:#FAE8C8;color:#8C6B30;">
        <p class="font-bold mb-1">⚠ 취소 후 처리 안내</p>
        <p>이 청구서에 포함된 명세서는 <strong>취소 처리</strong>되며,</p>
        <p>다음 빌링 사이클 도래 시 자동 생성되는 청구서에 <strong>재포함</strong>됩니다.</p>
      </div>
      <p v-if="cancelErrorMsg" class="mt-2 text-xs font-semibold" style="color:#B85C5C;">{{ cancelErrorMsg }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button"
                  class="rounded border px-3 py-1.5 text-sm font-semibold"
                  style="border-color:#DDD7CE;background-color:transparent;color:#6B5F50;"
                  @click="showCancelModal = false">닫기</button>
          <button type="button"
                  class="rounded px-3 py-1.5 text-sm font-semibold text-white"
                  style="background-color:#B85C5C;"
                  @click="confirmInvoiceCancel">취소 확정</button>
        </div>
      </template>
    </ModalBase>

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
textarea::placeholder { color: #9A8C7E; font-style: italic; }
button:active { transform: scale(0.98); }
</style>