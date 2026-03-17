<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDocumentSummaries } from '@/api/document'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import HistoryModal from '@/components/history/HistoryModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useAuthStore } from '@/stores/auth'
import { useHistoryStore } from '@/stores/history'
import { DEAL_PIPELINE, formatDate } from '@/utils/dealHistory'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const historyStore = useHistoryStore()

const searchText = ref('')
const appliedSearchText = ref('')
const isModalOpen = ref(false)
const selectedDoc = ref(null)
const summaryDocuments = ref([])
const summaryLoading = ref(false)
const summaryError = ref('')

const normalizeTab = (tab) => {
  const map = {
    요청: '견적요청서',
    견적: '견적서',
    계약: '계약서',
    주문: '주문서',
    명세: '명세서',
    청구: '청구서',
    결제: '결제',
  }

  return map[tab] || tab
}
const currentTab = ref(typeof route.query.title === 'string' ? normalizeTab(route.query.title) : '견적요청서')
const STEP_SHORT_LABEL = {
  견적요청서: '요청',
  견적서: '견적',
  계약서: '계약',
  주문서: '주문',
  명세서: '명세',
  청구서: '청구',
  결제: '결제',
}

const pipeline = computed(() => historyStore.getPipelineById(route.query.pipelineId))
const pageTitle = computed(() => `${currentTab.value} 목록`)
const currentStageLabel = computed(() => pipeline.value?.latestDocTypeLabel || '')
const pageError = computed(() => historyStore.error || summaryError.value)
const isPageLoading = computed(() => historyStore.loading || summaryLoading.value)

const normalizePageResponse = (response) => {
  const payload = response?.data ?? response
  const pageData = payload?.content
      ? payload
      : payload?.result === 'SUCCESS' && payload?.data
          ? payload.data
          : null

  if (!pageData || !Array.isArray(pageData.content)) {
    return []
  }

  return pageData.content
}

const summaryDocumentMap = computed(() => new Map(
  summaryDocuments.value.map((doc) => [`${String(doc.docType || '').toUpperCase()}-${String(doc.docId)}`, doc]),
))

const stepsData = computed(() => {
  const base = (pipeline.value?.steps || DEAL_PIPELINE).map((step) => step.label)
  const stepMap = new Map((pipeline.value?.steps || []).map((step) => [step.label, step.state]))
  return base.map((name) => {
    const state = stepMap.get(name) || 'pending'
    return { name, status: state }
  })
})

const documents = computed(() => (pipeline.value?.documents || []).map((doc) => {
  const summary = summaryDocumentMap.value.get(`${String(doc.type || '').toUpperCase()}-${String(doc.id)}`)
  const statusText = doc.statusLabel || doc.status || '진행중'
  const statusClass = statusText.includes('완료') || statusText.includes('발행')
      ? 'bg-[var(--color-olive-light)] text-[var(--color-olive-dark)]'
      : 'bg-[var(--color-orange-light)] text-[var(--color-orange-dark)]'
  const amount = summary?.amount ?? doc.amount
  const createdAt = summary?.createdAt || doc.actionAt || null

  return {
    id: summary?.docId || doc.id,
    type: doc.typeLabel,
    date: formatDate(createdAt),
    displayCode: summary?.docCode || doc.displayCode || doc.id,
    amount: Number(amount || 0) > 0 ? `${Number(amount).toLocaleString()}원` : '-',
    status: doc.status,
    statusLabel: statusText,
    statusClass,
    remark: doc.remark || '',
    rejectReason: '',
  }
}))

const loadSummaryDocuments = async () => {
  const pipelineId = typeof route.query.pipelineId === 'string' ? route.query.pipelineId : ''
  if (!pipelineId) {
    summaryDocuments.value = []
    return
  }

  summaryLoading.value = true
  summaryError.value = ''

  try {
    const response = await getDocumentSummaries({
      pipelineId,
      size: 100,
      sort: 'createdAt,desc',
    })
    summaryDocuments.value = normalizePageResponse(response)
  } catch (error) {
    summaryDocuments.value = []
    summaryError.value = error?.response?.data?.message || error?.message || '문서 요약 정보를 불러오지 못했습니다.'
  } finally {
    summaryLoading.value = false
  }
}

