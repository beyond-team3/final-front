<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

// ── URL 파라미터로 모드 결정 ─────────────────────────────
// mode: 'new' | 'pending' | 'issued'
// contractId: 신규 모드에서 계약 ID
// clientId: 신규 모드에서 거래처 ID
// id: pending/issued 모드에서 청구서 ID
const pageMode = ref(route.query.mode || 'new')
const invoiceId = ref(route.query.id || null)
const contractId = ref(route.query.contractId || null)
const clientId = ref(route.query.clientId || null)

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)

// ── 선택된 계약 정보 ─────────────────────────────────────
const selectedContract = computed(() =>
    contractId.value ? documentStore.getContractById?.(contractId.value) || null : null
)

const selectedClientData = computed(() =>
    documentStore.clientMaster?.find((c) => c.id === clientId.value) || selectedContract.value?.client || null
)

// ── 명세서(Statement) 목록 ───────────────────────────────
// 계약에 연결된 주문서들의 명세서 항목
const statementList = computed(() => {
  if (!selectedContract.value) return []
  // 계약에 연결된 orders에서 명세서 생성 (미청구 항목)
  const orders = documentStore.orders?.filter((o) => o.contractId === contractId.value) || []
  return orders.map((order) => ({
    id: `INV-${order.id}`,
    orderId: order.id,
    supply: order.totalAmount || 0,
    status: documentStore.invoices?.some((inv) => inv.orderId === order.id) ? 'completed' : 'available',
    issueDate: order.createdAt || '',
  }))
})

// 선택된 명세서 set
const selectedIds = ref(new Set())
const currentFilter = ref('all')
const remarks = ref('')

const filteredStatements = computed(() => {
  const list = statementList.value
  if (currentFilter.value === 'all') return list
  return list.filter((s) => s.status === currentFilter.value)
})

// 전체 선택
const allAvailableSelected = computed(() => {
  const available = filteredStatements.value.filter((s) => s.status === 'available')
  if (available.length === 0) return false
  return available.every((s) => selectedIds.value.has(s.id))
})

function toggleAll(checked) {
  const available = filteredStatements.value.filter((s) => s.status === 'available')
  available.forEach((s) => {
    if (checked) selectedIds.value.add(s.id)
    else selectedIds.value.delete(s.id)
  })
  // trigger reactivity
  selectedIds.value = new Set(selectedIds.value)
}

function toggleStatement(id, checked) {
  if (checked) selectedIds.value.add(id)
  else selectedIds.value.delete(id)
  selectedIds.value = new Set(selectedIds.value)
}

// ── 금액 계산 ────────────────────────────────────────────
const selectedStatements = computed(() =>
    statementList.value.filter((s) => selectedIds.value.has(s.id))
)

const supplyAmount = computed(() => selectedStatements.value.reduce((sum, s) => sum + s.supply, 0))
const taxAmount = computed(() => Math.round(supplyAmount.value * 0.1))
const totalAmount = computed(() => supplyAmount.value + taxAmount.value)

const canCreate = computed(() => selectedStatements.value.length > 0)

// pending 모드에서는 available 명세서 자동 선택
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

onMounted(() => {
  void historyStore.ensureLoaded?.()
})

// ── 날짜 헬퍼 ────────────────────────────────────────────
const today = new Date()
const todayStr = today.toLocaleDateString('ko-KR')
const dueDate = new Date(today)
dueDate.setDate(dueDate.getDate() + 30)
const dueDateStr = dueDate.toLocaleDateString('ko-KR')
const invNo = computed(() =>
    `CINV-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`
)

// ── 모드별 UI 텍스트 ─────────────────────────────────────
const modeLabel = computed(() => {
  if (pageMode.value === 'pending') return '발행 대기'
  if (pageMode.value === 'issued') return '발행 완료'
  return '신규 청구서 발행'
})

const modeBannerClass = computed(() => {
  if (pageMode.value === 'pending') return 'bg-yellow-50 border-yellow-200 text-yellow-700'
  if (pageMode.value === 'issued') return 'bg-green-50 border-green-200 text-green-700'
  return 'bg-blue-50 border-blue-200 text-blue-700'
})

const isReadOnly = computed(() => pageMode.value === 'issued')

// ── 청구서 생성 ──────────────────────────────────────────
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
    mode: pageMode.value === 'pending' ? 'issued' : 'pending',
  })

  showSuccess.value = true
}

