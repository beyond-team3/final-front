<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CdrButton, IconListView, IconSort } from '@rei/cedar'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { getDocumentSummaries } from '@/api/document'
import HistoryModal from '@/components/history/HistoryModal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { DOC_STATUS } from '@/utils/constants'

const route = useRoute()

const DOC_TYPE_META = {
  RFQ: { label: '견적요청서', tone: 'rfq' },
  QUO: { label: '견적서', tone: 'quotation' },
  CNT: { label: '계약서', tone: 'contract' },
  ORD: { label: '주문서', tone: 'order' },
  STMT: { label: '명세서', tone: 'statement' },
  INV: { label: '청구서', tone: 'invoice' },
  PAY: { label: '입금확인서', tone: 'payment' },
}

const STATUS_META = {
  REQUESTED: { label: '요청됨', tone: 'pending' },
  QUOTED: { label: '견적 발행', tone: 'active' },
  CONTRACTED: { label: '계약 완료', tone: 'success' },
  ORDERED: { label: '주문 완료', tone: 'active' },
  ISSUED: { label: '발행 완료', tone: 'success' },
  PAID: { label: '입금 완료', tone: 'success' },
  CANCELED: { label: '취소', tone: 'danger' },
  REJECTED: { label: '반려', tone: 'danger' },
}

const EXCLUDED_DOC_TYPES = new Set(['PAY'])

const EMPTY_PAGE = {
  content: [],
  totalElements: 0,
  totalPages: 1,
  size: 10,
  number: 0,
}

const documentPage = ref(EMPTY_PAGE)
const isLoading = ref(false)
const loadError = ref('')

const keyword = ref('')
const debouncedKeyword = ref('')
const selectedDocType = ref('ALL')
const selectedStatus = ref('ALL')
const sortDirection = ref('desc')
const page = ref(1)
const pageSize = ref(10)
const selectedDocument = ref(null)
const isHistoryModalOpen = ref(false)
const showSortMenu = ref(false)
const showPageSizeMenu = ref(false)
let keywordDebounceTimer = null

const columns = [
  { key: 'docCode', label: '문서 코드', width: '12rem' },
  { key: 'docTypeLabel', label: '문서 유형', width: '8rem' },
  { key: 'clientName', label: '거래처', width: '10rem' },
  { key: 'ownerEmployeeName', label: '담당자', width: '8rem' },
  { key: 'expiredDateLabel', label: '만료일', width: '8rem' },
  { key: 'statusLabel', label: '상태', width: '8rem' },
  { key: 'createdAtLabel', label: '생성일', width: '10rem' },
]

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ko-KR')
}

const decorateDocument = (doc) => ({
  ...doc,
  docTypeLabel: DOC_TYPE_META[doc.docType]?.label || doc.docType,
  docTypeTone: DOC_TYPE_META[doc.docType]?.tone || 'default',
  statusLabel: STATUS_META[doc.status]?.label || doc.status,
  statusTone: STATUS_META[doc.status]?.tone || 'default',
  expiredDateLabel: formatDate(doc.expiredDate),
  createdAtLabel: formatDate(doc.createdAt),
  ownerEmployeeName: doc.ownerEmployeeName || '-',
  clientName: doc.clientName || '-',
})

const normalizePageResponse = (response) => {
  const payload = response?.data ?? response
  const pageData = payload?.content
      ? payload
      : payload?.result === 'SUCCESS' && payload?.data
          ? payload.data
          : null

  if (!pageData || !Array.isArray(pageData.content)) {
    return null
  }

  return {
    content: pageData.content,
    totalElements: Number(pageData.totalElements ?? pageData.content.length ?? 0),
    totalPages: Number(pageData.totalPages ?? 1),
    size: Number(pageData.size ?? 20),
    number: Number(pageData.number ?? 0),
  }
}

const loadDocuments = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    const response = await getDocumentSummaries({
      page: page.value - 1,
      size: pageSize.value,
      sort: `createdAt,${sortDirection.value}`,
      docType: selectedDocType.value === 'ALL' ? undefined : selectedDocType.value,
      status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value,
      keyword: debouncedKeyword.value.trim() || undefined,
    })
    const normalized = normalizePageResponse(response)

    if (!normalized) {
      documentPage.value = EMPTY_PAGE
      return
    }

    const filteredContent = normalized.content.filter(
        (doc) => !EXCLUDED_DOC_TYPES.has(String(doc?.docType || '').toUpperCase()),
    )

    documentPage.value = {
      ...normalized,
      content: filteredContent,
      totalElements: filteredContent.length,
      totalPages: Math.max(1, Math.ceil(filteredContent.length / Number(normalized.size || pageSize.value || 10))),
    }
  } catch (error) {
    documentPage.value = EMPTY_PAGE
    loadError.value = error?.response?.data?.message || error?.message || '문서 조회 API 연결에 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDocuments()
})