const filteredDocs = computed(() => {
  return documents.value.filter((doc) => {
    const matchesTab = doc.type === currentTab.value
    const matchesSearch = String(doc.displayCode || doc.id).toLowerCase().includes(appliedSearchText.value.trim().toLowerCase())
    return matchesTab && matchesSearch
  })
})

const stepClass = (status) => {
  if (status === 'completed') {
    return 'bg-[var(--color-olive)] text-white'
  }

  if (status === 'active') {
    return 'bg-[var(--color-orange)] text-white ring-4 ring-[var(--color-orange-light)]'
  }

  return 'bg-[var(--color-border-divider)] text-[var(--color-text-placeholder)]'
}

const stepLabelClass = (stepName) => {
  return stepName === currentTab.value
      ? 'text-[var(--color-olive)] underline decoration-[var(--color-olive)] underline-offset-4'
      : 'text-[var(--color-text-body)]'
}

const setTab = (tabName) => {
  currentTab.value = normalizeTab(tabName)
  searchText.value = ''
  appliedSearchText.value = ''
  router.replace({
    name: 'sales-documents',
    query: {
      ...route.query,
      title: tabName,
    },
  })
}

const openDetail = (document) => {
  selectedDoc.value = document
  isModalOpen.value = true
}

const applySearch = () => {
  appliedSearchText.value = searchText.value
}

const goBack = () => {
  const pipelineId = typeof route.query.pipelineId === 'string' ? route.query.pipelineId : ''
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}

const retryPageLoad = () => {
  void historyStore.fetchPipelines().then(() => {
    if (typeof route.query.pipelineId === 'string') {
      void historyStore.ensureDealLogs(route.query.pipelineId)
    }
  })
  void loadSummaryDocuments()
}