function onSuccessConfirm() {
  showSuccess.value = false
  router.push('/documents/invoices')
}
</script>

<template>
  <section>
    <!-- 브레드크럼 + 뒤로가기 -->
    <div class="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
      <p class="text-sm text-slate-500">
        영업 문서 &gt;
        <router-link to="/documents/invoices" class="text-blue-500 hover:underline">청구서 관리</router-link>
        &gt;
        <span class="font-semibold text-slate-800">{{ modeLabel }}</span>
      </p>
      <button
          type="button"
          class="rounded bg-slate-500 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          @click="router.push('/documents/invoices')"
      >
        뒤로가기
      </button>
    </div>

    <!-- 모드 배너 -->
    <div class="mb-5 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold" :class="modeBannerClass">
      <span v-if="pageMode === 'pending'">🕐 <strong>발행 대기</strong> — 명세서를 확인하고 청구서를 발행 확정하세요.</span>
      <span v-else-if="pageMode === 'issued'">✅ <strong>발행 완료</strong> — 발행 완료된 청구서입니다. 수정할 수 없습니다.</span>
      <span v-else>✨ <strong>신규 청구서 발행</strong> — 발행할 명세서를 선택하고 청구서를 생성하세요.</span>
    </div>

    <!-- 분할 레이아웃 (좌: 입력폼 / 우: PDF 미리보기) -->
    <div class="grid gap-5 xl:grid-cols-[1.2fr_500px]">

      <!-- ── 왼쪽 패널 ── -->
      <section class="space-y-5">

        <!-- 주문 요약 카드 (선택된 계약/거래처 정보) -->
        <article class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xl">📦</div>
          <div class="flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">계약 번호</p>
              <p class="text-sm font-bold text-blue-600">{{ selectedContract?.id || contractId || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">거래처명</p>
              <p class="text-sm font-bold text-slate-800">{{ selectedClientData?.name || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">청구 주기</p>
              <p class="text-sm font-bold text-slate-800">{{ selectedContract?.billingCycle || '—' }}</p>
            </div>
          </div>
        </article>

        <!-- 명세서 목록 -->
        <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span>📄</span>
            <span class="text-sm font-bold text-slate-800">명세서 목록</span>
            <span v-if="isReadOnly" class="ml-auto rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">🔒 읽기 전용</span>
            <span v-else-if="pageMode === 'pending'" class="ml-auto rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">✓ 자동 선택됨</span>
          </div>

          <!-- 필터 -->
          <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
            <span class="text-xs font-semibold text-slate-500">상태 필터</span>
            <button
                v-for="f in [['all','전체'], ['available','청구 가능'], ['completed','청구 완료']]"
                :key="f[0]"
                type="button"
                class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                :class="currentFilter === f[0]
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600'"
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
              <thead class="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th class="w-10 px-4 py-2.5">
                  <input
                      type="checkbox"
                      :disabled="isReadOnly"
                      :checked="allAvailableSelected"
                      class="rounded"
                      @change="e => toggleAll(e.target.checked)"
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
                  class="border-t border-slate-100"
                  :class="stmt.status === 'completed' ? 'opacity-50' : ''"
              >
                <td class="px-4 py-3">
                  <input
                      type="checkbox"
                      :disabled="isReadOnly || stmt.status === 'completed'"
                      :checked="selectedIds.has(stmt.id)"
                      class="rounded"
                      @change="e => toggleStatement(stmt.id, e.target.checked)"
                  />
                </td>
                <td class="px-4 py-3">
                  <p class="font-bold text-slate-800">{{ stmt.id }}</p>
                </td>
                <td class="px-4 py-3 text-slate-500">{{ stmt.orderId }}</td>
                <td class="px-4 py-3 text-right font-semibold text-slate-600">
                  ₩{{ stmt.supply.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-center">
                    <span
                        class="rounded-full px-2 py-0.5 text-xs font-bold"
                        :class="stmt.status === 'available'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-slate-100 text-slate-400'"
                    >
                      {{ stmt.status === 'available' ? '청구 가능' : '청구 완료' }}
                    </span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-400">{{ stmt.issueDate }}</td>
              </tr>
              <tr v-if="filteredStatements.length === 0">
                <td colspan="6" class="px-4 py-10 text-center text-slate-400">
                  조건에 맞는 명세서가 없습니다.
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </article>

        <!-- 선택 명세서 요약 -->
        <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span>💰</span>
            <span class="text-sm font-bold text-slate-800">선택 명세서 요약</span>
            <span class="ml-auto text-xs text-slate-400">실시간 계산</span>
          </div>
          <div class="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
            <div class="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-400">선택된 명세서</p>
              <p class="mt-1 text-xl font-extrabold text-indigo-700">{{ selectedStatements.length }}<span class="text-sm font-bold"> 건</span></p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">공급가액 합계</p>
              <p class="mt-1 text-xl font-extrabold text-slate-700"><span class="text-sm font-bold">₩</span>{{ supplyAmount.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">부가세 (10%)</p>
              <p class="mt-1 text-xl font-extrabold text-slate-700"><span class="text-sm font-bold">₩</span>{{ taxAmount.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-blue-400">총 청구 금액</p>
              <p class="mt-1 text-xl font-extrabold text-blue-700"><span class="text-sm font-bold">₩</span>{{ totalAmount.toLocaleString() }}</p>
            </div>
          </div>
        </article>

        <!-- 비고 -->
        <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span>✏️</span>
            <span class="text-sm font-bold text-slate-800">비고 (Remarks)</span>
            <span class="ml-auto text-xs text-slate-400">영업 히스토리 자동 기록</span>
          </div>
          <div class="p-5">
            <textarea
                v-model="remarks"
                :readonly="isReadOnly"
                maxlength="500"
                rows="3"
                class="w-full resize-vertical rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                :class="isReadOnly ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'bg-white'"
                placeholder="청구 관련 특이사항을 입력해 주세요. (예: 4월 정기 청구, 분기 결산 포함 등)"
            />
            <div class="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span>💡</span>
              <span>작성된 비고는 <strong>영업 히스토리에 자동 기록</strong>됩니다.</span>
              <span class="ml-auto">{{ remarks.length }} / 500</span>
            </div>
          </div>
        </article>

        <!-- 액션 바 -->
        <div v-if="!isReadOnly && isSalesRep" class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4">
          <p class="text-sm text-slate-400">
            선택된 명세서 <strong class="text-slate-600">{{ selectedStatements.length }}건</strong>
            &nbsp;·&nbsp; 총 <strong class="text-slate-600">₩{{ totalAmount.toLocaleString() }}</strong>
          </p>
          <div class="flex gap-2">
            <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                @click="router.push('/documents/invoices')"
            >
              취소
            </button>
            <button
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canCreate"
                @click="createInvoice"
            >
              {{ pageMode === 'pending' ? '✔ 청구서 발행 확정' : '✔ 청구서 생성' }}
            </button>
          </div>
        </div>

        <!-- 발행 완료 안내 -->
        <div v-if="isReadOnly" class="flex items-center justify-end rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-400">
          🔒 발행 완료된 청구서입니다. 수정 및 재발행이 불가합니다.
        </div>

      </section>

      <!-- ── 오른쪽 패널: PDF 미리보기 ── -->
      <section class="rounded-lg bg-[#525659] p-4">
        <div class="relative min-h-[750px] rounded bg-white p-8 text-[11px] text-black shadow [font-family:serif]">

          <!-- PDF 헤더 -->
          <div class="mb-6 flex items-start justify-between border-b-2 border-slate-700 pb-4">
            <div>
              <h1 class="text-2xl font-black tracking-[4px]">청 구 서</h1>
              <p class="mt-1 text-xs text-slate-500">{{ invNo }}</p>
            </div>
            <div class="text-right text-xs leading-relaxed text-slate-500">
              <p class="text-sm font-extrabold text-slate-800">㈜종자 코리아</p>
              <p>서울특별시 서초구 반포대로 88</p>
              <p>사업자등록번호: 123-45-67890</p>
              <p>담당: 영업팀 &nbsp;|&nbsp; 02-1234-5678</p>
            </div>
          </div>

          <!-- 메타 정보 테이블 -->
          <table class="mb-5 w-full border-collapse text-xs">
            <tr>
              <td class="w-20 border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">수신처</td>
              <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ selectedClientData?.name || '—' }}</td>
              <td class="w-20 border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">청구일</td>
              <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ todayStr }}</td>
            </tr>
            <tr>
              <td class="border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">계약 번호</td>
              <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ selectedContract?.id || contractId || '—' }}</td>
              <td class="border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500">납부 기한</td>
              <td class="border border-slate-200 px-3 py-1.5 font-semibold">{{ dueDateStr }}</td>
            </tr>
          </table>

          <!-- 명세서 내역 -->
          <p class="my-3 border-l-4 border-blue-600 pl-2 text-xs font-extrabold text-slate-800">▪ 청구 명세서 내역</p>
          <table class="mb-3 w-full border-collapse text-xs">
            <thead>
            <tr class="bg-slate-50">
              <th class="border border-slate-200 px-3 py-2 text-left">명세서 번호</th>
              <th class="border border-slate-200 px-3 py-2 text-left">발행일</th>
              <th class="border border-slate-200 px-3 py-2 text-right">공급가액</th>
              <th class="border border-slate-200 px-3 py-2 text-right">부가세</th>
              <th class="border border-slate-200 px-3 py-2 text-right">합계</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="stmt in selectedStatements" :key="stmt.id">
              <td class="border border-slate-200 px-3 py-2">{{ stmt.id }}</td>
              <td class="border border-slate-200 px-3 py-2">{{ stmt.issueDate }}</td>
              <td class="border border-slate-200 px-3 py-2 text-right">₩{{ stmt.supply.toLocaleString() }}</td>
              <td class="border border-slate-200 px-3 py-2 text-right">₩{{ Math.round(stmt.supply * 0.1).toLocaleString() }}</td>
              <td class="border border-slate-200 px-3 py-2 text-right">₩{{ (stmt.supply + Math.round(stmt.supply * 0.1)).toLocaleString() }}</td>
            </tr>
            <tr v-if="selectedStatements.length === 0">
              <td colspan="5" class="border border-slate-200 py-8 text-center text-slate-400">
                왼쪽에서 청구할 명세서를 선택해주세요.
              </td>
            </tr>
            <!-- 합계 행 -->
            <tr v-if="selectedStatements.length > 0" class="bg-blue-50 font-bold text-blue-700">
              <td colspan="2" class="border border-slate-200 px-3 py-2">합 계</td>
              <td class="border border-slate-200 px-3 py-2 text-right">₩{{ supplyAmount.toLocaleString() }}</td>
              <td class="border border-slate-200 px-3 py-2 text-right">₩{{ taxAmount.toLocaleString() }}</td>
              <td class="border border-slate-200 px-3 py-2 text-right">₩{{ totalAmount.toLocaleString() }}</td>
            </tr>
            </tbody>
          </table>

          <!-- 금액 박스 -->
          <table class="mt-2 w-full border-collapse text-xs">
            <tr>
              <td class="border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-700">공급가액</td>
              <td class="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-800">₩{{ supplyAmount.toLocaleString() }}</td>
              <td class="border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-700">부가세 (10%)</td>
              <td class="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-800">₩{{ taxAmount.toLocaleString() }}</td>
              <td class="border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-700">합계금액</td>
              <td class="border border-slate-300 px-3 py-2 text-right font-semibold text-slate-800">₩{{ totalAmount.toLocaleString() }}</td>
            </tr>
          </table>

          <!-- 서명란 -->
          <div class="mt-8 flex justify-end gap-10 border-t border-slate-200 pt-4">
            <div class="text-center text-[10px] text-slate-500">
              <div class="mx-auto mb-1.5 h-10 w-24 border-b border-slate-300"></div>
              거래처 확인
            </div>
            <div class="text-center text-[10px] text-slate-500">
              <div class="mx-auto mb-1.5 h-10 w-24 border-b border-slate-300"></div>
              담당 영업자
            </div>
            <div class="text-center text-[10px] text-slate-500">
              <div class="mx-auto mb-1.5 h-10 w-24 border-b border-slate-300"></div>
              팀장 결재
            </div>
          </div>

        </div>
      </section>

    </div>

    <!-- ── 청구 완료 오버레이 ── -->
    <Teleport to="body">
      <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
        <div class="rounded-2xl bg-white px-12 py-10 text-center shadow-2xl">
          <p class="mb-4 text-5xl">✅</p>
          <p class="text-xl font-extrabold text-slate-800">청구서가 생성되었습니다</p>
          <p class="mt-2 text-sm text-slate-500">
            {{ selectedStatements.length }}건의 명세서가 처리되었습니다.<br>
            총 청구 금액: <strong>₩{{ totalAmount.toLocaleString() }}</strong>
          </p>
          <button
              type="button"
              class="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              @click="onSuccessConfirm"
          >
            확인
          </button>
        </div>
      </div>
    </Teleport>

  </section>
</template>