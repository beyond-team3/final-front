<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import NoteDetailModal from '@/components/note/NoteDetailModal.vue'
import { useNoteStore } from '@/stores/note'
import seedLogo from '@/assets/images/Seed_logo.png'

const noteStore = useNoteStore()
const route = useRoute()
const router = useRouter()

// --- State ---
const selectedClientId = ref('')
const selectedContractId = ref('')
const queryText = ref('') // Free text input
const analysisResult = ref(null)
const status = ref('IDLE') // IDLE, LOADING, SUCCESS, EMPTY, ERROR

const selectedNote = ref(null)
const showDetailModal = ref(false)

const recommendedThemes = [
  { label: '지난 맥락 요약', value: 'RECAP', display: '지난 맥락을 요약해줘' },
  { label: '리스크 탐지', value: 'RISK', display: '영업 리스크를 탐지해줘' },
  { label: '종자 매칭 전략', value: 'MATCHING', display: '맞춤형 종자 매칭 전략을 제안해줘' },
  { label: '미팅 체크리스트', value: 'CHECKLIST', display: '다음 미팅을 위한 체크리스트를 만들어줘' }
]

// --- Computed ---
const selectedClientName = computed(() => noteStore.getClientName(selectedClientId.value))
const availableContracts = computed(() => noteStore.contractOptions)

// --- Methods ---
const setQuery = (theme) => {
  queryText.value = theme.display
}

const handleClientChange = async () => {
  selectedContractId.value = ''
  if (selectedClientId.value) {
    await noteStore.fetchActiveContracts(selectedClientId.value)
  } else {
    noteStore.contractOptions = []
  }
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

const handleEvidenceClick = async (id) => {
  const noteId = Number(id)
  let note = noteStore.notes.find(n => n.id === noteId)
  
  if (!note) {
    await noteStore.fetchNotes()
    note = noteStore.notes.find(n => n.id === noteId)
  }

  if (note) {
    openDetail(note)
  } else {
    console.warn('Note not found in store:', id)
  }
}

/**
 * 구조화된 객체를 가독성 좋은 마크다운으로 변환
 */
const formatObjectToMarkdown = (data) => {
  // 1. 체크리스트 구조인 경우
  if (data.meeting_checklist) {
    const list = data.meeting_checklist
    let md = ''
    if (list.disclaimer) md += `> ${list.disclaimer}\n\n`
    if (list.appointments?.length) {
      md += `### 예정된 미팅 및 일정\n`
      list.appointments.forEach(item => md += `- **${item.date}**: ${item.purpose}\n`)
      md += '\n'
    }
    if (list.next_visit_todos?.length) {
      md += `### 다음 방문 시 수행할 작업 (To-do)\n`
      list.next_visit_todos.forEach(todo => md += `- ${todo}\n`)
    }
    return md
  }

  // 2. 기타 응답 객체 (response, summary 등 필드 대응)
  return data.response || data.summary || data.content || data.text || JSON.stringify(data)
}

const fetchAnalysis = async () => {
  if (!selectedClientId.value || !queryText.value.trim()) {
    return
  }

  status.value = 'LOADING'
  analysisResult.value = null

  try {
    // 추천 검색어 중 일치하는 항목이 있으면 value(상수)를 사용하고, 없으면 입력값 그대로 사용
    const matchedTheme = recommendedThemes.find(t => t.display === queryText.value)
    const finalQuery = matchedTheme ? matchedTheme.value : queryText.value

    const result = await noteStore.askRagSeed({
      clientId: selectedClientId.value,
      contractId: selectedContractId.value || 'NONE',
      query: finalQuery
    })

    if (result && result.content) {
      let raw = result.content
      
      // 백엔드 AI가 JSON 문자열로 응답했을 경우를 대비한 파싱 처리
      // 백엔드 AI가 JSON 문자열로 응답했을 경우를 대비한 파싱 처리
      if (typeof raw === 'string' && (raw.trim().startsWith('{') || raw.trim().startsWith('['))) {
        try {
          const parsed = JSON.parse(raw)
          // 명시적인 키 확인
          raw = parsed.content || parsed.retrieval_strategy_markdown || parsed.response || parsed.summary || parsed.text || raw

          // 만약 객체인데 위의 키가 없고 문자열 값이 하나만 있다면 그것을 추출
          if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
            const values = Object.values(raw).filter(v => typeof v === 'string')
            if (values.length > 0) raw = values[0]
          }
        } catch (e) {
          console.warn('Failed to parse AI response as JSON, using raw string.')
        }
      }

      // 객체일 경우 포맷터 적용 / 문자열일 경우 그대로 사용
      const content = (typeof raw === 'object' && raw !== null) 
        ? formatObjectToMarkdown(raw) 
        : raw
      
      analysisResult.value = { ...result, content }
      status.value = 'SUCCESS'

      if (noteStore.notes.length === 0) {
        noteStore.fetchNotes()
      }
    } else {
      status.value = 'EMPTY'
    }
  } catch (e) {
    status.value = 'ERROR'
  }
}