const allDocuments = computed(() =>
    documentPage.value.content
        .filter((doc) => !EXCLUDED_DOC_TYPES.has(String(doc?.docType || '').toUpperCase()))
        .map(decorateDocument),
)

const docTypeOptions = computed(() => [
  { value: 'ALL', label: '전체 문서 유형' },
  ...Array.from(new Set(allDocuments.value.map((doc) => doc.docType)))
      .filter(Boolean)
      .map((value) => ({ value, label: DOC_TYPE_META[value]?.label || value })),
])

const statusOptions = computed(() => {
  const options = [{ value: 'ALL', label: '전체 상태' }]
  
  // 선택된 문서 유형에 해당하는 상태들만 추출
  if (selectedDocType.value !== 'ALL') {
    const typeKey = selectedDocType.value // RFQ, QUO 등 (StatusBadge의 TYPE_MAP이 처리함)
    // 하지만 여기서는 DOC_STATUS 키를 직접 찾아야 할 수도 있음
    const TYPE_MAP = { RFQ: 'QUOTATION_REQUEST', QUO: 'QUOTATION', CNT: 'CONTRACT', ORD: 'ORDER', STMT: 'STATEMENT', INV: 'INVOICE' }
    const fullType = TYPE_MAP[typeKey] || typeKey
    
    if (DOC_STATUS[fullType]) {
      Object.entries(DOC_STATUS[fullType]).forEach(([key, val]) => {
        options.push({ value: key, label: val.label })
      })
      return options
    }
  }

  // 전체인 경우 모든 상태 합집합 (기존 STATUS_META 참고)
  const allStatuses = new Set()
  Object.values(DOC_STATUS).forEach(typeObj => {
    Object.entries(typeObj).forEach(([key, val]) => {
      if (!allStatuses.has(key)) {
        allStatuses.add(key)
        options.push({ value: key, label: val.label })
      }
    })
  })
  
  return options
})

const totalPages = computed(() => Math.max(1, documentPage.value.totalPages || 1))
const totalElements = computed(() => Number(documentPage.value.totalElements || 0))
const pagedDocuments = computed(() => allDocuments.value)

const visibleStart = computed(() => {
  if (totalElements.value === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

const visibleEnd = computed(() => {
  if (totalElements.value === 0) return 0
  return Math.min(page.value * pageSize.value, totalElements.value)
})

const resetPage = () => {
  page.value = 1
}

watch(totalPages, (nextTotalPages) => {
  if (page.value > nextTotalPages) {
    page.value = nextTotalPages
  }
}, { immediate: true })

watch(keyword, (value) => {
  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer)
  }
  keywordDebounceTimer = setTimeout(() => {
    debouncedKeyword.value = value
  }, 250)
})

watch([selectedDocType, selectedStatus, sortDirection, pageSize], () => {
  resetPage()
})

watch([debouncedKeyword, selectedDocType, selectedStatus, sortDirection, pageSize, page], () => {
  loadDocuments()
})

watch(() => route.query.documentId, (documentId) => {
  if (!documentId) return
  const matched = allDocuments.value.find((doc) => String(doc.docId) === String(documentId) || doc.surrogateId === String(documentId))
  if (matched) {
    selectedDocument.value = matched
    isHistoryModalOpen.value = true
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer)
  }
})

const openDocument = (row) => {
  selectedDocument.value = row
  isHistoryModalOpen.value = true
}

const closeDetail = () => {
  isHistoryModalOpen.value = false
}

watch(isHistoryModalOpen, (val) => {
  if (!val) {
    selectedDocument.value = null
  }
})

const docTypeBadgeStyle = (tone) => ({
  rfq: { backgroundColor: 'var(--color-orange-light)', color: 'var(--color-orange-dark)' },
  quotation: { backgroundColor: 'var(--color-orange-light)', color: 'var(--color-orange-dark)' },
  contract: { backgroundColor: 'var(--color-olive-light)', color: 'var(--color-olive-dark)' },
  order: { backgroundColor: 'var(--color-bg-section)', color: 'var(--color-text-body)' },
  statement: { backgroundColor: '#D6DDE6', color: 'var(--color-status-info)' },
  invoice: { backgroundColor: '#D6DDE6', color: 'var(--color-status-info)' },
  payment: { backgroundColor: 'var(--color-olive-light)', color: 'var(--color-olive-dark)' },
  default: { backgroundColor: 'var(--color-bg-section)', color: 'var(--color-text-body)' },
}[tone] || { backgroundColor: 'var(--color-bg-section)', color: 'var(--color-text-body)' })

