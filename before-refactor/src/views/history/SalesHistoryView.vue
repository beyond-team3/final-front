<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import UnifiedHistoryPanel from '@/components/history/UnifiedHistoryPanel.vue'
import { useHistoryStore } from '@/stores/history'

const router = useRouter()
const historyStore = useHistoryStore()

const pipelines = computed(() => historyStore.pipelinesForView)

const openPipelineDetail = (pipelineId) => {
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}

onMounted(() => {
  void historyStore.fetchPipelines()
})
</script>

<template>
  <section class="mx-auto max-w-[1200px] rounded-lg bg-white p-6 shadow-sm">
    <LoadingSpinner v-if="historyStore.loading" text="영업 히스토리를 불러오는 중입니다." />
    <ErrorMessage v-else-if="historyStore.error" :message="historyStore.error" @retry="historyStore.fetchPipelines" />
    <EmptyState
      v-else-if="pipelines.length === 0"
      title="영업 히스토리가 없습니다."
      description="문서를 작성하면 파이프라인이 생성됩니다."
    />
    <UnifiedHistoryPanel
      v-else
      title="영업 히스토리"
      :pipelines="pipelines"
      :show-client-name="true"
      @detail="openPipelineDetail"
    />
  </section>
</template>
