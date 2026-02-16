<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const isExpanded = ref(false)

const pipeline = computed(() => ({
  id: route.params.id,
  clientName: 'OO육묘장',
  manager: '김철수 과장',
  phone: '010-1234-5678',
  startDate: '2026-01-15',
  amountText: '15,000,000원',
  statusText: '계약 진행중',
})) // TODO: API 연결

const topSteps = ref([
  { name: '견적요청', statusText: '완료', state: 'completed', icon: '✓' },
  { name: '견적서', statusText: '완료', state: 'completed', icon: '✓' },
  { name: '계약서', statusText: '진행중', state: 'in-progress', icon: '🔄' },
])

const moreSteps = ref([
  { name: '주문서', statusText: '대기중', state: 'waiting', icon: '⏳' },
  { name: '명세서', statusText: '대기중', state: 'waiting', icon: '⏳' },
  { name: '청구서', statusText: '대기중', state: 'waiting', icon: '⏳' },
  { name: '결제완료', statusText: '대기중', state: 'waiting', icon: '⏳' },
]) // TODO: API 연결

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
</script>

<template>
  <section>
    <header class="mb-6 flex items-center gap-4">
      <button type="button" class="rounded-lg p-2 text-xl hover:bg-slate-200" @click="goBack">←</button>
      <div class="flex-1">
        <h2 class="text-2xl font-bold text-slate-900">{{ pipeline.clientName }} - 영업 히스토리</h2>
        <p class="text-sm text-slate-500">영업 진행 상황을 확인하세요</p>
      </div>
      <span class="rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">{{ pipeline.statusText }}</span>
    </header>

    <section class="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-slate-900">거래처 정보</h3>
      <div class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p class="text-slate-500">거래처명</p>
          <p class="font-medium text-slate-900">{{ pipeline.clientName }}</p>
        </div>
        <div>
          <p class="text-slate-500">담당자</p>
          <p class="font-medium text-slate-900">{{ pipeline.manager }}</p>
        </div>
        <div>
          <p class="text-slate-500">연락처</p>
          <p class="font-medium text-slate-900">{{ pipeline.phone }}</p>
        </div>
        <div>
          <p class="text-slate-500">시작일</p>
          <p class="font-medium text-slate-900">{{ pipeline.startDate }}</p>
        </div>
        <div>
          <p class="text-slate-500">총 계약 금액</p>
          <p class="text-lg font-semibold text-blue-600">{{ pipeline.amountText }}</p>
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
          <p class="mb-1 text-2xl">{{ step.icon }}</p>
          <p class="text-lg font-bold">{{ step.name }}</p>
          <p class="text-sm opacity-90">{{ step.statusText }}</p>
        </button>
      </div>

      <button
        v-if="!isExpanded"
        type="button"
        class="my-6 w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        @click="isExpanded = true"
      >
        주문서 단계부터 더보기
      </button>

      <div v-if="isExpanded" class="mt-6">
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
            <p class="mb-1 text-2xl">{{ step.icon }}</p>
            <p class="text-lg font-bold">{{ step.name }}</p>
            <p class="text-sm opacity-90">{{ step.statusText }}</p>
          </button>
        </div>
      </div>
    </section>

    <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
      각 단계를 클릭하면 해당 단계의 상세 문서 목록을 확인할 수 있습니다.
    </div>
  </section>
</template>
