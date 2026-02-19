<script setup>
import { computed, ref } from 'vue'
import { useDocumentStore } from '@/stores/document'
import HistoryModal from '@/components/history/HistoryModal.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const documentStore = useDocumentStore()
const authStore = useAuthStore()

const searchText = ref('')
const selectedType = ref('ALL')
const selectedStatus = ref('ALL')
const isModalOpen = ref(false)
const selectedDoc = ref(null)

const fallbackRows = [
  { id: 'QR-001', type: '견적요청서', date: '2026-01-15', amount: '-', status: '승인완료', remark: '초기 요청 문서', rejectReason: '' },
  { id: 'EST-005', type: '견적서', date: '2026-01-29', amount: '8,500,000원', status: '반려', remark: '수정안 제출', rejectReason: '단가 증빙 누락' },
  { id: 'CON-001', type: '계약서', date: '2026-01-22', amount: '15,000,000원', status: '진행중', remark: '특약 검토 중', rejectReason: '' },
  { id: 'OD-001', type: '주문서', date: '2026-01-25', amount: '15,000,000원', status: '주문완료', remark: '납기 확정', rejectReason: '' },
  { id: 'SP-001', type: '명세서', date: '2026-01-26', amount: '15,000,000원', status: '발행완료', remark: '출고 명세', rejectReason: '' },
  { id: 'IV-001', type: '청구서', date: '2026-01-27', amount: '16,500,000원', status: '발행대기', remark: '세금계산서 대기', rejectReason: '' },
] // TODO: API 연결

const normalizeStatus = (status) => {
  if (status === 'REQUESTED') return '요청완료'
  if (status === 'QUOTED') return '견적완료'
  if (status === 'ISSUED') return '승인완료'
  if (status === 'CONTRACTED') return '계약진행'
  if (status === 'ACTIVE') return '진행중'
  if (status === 'ORDERED') return '주문완료'
  if (status === 'pending') return '대기중'
  if (status === 'issued') return '발행완료'
  return status || '-'
}

const sourceRows = computed(() => {
  const formatAmount = (value) => {
    const amount = Number(value || 0)
    return amount > 0 ? `${amount.toLocaleString()}원` : '-'
  }

  const dynamicRows = [
    ...documentStore.quotationRequests.map((doc) => ({
      id: doc.id,
      type: '견적요청서',
      date: doc.createdAt,
      amount: formatAmount(doc.totalAmount),
      status: normalizeStatus(doc.status),
      remark: doc.requirements || '',
      rejectReason: '',
    })),
    ...documentStore.quotations.map((doc) => ({
      id: doc.id,
      type: '견적서',
      date: doc.createdAt,
      amount: formatAmount(doc.totalAmount),
      status: normalizeStatus(doc.status),
      remark: doc.memo || '',
      rejectReason: '',
    })),
    ...documentStore.contracts.map((doc) => ({
      id: doc.id,
      type: '계약서',
      date: doc.createdAt,
      amount: formatAmount(doc.totalAmount),
      status: normalizeStatus(doc.status),
      remark: doc.specialTerms || '',
      rejectReason: '',
    })),
    ...documentStore.orders.map((doc) => ({
      id: doc.id,
      type: '주문서',
      date: doc.createdAt,
      amount: formatAmount(doc.totalAmount),
      status: normalizeStatus(doc.status),
      remark: doc.memo || '',
      rejectReason: '',
    })),
    ...documentStore.invoices
      .filter((doc) => doc.status === 'issued')
      .map((doc) => ({
        id: `${doc.id}-S`,
        type: '명세서',
        date: doc.createdAt,
        amount: formatAmount(doc.totalAmount),
        status: '발행완료',
        remark: doc.remarks || '',
        rejectReason: '',
      })),
    ...documentStore.invoices.map((doc) => ({
      id: doc.id,
      type: '청구서',
      date: doc.createdAt,
      amount: formatAmount(doc.totalAmount),
      status: normalizeStatus(doc.status),
      remark: doc.remarks || '',
      rejectReason: '',
    })),
  ]

  if (dynamicRows.length > 0) {
    return dynamicRows
  }

  if (authStore.currentRole === ROLES.CLIENT) {
    return []
  }

  return fallbackRows
})

