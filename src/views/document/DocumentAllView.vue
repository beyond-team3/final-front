<script setup>
import { computed, ref, onMounted } from 'vue'
import { useDocumentStore } from '@/stores/document'
import { useHistoryStore } from '@/stores/history'
import HistoryModal from '@/components/history/HistoryModal.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const documentStore = useDocumentStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

const searchText = ref('')
const selectedType = ref('ALL')
const selectedStatus = ref('ALL')
const isModalOpen = ref(false)
const selectedDoc = ref(null)

/**
 * 💡 [디버깅 & 초기화]
 * 페이지 진입 시 데이터가 없으면 스토어에 요청
 */
onMounted(async () => {
  // 스토어가 비어있을 때만 데이터를 호출
  if (!documentStore.loading) {
    await Promise.all([
      documentStore.fetchDocumentsV2(),
      documentStore.fetchClientMaster(),
      documentStore.fetchStatements(),
      historyStore.fetchPipelines()
    ])
  }
})

/**
 * 🛠️ [상태 정규화]
 */
const normalizeStatus = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'REQUESTED' || s === '검토중' || s === 'REQUEST') return '요청완료'
  if (s === 'QUOTED' || s === '승인' || s === 'ISSUED') return '승인완료'
  if (s === 'CONTRACTED' || s === '체결') return '계약체결'
  if (s === 'ACTIVE' || s === '진행중') return '진행중'
  if (s === 'ORDERED' || s === '처리중') return '주문완료'
  if (s === 'PENDING' || s === '대기') return '대기중'
  if (s === 'ISSUED_FINAL' || s === '발행') return '발행완료'
  return status || '-'
}

/**
 * 🎯 [핵심] 역할별 데이터 필터링 및 매핑
 */
