<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DealHistoryListPanel from '@/components/history/DealHistoryListPanel.vue'
import { useDealV2 } from '@/config/featureFlags'
import { useHistoryStore } from '@/stores/history'

const router = useRouter()
const historyStore = useHistoryStore()

const pipelines = computed(() => historyStore.pipelinesForView)
const showDealV2 = computed(() => useDealV2())
const dealKpiCards = computed(() => {
  const kpis = historyStore.dealKpis || {}

  return [
    { key: 'dealCount', label: '전체 거래', value: Number(kpis.dealCount ?? 0) },
    { key: 'openDealCount', label: '진행중', value: Number(kpis.openDealCount ?? 0) },
    { key: 'closedDealCount', label: '종결', value: Number(kpis.closedDealCount ?? 0) },
    { key: 'successRate', label: '성공률', value: `${Number(kpis.successRate ?? 0).toFixed(1)}%` },
  ]
})

const openDetail = (dealId) => {
  router.push({ name: 'pipeline-detail', params: { id: dealId } })
}

onMounted(() => {
  void historyStore.fetchPipelines()
  if (useDealV2()) {
    void historyStore.fetchDealKpis()
  }
})
</script>

<template>
  <DealHistoryListPanel
    title="영업 히스토리"
    :deals="pipelines"
    :loading="historyStore.loading"
    :error="historyStore.error"
    :show-badge="showDealV2"
    :kpi-cards="showDealV2 ? dealKpiCards : []"
    @retry="historyStore.fetchPipelines"
    @deal-focus="historyStore.ensureDealLogs"
    @open-detail="openDetail"
  />
</template>
