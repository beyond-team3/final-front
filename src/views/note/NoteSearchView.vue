<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import NoteDetailModal from '@/components/note/NoteDetailModal.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const router = useRouter()

const filterClient = ref('')
const filterContractId = ref('')
const filterStart = ref('')
const filterEnd = ref('')
const sort = ref('desc')
const keyword = ref('')

// 고객사 선택 변경 시 계약 필터 초기화
watch(filterClient, () => {
  filterContractId.value = ''
})

const selectedNote = ref(null)
const showDetailModal = ref(false)

const contractOptions = computed(() => {
  if (!filterClient.value) return []
  return noteStore.getContractsByClient(filterClient.value)
})

const filteredNotes = computed(() => {
  return noteStore.searchClientNotes({
    clientId: filterClient.value || undefined,
    contractId: filterContractId.value || undefined,
    keyword: keyword.value || undefined,
    dateFrom: filterStart.value || undefined,
    dateTo: filterEnd.value || undefined,
    sort: sort.value,
  })
})

const resetFilter = () => {
  filterClient.value = ''
  filterContractId.value = ''
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
  router.push({ name: 'notes', query: { editId: id } })
}

const handleDelete = async (id) => {
  if (!window.confirm('정말 이 노트를 삭제하시겠습니까?')) {
    return
  }

  try {
    await noteStore.deleteNote(Number(id))
  } catch (e) {
    window.alert('삭제하지 못했습니다.')
  }
}

// Simple Markdown Parser (Heuristic) for Note Cards
const renderMarkdown = (text) => {
  if (!text) return ''
  
  // 문자열이 아닐 경우 문자열로 변환
  const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2)
  
  let html = content
    .replace(/^### (.*$)/gim, '<h4 class="text-lg font-bold text-[var(--color-text-strong)] mt-6 mb-3">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-xl font-bold text-[var(--color-text-strong)] mt-8 mb-4">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-2xl font-bold text-[var(--color-text-strong)] mt-10 mb-6">$1</h2>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-[var(--color-olive)] bg-[var(--color-bg-section)] p-4 my-4 rounded-r-md text-[var(--color-text-body)] italic">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[var(--color-text-strong)]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br>')

  return html
}
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <PageHeader title="영업 노트 탐색" subtitle="과거의 영업 활동 기록을 필터링하여 조회할 수 있습니다." />

    <!-- Filter Bar -->
    <section class="mb-8 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-sidebar)] p-6 shadow-sm mt-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1">고객사</label>
          <select v-model="filterClient" class="h-10 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm">
            <option value="">모든 고객</option>
            <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">{{ client.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1">계약코드</label>
          <select v-model="filterContractId" class="h-10 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm">
            <option value="">모든 계약</option>
            <option v-for="contract in contractOptions" :key="contract" :value="contract">{{ contract }}</option>
          </select>
        </div>
        <div class="lg:col-span-2 flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1">날짜 범위</label>
          <div class="flex items-center space-x-3">
            <input v-model="filterStart" type="date" class="h-10 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm">
            <span class="text-[var(--color-text-placeholder)]">~</span>
            <input v-model="filterEnd" type="date" class="h-10 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm">
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <div class="relative lg:col-span-3">
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"></i>
          <input 
            v-model="keyword" 
            type="text" 
            placeholder="고객명, 계약명, 요약 내용으로 검색..." 
            class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] pl-11 pr-4 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm"
          >
        </div>
        <div class="flex space-x-3">
          <select v-model="sort" class="h-11 flex-1 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm">
            <option value="desc">최신순</option>
            <option value="asc">오래된순</option>
          </select>
          <button @click="resetFilter" title="필터 초기화" class="w-11 h-11 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-sub)] rounded-lg hover:bg-[var(--color-bg-section)] transition-colors flex items-center justify-center">
            <span class="text-xl font-bold">↻</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Note Grid -->
    <div v-if="filteredNotes.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      <div 
        v-for="note in filteredNotes" 
        :key="note.id" 
        class="group flex flex-col rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm hover:shadow-md hover:border-[var(--color-olive)] transition-all relative overflow-hidden"
      >
        <div class="flex justify-between items-start mb-4 relative z-10">
          <span class="font-bold text-[var(--color-olive)] text-lg">{{ noteStore.getClientName(note.clientId) }}</span>
          <span class="text-[var(--text-caption)] text-[var(--color-text-placeholder)] font-bold">{{ note.activityDate }}</span>
        </div>
        
        <div class="bg-[var(--color-bg-section)] p-5 rounded-xl mb-6 flex-1 border border-[var(--color-border-divider)] relative z-10">
          <p class="text-[10px] font-bold text-[var(--color-text-sub)] uppercase tracking-widest mb-3 flex items-center gap-2">
            <i class="fas fa-sparkles text-[var(--color-olive)]"></i> AI 요약
          </p>

          <div v-if="note.aiSummary && note.aiSummary.length > 0" class="space-y-2">
            <div
                v-for="(line, idx) in note.aiSummary"
                :key="idx"
                class="text-sm text-[var(--color-text-body)] flex items-start leading-relaxed"
            >
              <span class="text-[var(--color-olive)] mr-2 font-bold">•</span>
              <div class="prose flex-1" v-html="renderMarkdown(line)"></div>
            </div>
          </div>
          <p v-else class="text-sm text-[var(--color-text-placeholder)] italic">요약 분석 중...</p>
        </div>

        <div class="flex justify-between items-center text-sm relative z-10 gap-3">
          <span class="text-[var(--color-text-sub)] truncate font-medium flex items-center gap-2 flex-1 min-w-0">
            <i class="fa-regular fa-file-lines text-[var(--color-text-placeholder)]"></i>
            {{ note.contractId || '일반 상담' }}
          </span>
          <div class="flex items-center gap-4 flex-shrink-0">
            <button @click="goEdit(note.id)" class="text-[var(--color-orange)] font-bold hover:underline">수정</button>
            <button @click="handleDelete(note.id)" class="text-[var(--color-status-error)] font-bold hover:underline">삭제</button>
            <button @click="openDetail(note)" class="text-[var(--color-olive)] font-bold hover:underline">원문</button>
          </div>
        </div>
        <i class="fas fa-quote-right absolute -right-4 -top-4 text-[var(--color-bg-section)] text-8xl group-hover:text-[var(--color-olive)]/5 transition-colors"></i>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-sm">
      <div class="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
        <i class="fas fa-box-open text-4xl"></i>
      </div>
      <p class="text-[var(--color-text-sub)] font-medium">조건에 맞는 기록이 없습니다.</p>
    </div>

    <!-- Note Detail Modal -->
    <NoteDetailModal 
      :show="showDetailModal" 
      :note="selectedNote" 
      @close="closeDetail" 
    />
  </section>
</template>

<style scoped>
.prose :deep(br) {
  content: "";
  display: block;
  margin-top: 0.5rem;
}
.prose :deep(li) {
  margin-bottom: 0.5rem;
}
</style>