const typeOptions = computed(() => ['ALL', ...new Set(sourceRows.value.map((row) => row.type))])
const statusOptions = computed(() => ['ALL', ...new Set(sourceRows.value.map((row) => row.status))])

const filteredRows = computed(() => {
  return sourceRows.value.filter((row) => {
    const matchType = selectedType.value === 'ALL' || row.type === selectedType.value
    const matchStatus = selectedStatus.value === 'ALL' || row.status === selectedStatus.value
    const keyword = searchText.value.trim().toLowerCase()
    const matchSearch = keyword.length === 0
      || row.id.toLowerCase().includes(keyword)
      || row.type.toLowerCase().includes(keyword)
    return matchType && matchStatus && matchSearch
  })
})

const statusClass = (status) => {
  if (status.includes('완료') || status.includes('승인')) return 'bg-emerald-100 text-emerald-800'
  if (status.includes('반려')) return 'bg-red-100 text-red-700'
  if (status.includes('진행')) return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}

const openDetail = (row) => {
  selectedDoc.value = row
  isModalOpen.value = true
}

const modalMode = computed(() => {
  if (!selectedDoc.value) {
    return 'sales-clean'
  }

  if (selectedDoc.value.status.includes('반려')) {
    return authStore.currentRole === ROLES.ADMIN ? 'admin-rejected' : 'sales-rejected'
  }

  return 'sales-clean'
})

const shouldHideRemark = computed(() => {
  return authStore.currentRole === ROLES.ADMIN || authStore.currentRole === ROLES.CLIENT
})
const canDownload = computed(() => {
  return authStore.currentRole === ROLES.SALES_REP
    || authStore.currentRole === ROLES.ADMIN
    || authStore.currentRole === ROLES.CLIENT
})
</script>

<template>
  <section class="mx-auto max-w-[1400px]">
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">모든 문서</h1>
      <p class="mt-1 text-sm text-slate-500">작성된 전체 문서를 조회하고 검색할 수 있습니다.</p>
    </header>

    <section class="mb-6 rounded-lg bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-3">
        <input
          v-model="searchText"
          type="text"
          class="h-10 min-w-60 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
          placeholder="문서번호 또는 문서유형 검색"
        >

        <select v-model="selectedType" class="h-10 rounded-lg border border-slate-300 px-3 text-sm">
          <option v-for="type in typeOptions" :key="type" :value="type">
            {{ type === 'ALL' ? '문서유형 전체' : type }}
          </option>
        </select>

        <select v-model="selectedStatus" class="h-10 rounded-lg border border-slate-300 px-3 text-sm">
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ status === 'ALL' ? '상태 전체' : status }}
          </option>
        </select>
      </div>
    </section>

    <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table v-if="filteredRows.length > 0" class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-slate-50 text-left text-slate-700">
            <th class="px-6 py-3 font-semibold">문서번호</th>
            <th class="px-6 py-3 font-semibold">문서유형</th>
            <th class="px-6 py-3 font-semibold">작성일</th>
            <th class="px-6 py-3 font-semibold">금액</th>
            <th class="px-6 py-3 font-semibold">상태</th>
            <th class="px-6 py-3 font-semibold">액션</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="`${row.type}-${row.id}`"
            class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
            @click="openDetail(row)"
          >
            <td class="px-6 py-4 font-medium text-slate-800 hover:text-blue-700">{{ row.id }}</td>
            <td class="px-6 py-4">{{ row.type }}</td>
            <td class="px-6 py-4">{{ row.date }}</td>
            <td class="px-6 py-4">{{ row.amount }}</td>
            <td class="px-6 py-4">
              <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusClass(row.status)">{{ row.status }}</span>
            </td>
            <td class="px-6 py-4">
              <button
                type="button"
                class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                @click.stop="openDetail(row)"
              >
                보기
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="p-16 text-center text-slate-400">
        <p class="text-base">검색 조건에 맞는 문서가 없습니다.</p>
      </div>
    </section>

    <HistoryModal
      v-model="isModalOpen"
      :title="selectedDoc ? selectedDoc.id : '문서 상세'"
      :mode="modalMode"
      :show-download="canDownload"
      :hide-remark="shouldHideRemark"
      :remark="selectedDoc ? selectedDoc.remark : ''"
      :reject-reason="selectedDoc ? selectedDoc.rejectReason : ''"
    />
  </section>
</template>
