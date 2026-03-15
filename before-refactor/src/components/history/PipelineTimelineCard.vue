<script setup>
import { computed } from 'vue'

const props = defineProps({
  pipeline: {
    type: Object,
    required: true,
  },
  showClientName: {
    type: Boolean,
    default: false,
  },
  showDetailButton: {
    type: Boolean,
    default: true,
  },
  amountFormatter: {
    type: Function,
    default: (value) => `${new Intl.NumberFormat('ko-KR').format(value || 0)}원`,
  },
})

const emit = defineEmits(['detail'])

const defaultSteps = computed(() => {
  if (props.pipeline.steps && props.pipeline.steps.length > 0) {
    return props.pipeline.steps
  }

  const stage = Number(props.pipeline.currentStage || 3)
  const names = ['견적요청', '견적서', '계약서', '주문서', '명세서', '청구서']
  return names.map((name, index) => {
    const order = index + 1
    if (order < stage) return { name, state: 'completed' }
    if (order === stage) return { name, state: 'in-progress' }
    return { name, state: 'waiting' }
  })
})

const statusClass = computed(() => {
  if (props.pipeline.statusClass) {
    return props.pipeline.statusClass
  }

  if ((props.pipeline.status || '').includes('completed')) {
    return 'bg-emerald-100 text-emerald-800'
  }

  return 'status-primary'
})

const getStepClass = (state) => {
  if (state === 'completed') {
    return 'bg-emerald-500 text-white'
  }

  if (state === 'in-progress' || state === 'active') {
    return 'step-progress'
  }

  return 'bg-slate-300 text-slate-600'
}

const getStepIcon = (state) => {
  if (state === 'completed') return '✓'
  if (state === 'in-progress' || state === 'active') return '🔄'
  return '⏳'
}

const openDetail = () => {
  emit('detail', props.pipeline.id)
}
</script>

<template>
  <article class="rounded-lg bg-white p-6 shadow-sm transition hover:shadow-md">
    <header class="mb-4 flex items-start justify-between gap-3">
      <h3 v-if="showClientName" class="text-xl font-semibold text-slate-900">거래처: {{ pipeline.clientName }}</h3>
      <h3 v-else class="text-base font-semibold text-slate-900">파이프라인 #{{ pipeline.id }}</h3>
      <span class="inline-block rounded-full px-3 py-1 text-xs font-medium" :class="statusClass">
        {{ pipeline.statusLabel }}
      </span>
    </header>

    <div class="mb-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
      <p><span class="text-slate-500">시작일:</span> <span class="font-medium text-slate-900">{{ pipeline.startDate }}</span></p>
      <p v-if="pipeline.updatedAt"><span class="text-slate-500">최종 업데이트:</span> <span class="font-medium text-slate-900">{{ pipeline.updatedAt }}</span></p>
    </div>

    <div class="mb-4">
      <span class="text-sm text-slate-500">총 계약 금액:</span>
      <span class="ml-2 text-lg font-semibold text-slate-900">{{ amountFormatter(pipeline.amount) }}</span>
    </div>

    <div class="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
      <template v-for="(step, index) in defaultSteps" :key="`${pipeline.id}-${step.name}`">
        <div class="flex min-w-20 flex-col items-center">
          <div class="mb-1 flex h-8 w-8 items-center justify-center rounded-full text-sm" :class="getStepClass(step.state)">
            {{ getStepIcon(step.state) }}
          </div>
          <span class="text-xs text-slate-500">{{ step.name }}</span>
        </div>
        <div v-if="index < defaultSteps.length - 1" class="mb-4 h-0.5 w-4 bg-slate-300" />
      </template>
    </div>

    <div v-if="showDetailButton" class="flex justify-end">
      <button
        type="button"
        class="btn-primary"
        @click="openDetail"
      >
        상세보기
        <span>→</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.status-primary {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.step-progress {
  background-color: var(--color-primary);
  color: #fff;
}
</style>