const statusBadgeStyle = (tone) => ({
  success: { backgroundColor: 'var(--color-olive-light)', color: 'var(--color-status-success)' },
  active: { backgroundColor: 'var(--color-orange-light)', color: 'var(--color-status-warning)' },
  pending: { backgroundColor: '#D6DDE6', color: 'var(--color-status-info)' },
  danger: { backgroundColor: '#F0D4D4', color: 'var(--color-status-error)' },
  default: { backgroundColor: 'var(--color-bg-section)', color: 'var(--color-text-body)' },
}[tone] || { backgroundColor: 'var(--color-bg-section)', color: 'var(--color-text-body)' })

const applySortDirection = (direction) => {
  sortDirection.value = direction
  showSortMenu.value = false
}

const applyPageSize = (size) => {
  pageSize.value = size
  showPageSizeMenu.value = false
}
</script>

<template>
    <section class="screen-content document-summary-page">
      <div class="mb-5 flex items-center justify-between border-b pb-[15px]" style="border-color: #E8E3D8;">
        <div>
          <h2 class="text-2xl font-semibold" style="color: #3D3529;">모든 문서</h2>
          <p class="mt-1 text-xs" style="color: #9A8C7E;">
            총 {{ totalElements }}건
          </p>
        </div>
      </div>

      <div
          v-if="loadError"
          class="mb-4 rounded-lg border px-4 py-3 text-sm"
          style="border-color: #E1B4B4; background-color: #F8E3E3; color: #9D4B4B;"
      >
        {{ loadError }}
      </div>

      <section class="mb-5 rounded-[10px] border p-[18px] shadow-[0_1px_2px_rgba(61,53,41,0.06)]" style="background-color: #EFEADF; border-color: #DDD7CE;">
        <div class="grid gap-3 xl:grid-cols-[minmax(0,2.2fr)_repeat(2,minmax(0,1fr))_auto_auto]">
          <label class="flex flex-col gap-2">
            <input
                v-model="keyword"
                type="text"
                class="h-10 rounded border px-3 text-sm outline-none focus:ring-1 focus:ring-[#7A8C42]"
                style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;"
                placeholder="문서 ID, 코드, 거래처, 담당자 검색"
            >
          </label>

          <label class="flex flex-col gap-2">
            <select
                v-model="selectedDocType"
                class="h-10 rounded border px-3 text-sm outline-none focus:ring-1 focus:ring-[#7A8C42]"
                style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;"
            >
              <option v-for="option in docTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="flex flex-col gap-2">
            <select
                v-model="selectedStatus"
                class="h-10 rounded border px-3 text-sm outline-none focus:ring-1 focus:ring-[#7A8C42]"
                style="background-color: #FAF7F3; border-color: #DDD7CE; color: #3D3529;"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <div class="flex flex-col gap-2">
            <div class="relative filter-popover">
              <CdrButton
                  type="button"
                  modifier="secondary"
                  icon-only
                  with-background
                  class="filter-icon-btn"
                  :aria-expanded="showSortMenu"
                  aria-label="정렬 선택"
                  @click="showSortMenu = !showSortMenu; showPageSizeMenu = false"
              >
                <IconSort />
              </CdrButton>
              <div v-if="showSortMenu" class="filter-dropdown document-filter-dropdown" @click.stop>
                <button type="button" class="filter-dropdown-item" :class="{ active: sortDirection === 'desc' }" @click="applySortDirection('desc')">
                  최신순
                </button>
                <button type="button" class="filter-dropdown-item" :class="{ active: sortDirection === 'asc' }" @click="applySortDirection('asc')">
                  오래된순
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="relative filter-popover">
              <CdrButton
                  type="button"
                  modifier="secondary"
                  icon-only
                  with-background
                  class="filter-icon-btn"
                  :aria-expanded="showPageSizeMenu"
                  aria-label="페이지 크기 선택"
                  @click="showPageSizeMenu = !showPageSizeMenu; showSortMenu = false"
              >
                <IconListView />
              </CdrButton>
              <div v-if="showPageSizeMenu" class="filter-dropdown document-filter-dropdown" @click.stop>
                <button type="button" class="filter-dropdown-item" :class="{ active: pageSize === 5 }" @click="applyPageSize(5)">
                  5개씩
                </button>
                <button type="button" class="filter-dropdown-item" :class="{ active: pageSize === 10 }" @click="applyPageSize(10)">
                  10개씩
                </button>
                <button type="button" class="filter-dropdown-item" :class="{ active: pageSize === 20 }" @click="applyPageSize(20)">
                  20개씩
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DataTable
          :columns="columns"
          :rows="pagedDocuments"
          row-key="surrogateId"
          :loading="isLoading"
          empty-text="조건에 맞는 문서가 없습니다."
          @row-click="openDocument"
      >
        <template #cell-docTypeLabel="{ row }">
          <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap" :style="docTypeBadgeStyle(row.docTypeTone)">
            {{ row.docTypeLabel }}
          </span>
        </template>

        <template #cell-statusLabel="{ row }">
          <StatusBadge :type="row.docType" :status="row.status" />
        </template>

        <template #footer>
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p class="text-sm" style="color: #9A8C7E;">
              총 {{ totalElements }}건 중
              {{ visibleStart }}-{{ visibleEnd }}건 표시
            </p>
            <PaginationControls v-model="page" :total-pages="totalPages" />
          </div>
        </template>
      </DataTable>

      <HistoryModal
          v-model="isHistoryModalOpen"
          :title="selectedDocument?.docCode || '문서 상세'"
          :doc-id="String(selectedDocument?.docId || '')"
          :doc-type="selectedDocument?.docTypeLabel || selectedDocument?.docType || ''"
      />
    </section>
