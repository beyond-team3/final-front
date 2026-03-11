<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const route = useRoute()

// 1. 상태 정의
const selectedClientId = ref('')
const briefing = ref(null)

// UI 상태 관리: 'IDLE' | 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR'
const status = ref('IDLE')

// 2. Computed
const selectedClientName = computed(() => noteStore.getClientName(selectedClientId.value))

const recentNotes = computed(() => {
  if (!briefing.value || !briefing.value.evidenceNoteIds) return []
  const idSet = new Set(briefing.value.evidenceNoteIds)
  return noteStore.notes.filter((item) => idSet.has(item.id))
})

// 3. 브리핑 로드 로직
const loadBriefing = async () => {
  const currentId = selectedClientId.value

  if (!currentId) {
    status.value = 'IDLE'
    briefing.value = null
    return
  }

  status.value = 'LOADING'
  briefing.value = null

  try {
    const result = await noteStore.fetchBriefingByClient(currentId)
    
    if (currentId !== selectedClientId.value) return

    if (result) {
      briefing.value = result
      status.value = 'SUCCESS'
    } else {
      status.value = 'EMPTY' 
    }
  } catch (e) {
    if (currentId === selectedClientId.value) {
      status.value = 'ERROR'
    }
  }
}

// 4. Watchers
watch(selectedClientId, () => {
  loadBriefing()
})

watch(() => route.query.clientId, (newId) => {
  if (newId) {
    const parsed = Number(newId)
    selectedClientId.value = Number.isNaN(parsed) ? newId : parsed
  }
}, { immediate: true })

// Simple Markdown Parser (Heuristic)
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
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
      <PageHeader title="AI 영업 브리핑" subtitle="고객사별 핵심 활동과 전략 인사이트를 제공합니다." />
      
      <div class="flex flex-col gap-1 w-full lg:w-64">
        <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">브리핑 대상</label>
        <select 
          v-model="selectedClientId" 
          class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm"
        >
          <option value="">고객사 선택</option>
          <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">
            {{ client.name }}
          </option>
        </select>
      </div>
    </div>

    <div id="brief-view-container">
      <!-- IDLE State -->
      <div v-if="status === 'IDLE'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-sm">
        <div class="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
          <i class="fas fa-address-card text-4xl"></i>
        </div>
        <h3 class="text-xl font-bold text-[var(--color-text-strong)] mb-2">분석 대기 중</h3>
        <p class="text-[var(--color-text-sub)]">상단에서 고객사를 선택하여 리포트를 확인하세요.</p>
      </div>

      <!-- EMPTY State -->
      <div v-else-if="status === 'EMPTY'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-sm">
        <div class="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
          <i class="fas fa-hourglass-half text-4xl"></i>
        </div>
        <h4 class="font-bold text-[var(--color-text-strong)] mb-2">분석 데이터 부족</h4>
        <p class="text-[var(--color-text-sub)]">해당 고객에 대해 AI가 분석할 수 있는 영업 기록이 충분하지 않습니다.</p>
      </div>

      <!-- LOADING State -->
      <div v-else-if="status === 'LOADING'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border border-[var(--color-border-card)] shadow-sm">
        <div class="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-[var(--color-bg-base)] border-t-[var(--color-olive)] mb-6"></div>
        <p class="text-[var(--color-text-body)] font-medium">AI 전략 엔진이 데이터를 인출하고 있습니다...</p>
      </div>

      <!-- ERROR State -->
      <div v-else-if="status === 'ERROR'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-status-error)]/30 shadow-sm">
        <i class="fas fa-exclamation-triangle text-5xl text-[var(--color-status-error)] mb-6"></i>
        <p class="text-[var(--color-status-error)] font-bold text-lg">브리핑 정보를 불러올 수 없습니다.</p>
        <button @click="loadBriefing" class="mt-4 px-6 py-2 bg-[var(--color-bg-base)] text-[var(--color-text-body)] rounded-lg font-bold">다시 시도</button>
      </div>

      <!-- SUCCESS State -->
      <div v-else-if="status === 'SUCCESS' && briefing" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Hero Header -->
        <div class="bg-gradient-to-br from-[var(--color-olive)] to-[var(--color-olive)] p-10 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div class="relative z-10">
            <div class="flex items-center gap-2 mb-3">
