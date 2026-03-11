<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const route = useRoute()
const router = useRouter()

// 1. 상태 정의
const selectedClientId = ref('')
const briefing = ref(null)
const status = ref('IDLE') // 'IDLE' | 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR'

// 2. 팝오버 상태 (Preview 기능)
const hoverPreview = ref({
  show: false,
  content: '',
  x: 0,
  y: 0
})

// 3. Computed
const selectedClientName = computed(() => noteStore.getClientName(selectedClientId.value))

const recentNotes = computed(() => {
  if (!briefing.value || !briefing.value.evidenceNoteIds) return []
  const idSet = new Set(briefing.value.evidenceNoteIds)
  return noteStore.notes.filter((item) => idSet.has(item.id))
})

// 4. 브리핑 로드 로직
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
    if (currentId === selectedClientId.value) status.value = 'ERROR'
  }
}

// 5. Watchers
watch(selectedClientId, () => loadBriefing())
watch(() => route.query.clientId, (newId) => {
  if (newId) {
    const parsed = Number(newId)
    selectedClientId.value = Number.isNaN(parsed) ? newId : parsed
  }
}, { immediate: true })

// 6. 인터랙티브 핸들러 (이벤트 위임)
const handleInteraction = (e) => {
  const chip = e.target.closest('.evidence-chip')
  if (!chip) return

  const id = Number(chip.dataset.id)
  const note = noteStore.notes.find(n => n.id === id)

  if (e.type === 'click') {
    // 앵커링: 클릭 시 해당 노트로 이동 및 하이라이트
    const targetId = `note-${id}`
    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('highlight-note')
      setTimeout(() => el.classList.remove('highlight-note'), 2000)
    }
  } else if (e.type === 'mouseover') {
    // 프리뷰: 마우스 오버 시 미니 팝오버 표시
    if (note) {
      hoverPreview.value = {
        show: true,
        content: note.aiSummary?.[0] || note.content.substring(0, 100) + '...',
        x: e.clientX + 10,
        y: e.clientY + 10
      }
    }
  } else if (e.type === 'mouseout') {
    hoverPreview.value.show = false
  }
}

// 7. 마크다운 렌더러
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
    .replace(/\(ID (\d+)\)/g, '<span class="evidence-chip" data-id="$1">#$1</span>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br>')

  return html
}