const modalMode = computed(() => {
  if (!selectedDoc.value) {
    return 'sales-clean'
  }

  if (String(selectedDoc.value.statusLabel || '').includes('반려')) {
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

onMounted(() => {
  if (!pipeline.value) {
    void historyStore.fetchPipelines().then(() => {
      if (typeof route.query.pipelineId === 'string') {
        void historyStore.ensureDealLogs(route.query.pipelineId)
        void loadSummaryDocuments()
      }
    })
    return
  }

  if (typeof route.query.pipelineId === 'string') {
    void historyStore.ensureDealLogs(route.query.pipelineId)
    void loadSummaryDocuments()
  }
})

watch(() => route.query.pipelineId, () => {
  void loadSummaryDocuments()
})
</script>

<template>
      <section class="screen-content">
      <section v-if="isPageLoading" class="flex justify-center p-20">
        <LoadingSpinner text="문서 목록을 불러오는 중입니다." />
      </section>
      <ErrorMessage v-else-if="pageError" :message="pageError" @retry="retryPageLoad" />
      <EmptyState
          v-else-if="!pipeline"
          title="파이프라인 문서를 찾을 수 없습니다."
          description="히스토리 화면에서 파이프라인을 다시 선택해주세요."
      />
      <template v-else>
        <header class="mb-6 flex items-center gap-4 border-b border-[var(--color-border-divider)] pb-4">
          <button type="button" class="rounded-lg p-2 text-xl hover:bg-[var(--color-bg-section)]" @click="goBack">←</button>
          <div>
            <p class="text-sm text-[var(--color-text-sub)]">현재 위치: {{ pipeline.clientName }} > {{ currentTab }}</p>
            <h2 class="text-2xl font-semibold text-[var(--color-text-strong)]">{{ pageTitle }}</h2>
            <p class="mt-1 text-xs text-[var(--color-text-sub)]">현재 진행 단계: {{ currentStageLabel || '-' }}</p>
          </div>
        </header>

        <section class="mb-6 overflow-x-auto rounded-[20px] border border-[var(--color-border-card)] p-4 shadow-sm" style="background-color: var(--color-bg-section);">
          <div class="flex min-w-[680px] items-start justify-between gap-2">
            <button
                v-for="step in stepsData"
                :key="step.name"
                type="button"
                class="group relative flex flex-1 flex-col items-center gap-2 px-1"
                @click="setTab(step.name)"
            >
              <span class="flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold transition-all" :class="stepClass(step.status)">
                {{ STEP_SHORT_LABEL[step.name] || step.name.slice(0, 1) }}
              </span>
              <span class="text-center text-xs font-medium" :class="stepLabelClass(step.name)">
                {{ step.name }}
              </span>
            </button>
          </div>
        </section>

        <section class="mb-6 flex gap-2 rounded-[20px] border border-[var(--color-border-card)] p-4 shadow-sm" style="background-color: var(--color-bg-section);">
          <input
              v-model="searchText"
              type="text"
              class="flex-1 rounded-lg border border-[var(--color-border-card)] px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-olive)] focus:outline-none"
              style="background-color: var(--color-bg-input);"
              placeholder="문서코드로 검색해주세요"
          >
          <button
              type="button"
              class="rounded-lg bg-[var(--color-orange)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-orange-dark)]"
              @click="applySearch"
          >
            검색
          </button>
        </section>

        <section class="overflow-hidden rounded-lg border border-[var(--color-border-card)] shadow-sm" style="background-color: var(--color-bg-card);">
          <table v-if="filteredDocs.length > 0" class="w-full border-collapse text-sm">
            <thead>
            <tr class="text-left text-[var(--color-text-sub)]" style="background-color: var(--color-bg-section);">
              <th class="px-6 py-3 font-semibold">문서코드</th>
              <th class="px-6 py-3 font-semibold">작성일</th>
              <th class="px-6 py-3 font-semibold">금액</th>
              <th class="px-6 py-3 font-semibold">상태</th>
              <th class="px-6 py-3 font-semibold">상세</th>
            </tr>
            </thead>
            <tbody>
            <tr
                v-for="doc in filteredDocs"
                :key="doc.id"
                class="cursor-pointer border-t border-[var(--color-border-divider)] transition-colors hover:bg-[var(--color-bg-section)]"
                @click="openDetail(doc)"
            >
              <td class="px-6 py-4 font-medium text-[var(--color-olive)]">{{ doc.displayCode }}</td>
              <td class="px-6 py-4 text-[var(--color-text-body)]">{{ doc.date }}</td>
              <td class="px-6 py-4 font-mono text-[var(--color-text-body)]">{{ doc.amount }}</td>
              <td class="px-6 py-4">
                <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="doc.statusClass">{{ doc.statusLabel }}</span>
              </td>
              <td class="px-6 py-4">
                <button
                    type="button"
                    class="rounded bg-[var(--color-orange)] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[var(--color-orange-dark)]"
                    @click.stop="openDetail(doc)"
                >
                  보기
                </button>
              </td>
            </tr>
            </tbody>
          </table>

          <div v-else class="p-16 text-center text-[var(--color-text-placeholder)]">
            <p class="mb-2 text-base font-bold">데이터가 없습니다</p>
            <p class="text-sm">작성된 {{ currentTab }}가 없습니다.</p>
          </div>
        </section>

        <HistoryModal
            v-model="isModalOpen"
            :title="selectedDoc ? selectedDoc.displayCode : '문서코드'"
            :doc-id="selectedDoc ? String(selectedDoc.id) : ''"
            :doc-type="selectedDoc ? String(selectedDoc.type) : ''"
            :mode="modalMode"
            :show-download="canDownload"
            :hide-remark="shouldHideRemark"
            :remark="selectedDoc ? selectedDoc.remark : ''"
            :reject-reason="selectedDoc ? selectedDoc.rejectReason : ''"
        />
      </template>
      </section>
</template>
