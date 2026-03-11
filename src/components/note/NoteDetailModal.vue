<!-- src/components/note/NoteDetailModal.vue -->
<script setup>
import { useRouter } from 'vue-router'
import { useNoteStore } from '@/stores/note'

const props = defineProps({
  show: Boolean,
  note: Object,
  isRiskHighlight: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const noteStore = useNoteStore()
const router = useRouter()

const close = () => emit('close')

const goEdit = () => {
  if (props.note?.id) {
    router.push({ name: 'notes', query: { editId: props.note.id } })
    close()
  }
}

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
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br>')

  if (props.isRiskHighlight) {
    const riskKeywords = ['리스크', '위험', '주의', '문제', '클레임', '병해충', '부족', '경쟁사', '저하', '피해']
    riskKeywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi')
      html = html.replace(regex, '<span class="text-[var(--color-status-error)] font-bold">$1</span>')
    })
  }

  return html
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm" @click="close"></div>
    <div class="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-300">
      <div class="p-8 lg:p-10 overflow-y-auto flex-1">
        <div class="flex justify-between items-start mb-8">
          <div>
            <span class="font-extrabold text-[var(--color-olive)] text-3xl block mb-2">{{ noteStore.getClientName(note?.clientId) }}</span>
            <div class="flex items-center gap-3 text-[var(--color-text-sub)]">
              <span class="font-bold flex items-center gap-2">
                <i class="fa-regular fa-file-lines"></i>
                {{ note?.contractId || '일반 상담' }}
              </span>
              <span class="h-1 w-1 rounded-full bg-[var(--color-text-placeholder)]"></span>
              <span class="font-medium">{{ note?.activityDate }}</span>
            </div>
          </div>
          <button @click="close" class="h-12 w-12 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-base)] transition-colors text-3xl text-[var(--color-text-sub)]">&times;</button>
        </div>

        <div class="bg-[var(--color-bg-section)] p-6 rounded-2xl border border-[var(--color-olive)]/20 mb-10 shadow-sm">
          <p class="text-[11px] font-bold text-[var(--color-olive)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <i class="fas fa-sparkles"></i> AI 분석 요약
          </p>
          <div v-if="note?.aiSummary && note?.aiSummary.length > 0" class="space-y-4">
            <div v-for="(line, idx) in note.aiSummary" :key="idx" class="text-base text-[var(--color-text-body)] flex items-start leading-relaxed">
              <span class="text-[var(--color-olive)] mr-3 font-bold">•</span>
              <div class="prose flex-1" v-html="renderMarkdown(line)"></div>
            </div>
          </div>
          <p v-else class="text-sm text-[var(--color-text-placeholder)] italic">기록된 분석 요약이 없습니다.</p>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-bold text-[var(--color-text-strong)] flex items-center gap-2">
            <i class="fas fa-align-left text-[var(--color-text-placeholder)]"></i> 상세 내용
          </h4>
          <div 
            class="prose bg-[var(--color-bg-section)]/50 p-8 rounded-2xl border border-[var(--color-border-divider)] min-h-[250px] text-[var(--color-text-body)]"
            v-html="renderMarkdown(note?.content)"
          ></div>
        </div>
      </div>

      <div class="p-6 bg-[var(--color-bg-section)] border-t border-[var(--color-border-divider)] flex justify-end gap-3">
        <button @click="goEdit" class="h-12 px-8 bg-[var(--color-orange)] text-white rounded-xl font-bold hover:bg-[var(--color-orange-dark)] transition-all shadow-md">수정하기</button>
        <button @click="close" class="h-12 px-8 bg-white border border-[var(--color-border-card)] text-[var(--color-text-sub)] rounded-xl font-bold hover:bg-[var(--color-bg-base)] transition-all">닫기</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose :deep(p) { margin-bottom: 1rem; }
.prose :deep(br) { content: ""; display: block; margin-top: 0.5rem; }
.prose :deep(li) { margin-bottom: 0.5rem; }
</style>