const sourceRows = computed(() => {
  const formatAmount = (v) => (Number(v || 0) > 0 ? `${Number(v).toLocaleString()}원` : '-')

  // 1. [History 데이터 통합] 히스토리 데이터는 보조 정보로 활용
  let historyDocsMap = new Map()
  if (historyStore.pipelines) {
    historyStore.pipelines.forEach(h => {
      if (Array.isArray(h.documents)) {
        h.documents.forEach(d => {
          historyDocsMap.set(String(d.id), { ...d, clientId: h.clientId, fromHistory: true })
        })
      }
    })
  }

  // 2. 모든 소스 통합 (백엔드에서 이미 본인 권한에 맞는 데이터만 내려옴)
  const allRawDocs = [
    ...documentStore.quotationRequests.map(d => ({ ...d, typeLabel: '견적요청서' })),
    ...documentStore.quotations.map(d => ({ ...d, typeLabel: '견적서' })),
    ...documentStore.contracts.map(d => ({ ...d, typeLabel: '계약서' })),
    ...documentStore.orders.map(d => ({ ...d, typeLabel: '주문서' })),
    ...documentStore.invoices.map(d => ({ ...d, typeLabel: String(d.status).toUpperCase() === 'ISSUED' ? '명세서' : '청구서' }))
  ]

  // 3. 히스토리에는 있지만 스토어 목록엔 없는 데이터 보완 (생성 직후 등)
  const finalDocs = [...allRawDocs]
  historyDocsMap.forEach((hDoc, id) => {
    if (!finalDocs.some(d => String(d.id) === id)) {
      finalDocs.push(hDoc)
    }
  })

  // 4. 데이터 정규화 및 최신순 정렬
  return finalDocs
      .map(doc => ({
        id: doc.id,
        displayCode: doc.displayCode || doc.id,
        type: doc.typeLabel || doc.type,
        date: doc.date || doc.createdAt || '-',
        amount: formatAmount(doc.totalAmount || doc.amount),
        status: normalizeStatus(doc.status),
        remark: doc.memo || doc.remarks || doc.requirements || doc.remark || '',
        authorId: doc.authorId,
        clientId: doc.clientId,
        rejectReason: doc.rejectReason || ''
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // 최신순
})

/**
 * 🔍 [UI 필터 및 검색]
 */
const typeOptions = computed(() => ['ALL', ...new Set(sourceRows.value.map(r => r.type))])
const statusOptions = computed(() => ['ALL', ...new Set(sourceRows.value.map(r => r.status))])

const filteredRows = computed(() => {
  return sourceRows.value.filter(row => {
    const matchType = selectedType.value === 'ALL' || row.type === selectedType.value
    const matchStatus = selectedStatus.value === 'ALL' || row.status === selectedStatus.value
    const kw = searchText.value.trim().toLowerCase()
    const matchSearch = kw === ''
        || String(row.displayCode || row.id).toLowerCase().includes(kw)
        || row.type.toLowerCase().includes(kw)
    return matchType && matchStatus && matchSearch
  })
})

const statusClass = (s) => {
  if (s.includes('완료') || s.includes('승인') || s.includes('체결')) return 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
  if (s.includes('반려')) return 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
  if (s.includes('진행') || s.includes('처리')) return 'bg-[var(--color-olive-light)] text-[var(--color-olive)]'
  return 'bg-[var(--color-sidebar-hover)] text-[var(--color-muted)]'
}

const openDetail = (row) => {
  selectedDoc.value = row
  isModalOpen.value = true
}
</script>

<template>
  <main style="background-color: #EDE8DF; min-height: 100vh;">
    <section class="mx-auto max-w-[1400px] p-6">
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900" style="font-family: 'KoPub Dotum', sans-serif !important;">모든 문서</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ authStore.me?.name }}님, 총 {{ sourceRows.length }}건을 찾았습니다.
        </p>
      </header>

      <div class="mb-6 flex flex-wrap gap-3 p-4 shadow-sm rounded-lg border border-slate-200" style="background-color: var(--color-bg-card);">
        <input
            v-model="searchText"
            type="text"
            class="flex-1 min-w-[250px] border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-olive)] focus:outline-none"
            style="background-color: var(--color-bg-input);"
            placeholder="문서코드 또는 유형 검색..."
        >
        <select v-model="selectedType" class="border border-slate-300 p-2 rounded-lg text-sm" style="background-color: var(--color-bg-input);">
          <option v-for="t in typeOptions" :key="t" :value="t">{{ t === 'ALL' ? '문서유형 전체' : t }}</option>
        </select>
        <select v-model="selectedStatus" class="border border-slate-300 p-2 rounded-lg text-sm" style="background-color: var(--color-bg-input);">
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s === 'ALL' ? '상태 전체' : s }}</option>
        </select>
      </div>

      <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm" style="background-color: var(--color-bg-card);">
        <table v-if="filteredRows.length > 0" class="w-full text-left text-sm border-collapse">
          <thead class="bg-[var(--color-sidebar-hover)] border-b border-slate-200">
          <tr>
            <th class="p-4 font-semibold text-[var(--color-text)]">문서코드</th>
            <th class="p-4 font-semibold text-[var(--color-text)]">문서유형</th>
            <th class="p-4 font-semibold text-[var(--color-text)]">작성일</th>
            <th class="p-4 font-semibold text-[var(--color-text)]">금액</th>
            <th class="p-4 font-semibold text-[var(--color-text)]">상태</th>
            <th class="p-4 font-semibold text-[var(--color-text)] text-center">작업</th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="row in filteredRows"
              :key="`${row.type}-${row.id}`"
              class="border-b border-slate-100 hover:bg-[var(--color-sidebar-hover)] cursor-pointer transition-colors"
              @click="openDetail(row)"
          >
            <td class="p-4 font-medium text-[var(--color-olive)]">{{ row.displayCode }}</td>
            <td class="p-4 text-[var(--color-muted)]">{{ row.type }}</td>
            <td class="p-4 text-[var(--color-muted)]">{{ row.date }}</td>
            <td class="p-4 font-mono text-[var(--color-text)]">{{ row.amount }}</td>
            <td class="p-4">
                <span :class="statusClass(row.status)" class="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                  {{ row.status }}
                </span>
            </td>
            <td class="p-4 text-center">
              <button
                  class="border border-[var(--color-olive)] px-3 py-1 rounded-md text-[var(--color-olive)] hover:bg-[var(--color-olive-light)] transition-colors"
                  style="background-color: var(--color-bg-input);"
                  @click.stop="openDetail(row)"
              >
                상세보기
              </button>
            </td>
          </tr>
          </tbody>
        </table>

        <div v-else class="p-20 text-center">
          <div v-if="documentStore.loading" class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div v-else class="text-slate-400">
            <p class="text-lg font-bold">작성된 문서가 없습니다.</p>
          </div>
        </div>
      </div>

      <HistoryModal
          v-model="isModalOpen"
          :title="String(selectedDoc?.displayCode || selectedDoc?.id || '문서 상세')"
          :doc-id="String(selectedDoc?.id || '')"
          :doc-type="String(selectedDoc?.type || '')"
          :remark="selectedDoc?.remark"
          :reject-reason="selectedDoc?.rejectReason"
      />
    </section>
  </main>
</template>