// Simple Markdown Parser for Analysis Reports
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

  // Risk Keywords Highlighting for the Main Report
  const riskKeywords = ['리스크', '위험', '주의', '문제', '클레임', '병해충', '부족', '경쟁사', '저하', '피해']
  riskKeywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi')
    html = html.replace(regex, '<span class="text-[var(--color-status-error)] font-bold">$1</span>')
  })

  return `<div class="md-content">${html}</div>`
}

onMounted(async () => {
  if (noteStore.notes.length === 0) {
    noteStore.fetchNotes()
  }

  if (route.query.clientId) {
    selectedClientId.value = Number(route.query.clientId)
    await noteStore.fetchActiveContracts(selectedClientId.value)
    if (route.query.contractId) {
      selectedContractId.value = route.query.contractId
    }
  }
})
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <!-- Header -->
    <div class="mb-6">
      <PageHeader 
        title="영업 전략 분석"
        subtitle="AI 지식 엔진이 영업 노트와 품종 카탈로그를 실시간 분석하여 검증된 영업 전략을 생성합니다."
      />
    </div>

    <!-- Filter Bar -->
    <div class="mb-10 flex flex-col gap-4 rounded-xl bg-[var(--color-bg-sidebar)] p-5 shadow-sm border border-[var(--color-border-card)] w-full">
      <div class="flex flex-wrap gap-4 items-end">
          <div class="flex flex-col gap-1.5">
            <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">거래처</label>
            <select 
              v-model="selectedClientId" 
              @change="handleClientChange"
              class="h-11 w-48 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm transition-all"
            >
              <option value="">거래처 선택</option>
              <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">계약 범위</label>
            <select 
              v-model="selectedContractId"
              class="h-11 w-40 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm transition-all"
              :disabled="!selectedClientId"
            >
              <option value="">전체 계약</option>
              <option v-for="contract in availableContracts" :key="contract.id" :value="contract.contractCode">
                {{ contract.contractCode }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5 flex-1 min-w-[300px]">
            <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">분석 요청 사항</label>
            <div class="relative">
              <input 
                v-model="queryText"
                type="text"
                placeholder="어떤 분석이 필요하신가요? (직접 입력 가능)"
                class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] pl-4 pr-10 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm transition-all"
                @keyup.enter="fetchAnalysis"
              />
              <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"></i>
            </div>
          </div>

          <button 
            @click="fetchAnalysis"
            class="h-11 rounded-lg bg-[var(--color-olive)] px-8 text-sm font-bold text-white transition-all hover:bg-[var(--color-olive-dark)] hover:shadow-md shadow-sm disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed group"
            :disabled="!selectedClientId || !queryText.trim() || status === 'LOADING'"
          >
            <i v-if="status === 'LOADING'" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-magic opacity-80 group-hover:opacity-100 transition-opacity"></i>
            분석 실행
          </button>
        </div>

        <!-- 추천 검색어 배지 -->
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <span class="text-[11px] font-bold text-[var(--color-text-placeholder)] uppercase mr-1">추천 검색어:</span>
          <button
            v-for="theme in recommendedThemes"
            :key="theme.label"
            type="button"
            @click="setQuery(theme)"
            class="rounded-full border border-[var(--color-border-card)] bg-white px-3.5 py-1.5 text-xs font-medium text-[var(--color-text-body)] transition-all hover:border-[var(--color-olive)] hover:text-[var(--color-olive)] hover:shadow-sm active:scale-95"
          >
            # {{ theme.label }}
          </button>
        </div>
      </div>

    <!-- Main Content Area -->
    <div class="">
      <!-- IDLE State -->
      <div v-if="status === 'IDLE'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-bg-base)]">
          <img :src="seedLogo" alt="Seed Logo" class="w-14 h-14 object-contain opacity-50" />
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">전략 인출 준비 완료</h3>
        <p class="text-[var(--color-text-sub)]">거래처를 선택하고 분석 요청 사항을 입력해 주세요.</p>
      </div>

      <!-- LOADING State -->
      <div v-else-if="status === 'LOADING'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 relative">
          <div class="h-16 w-16 animate-spin rounded-full border-4 border-[var(--color-bg-base)] border-t-[var(--color-olive)]"></div>
          <i class="fas fa-seedling absolute inset-0 flex items-center justify-center text-[var(--color-olive)]"></i>
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">영업 지식 베이스 분석 중...</h3>
        <p class="text-[var(--color-text-sub)]">최적의 비즈니스 전략을 생성하고 있습니다.</p>
      </div>

      <!-- ERROR State -->
      <div v-else-if="status === 'ERROR'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-status-error)]/30 bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-[var(--color-status-error)]">
          <i class="fas fa-exclamation-triangle text-4xl"></i>
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">분석 도중 오류 발생</h3>
        <p class="text-[var(--color-text-sub)]">AI 지식 엔진과의 통신이 원활하지 않습니다. 다시 한 번 시도해 주세요.</p>
      </div>

      <!-- EMPTY State -->
      <div v-else-if="status === 'EMPTY'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
          <i class="fas fa-comment-slash text-4xl"></i>
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">분석 결과 없음</h3>
        <p class="text-[var(--color-text-sub)]">해당 거래처에 대한 데이터가 부족하여 분석을 실행할 수 없습니다. 더 많은 영업 노트를 작성해 보세요.</p>
      </div>

      <!-- SUCCESS State -->
      <div v-else-if="status === 'SUCCESS' && analysisResult" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Report Card -->
        <div class="overflow-hidden rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-md">
          <div class="h-2 bg-[var(--color-olive)]"></div>
          
          <div class="p-8 lg:p-12">
            <div class="mb-10 flex items-start justify-between border-b border-[var(--color-border-divider)] pb-8">
              <div>
                <div class="mb-4 flex items-center gap-2">
