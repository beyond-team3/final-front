<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HistoryModal from '@/components/history/HistoryModal.vue'

const route = useRoute()
const router = useRouter()

const searchText = ref('')
const appliedSearchText = ref('')
const isModalOpen = ref(false)
const selectedDoc = ref(null)

const stepsData = ref([
  { name: '견적요청서', status: 'completed', statusText: '완료' },
  { name: '견적서', status: 'completed', statusText: '완료' },
  { name: '계약서', status: 'active', statusText: '진행중' },
  { name: '주문서', status: 'pending', statusText: '대기' },
  { name: '명세서', status: 'pending', statusText: '대기' },
  { name: '청구서', status: 'pending', statusText: '대기' },
  { name: '결제완료', status: 'pending', statusText: '대기' },
]) // TODO: API 연결

const documents = ref([
  {
    id: 'QR-001',
    type: '견적요청서',
    date: '2026-01-15',
    amount: '-',
    status: '승인완료',
    statusClass: 'bg-emerald-100 text-emerald-800',
    remark: '초기 요청 문서입니다.',
    rejectReason: '',
  },
  {
    id: 'EST-005',
    type: '견적서',
    date: '2026-01-29',
    amount: '8,500,000원',
    status: '반려',
    statusClass: 'bg-red-100 text-red-700',
    remark: '할인 조건 반영된 수정안입니다.',
    rejectReason: '단가 조정 증빙 서류가 누락되었습니다. 보완 후 재승인 요청하세요.',
  },
  {
    id: 'EST-002',
    type: '견적서',
    date: '2026-01-22',
    amount: '4,500,000원',
    status: '승인완료',
    statusClass: 'bg-emerald-100 text-emerald-800',
    remark: '기본 견적 초안입니다.',
    rejectReason: '',
  },
  {
    id: 'CON-001',
    type: '계약서',
    date: '2026-01-22',
    amount: '15,000,000원',
    status: '진행중',
    statusClass: 'bg-blue-100 text-blue-700',
    remark: '특약 조항 검토 중입니다.',
    rejectReason: '',
  },
  {
    id: 'OD-001',
    type: '주문서',
    date: '2026-01-25',
    amount: '15,000,000원',
    status: '승인완료',
    statusClass: 'bg-emerald-100 text-emerald-800',
    remark: '납기 일정 확정 건입니다.',
    rejectReason: '',
  },
  {
    id: 'SP-001',
    type: '명세서',
    date: '2026-01-26',
    amount: '15,000,000원',
    status: '승인완료',
    statusClass: 'bg-emerald-100 text-emerald-800',
    remark: '출고 명세서입니다.',
    rejectReason: '',
  },
  {
    id: 'IV-001',
    type: '청구서',
    date: '2026-01-27',
    amount: '16,500,000원',
    status: '진행중',
    statusClass: 'bg-blue-100 text-blue-700',
    remark: '결제 요청 대기 상태입니다.',
    rejectReason: '',
  },
]) // TODO: API 연결

const normalizeTab = (tab) => {
  if (tab === '견적요청') {
    return '견적요청서'
  }
  return tab
}

const initialTab = typeof route.query.title === 'string' ? normalizeTab(route.query.title) : '견적서'
const currentTab = ref(initialTab)

const pageTitle = computed(() => `${currentTab.value} 목록`)

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
  const pipelineId = typeof route.query.pipelineId === 'string' ? route.query.pipelineId : '1'
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}

const modalMode = computed(() => {
  if (!selectedDoc.value) {
    return 'sales-clean'
  }

  return selectedDoc.value.status.includes('반려') ? 'sales-rejected' : 'sales-clean'
})
</script>

<template>
  <section>
    <header class="mb-6 flex items-center gap-4">
      <button type="button" class="rounded-lg p-2 text-xl hover:bg-slate-200" @click="goBack">←</button>
      <div>
        <p class="text-sm text-slate-500">현재 위치: OO육묘장 > {{ currentTab }}</p>
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
  </section>
</template>
