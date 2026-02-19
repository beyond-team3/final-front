<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  contract: '',
  date: new Date().toISOString().slice(0, 10),
  content: '',
})

const showAiSummary = ref(false)
const aiSummaryContent = ref([])

const contractOptions = computed(() => noteStore.getContractsByClient(form.value.clientId))

watch(() => form.value.clientId, (newVal, oldVal) => {
  if (oldVal !== undefined && newVal !== oldVal && !isEditMode.value) {
    form.value.contract = ''
  }
})

const loadEditNote = (noteId) => {
  const note = noteStore.notes.find(n => n.id === Number(noteId))
  if (note) {
    isEditMode.value = true
    editingNoteId.value = Number(noteId)
    form.value = {
      clientId: note.clientId,
      contract: note.contract,
      date: note.date,
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
})

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

    aiSummaryContent.value = result.summary
    showAiSummary.value = true
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const closeSummaryModal = () => {
  showAiSummary.value = false
  router.push({ name: 'note-search' })
}
</script>

<template>
  <section>
    <PageHeader 
      :title="isEditMode ? '영업 활동 수정' : '영업 활동 기록'" 
      subtitle="고객과의 미팅 내용을 기록하고 AI 분석을 수행합니다." 
    />

    <article class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-bold text-slate-600 mb-2">고객처</label>
            <select 
              v-model="form.clientId" 
              class="w-full border-slate-300 p-3 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="">고객 선택</option>
              <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-600 mb-2">활동 일자</label>
            <input 
              v-model="form.date" 
              type="date" 
              class="w-full border-slate-300 p-3 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-600 mb-2">계약 건</label>
          <select 
            v-model="form.contract" 
            class="w-full border-slate-300 p-3 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
          >
            <option value="">계약 선택</option>
            <option v-for="contract in contractOptions" :key="contract" :value="contract">
              {{ contract }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-600 mb-2">미팅 내용</label>
          <textarea 
            v-model="form.content" 
            rows="12" 
            class="w-full border-slate-300 p-4 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500 leading-relaxed" 
            placeholder="고객과의 미팅, 통화 내용 등 상세한 활동 내용을 입력하세요..."
          ></textarea>
        </div>
        <div class="flex justify-end">
          <button 
            @click="saveNote" 
            :disabled="isLoading"
            class="bg-sky-600 text-white px-8 py-3 rounded-md font-bold hover:bg-sky-700 transition-colors flex items-center justify-center"
            :class="{ 'bg-amber-600 hover:bg-amber-700': isEditMode, 'opacity-50 cursor-not-allowed': isLoading }"
          >
            <template v-if="isLoading">
              <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
              {{ isEditMode ? '수정' : '분석' }} 중...
            </template>
            <template v-else>
              <i class="fas fa-save mr-2"></i> 
              {{ isEditMode ? '수정 및 AI 재분석' : '저장 및 AI 분석' }}
            </template>
          </button>
        </div>
      </div>
    </article>

    <!-- AI Summary Modal -->
    <div v-if="showAiSummary" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeSummaryModal"></div>
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden z-10">
        <div class="p-5 border-b bg-slate-50">
          <h3 class="text-xl font-bold flex items-center">
            <i class="fas fa-sparkles text-sky-500 mr-3"></i>AI 요약 분석 결과
          </h3>
        </div>
        <div class="p-8">
          <p class="text-sm text-slate-600 mb-4">
            영업 활동 노트가 성공적으로 {{ isEditMode ? '수정' : '저장' }}되었으며, AI가 분석한 핵심 요약은 다음과 같습니다.
          </p>
          <div class="bg-sky-50 border border-sky-200 p-6 rounded-lg text-slate-700 space-y-2">
            <ul class="space-y-3">
              <li v-for="(s, idx) in aiSummaryContent" :key="idx" class="flex items-start">
                <i class="fas fa-check-circle text-sky-500 mt-1 mr-3"></i>
                <span class="font-medium text-slate-700">{{ s }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="p-4 bg-slate-50 border-t text-right">
          <button @click="closeSummaryModal" class="bg-sky-600 text-white px-6 py-2 rounded-md font-bold hover:bg-sky-700">
            확인
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
