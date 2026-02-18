<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const router = useRouter()

const filterClient = ref('')
const filterContract = ref('')
const filterStart = ref('')
const filterEnd = ref('')
const sort = ref('desc')
const keyword = ref('')

const selectedNote = ref(null)
const showDetailModal = ref(false)

const contractOptions = computed(() => {
  if (!filterClient.value) return []
  return noteStore.getContractsByClient(filterClient.value)
})

const filteredNotes = computed(() => {
  return noteStore.searchClientNotes({
    clientId: filterClient.value || undefined,
    contract: filterContract.value || undefined,
    keyword: keyword.value || undefined,
    dateFrom: filterStart.value || undefined,
    dateTo: filterEnd.value || undefined,
    sort: sort.value,
  })
})

const resetFilter = () => {
  filterClient.value = ''
  filterContract.value = ''
  filterStart.value = ''
  filterEnd.value = ''
  sort.value = 'desc'
  keyword.value = ''
}

const openDetail = (note) => {
  selectedNote.value = note
  showDetailModal.value = true
}

const closeDetail = () => {
  showDetailModal.value = false
  selectedNote.value = null
}

const goEdit = (id) => {
  router.push({ name: 'note-write', query: { editId: id } })
}
</script>

<template>
  <section>
    <PageHeader title="영업 노트 탐색" subtitle="과거의 영업 활동 기록을 필터링하여 조회할 수 있습니다." />

    <section class="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">고객사</label>
          <select v-model="filterClient" class="w-full border-slate-300 p-2 rounded text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            <option value="">모든 고객</option>
            <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">{{ client.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">계약명</label>
          <select v-model="filterContract" class="w-full border-slate-300 p-2 rounded text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            <option value="">모든 계약</option>
            <option v-for="contract in contractOptions" :key="contract" :value="contract">{{ contract }}</option>
          </select>
        </div>
        <div class="lg:col-span-2">
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">날짜 범위</label>
          <div class="flex items-center space-x-2">
            <input v-model="filterStart" type="date" class="w-full border-slate-300 p-2 rounded text-xs shadow-sm focus:border-sky-500 focus:ring-sky-500">
            <span class="text-slate-400">~</span>
            <input v-model="filterEnd" type="date" class="w-full border-slate-300 p-2 rounded text-xs shadow-sm focus:border-sky-500 focus:ring-sky-500">
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div class="relative lg:col-span-3">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            v-model="keyword" 
            type="text" 
            placeholder="고객명, 계약명, 요약 내용으로 검색..." 
            class="w-full border-slate-300 p-2 pl-10 rounded text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500"
          >
        </div>
        <div class="flex space-x-2">
          <select v-model="sort" class="w-full border-slate-300 p-2 rounded text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            <option value="desc">최신순</option>
            <option value="asc">오래된순</option>
          </select>
          <button @click="resetFilter" title="필터 초기화" class="w-10 bg-slate-200 text-slate-600 rounded text-sm hover:bg-slate-300 transition-colors">
            <i class="fas fa-rotate-left"></i>
          </button>
        </div>
      </div>
    </section>

    <div v-if="filteredNotes.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="note in filteredNotes" 
        :key="note.id" 
        class="border rounded-lg p-5 shadow-sm bg-white hover:shadow-md hover:border-sky-300 transition-all relative"
      >
        <div class="flex justify-between items-start mb-3">
          <span class="font-bold text-sky-600">{{ noteStore.getClientName(note.clientId) }}</span>
          <span class="text-xs text-slate-400 font-medium">{{ note.date }}</span>
        </div>
        <div class="bg-slate-50 p-4 rounded-md mb-4">
          <p class="text-xs text-slate-500 font-bold mb-1.5">AI 요약</p>
          <p class="text-sm text-slate-600 line-clamp-2">{{ note.summary?.join(', ') || '요약 분석 중...' }}</p>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500 truncate max-w-[120px]">
            <i class="fa-regular fa-file-lines mr-2 text-slate-400"></i>
            {{ note.contract || '일반 상담' }}
          </span>
          <div class="space-x-3">
            <button @click="goEdit(note.id)" class="text-amber-500 font-bold hover:underline">수정</button>
            <button @click="openDetail(note)" class="text-sky-500 font-bold hover:underline">원문 보기</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="col-span-full py-20 text-center text-slate-400 bg-white rounded-lg border">
      <i class="fas fa-box-open text-4xl mb-4"></i>
      <p>조건에 맞는 기록이 없습니다.</p>
    </div>

    <!-- Note Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeDetail"></div>
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col z-10">
        <div class="flex justify-between items-center p-5 border-b">
          <div class="flex items-center">
            <h3 class="text-xl font-bold">영업 노트 원문</h3>
            <span v-if="selectedNote?.isEdited" class="ml-3 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">수정됨</span>
          </div>
          <button @click="closeDetail" class="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div class="p-8 overflow-y-auto">
          <div class="flex justify-between items-end mb-4">
            <div>
              <p class="text-xl font-bold text-sky-600">{{ noteStore.getClientName(selectedNote?.clientId) }}</p>
              <p class="text-sm text-slate-500">{{ selectedNote?.contract || '일반 상담' }}</p>
            </div>
            <p class="text-sm text-slate-400 font-medium">{{ selectedNote?.date }}</p>
          </div>
          <div class="bg-slate-50 p-6 rounded-lg prose max-w-none">
            <pre class="font-sans whitespace-pre-wrap text-slate-700">{{ selectedNote?.content }}</pre>
          </div>
        </div>
        <div class="p-4 bg-slate-50 border-t text-right">
          <button @click="closeDetail" class="bg-slate-500 text-white px-6 py-2 rounded-md font-bold hover:bg-slate-600">닫기</button>
        </div>
      </div>
    </div>
  </section>
</template>
