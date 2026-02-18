<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const route = useRoute()
const selectedClientId = ref('')

const briefing = computed(() => {
  if (!selectedClientId.value) return null
  return noteStore.getBriefingByClient(selectedClientId.value)
})

const clientNotes = computed(() => {
  if (!selectedClientId.value) return []
  return noteStore.getNotesByClient(selectedClientId.value)
})

const selectedClientName = computed(() => noteStore.getClientName(selectedClientId.value))

const recentNotes = computed(() => {
  if (!briefing.value) return []
  const idSet = new Set(briefing.value.recentNoteIds)
  return noteStore.notes.filter((item) => idSet.has(item.id))
})

watch(() => route.query.clientId, (newId) => {
  if (newId) {
    selectedClientId.value = Number(newId) || newId
  }
}, { immediate: true })

const loadBriefing = (clientId) => {
  selectedClientId.value = clientId
}
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
      <!-- No Selection -->
      <div v-if="!selectedClientId" class="py-20 text-center bg-white rounded-lg border border-slate-200">
        <i class="fas fa-address-card text-6xl text-slate-200 mb-4"></i>
        <p class="text-slate-400 font-medium">상단에서 고객사를 선택해 주세요.</p>
      </div>

      <!-- Main UI -->
      <div v-else-if="briefing" class="space-y-8">
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

      <!-- Not Enough Data -->
      <div v-else class="py-20 text-center bg-slate-50 rounded-lg border border-slate-200">
        <i class="fas fa-hourglass-half text-5xl text-slate-300 mb-4"></i>
        <h4 class="font-bold text-slate-500 mb-2">분석 데이터 부족</h4>
        <p class="text-sm text-slate-400">해당 고객사의 분석 가능한 노트가 3개 이상 필요합니다.</p>
      </div>
    </div>
  </section>
</template>
