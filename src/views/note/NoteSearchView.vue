<script setup>
import { computed, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()

const filterClient = ref('')
const filterContract = ref('')
const filterStart = ref('')
const filterEnd = ref('')
const sort = ref('desc')
const keyword = ref('')

const contractOptions = computed(() => {
  if (!filterClient.value) {
    return []
  }
  return noteStore.getContractsByClient(filterClient.value)
})

const filteredNotes = computed(() => {
  return noteStore.searchClientNotes({
    clientId: filterClient.value || undefined,
    contract: filterContract.value || undefined,
    keyword: keyword.value || undefined,
    dateFrom: filterStart.value || undefined,
    dateTo: filterEnd.value || undefined,
    sort: sort.value,
  })
})

const resetFilter = () => {
  filterClient.value = ''
  filterContract.value = ''
  filterStart.value = ''
  filterEnd.value = ''
  sort.value = 'desc'
  keyword.value = ''
}
</script>

<template>
  <section>
    <PageHeader title="노트 검색" subtitle="고객사/계약/기간 조건으로 영업 노트를 탐색합니다." />

    <section class="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label class="text-xs font-bold uppercase text-slate-500">
          고객사
          <select v-model="filterClient" class="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-sm font-normal">
            <option value="">모든 고객</option>
            <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">{{ client.name }}</option>
          </select>
        </label>

        <label class="text-xs font-bold uppercase text-slate-500">
          계약명
          <select v-model="filterContract" class="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-sm font-normal">
            <option value="">모든 계약</option>
            <option v-for="contract in contractOptions" :key="contract" :value="contract">{{ contract }}</option>
          </select>
        </label>

        <label class="text-xs font-bold uppercase text-slate-500">
          시작일
          <input v-model="filterStart" type="date" class="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-sm font-normal" />
        </label>

        <label class="text-xs font-bold uppercase text-slate-500">
          종료일
          <input v-model="filterEnd" type="date" class="mt-1 h-10 w-full rounded border border-slate-300 px-2 text-sm font-normal" />
        </label>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-[1fr_180px_40px]">
        <input
          v-model="keyword"
          type="text"
          class="h-10 rounded border border-slate-300 px-3 text-sm"
          placeholder="고객명, 계약명, 요약, 본문 검색"
        />

        <select v-model="sort" class="h-10 rounded border border-slate-300 px-2 text-sm">
          <option value="desc">최신순</option>
          <option value="asc">오래된순</option>
        </select>

        <button type="button" class="h-10 rounded bg-slate-200 text-slate-700 hover:bg-slate-300" @click="resetFilter">↺</button>
      </div>
    </section>

    <section v-if="filteredNotes.length > 0" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="note in filteredNotes" :key="note.id" class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm font-semibold text-sky-700">{{ noteStore.getClientName(note.clientId) }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ note.date }} · {{ note.contract || '일반 메모' }}</p>
        <ul class="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700">
          <li v-for="summary in note.summary" :key="`${note.id}-${summary}`">{{ summary }}</li>
        </ul>
      </article>
    </section>

    <section v-else class="rounded-lg border border-slate-200 bg-white p-16 text-center text-sm text-slate-400">
      검색 조건에 맞는 활동 기록이 없습니다.
    </section>
  </section>
</template>