const goToWriteNote = () => {
  router.push({ name: 'notes', query: { clientId: selectedClientId.value } })
}
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <!-- 팝오버 프리뷰 UI -->
<!--    <div -->
<!--      v-if="hoverPreview.show" -->
<!--      class="fixed z-[999] pointer-events-none bg-slate-800 text-white text-xs p-3 rounded-lg shadow-2xl max-w-xs animate-in fade-in zoom-in-95 duration-200"-->
<!--      :style="{ left: hoverPreview.x + 'px', top: hoverPreview.y + 'px' }"-->
<!--    >-->
<!--&lt;!&ndash;      <div class="flex items-center gap-2 mb-1 border-b border-white/10 pb-1">&ndash;&gt;-->
<!--&lt;!&ndash;        <i class="fas fa-eye text-[var(&#45;&#45;color-olive-light)]"></i>&ndash;&gt;-->
<!--&lt;!&ndash;        <span class="font-bold">Quick Preview</span>&ndash;&gt;-->
<!--&lt;!&ndash;      </div>&ndash;&gt;-->
<!--&lt;!&ndash;      <p class="leading-relaxed opacity-90">{{ hoverPreview.content }}</p>&ndash;&gt;-->
<!--    </div>-->

    <!-- Header -->
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

    <div id="brief-view-container" @click="handleInteraction" @mouseover="handleInteraction" @mouseout="handleInteraction">
      <!-- IDLE / LOADING / ERROR 생략 (기존 코드 유지) -->
      <div v-if="status === 'IDLE'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-sm">
        <div class="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
          <i class="fas fa-address-card text-4xl"></i>
        </div>
        <h3 class="text-xl font-bold text-[var(--color-text-strong)] mb-2">분석 대기 중</h3>
        <p class="text-[var(--color-text-sub)]">상단에서 고객사를 선택하여 리포트를 확인하세요.</p>
      </div>

      <div v-else-if="status === 'EMPTY'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-sm">
        <div class="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
          <i class="fas fa-hourglass-half text-4xl"></i>
        </div>
        <h4 class="font-bold text-[var(--color-text-strong)] mb-2">분석 데이터 부족</h4>
        <p class="text-[var(--color-text-sub)] mb-6">해당 고객에 대해 AI가 분석할 수 있는 영업 기록이 충분하지 않습니다.</p>
        <button @click="goToWriteNote" class="px-6 py-3 bg-[var(--color-olive)] text-white rounded-xl font-bold shadow-md hover:bg-[var(--color-olive-dark)] transition-all flex items-center gap-2 mx-auto">
          <i class="fas fa-pen-to-square"></i>영업 노트 작성하기
        </button>
      </div>

      <div v-else-if="status === 'LOADING'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border border-[var(--color-border-card)] shadow-sm">
        <div class="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-[var(--color-bg-base)] border-t-[var(--color-olive)] mb-6"></div>
        <p class="text-[var(--color-text-body)] font-medium">AI 전략 엔진이 데이터를 인출하고 있습니다...</p>
      </div>

      <!-- SUCCESS State -->
      <div v-else-if="status === 'SUCCESS' && briefing" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Hero Header (Enhanced Hierarchy) -->
        <div class="bg-gradient-to-br from-[var(--color-olive)] to-[var(--color-olive-dark)] p-10 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div class="relative z-10">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs text-white/70 font-bold uppercase tracking-widest">Strategy Briefing</span>
              <span class="h-1 w-1 rounded-full bg-white/30"></span>
              <span class="text-xs text-white/70">Revision {{ briefing.revision }}</span>
            </div>
            <h3 class="text-5xl font-extrabold mb-4">{{ selectedClientName }}</h3>
            <p class="text-white/80 font-medium text-lg mb-8">실시간 영업 데이터 자산 기반 전략 브리핑</p>
            
            <div class="flex flex-wrap gap-8 pt-6 border-t border-white/20">
              <div class="flex flex-col">
                <span class="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">참조된 데이터 자산</span>
                <span class="text-2xl font-bold">{{ briefing.evidenceNoteIds?.length || 0 }} <small class="text-sm font-medium opacity-70">Notes</small></span>
              </div>
              <div class="flex flex-col border-l border-white/20 pl-8">
                <span class="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">최종 분석 업데이트</span>
                <span class="text-lg font-bold">최신 상태</span>
              </div>
            </div>
          </div>
          <i class="fas fa-brain absolute -right-4 -bottom-4 text-white/10 text-[12rem]"></i>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <!-- Left: Details -->
          <div class="lg:col-span-3 space-y-8">
            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)]">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-xl flex items-center">
                <i class="fa-solid fa-arrows-to-dot w-8 text-[var(--color-olive)]"></i> 핵심 현황 및 최근 변화
              </h4>
              <div class="space-y-4">
                <div v-for="(item, idx) in briefing.statusChange" :key="idx" class="flex gap-3 bg-[var(--color-bg-section)] p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <span class="text-[var(--color-olive)] mt-1">•</span>
                  <div class="prose text-[var(--color-text-body)] leading-relaxed text-sm flex-1" v-html="renderMarkdown(item)"></div>
                </div>
              </div>
            </div>

            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)]">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-xl flex items-center">
                <i class="fa-solid fa-chart-line w-8 text-[var(--color-orange)]"></i> 장기 패턴 및 특이사항
              </h4>
              <div class="space-y-4">
                <div v-for="(item, idx) in briefing.longTermPattern" :key="idx" class="flex gap-3 bg-[var(--color-bg-section)] p-4 rounded-xl border border-[var(--color-border-divider)]">
                  <span class="text-[var(--color-orange)] mt-1">•</span>
                  <div class="prose text-[var(--color-text-body)] leading-relaxed text-sm flex-1" v-html="renderMarkdown(item)"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Strategy & Anchor Targets -->
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
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-lg flex items-center gap-2">
                <i class="fa-solid fa-clock-rotate-left text-[var(--color-text-sub)]"></i> 최근 반영된 노트
              </h4>
              <div class="space-y-4">
                <div v-for="note in recentNotes" :key="note.id" :id="`note-${note.id}`" class="recent-note-item border-l-4 pl-4 border-[var(--color-border-divider)] hover:border-[var(--color-olive)] transition-all py-3">
                  <p class="text-[var(--text-caption)] text-[var(--color-text-placeholder)] font-black mb-1">#{{ note.id }} · {{ note.activityDate }}</p>
                  <div class="prose text-[var(--color-text-body)] font-medium text-sm line-clamp-3 leading-relaxed" v-html="renderMarkdown(note.aiSummary?.[0] || '요약 내용 없음')"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.prose :deep(strong) {
  color: var(--color-olive-dark);
  background: linear-gradient(120deg, rgba(171, 200, 186, 0.2) 0%, rgba(171, 200, 186, 0.2) 100%);
  padding: 0 4px;
  border-radius: 4px;
}

.prose :deep(.evidence-chip) {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  background: var(--color-bg-base);
  border: 1px solid var(--color-border-card);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 800;
  color: var(--color-olive);
  cursor: pointer;
  margin: 0 2px;
  transition: all 0.2s;
  vertical-align: middle;
}

.prose :deep(.evidence-chip:hover) {
  background: var(--color-olive);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.recent-note-item { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.highlight-note {
  background-color: rgba(171, 200, 186, 0.15);
  border-left-color: var(--color-olive) !important;
  transform: translateX(4px);
}

.prose :deep(p) { margin-bottom: 0.75rem; }
.prose :deep(br) { content: ""; display: block; margin-top: 0.5rem; }
.prose :deep(li) { margin-bottom: 0.5rem; }
</style>