<!--              <span class="bg-[var(&#45;&#45;color-olive)] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Standard Report</span>-->
              <span class="text-xs text-white/70">Revision {{ briefing.revision }}</span>
            </div>
            <h3 class="text-4xl font-bold mb-2">{{ selectedClientName }}</h3>
            <p class="text-white/80 font-medium">실시간 영업 데이터 자산 기반 전략 브리핑</p>
          </div>
          <i class="fas fa-brain absolute -right-4 -bottom-4 text-white/10 text-9xl"></i>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <!-- Left Column: Patterns -->
          <div class="lg:col-span-3 space-y-8">
            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)]">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-xl flex items-center">
                <i class="fa-solid fa-arrows-to-dot w-8 text-[var(--color-olive)]"></i>
                핵심 현황 및 최근 변화
              </h4>
              <div class="space-y-4">
                <div v-for="(item, idx) in briefing.statusChange" :key="idx" class="flex gap-3 bg-[var(--color-bg-section)] p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <span class="text-[var(--color-olive)] mt-1">•</span>
                  <div class="prose text-[var(--color-text-body)] leading-relaxed text-sm flex-1" v-html="renderMarkdown(item)"></div>
                </div>
                <p v-if="!briefing.statusChange?.length" class="text-[var(--color-text-placeholder)] italic">최근 변화 데이터가 없습니다.</p>
              </div>
            </div>

            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)]">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-xl flex items-center">
                <i class="fa-solid fa-chart-line w-8 text-[var(--color-orange)]"></i>
                장기 패턴 및 특이사항
              </h4>
              <div class="space-y-4">
                <div v-for="(item, idx) in briefing.longTermPattern" :key="idx" class="flex gap-3 bg-[var(--color-bg-section)] p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <span class="text-[var(--color-orange)] mt-1">•</span>
                  <div class="prose text-[var(--color-text-body)] leading-relaxed text-sm flex-1" v-html="renderMarkdown(item)"></div>
                </div>
                <p v-if="!briefing.longTermPattern?.length" class="text-[var(--color-text-placeholder)] italic">장기 패턴 데이터가 없습니다.</p>
              </div>
            </div>
          </div>

          <!-- Right Column: Strategy & Notes -->
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-[var(--color-orange-light)]/30 border-[var(--color-orange-light)] border p-8 rounded-2xl shadow-sm">
              <h4 class="font-bold text-[var(--color-orange-dark)] mb-6 text-xl flex items-center">
                <i class="fa-solid fa-lightbulb w-8"></i>
                AI 추천 전략
              </h4>
              <div 
                class="prose text-[var(--color-text-strong)] font-medium text-sm leading-relaxed bg-white/50 p-5 rounded-xl border border-[var(--color-orange-light)]"
                v-html="renderMarkdown(briefing.strategySuggestion || '추천 전략이 없습니다.')"
              ></div>
            </div>

            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)]">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-lg flex items-center">
                <i class="fa-solid fa-clock-rotate-left w-8 text-[var(--color-text-sub)]"></i>
                최근 반영된 노트
              </h4>
              <div class="space-y-4">
                <div v-for="note in recentNotes" :key="note.id" class="border-l-3 pl-4 border-[var(--color-border-divider)] hover:border-[var(--color-olive)] transition-colors">
                  <p class="text-[var(--text-caption)] text-[var(--color-text-placeholder)] font-bold mb-1">{{ note.activityDate }}</p>
                  <div 
                    class="prose text-[var(--color-text-body)] font-medium text-sm line-clamp-2 leading-relaxed"
                    v-html="renderMarkdown(note.aiSummary?.[0] || '요약 내용 없음')"
                  ></div>
                </div>
                <p v-if="!recentNotes.length" class="text-[var(--color-text-placeholder)] italic text-sm">최근 노트 내역이 없습니다.</p>
              </div>
            </div>
          </div>
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