<script setup>
import { computed, ref, watch } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNoteStore } from '@/stores/note'

const noteStore = useNoteStore()

const form = ref({
  clientId: '',
  contract: '',
  date: new Date().toISOString().slice(0, 10),
  content: '',
})

const latestSummary = ref([])

const contractOptions = computed(() => noteStore.getContractsByClient(form.value.clientId))
const recentNotes = computed(() => noteStore.searchClientNotes({ sort: 'desc' }).slice(0, 5))

watch(() => form.value.clientId, () => {
  form.value.contract = ''
})

const saveNote = () => {
  if (!form.value.clientId || !form.value.date || !form.value.content.trim()) {
    window.alert('고객처, 활동 일자, 미팅 내용은 필수 입력입니다.')
    return
  }

  const created = noteStore.createNote({
    clientId: form.value.clientId,
    contract: form.value.contract,
    crop: '',
    variety: '',
    date: form.value.date,
    content: form.value.content.trim(),
  })

  latestSummary.value = created.summary
  form.value.content = ''
}
</script>

<template>
  <section>
    <PageHeader title="영업 활동 기록" subtitle="screen_definition/note/notee.html 기반 노트 작성 화면" />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <article class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="text-sm font-medium text-slate-700">
            고객처
            <select v-model="form.clientId" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">고객 선택</option>
              <option v-for="client in noteStore.clients" :key="client.id" :value="client.id">{{ client.name }}</option>
            </select>
          </label>

          <label class="text-sm font-medium text-slate-700">
            활동 일자
            <input v-model="form.date" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
          </label>
        </div>

        <label class="mt-4 block text-sm font-medium text-slate-700">
          계약 건
          <select v-model="form.contract" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">계약 선택</option>
            <option v-for="contract in contractOptions" :key="contract" :value="contract">{{ contract }}</option>
          </select>
        </label>

        <label class="mt-4 block text-sm font-medium text-slate-700">
          미팅 내용
          <textarea
            v-model="form.content"
            rows="12"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="고객과의 미팅, 통화 내용 등 상세한 활동 내용을 입력하세요"
          />
        </label>

        <div class="mt-5 flex justify-end">
          <button type="button" class="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700" @click="saveNote">
            저장 및 AI 분석
          </button>
        </div>
      </article>

      <aside class="space-y-6">
        <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="mb-3 font-semibold text-sky-700">AI 실시간 요약</h3>
          <ul v-if="latestSummary.length > 0" class="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li v-for="item in latestSummary" :key="item">{{ item }}</li>
          </ul>
          <p v-else class="text-sm text-slate-500">저장 시 AI가 핵심 내용을 요약합니다.</p>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="mb-3 font-semibold text-slate-800">최근 기록</h3>
          <div class="space-y-3">
            <div v-for="note in recentNotes" :key="note.id" class="rounded-md border border-slate-100 p-3">
              <p class="text-sm font-semibold text-slate-800">{{ noteStore.getClientName(note.clientId) }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ note.date }} · {{ note.contract || '일반 메모' }}</p>
              <p class="mt-2 text-xs text-slate-600">{{ note.summary[0] }}</p>
            </div>
          </div>
        </article>
      </aside>
    </div>
  </section>
</template>
