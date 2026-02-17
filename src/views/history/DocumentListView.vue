<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import HistoryModal from '@/components/history/HistoryModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useHistoryStore } from '@/stores/history'

const route = useRoute()
const router = useRouter()
const historyStore = useHistoryStore()

const searchText = ref('')
const appliedSearchText = ref('')
const isModalOpen = ref(false)
const selectedDoc = ref(null)

const normalizeTab = (tab) => {
  const map = {
    견적요청: '견적요청서',
    견적: '견적서',
    계약: '계약서',
    주문: '주문서',
    명세: '명세서',
    청구: '청구서',
  }

  return map[tab] || tab
}
const currentTab = ref(typeof route.query.title === 'string' ? normalizeTab(route.query.title) : '견적요청서')

const pipeline = computed(() => historyStore.getPipelineById(route.query.pipelineId))
const pageTitle = computed(() => `${currentTab.value} 목록`)

const stepsData = computed(() => {
  const base = ['견적요청서', '견적서', '계약서', '주문서', '명세서', '청구서']
  const doneStage = pipeline.value?.stageNumber || 1
  return base.map((name, index) => {
    const order = index + 1
    if (order < doneStage) {
      return { name, status: 'completed', statusText: '완료' }
    }
    if (order === doneStage) {
      return { name, status: 'active', statusText: '진행중' }
    }
    return { name, status: 'pending', statusText: '대기' }
  })
})

const documents = computed(() => (pipeline.value?.documents || []).map((doc) => {
  const statusText = doc.status || '진행중'
  const statusClass = statusText.includes('완료') || statusText.includes('발행')
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-blue-100 text-blue-700'

  return {
    id: doc.id,
    type: doc.typeLabel,
    date: doc.date,
    amount: Number(doc.amount || 0) > 0 ? `${Number(doc.amount).toLocaleString()}원` : '-',
    status: statusText,
    statusClass,
    remark: doc.remark || '',
    rejectReason: '',
  }
}))

const filteredDocs = computed(() => {
  return documents.value.filter((doc) => {
    const matchesTab = doc.type === currentTab.value
    const matchesSearch = doc.id.toLowerCase().includes(appliedSearchText.value.trim().toLowerCase())
    return matchesTab && matchesSearch
  })
})

const stepClass = (status) => {
  if (status === 'completed') {
    return 'bg-emerald-500 text-white'
  }

  if (status === 'active') {
    return 'bg-blue-600 text-white ring-4 ring-blue-100'
  }

  return 'bg-slate-200 text-slate-400'
}

const stepLabelClass = (stepName) => {
  return stepName === currentTab.value ? 'text-blue-600 underline' : 'text-slate-600'
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

const modalMode = computed(() => {
  if (!selectedDoc.value) {
    return 'sales-clean'
  }

  return selectedDoc.value.status.includes('반려') ? 'sales-rejected' : 'sales-clean'
})

onMounted(() => {
  if (!pipeline.value) {
    void historyStore.fetchPipelines()
  }
})
</script>

<template>
  <section>
    <LoadingSpinner v-if="historyStore.loading" text="문서 목록을 불러오는 중입니다." />
    <ErrorMessage v-else-if="historyStore.error" :message="historyStore.error" @retry="historyStore.fetchPipelines" />
    <EmptyState
      v-else-if="!pipeline"
      title="파이프라인 문서를 찾을 수 없습니다."
      description="히스토리 화면에서 파이프라인을 다시 선택해주세요."
    />
    <template v-else>
      <header class="mb-6 flex items-center gap-4">
        <button type="button" class="rounded-lg p-2 text-xl hover:bg-slate-200" @click="goBack">←</button>
        <div>
          <p class="text-sm text-slate-500">현재 위치: {{ pipeline.clientName }} > {{ currentTab }}</p>
          <h2 class="text-2xl font-bold text-slate-900">{{ pageTitle }}</h2>
        </div>
      </header>

      <section class="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex min-w-[680px] items-start justify-between gap-2">
          <button
            v-for="step in stepsData"
            :key="step.name"
            type="button"
            class="group relative flex flex-1 flex-col items-center gap-2 px-1"
            @click="setTab(step.name)"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold" :class="stepClass(step.status)">
              {{ step.status === 'completed' ? '완' : step.status === 'active' ? '진' : '대' }}
            </span>
            <span class="text-center text-xs font-medium" :class="stepLabelClass(step.name)">
              {{ step.name }}<br>{{ step.statusText }}
            </span>
          </button>
        </div>
      </section>

      <section class="mb-6 flex gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          v-model="searchText"
          type="text"
          class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="문서번호로 검색해주세요"
        >
        <button
          type="button"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          @click="applySearch"
        >
          검색
        </button>
      </section>

      <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table v-if="filteredDocs.length > 0" class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50 text-left text-slate-700">
              <th class="px-6 py-3 font-semibold">문서번호</th>
              <th class="px-6 py-3 font-semibold">작성일</th>
              <th class="px-6 py-3 font-semibold">금액</th>
              <th class="px-6 py-3 font-semibold">상태</th>
              <th class="px-6 py-3 font-semibold">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in filteredDocs" :key="doc.id" class="border-t border-slate-100">
              <td class="px-6 py-4">{{ doc.id }}</td>
              <td class="px-6 py-4">{{ doc.date }}</td>
              <td class="px-6 py-4">{{ doc.amount }}</td>
              <td class="px-6 py-4">
                <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="doc.statusClass">{{ doc.status }}</span>
              </td>
              <td class="px-6 py-4">
                <button
                  type="button"
                  class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  @click="openDetail(doc)"
                >
                  보기
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="p-16 text-center text-slate-400">
          <p class="mb-2 text-base">데이터가 없습니다</p>
          <p class="text-sm">작성된 {{ currentTab }}가 없습니다.</p>
        </div>
      </section>

      <HistoryModal
        v-model="isModalOpen"
        :title="selectedDoc ? selectedDoc.id : '문서번호'"
        :mode="modalMode"
        :remark="selectedDoc ? selectedDoc.remark : ''"
        :reject-reason="selectedDoc ? selectedDoc.rejectReason : ''"
      />
    </template>
  </section>
</template>
