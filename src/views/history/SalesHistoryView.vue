<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'
import UnifiedHistoryPanel from '@/components/history/UnifiedHistoryPanel.vue'

const router = useRouter()
const authStore = useAuthStore()

const pipelines = ref([
  {
    id: 1,
    clientName: 'OO육묘장',
    statusText: '계약 진행중',
    statusTone: 'primary',
    startDate: '2026-01-15',
    amount: 15000000,
    steps: [
      { name: '견적요청', state: 'completed', statusText: '완료' },
      { name: '견적서', state: 'completed', statusText: '완료' },
      { name: '계약서', state: 'in-progress', statusText: '진행' },
      { name: '주문서', state: 'waiting', statusText: '대기' },
      { name: '명세서', state: 'waiting', statusText: '대기' },
      { name: '청구서', state: 'waiting', statusText: '대기' },
      { name: '결제완료', state: 'waiting', statusText: '대기' },
    ],
  },
  {
    id: 2,
    clientName: '△△대리점',
    statusText: '주문 완료',
    statusTone: 'success',
    startDate: '2026-01-10',
    amount: 12000000,
    steps: [
      { name: '견적요청', state: 'completed', statusText: '완료' },
      { name: '견적서', state: 'completed', statusText: '완료' },
      { name: '계약서', state: 'completed', statusText: '완료' },
      { name: '주문서', state: 'completed', statusText: '완료' },
      { name: '명세서', state: 'in-progress', statusText: '진행' },
      { name: '청구서', state: 'waiting', statusText: '대기' },
      { name: '결제완료', state: 'waiting', statusText: '대기' },
    ],
  },
  {
    id: 3,
    clientName: '□□농장',
    statusText: '견적 대기중',
    statusTone: 'warning',
    startDate: '2026-01-25',
    amount: 8000000,
    steps: [
      { name: '견적요청', state: 'completed', statusText: '완료' },
      { name: '견적서', state: 'in-progress', statusText: '진행' },
      { name: '계약서', state: 'waiting', statusText: '대기' },
      { name: '주문서', state: 'waiting', statusText: '대기' },
      { name: '명세서', state: 'waiting', statusText: '대기' },
      { name: '청구서', state: 'waiting', statusText: '대기' },
      { name: '결제완료', state: 'waiting', statusText: '대기' },
    ],
  },
]) // TODO: API 연결

const canEdit = computed(() => authStore.currentRole !== ROLES.CLIENT)

const openPipelineDetail = (pipelineId) => {
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}

const editPipeline = (pipelineId) => {
  router.push({ name: 'pipeline-detail', params: { id: pipelineId }, query: { edit: '1' } })
}
</script>

<template>
  <section class="mx-auto max-w-[1200px] rounded-lg bg-white p-6 shadow-sm">
    <UnifiedHistoryPanel
      title="영업 히스토리"
      :pipelines="pipelines"
      :show-client-name="true"
      :show-edit-button="canEdit"
      @detail="openPipelineDetail"
      @edit="editPipeline"
    />
  </section>
</template>
