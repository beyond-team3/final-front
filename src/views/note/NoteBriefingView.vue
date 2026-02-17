<script setup>
import { computed, ref, watch } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()
const selectedClientId = ref('')

const briefing = computed(() => {
  if (!selectedClientId.value) {
    return null
  }

  return noteStore.getBriefingByClient(selectedClientId.value)
})

const selectedClientName = computed(() => noteStore.getClientName(selectedClientId.value))

const recentNotes = computed(() => {
  if (!briefing.value) {
    return []
  }

  const idSet = new Set(briefing.value.recentNoteIds)
  return noteStore.notes.filter((item) => idSet.has(item.id))
})

watch(selectedClientId, () => {
  if (!selectedClientId.value) {
    return
  }
}, { immediate: true })
</script>

<template>
  <section>
    <PageHeader title="AI 영업 브리핑" subtitle="고객사별 최근 활동을 요약해 전략 인사이트를 제공합니다." />

    <div class="mb-6 flex justify-end">
      <select v-model="selectedClientId" class="h-10 w-full max-w-xs rounded border border-slate-300 px-3 text-sm">
        <option value="">브리핑 대상 선택</option>
        <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">{{ client.name }}</option>
      </select>
    </div>

    <section v-if="!selectedClientId" class="rounded-lg border border-slate-200 bg-white py-20 text-center text-slate-400">
      고객사를 선택해 주세요.
    </section>

    <section v-else-if="!briefing" class="rounded-lg border border-slate-200 bg-white py-20 text-center text-slate-400">
      분석 가능한 노트가 부족합니다. (최소 3개 필요)
    </section>

    <section v-else class="space-y-6">
      <article class="rounded-lg bg-slate-800 p-8 text-white shadow">
        <h3 class="text-2xl font-bold">{{ selectedClientName }}</h3>
        <p class="mt-1 text-sm text-slate-300">AI 전략 분석 리포트</p>
      </article>

      <div class="grid gap-6 lg:grid-cols-5">
        <div class="space-y-6 lg:col-span-3">
          <article class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h4 class="mb-3 text-lg font-bold text-slate-800">핵심 현황 및 최근 변화</h4>
            <ul class="list-disc space-y-1 pl-4 text-sm text-slate-700">
              <li v-for="item in briefing.statusChange" :key="item">{{ item }}</li>
            </ul>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h4 class="mb-3 text-lg font-bold text-slate-800">장기 패턴 및 특이사항</h4>
            <ul class="list-disc space-y-1 pl-4 text-sm text-slate-700">
              <li v-for="item in briefing.pattern" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>

        <div class="space-y-6 lg:col-span-2">
          <article class="rounded-lg border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h4 class="mb-3 text-lg font-bold text-emerald-800">AI 추천 전략</h4>
            <p class="text-sm font-medium text-emerald-700">{{ briefing.strategy }}</p>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h4 class="mb-3 text-lg font-bold text-slate-800">최근 반영된 노트</h4>
            <div class="space-y-3">
              <div v-for="note in recentNotes" :key="note.id" class="rounded border border-slate-100 p-3">
                <p class="text-xs text-slate-500">{{ note.date }} · {{ note.contract || '일반 메모' }}</p>
                <p class="mt-1 text-sm text-slate-700">{{ note.summary[0] }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </section>
</template>
