<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const route = useRoute()
const router = useRouter()

const isEditMode = ref(false)
const editingNoteId = ref(null)
const isLoading = ref(false)

const form = ref({
  clientId: '',
  contractId: '',
  date: new Date().toISOString().slice(0, 10),
  content: '',
})

const showAiSummary = ref(false)
const aiSummaryContent = ref([])

// 계약 목록은 스토어의 contractOptions를 사용
const contractOptions = computed(() => noteStore.contractOptions)

// 거래처 선택 시 유효 계약 목록 로드
watch(() => form.value.clientId, async (newVal, oldVal) => {
  if (newVal) {
    await noteStore.fetchActiveContracts(newVal)
  } else {
    noteStore.contractOptions = []
  }
  
  if (oldVal !== undefined && newVal !== oldVal) {
    // 수정 모드일 때의 초기 하이드레이션(oldVal이 undefined이거나 빈 값인 경우)을 제외하고는 계약 선택을 초기화
    const isInitialHydration = isEditMode.value && (oldVal === undefined || oldVal === '')
    if (!isInitialHydration) {
      form.value.contractId = ''
    }
  }
}, { immediate: true })

const loadEditNote = async (noteId) => {
  const note = noteStore.notes.find(n => n.id === Number(noteId))
  if (note) {
    isEditMode.value = true
    editingNoteId.value = Number(noteId)
    
    // 수정 모드일 때도 해당 고객의 계약 목록을 먼저 불러옴
    await noteStore.fetchActiveContracts(note.clientId)
    
    form.value = {
      clientId: note.clientId,
      contractId: note.contractId || '',
      date: note.activityDate,
      content: note.content,
    }
  }
}

watch(() => noteStore.notes, () => {
  const noteId = route.query.editId
  if (noteId && !isEditMode.value) {
    loadEditNote(noteId)
  }
}, { immediate: true })

const saveNote = async () => {
  if (!form.value.clientId || !form.value.date || !form.value.content.trim()) {
    window.alert('고객처, 활동 일자, 미팅 내용은 필수 입력입니다.')
    return
  }

  isLoading.value = true
  try {
    let result
    if (isEditMode.value) {
      result = await noteStore.updateNote(editingNoteId.value, {
        ...form.value,
        content: form.value.content.trim(),
      })
    } else {
      result = await noteStore.createNote({
        ...form.value,
        content: form.value.content.trim(),
      })
    }

    if (result) {
      aiSummaryContent.value = result.aiSummary ?? []
      showAiSummary.value = true
    } else {
      window.alert('저장에 실패했습니다. 다시 시도해 주세요.')
    }
  } catch (e) {
    window.alert(noteStore.error || '저장 중 오류가 발생했습니다.')
  } finally {
    isLoading.value = false
  }
}

const closeSummaryModal = () => {
  showAiSummary.value = false
  router.push({ name: 'note-search' })
}

// Simple Markdown Parser (Heuristic)
const renderMarkdown = (text) => {
  if (!text) return ''
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
    <PageHeader 
      :title="isEditMode ? '영업 활동 수정' : '영업 활동 기록'" 
      subtitle="고객과의 미팅 내용을 기록하고 AI 분석을 수행합니다." 
    />

    <article class="mx-auto max-w-4xl rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-8 lg:p-10 shadow-sm mt-6">
      <div class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="flex flex-col gap-1">
            <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1">고객처</label>
            <select 
              v-model="form.clientId" 
              class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm"
            >
              <option value="">고객 선택</option>
              <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1">활동 일자</label>
            <input 
              v-model="form.date" 
              type="date" 
              class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm"
            >
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1">계약 건 (선택)</label>
          <select 
            v-model="form.contractId" 
            class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm"
          >
            <option value="">{{ contractOptions.length > 0 ? '계약 선택 안 함' : '연결된 계약 없음' }}</option>
            <option v-for="contract in contractOptions" :key="contract.id" :value="contract.contractCode">
              {{ contract.contractCode }} ({{ contract.startDate }} ~ {{ contract.endDate }})
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1">미팅 내용</label>
          <textarea 
            v-model="form.content" 
            rows="12" 
            class="w-full rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-5 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm leading-relaxed" 
            placeholder="고객과의 미팅, 통화 내용 등 상세한 활동 내용을 입력하세요..."
          ></textarea>
        </div>

        <div class="flex justify-end pt-4">
          <button 
            @click="saveNote" 
            :disabled="isLoading"
            class="min-w-[200px] h-12 rounded-xl text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-3"
            :class="[
              isEditMode ? 'bg-[var(--color-orange)] hover:bg-[var(--color-orange-dark)]' : 'bg-[var(--color-olive)] hover:bg-[var(--color-olive-dark)]',
              { 'opacity-50 cursor-not-allowed shadow-none': isLoading }
            ]"
          >
            <template v-if="isLoading">
              <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              {{ isEditMode ? '수정' : '분석' }} 중...
            </template>
            <template v-else>
              <i class="fas fa-magic"></i> 
              {{ isEditMode ? '수정 및 AI 재분석' : '저장 및 AI 분석' }}
            </template>
          </button>
        </div>
      </div>
    </article>

    <!-- AI Summary Modal -->
    <div v-if="showAiSummary" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm" @click="closeSummaryModal"></div>
      <div class="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <div class="p-6 border-b border-[var(--color-border-divider)] bg-[var(--color-bg-section)]">
          <h3 class="text-xl font-bold flex items-center text-[var(--color-text-strong)]">
            <i class="fas fa-sparkles text-[var(--color-olive)] mr-3"></i>AI 요약 분석 결과
          </h3>
        </div>
        <div class="p-8">
          <p class="text-sm text-[var(--color-text-body)] mb-6">
            영업 활동 노트가 성공적으로 {{ isEditMode ? '수정' : '저장' }}되었습니다.<br>AI가 분석한 핵심 요약은 다음과 같습니다.
          </p>
          <div class="bg-[var(--color-bg-section)] border border-[var(--color-border-card)] p-6 rounded-xl space-y-4">
            <ul class="space-y-3">
              <li v-for="(s, idx) in aiSummaryContent" :key="idx" class="flex items-start gap-3">
                <i class="fas fa-check-circle text-[var(--color-olive)] mt-1"></i>
                <div class="prose text-sm font-medium text-[var(--color-text-body)] leading-relaxed flex-1" v-html="renderMarkdown(s)"></div>
              </li>
              <li v-if="!aiSummaryContent.length" class="text-sm text-[var(--color-text-placeholder)] italic">분석된 내용이 없습니다.</li>
            </ul>
          </div>
        </div>
        <div class="p-5 bg-[var(--color-bg-section)] border-t border-[var(--color-border-divider)] text-center">
          <button @click="closeSummaryModal" class="w-full h-11 bg-[var(--color-olive)] text-white rounded-lg font-bold hover:bg-[var(--color-olive-dark)] transition-colors">
            분석 결과 확인 완료
          </button>
        </div>
      </div>
    </div>
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