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
  if (!briefing.value || !briefing.value.recentNoteIds) return []
  const idSet = new Set(briefing.value.recentNoteIds)
  return noteStore.notes.filter((item) => idSet.has(item.id))
})

// 3. 브리핑 로드 로직 (핵심)
const loadBriefing = async () => {
  const currentId = selectedClientId.value

  // 1) 선택된 고객 없음
  if (!currentId) {
    status.value = 'IDLE'
    briefing.value = null
    return
  }

  // 2) 데이터 로딩 중이면 대기 (Store 초기화)
  if (noteStore.loading) {
    status.value = 'LOADING'
    return
  }

  // 3) 노트 개수 검증 (비즈니스 로직 필수)
  const clientNotes = noteStore.getNotesByClient(currentId)
  if (clientNotes.length < 3) {
    status.value = 'EMPTY'
    briefing.value = null
    return
  }

  // 4) 브리핑 로딩 시작
  status.value = 'LOADING'
  briefing.value = null // 이전 데이터 잔상 제거

  try {
    const result = await noteStore.fetchBriefingByClient(currentId)
    
    // 요청 완료 시점에 선택된 ID가 변경되었는지 확인 (Race Condition 방지)
    if (currentId !== selectedClientId.value) return

    if (result) {
      briefing.value = result
      status.value = 'SUCCESS'
    } else {
      status.value = 'ERROR'
    }
  } catch (e) {
    if (currentId === selectedClientId.value) {
      status.value = 'ERROR'
    }
  }
}

// 4. Watchers
// 선택된 고객 변경 감지
watch(selectedClientId, () => {
  loadBriefing()
})

// Store 로딩 완료 감지 (초기 진입 시 노트 데이터 확보 후 실행)
watch(() => noteStore.loading, (isLoading) => {
  if (!isLoading && selectedClientId.value) {
    loadBriefing()
  }
})

// URL 쿼리 파라미터 연동
watch(() => route.query.clientId, (newId) => {
  if (newId) {
    const parsed = Number(newId)
    selectedClientId.value = Number.isNaN(parsed) ? newId : parsed
  }
}, { immediate: true })

</script>

<template>
  <section>
    <div class="flex justify-between items-center mb-6">
      <PageHeader title="AI 영업 브리핑" subtitle="고객사별 핵심 활동과 전략 인사이트를 제공합니다." />
      <select 
        v-model="selectedClientId" 
        class="text-sm font-normal border p-2 rounded bg-white shadow-sm outline-none w-64"
      >
        <option value="">브리핑 대상 선택</option>
        <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">
          {{ client.name }}
        </option>
      </select>
    </div>

    <div id="brief-view-container">
      <!-- 1) 대기 상태 (고객 미선택) -->
      <div v-if="status === 'IDLE'" class="py-20 text-center bg-white rounded-lg border border-slate-200">
        <i class="fas fa-address-card text-6xl text-slate-200 mb-4"></i>
        <p class="text-slate-400 font-medium">상단에서 고객사를 선택해 주세요.</p>
      </div>

      <!-- 2) 분석 데이터 부족 (노트 < 3개) -->
      <div v-else-if="status === 'EMPTY'" class="py-20 text-center bg-slate-50 rounded-lg border border-slate-200">
        <i class="fas fa-hourglass-half text-5xl text-slate-300 mb-4"></i>
        <h4 class="font-bold text-slate-500 mb-2">분석 데이터 부족</h4>
        <p class="text-sm text-slate-400">분석 가능한 노트가 3개 이상 필요합니다.</p>
      </div>

      <!-- 3) 로딩 중 (스켈레톤 UI 추천, 여기서는 심플한 로딩 표시) -->
      <div v-else-if="status === 'LOADING'" class="py-20 text-center bg-white rounded-lg border border-slate-200">
        <i class="fas fa-circle-notch fa-spin text-4xl text-sky-500 mb-4"></i>
        <p class="text-slate-500 font-medium">AI가 데이터를 분석하고 있습니다...</p>
      </div>

      <!-- 4) 에러 상태 -->
      <div v-else-if="status === 'ERROR'" class="py-20 text-center bg-red-50 rounded-lg border border-red-200">
        <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
        <p class="text-red-500 font-medium">브리핑 정보를 불러올 수 없습니다.</p>
      </div>

      <!-- 5) 정상 브리핑 화면 -->
      <div v-else-if="status === 'SUCCESS' && briefing" class="space-y-8">
        <div class="bg-gradient-to-r from-slate-700 to-slate-800 p-8 rounded-lg text-white shadow-lg">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-3xl font-bold mb-1">{{ selectedClientName }}</h3>
              <p class="text-slate-300 text-sm">AI 전략 분석 리포트</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div class="lg:col-span-3 space-y-8">
            <div class="bg-white p-6 rounded-lg shadow-sm border">
              <h4 class="font-bold text-slate-800 mb-4 text-lg flex items-center">
                <i class="fa-solid fa-arrows-to-dot w-6 mr-2 text-sky-500"></i>
                핵심 현황 및 최근 변화
              </h4>
              <div class="text-sm text-slate-600 leading-relaxed space-y-2">
                <p v-for="(item, idx) in briefing.statusChange" :key="idx">• {{ item }}</p>
              </div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-sm border">
              <h4 class="font-bold text-slate-800 mb-4 text-lg flex items-center">
                <i class="fa-solid fa-chart-line w-6 mr-2 text-amber-500"></i>
                장기 패턴 및 특이사항
              </h4>
              <div class="text-sm text-slate-600 leading-relaxed space-y-2">
                <p v-for="(item, idx) in briefing.pattern" :key="idx">• {{ item }}</p>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-emerald-50 border-emerald-200 border p-6 rounded-lg shadow-sm">
              <h4 class="font-bold text-emerald-800 mb-4 text-lg flex items-center">
                <i class="fa-solid fa-lightbulb w-6 mr-2 text-emerald-500"></i>
                AI 추천 전략
              </h4>
              <div class="text-sm font-medium text-emerald-700">
                {{ briefing.strategy }}
              </div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-sm border">
              <h4 class="font-bold text-slate-800 mb-4 text-lg flex items-center">
                <i class="fa-solid fa-clock-rotate-left w-6 mr-2 text-slate-400"></i>
                최근 반영된 노트
              </h4>
              <div class="text-sm space-y-3">
                <div v-for="note in recentNotes" :key="note.id" class="border-l-2 pl-3 border-slate-200">
                  <p class="text-xs text-slate-400 font-medium">{{ note.date }}</p>
                  <p class="text-slate-600 font-medium line-clamp-2">{{ note.summary?.[0] || '요약 내용 없음' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
