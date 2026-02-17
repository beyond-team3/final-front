<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useHistoryStore } from '@/stores/history'

const route = useRoute()
const router = useRouter()
const historyStore = useHistoryStore()

const pipeline = computed(() => historyStore.getPipelineById(route.params.id))
const stageSteps = computed(() => {
  if (!pipeline.value) {
    return []
  }

  const names = ['견적요청', '견적', '계약', '주문', '명세', '청구', '결제완료']
  return names.map((name, index) => {
    const order = index + 1
    if (order < pipeline.value.stageNumber) {
      return { name, statusText: '완료', state: 'completed' }
    }
    if (order === pipeline.value.stageNumber) {
      return { name, statusText: '진행중', state: 'in-progress' }
    }
    return { name, statusText: '대기중', state: 'waiting' }
  })
})

const topSteps = computed(() => stageSteps.value.slice(0, 3))
const moreSteps = computed(() => stageSteps.value.slice(3))

const getStepClass = (state) => {
  if (state === 'completed') {
    return 'from-emerald-500 to-emerald-600'
  }

  if (state === 'in-progress') {
    return 'from-blue-500 to-blue-600 animate-pulse'
  }

  return 'from-slate-400 to-slate-500'
}

const goBack = () => {
  router.push({ name: 'sales-history' })
}

const openDocList = (stepName) => {
  router.push({
    name: 'sales-documents',
    query: {
      title: stepName,
      pipelineId: String(route.params.id),
    },
  })
}

onMounted(() => {
  if (!pipeline.value) {
    void historyStore.fetchPipelines()
  }
})
</script>

<template>
  <section>
    <LoadingSpinner v-if="historyStore.loading" text="파이프라인 정보를 불러오는 중입니다." />
    <ErrorMessage v-else-if="historyStore.error" :message="historyStore.error" @retry="historyStore.fetchPipelines" />
    <EmptyState
      v-else-if="!pipeline"
      title="파이프라인을 찾을 수 없습니다."
      description="히스토리 목록에서 다시 선택해주세요."
    />
    <template v-else>
      <header class="mb-6 flex items-center gap-4">
        <button type="button" class="rounded-lg p-2 text-xl hover:bg-slate-200" @click="goBack">←</button>
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-slate-900">{{ pipeline.clientName }} - 영업 히스토리</h2>
          <p class="text-sm text-slate-500">영업 진행 상황을 확인하세요</p>
        </div>
        <span class="rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">{{ pipeline.stage }} 진행중</span>
      </header>

      <section class="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 text-lg font-semibold text-slate-900">거래처 정보</h3>
        <div class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p class="text-slate-500">거래처명</p>
            <p class="font-medium text-slate-900">{{ pipeline.clientName }}</p>
          </div>
          <div>
            <p class="text-slate-500">시작일</p>
            <p class="font-medium text-slate-900">{{ pipeline.startDate }}</p>
          </div>
          <div>
            <p class="text-slate-500">최근 갱신</p>
            <p class="font-medium text-slate-900">{{ pipeline.updatedAt }}</p>
          </div>
          <div>
            <p class="text-slate-500">총 계약 금액</p>
            <p class="text-lg font-semibold text-blue-600">{{ Number(pipeline.amount || 0).toLocaleString() }}원</p>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h3 class="mb-4 text-lg font-semibold text-slate-900">파이프라인 진행 상황</h3>

        <div class="grid gap-3 md:grid-cols-3">
          <button
            v-for="step in topSteps"
            :key="step.name"
            type="button"
            class="rounded-lg bg-gradient-to-br px-5 py-6 text-center text-white shadow transition hover:scale-[1.01] md:[clip-path:polygon(0_0,90%_0,100%_50%,90%_100%,0_100%)]"
            :class="getStepClass(step.state)"
            @click="openDocList(step.name)"
          >
            <p class="text-lg font-bold">{{ step.name }}</p>
            <p class="text-sm opacity-90">{{ step.statusText }}</p>
          </button>
        </div>

        <div class="mt-6">
          <div class="mb-4 flex justify-center text-2xl text-slate-400">➜</div>

          <div class="grid gap-3 md:grid-cols-3">
            <button
              v-for="step in moreSteps"
              :key="step.name"
              type="button"
              class="rounded-lg bg-gradient-to-br px-5 py-6 text-center text-white shadow transition hover:scale-[1.01] md:[clip-path:polygon(0_0,90%_0,100%_50%,90%_100%,0_100%)]"
              :class="getStepClass(step.state)"
              @click="openDocList(step.name)"
            >
              <p class="text-lg font-bold">{{ step.name }}</p>
              <p class="text-sm opacity-90">{{ step.statusText }}</p>
            </button>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>
