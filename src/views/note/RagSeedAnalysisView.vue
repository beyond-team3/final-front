<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const route = useRoute()

// --- State ---
const selectedClientId = ref('')
const selectedContractId = ref('')
const queryType = ref('RECAP') // RECAP, RISK, MATCHING, CHECKLIST
const analysisResult = ref(null)
const status = ref('IDLE') // IDLE, LOADING, SUCCESS, EMPTY, ERROR

// --- Computed ---
const selectedClientName = computed(() => noteStore.getClientName(selectedClientId.value))
const availableContracts = computed(() => noteStore.contractOptions)

// --- Methods ---
const handleClientChange = async () => {
  selectedContractId.value = ''
  if (selectedClientId.value) {
    await noteStore.fetchActiveContracts(selectedClientId.value)
  } else {
    noteStore.contractOptions = []
  }
}

const fetchAnalysis = async () => {
  if (!selectedClientId.value) {
    status.value = 'IDLE'
    return
  }

  status.value = 'LOADING'
  analysisResult.value = null

  try {
    const result = await noteStore.askRagSeed({
      clientId: selectedClientId.value,
      contractId: selectedContractId.value || 'NONE',
      query: queryType.value
    })

    if (result && result.content) {
      let content = result.content
      
      // 백엔드 응답이 JSON 문자열({"content": "..."})인 경우 파싱하여 마크다운 추출
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(content)
          content = parsed.content || parsed.text || content
        } catch (e) {
          console.warn('JSON 파싱 실패:', e)
        }
      }
      
      analysisResult.value = { ...result, content }
      status.value = 'SUCCESS'
    } else {
      status.value = 'EMPTY'
    }
  } catch (e) {
    status.value = 'ERROR'
  }
}

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
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold text-[var(--color-text-strong)]">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br>')

  // Special handling for Risks (Keywords heuristic)
  const riskKeywords = ['리스크', '위험', '주의', '문제', '클레임', '병해충', '부족', '경쟁']
  riskKeywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi')
    html = html.replace(regex, '<span class="text-[var(--color-status-error)] font-bold">$1</span>')
  })

  return html
}

const handleEvidenceClick = (id) => {
  // logic to show evidence details (e.g. open a modal with the note content)
  console.log('Evidence clicked:', id)
  // alert(`Evidence ID: ${id} Clicked. (모달 구현 예정)`)
}

