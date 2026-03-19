<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import NoteDetailModal from '@/components/note/NoteDetailModal.vue'
import { useNoteStore } from '@/stores/note'
import seedLogo from '@/assets/images/Seed_logo.png'

const noteStore = useNoteStore()
const route = useRoute()
const router = useRouter()

// 1. 상태 정의
const selectedClientId = ref('')
const briefing = ref(null)
const status = ref('IDLE') // 'IDLE' | 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR'

const selectedDetailNote = ref(null)
const showDetailModal = ref(false)

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

    // 수정 포인트: result가 있어도 핵심 전략 제안이 없으면 EMPTY로 취급
    if (result && result.strategySuggestion && result.strategySuggestion.trim() !== "") {
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
    const targetId = `note-${id}`
    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('highlight-note')
      setTimeout(() => el.classList.remove('highlight-note'), 2000)
    }
  } else if (e.type === 'mouseover') {
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

const openNoteDetail = (note) => {
  selectedDetailNote.value = note
  showDetailModal.value = true
}

const closeNoteDetail = () => {
  showDetailModal.value = false
  selectedDetailNote.value = null
}

const formatDate = (dateStr) => {
  if (!dateStr) return '기록 없음'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  
  return `${y}-${m}-${d} ${h}:${min}`
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
      <PageHeader title="영업 브리핑" subtitle="AI가 누적된 영업 데이터를 분석하여 거래처별 핵심 현황과 맞춤형 대응 전략을 브리핑합니다." />
      
      <div class="flex flex-col gap-1 w-full lg:w-64">
        <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">브리핑 대상</label>
        <select 
          v-model="selectedClientId" 
          class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm"
        >
          <option value="">거래처 선택</option>
          <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">
            {{ client.name }}
          </option>
        </select>
      </div>
    </div>

    <div id="brief-view-container" @click="handleInteraction" @mouseover="handleInteraction" @mouseout="handleInteraction">
      <!-- IDLE / LOADING / ERROR -->
      <div v-if="status === 'IDLE'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-sm">
        <div class="mb-6 flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-[var(--color-bg-base)]">
          <img :src="seedLogo" alt="Seed Logo" class="w-14 h-14 object-contain opacity-50" />
        </div>
        <h3 class="text-xl font-bold text-[var(--color-text-strong)] mb-2">분석 대기 중</h3>
        <p class="text-[var(--color-text-sub)]">상단에서 거래처를 선택하여 리포트를 확인하세요.</p>
      </div>

      <div v-else-if="status === 'EMPTY'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-sm animate-in fade-in duration-500">
        <div class="mb-6 flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-[var(--color-bg-base)]">
          <img :src="seedLogo" alt="Seed Logo" class="w-16 h-16 object-contain grayscale opacity-60" />
        </div>
        <h4 class="text-2xl font-bold text-[var(--color-text-strong)] mb-3">분석 데이터 부족</h4>
        <p class="text-[var(--color-text-sub)] mb-8 text-lg">
          해당 거래처에 대해 AI가 분석할 수 있는 영업 기록이 충분하지 않습니다.<br>
          최소 3개 이상의 영업 노트를 작성해 주세요.
        </p>
        <button 
          @click="goToWriteNote" 
          class="px-8 py-4 bg-[var(--color-olive)] text-white rounded-xl font-bold shadow-lg hover:bg-[var(--color-olive-dark)] transition-all flex items-center mx-auto transform hover:scale-105"
        >
          <i class="fas fa-pen-to-square"></i> 영업 노트 작성하기
        </button>
      </div>

      <div v-else-if="status === 'LOADING'" class="py-32 text-center bg-[var(--color-bg-card)] rounded-2xl border border border-[var(--color-border-card)] shadow-sm">
        <div class="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-[var(--color-bg-base)] border-t-[var(--color-olive)] mb-6"></div>
        <p class="text-[var(--color-text-body)] font-medium">AI 전략 엔진이 데이터를 인출하고 있습니다...</p>
      </div>

      <!-- SUCCESS State -->
      <div v-else-if="status === 'SUCCESS' && briefing" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- 1. Hero Header -->
        <div class="bg-gradient-to-br from-[var(--color-olive)] to-[var(--color-olive-dark)] p-10 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div class="relative z-10">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs text-white/70 font-bold uppercase tracking-widest">Strategy Briefing</span>
              <span class="h-1 w-1 rounded-full bg-white/30"></span>
              <span class="text-xs text-white/70">version NO.{{ briefing.revision }}</span>
            </div>
            <h3 class="text-5xl text-white/95 font-extrabold mb-4">{{ selectedClientName }}</h3>
            <p class="text-white/80 font-medium text-lg">
              총 {{ briefing.evidenceNoteIds?.length || 0 }}개의 영업 데이터 분석 기반 · 
              마지막 업데이트: {{ formatDate(briefing.updatedAt || briefing.createdAt) }}
            </p>
          </div>
          <i class="fas fa-brain absolute -right-4 -bottom-4 text-white/10 text-[12rem]"></i>
        </div>

        <!-- 2. AI Recommendation (Simple Design - Full Width) -->
        <div class="bg-[var(--color-bg-card)] p-8 lg:p-10 rounded-2xl border border-[var(--color-border-card)] shadow-sm">
          <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-xl flex items-center gap-3">
            <i class="fa-solid fa-lightbulb text-[var(--color-orange)]"></i>
            AI 추천 전략
          </h4>
          <div 
            class="prose text-[var(--color-text-body)] leading-relaxed text-sm"
            v-html="renderMarkdown(briefing.strategySuggestion || '추천 전략이 없습니다.')"
          ></div>
        </div>

        <!-- 3. Split Layout (6:4 Ratio) -->
        <div class="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          
          <!-- Left Column (6/10): Analysis -->
          <div class="lg:col-span-6 space-y-8">
            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)]">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-xl flex items-center gap-3">
                <i class="fa-solid fa-arrows-to-dot text-[var(--color-olive)]"></i>
                핵심 현황 및 최근 변화
              </h4>
              <div class="space-y-4">
                <div v-for="(item, idx) in briefing.statusChange" :key="idx" class="flex gap-3 bg-[var(--color-bg-section)] p-5 rounded-xl border border-[var(--color-border-divider)]">
                  <span class="text-[var(--color-olive)] font-bold">●</span>
                  <div class="prose text-[var(--color-text-body)] leading-relaxed text-sm flex-1" v-html="renderMarkdown(item)"></div>
                </div>
              </div>
            </div>

            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)]">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-6 text-xl flex items-center gap-3">
                <i class="fa-solid fa-chart-line text-[var(--color-olive)]"></i>
                장기 패턴 및 특이사항
              </h4>
              <div class="space-y-4">
                <div v-for="(item, idx) in briefing.longTermPattern" :key="idx" class="flex gap-3 bg-[var(--color-bg-section)] p-5 rounded-xl border border-[var(--color-border-divider)]">
                  <span class="text-[var(--color-olive)] font-bold">●</span>
                  <div class="prose text-[var(--color-text-body)] leading-relaxed text-sm flex-1" v-html="renderMarkdown(item)"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column (4/10): Evidence -->
          <div class="lg:col-span-4 sticky top-8">
            <div class="bg-[var(--color-bg-card)] p-8 rounded-2xl shadow-sm border border-[var(--color-border-card)] max-h-[calc(100vh-100px)] overflow-y-auto">
              <h4 class="font-bold text-[var(--color-text-strong)] mb-2 text-lg flex items-center gap-3">
                <i class="fa-solid fa-clock-rotate-left text-[var(--color-text-sub)]"></i>
                분석 근거 데이터
              </h4>
              <p class="text-[11px] text-[var(--color-text-placeholder)] font-medium mb-6">
                영업노트 번호를 클릭하여 해당 노트의 요약과 원문을 볼 수 있습니다.
              </p>
              <div class="space-y-6">
                <div 
                  v-for="note in recentNotes" 
                  :key="note.id" 
                  :id="`note-${note.id}`"
                  class="recent-note-item bg-[var(--color-bg-section)] border-l-4 p-5 rounded-r-xl border-[var(--color-border-divider)] hover:border-[var(--color-olive)] transition-all"
                >
                  <div class="flex justify-between items-center mb-3">
                    <span 
                      @click="openNoteDetail(note)"
                      class="text-[10px] font-black text-[var(--color-olive)] hover:underline cursor-pointer uppercase"
                    >영업 노트 #{{ note.id }}</span>
                    <span class="text-xs font-bold text-[var(--color-text-sub)] opacity-70">{{ note.activityDate }}</span>
                  </div>
                  <div 
                    class="prose text-[var(--color-text-body)] font-medium text-xs line-clamp-5 leading-relaxed"
                    v-html="renderMarkdown(note.aiSummary?.[0] || '요약 내용 없음')"
                  ></div>
                </div>
                <p v-if="!recentNotes.length" class="text-center py-10 text-[var(--color-text-placeholder)] italic text-sm">최근 분석에 반영된 노트가 없습니다.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Note Detail Modal -->
    <NoteDetailModal 
      :show="showDetailModal" 
      :note="selectedDetailNote" 
      @close="closeNoteDetail" 
    />
  </section>
</template>

<style scoped>
.prose :deep(strong) {
  color: var(--color-olive-dark);
  background: linear-gradient(120deg, rgba(171, 200, 186, 0.1) 0%, rgba(171, 200, 186, 0.1) 100%);
  padding: 0 4px;
  border-radius: 4px;
}

.prose :deep(.evidence-chip) {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  background: white;
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
}

.recent-note-item { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.highlight-note {
  background-color: rgba(171, 200, 186, 0.2) !important;
  border-left-color: var(--color-olive) !important;
  transform: translateX(4px);
}

.prose :deep(p) { margin-bottom: 0.75rem; }
.prose :deep(br) { content: ""; display: block; margin-top: 0.5rem; }
.prose :deep(li) { margin-bottom: 0.5rem; }

.overflow-y-auto::-webkit-scrollbar { width: 4px; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: var(--color-border-divider); border-radius: 10px; }
</style>