<!--                  <span class="rounded-full bg-[var(&#45;&#45;color-olive)] px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">RAGseed Engine</span>-->
<!--                  <span class="text-[var(&#45;&#45;text-caption)] text-[var(&#45;&#45;color-text-placeholder)] font-medium">Verified Analysis</span>-->
                </div>
                <h3 class="text-4xl font-extrabold text-[var(--color-text-strong)]">{{ selectedClientName }} 전략 리포트</h3>
                <div class="mt-3 text-[var(--color-text-sub)] prose text-sm opacity-80" v-html="renderMarkdown(analysisResult.attribution)"></div>
              </div>
<!--              <div class="hidden lg:block text-right">-->
<!--                 <p class="text-xs font-bold text-[var(&#45;&#45;color-text-placeholder)] uppercase mb-1">Report ID</p>-->
<!--                 <p class="text-sm font-mono text-[var(&#45;&#45;color-text-sub)]">#{{ analysisResult.id || 'N/A' }}</p>-->
<!--              </div>-->
            </div>

            <!-- Markdown Content -->
            <div 
              class="prose max-w-none text-[var(--color-text-body)] leading-loose text-base"
              v-html="renderMarkdown(analysisResult.content)"
            ></div>

            <!-- Risk Highlight Area -->
            <div v-if="queryText.toUpperCase().includes('RISK') || queryText.includes('리스크') || analysisResult.content.includes('위험') || analysisResult.content.includes('리스크')" class="mt-12 rounded-2xl border border-[var(--color-status-error)]/20 bg-[var(--color-orange-light)]/10 p-8 shadow-inner">
              <h5 class="mb-4 flex items-center gap-3 font-bold text-[var(--color-status-error)] text-lg">
                <i class="fas fa-shield-virus"></i>
                집중 리스크 탐지 및 권고 사항
              </h5>
              <p class="text-sm text-[var(--color-text-body)] leading-relaxed">
                위 분석 결과는 영업 활동 기록 내의 부정적 키워드(병해충, 클레임, 경쟁사 등)를 중점적으로 추출한 결과입니다.
                탐지된 리스크 항목에 대한 담당자의 후속 조치를 권장합니다.
              </p>
            </div>
          </div>

          <!-- Evidence Footer -->
          <div class="border-t border-[var(--color-border-divider)] bg-[var(--color-bg-section)]/50 p-8">
            <h5 class="mb-1 text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider flex items-center gap-2">
              <i class="fas fa-link text-xs"></i> 분석 근거 데이터
            </h5>
            <p class="mb-5 text-[11px] text-[var(--color-text-placeholder)] font-medium">
              클릭하면 해당 영업 노트의 요약과 원문을 볼 수 있습니다.
            </p>
            <div class="flex flex-wrap gap-3">
              <button 
                v-for="id in analysisResult.evidenceIds" 
                :key="id"
                type="button"
                @click="handleEvidenceClick(id)"
                class="evidence-item group flex cursor-pointer items-center rounded-lg bg-white border border-[var(--color-border-card)] px-4 py-2 transition-all shadow-sm"
              >
                <i class="fas fa-file-alt text-xs text-[var(--color-olive)] group-hover:text-white"></i>
                <span class="text-xs font-bold text-[var(--color-text-strong)] group-hover:text-white">영업 노트 #{{ id }}</span>
              </button>
              <p v-if="!analysisResult.evidenceIds?.length" class="text-xs text-[var(--color-text-placeholder)] italic">참조된 영업 활동 기록이 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Note Detail Modal -->
    <NoteDetailModal 
      :show="showDetailModal" 
      :note="selectedNote" 
      :is-risk-highlight="true"
      @close="closeDetail" 
    />
  </section>
</template>

<style scoped>
.prose :deep(p) {
  margin-bottom: 1rem;
}
.prose :deep(br) {
  content: "";
  display: block;
  margin-top: 0.5rem;
}
.prose :deep(li) {
  margin-bottom: 0.5rem;
}
.md-content {
  white-space: normal;
}
.evidence-item:hover {
  background-color: var(--color-olive) !important;
  border-color: var(--color-olive) !important;
}
</style>