</template>

<style scoped>
.document-summary-page :deep(.table thead th) {
  background: #efeadf;
  color: #6b5f50;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 1px solid #ddd7ce;
}

.document-summary-page :deep(.table tbody tr) {
  cursor: pointer;
}

.document-summary-page :deep(.table tbody tr:hover) {
  background: #faf7f3;
}

.document-summary-page :deep(.table tbody td) {
  color: #3d3529;
  vertical-align: middle;
  border-top: 1px solid #e8e3d8;
}

.document-summary-page :deep(.app-data-table) {
  border: 1px solid #ddd7ce;
  border-radius: 0.5rem;
  background: #f7f3ec;
  box-shadow: none;
}

.document-summary-page :deep(.app-data-table .border-t) {
  border-color: #ddd7ce !important;
}

.document-summary-page :deep(.pager) {
  gap: 8px;
}

.document-summary-page :deep(.page-btn) {
  min-width: 36px;
  height: 36px;
  border-radius: 0.375rem;
  border: 1px solid #ddd7ce;
  background: #faf7f3;
  color: #6b5f50;
  font-size: 13px;
  font-weight: 600;
}

.document-summary-page :deep(.page-btn.active) {
  background: #c8622a;
  border-color: #c8622a;
  color: #fff;
}

.document-summary-page :deep(.page-btn:disabled) {
  opacity: 0.5;
  cursor: default;
}

.filter-popover {
  position: relative;
}

.document-summary-page :deep(.filter-icon-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  min-height: 44px;
  height: 44px;
  padding: 0;
  border-radius: 10px;
  border: none;
  background: rgba(122, 140, 66, 0.28);
  color: var(--color-olive-dark, #586830);
  box-shadow: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.document-summary-page :deep(.filter-icon-btn:hover),
.document-summary-page :deep(.filter-icon-btn:focus) {
  background: var(--color-olive, #7A8C42);
  color: #fff;
}

.document-summary-page :deep(.filter-icon-btn:active) {
  background: var(--color-olive-dark, #586830);
  color: #fff;
}

.document-summary-page :deep(.filter-icon-btn svg) {
  width: 20px;
  height: 20px;
  margin: 0;
  fill: currentColor;
}

.document-filter-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  min-width: 130px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  box-shadow: 0 6px 16px rgba(61, 53, 41, 0.12);
}

.document-filter-dropdown .filter-dropdown-item {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 12px;
  color: var(--color-text-body, #6B5F50);
  text-align: left;
  cursor: pointer;
}

.document-filter-dropdown .filter-dropdown-item:hover {
  background: var(--color-bg-section, #EFEADF);
  color: var(--color-text-strong, #3D3529);
}

.document-filter-dropdown .filter-dropdown-item.active {
  background: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
  font-weight: 700;
}
</style>