onMounted(async () => {
  if (route.query.clientId) {
    selectedClientId.value = Number(route.query.clientId)
    await noteStore.fetchActiveContracts(selectedClientId.value)
    if (route.query.contractId) {
      selectedContractId.value = route.query.contractId
    }
    // fetchAnalysis() // 자동 실행 제거
  }
})
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <!-- Header & Filter Bar -->
    <div class="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <PageHeader 
        title="RAGseed 전략 분석" 
        subtitle="영업 데이터(Seed)에서 인출한 AI 전략 리포트입니다." 
      />

      <div class="flex flex-wrap gap-3 rounded-xl bg-[var(--color-bg-sidebar)] p-4 shadow-sm border border-[var(--color-border-card)]">
        <div class="flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">거래처</label>
          <select 
            v-model="selectedClientId" 
            @change="handleClientChange"
            class="h-10 w-48 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)]"
          >
            <option value="">거래처 선택</option>
            <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">
              {{ client.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">계약 범위</label>
          <select 
            v-model="selectedContractId"
            class="h-10 w-40 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)]"
            :disabled="!selectedClientId"
          >
            <option value="">전체 범위</option>
            <option v-for="contract in availableContracts" :key="contract.id" :value="contract.contractCode">
              {{ contract.contractCode }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">분석 타입</label>
          <select 
            v-model="queryType"
            class="h-10 w-40 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)]"
          >
            <option value="RECAP">지난 맥락 요약</option>
            <option value="RISK">리스크 탐지</option>
            <option value="MATCHING">종자 매칭 전략</option>
            <option value="CHECKLIST">미팅 체크리스트</option>
          </select>
        </div>

        <button 
          @click="fetchAnalysis"
          class="mt-auto h-10 rounded-lg bg-[var(--color-olive)] px-6 text-sm font-bold text-white transition-all hover:bg-[var(--color-olive-dark)]"
          :disabled="!selectedClientId || status === 'LOADING'"
        >
          <i v-if="status === 'LOADING'" class="fas fa-spinner fa-spin mr-2"></i>
          분석 실행
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="mx-auto max-w-5xl">
      <!-- IDLE State -->
      <div v-if="status === 'IDLE'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
          <i class="fas fa-robot text-4xl"></i>
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">전략 인출 준비 완료</h3>
        <p class="text-[var(--color-text-sub)]">분석할 거래처와 옵션을 상단에서 선택해 주세요.</p>
      </div>

      <!-- LOADING State -->
      <div v-else-if="status === 'LOADING'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 relative">
          <div class="h-16 w-16 animate-spin rounded-full border-4 border-[var(--color-bg-base)] border-t-[var(--color-olive)]"></div>
          <i class="fas fa-seedling absolute inset-0 flex items-center justify-center text-[var(--color-olive)]"></i>
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">RAGseed 분석 중...</h3>
        <p class="text-[var(--color-text-sub)]">영업 데이터 자산에서 최적의 전략을 인출하고 있습니다.</p>
      </div>

      <!-- ERROR State -->
      <div v-else-if="status === 'ERROR'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-status-error)]/30 bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-[var(--color-status-error)]">
          <i class="fas fa-exclamation-triangle text-4xl"></i>
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">분석 오류 발생</h3>
        <p class="text-[var(--color-text-sub)]">AI 엔진과의 통신 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
      </div>

      <!-- EMPTY State -->
      <div v-else-if="status === 'EMPTY'" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-32 text-center shadow-sm">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-bg-base)] text-[var(--color-text-placeholder)]">
          <i class="fas fa-comment-slash text-4xl"></i>
        </div>
        <h3 class="mb-2 text-xl font-bold text-[var(--color-text-strong)]">인출된 데이터 없음</h3>
        <p class="text-[var(--color-text-sub)]">선택한 범위 내에 분석할 만한 영업 기록이 충분하지 않습니다.</p>
      </div>

      <!-- SUCCESS State -->
      <div v-else-if="status === 'SUCCESS' && analysisResult" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Report Card -->
        <div class="overflow-hidden rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-sm">
          <!-- Header Image/Pattern -->
          <div class="h-2 bg-gradient-to-r from-[var(--color-olive)] to-[var(--color-olive-light)]"></div>
          
          <div class="p-8 lg:p-10">
            <div class="mb-8 flex items-start justify-between">
              <div>
                <div class="mb-2 flex items-center gap-2">
                  <span class="rounded-full bg-[var(--color-olive)] px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">RAGseed Engine</span>
                  <span class="text-[var(--text-caption)] text-[var(--color-text-placeholder)]">Version {{ analysisResult.version }}</span>
                </div>
                <h3 class="text-3xl font-bold text-[var(--color-text-strong)]">{{ selectedClientName }} 전략 리포트</h3>
                <p class="mt-1 text-[var(--color-text-sub)]">{{ analysisResult.attribution }}</p>
              </div>
              <button class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border-card)] bg-white text-[var(--color-text-body)] hover:bg-[var(--color-bg-base)]">
                <i class="fas fa-download"></i>
              </button>
            </div>

            <!-- Markdown Content -->
            <div 
              class="prose max-w-none text-[var(--color-text-body)] leading-relaxed"
              v-html="renderMarkdown(analysisResult.content)"
            ></div>

            <!-- Risk Highlight Area (if query is RISK or contains risk) -->
            <div v-if="queryType === 'RISK'" class="mt-10 rounded-xl border border-[var(--color-status-error)]/20 bg-[var(--color-orange-light)]/20 p-6">
              <h5 class="mb-3 flex items-center gap-2 font-bold text-[var(--color-status-error)]">
                <i class="fas fa-shield-virus"></i>
                집중 리스크 탐지 결과
              </h5>
              <p class="text-sm text-[var(--color-text-body)]">
                위 분석 내용은 영업 노트 내 '병해충', '클레임', '경쟁사' 키워드를 중심으로 인출되었습니다. 해당 리스크에 대한 즉각적인 후속 조치를 권장합니다.
              </p>
            </div>
          </div>

          <!-- Evidence Footer -->
          <div class="border-t border-[var(--color-border-divider)] bg-[var(--color-bg-section)]/50 p-6">
            <h5 class="mb-4 text-[var(--text-caption)] font-bold text-[var(--color-text-sub)] uppercase tracking-wider">분석 근거 (Evidence)</h5>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="id in analysisResult.evidenceIds" 
                :key="id"
                @click="handleEvidenceClick(id)"
                class="group flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-olive-light)] px-4 py-1.5 transition-all hover:bg-[var(--color-olive)] hover:text-white"
              >
                <i class="fas fa-file-alt text-[10px] text-[var(--color-olive)] group-hover:text-white"></i>
                <span class="text-xs font-bold text-[var(--color-olive-dark)] group-hover:text-white">Note #{{ id }}</span>
              </div>
              <p v-if="!analysisResult.evidenceIds?.length" class="text-xs text-[var(--color-text-placeholder)]">참조된 근거 데이터가 없습니다.</p>
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
  margin-top: 0.75rem;
}
.prose :deep(li) {
  margin-bottom: 0.5rem;
}
</style>
