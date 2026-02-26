<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '영업 히스토리',
  },
  pipelines: {
    type: Array,
    default: () => [],
  },
  showClientName: {
    type: Boolean,
    default: false,
  },
  emptyText: {
    type: String,
    default: '영업 히스토리가 없습니다.',
  },
})

const emit = defineEmits(['detail'])

const historySort = ref('latest')

const statusClassByTone = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
}

const sortedPipelines = computed(() => {
  const result = [...props.pipelines]

  if (historySort.value === 'oldest') {
    result.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  } else if (historySort.value === 'amount-high') {
    result.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
  } else {
    result.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  }

  return result
})

const formatAmount = (value) => `₩${Number(value || 0).toLocaleString('ko-KR')}`

const statusClass = (pipeline) => {
  if (pipeline.badgeClass) {
    return pipeline.badgeClass
  }

  return statusClassByTone[pipeline.statusTone] || statusClassByTone.primary
}

const stepIcon = (state) => {
  if (state === 'completed') return '✓'
  if (state === 'in-progress' || state === 'active') return '...'
  return '⏳'
}

const stepClass = (state) => {
  if (state === 'completed') return 'step-completed'
  if (state === 'in-progress' || state === 'active') return 'step-progress'
  return 'step-waiting'
}
</script>

<template>
  <section>
    <div class="history-header">
      <h3>{{ title }} ({{ pipelines.length }}건)</h3>
      <select v-model="historySort" class="history-sort">
        <option value="latest">최신순</option>
        <option value="oldest">오래된순</option>
        <option value="amount-high">금액 높은순</option>
      </select>
    </div>

    <article v-for="pipeline in sortedPipelines" :key="pipeline.id" class="pipeline-card">
      <div class="pipeline-header">
        <div>
          <h4>
            <template v-if="showClientName">
              {{ pipeline.clientName }}
            </template>
            <template v-else>
              {{ pipeline.title || `파이프라인 #${pipeline.id}` }}
            </template>
          </h4>
          <p>시작일: {{ pipeline.startDate }} | 계약 금액: {{ formatAmount(pipeline.amount) }}</p>
        </div>
        <span class="badge" :class="statusClass(pipeline)">
          진행 상태: {{ pipeline.statusText }}
        </span>
      </div>

      <div class="pipeline-flow">
        <template v-for="(step, index) in pipeline.steps" :key="`${pipeline.id}-${step.name}`">
          <div class="pipeline-step">
            <div class="step-icon" :class="stepClass(step.state)">{{ stepIcon(step.state) }}</div>
            <span class="step-name">{{ step.name }}</span>
            <span class="step-state">{{ step.statusText || step.label || '' }}</span>
          </div>
          <div v-if="index < pipeline.steps.length - 1" class="step-connector" />
        </template>
      </div>

      <div class="actions">
        <button type="button" class="btn-sub" @click="emit('detail', pipeline.id)">상세보기</button>
      </div>
    </article>

    <article v-if="sortedPipelines.length === 0" class="empty-box">
      {{ emptyText }}
    </article>
  </section>
</template>

<style scoped>
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.history-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.history-sort {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 14px;
  background: #fff;
}

.pipeline-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  background: #fcfcfd;
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.pipeline-header h4 {
  font-weight: 700;
  color: #111827;
  font-size: 16px;
}

.pipeline-header p {
  margin-top: 4px;
  font-size: 14px;
  color: #6b7280;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.badge-primary {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.badge-success {
  background-color: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background-color: #fee2e2;
  color: #b91c1c;
}

.badge-neutral {
  background-color: #e5e7eb;
  color: #374151;
}

.pipeline-flow {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.pipeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  margin-bottom: 6px;
  border: 2px solid #ddd;
  background: #fff;
  color: #999;
}

.step-completed {
  background-color: #10b981;
  color: #fff;
  border-color: #10b981;
}

.step-progress {
  background-color: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.step-waiting {
  background-color: #f1f5f9;
  color: #94a3b8;
  border-color: #cbd5e1;
}

.step-name {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.step-state {
  font-size: 12px;
  color: #6b7280;
}

.step-connector {
  flex: 1;
  height: 2px;
  background-color: #e5e7eb;
  min-width: 20px;
  margin-bottom: 20px;
}

.actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.empty-box {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  text-align: center;
  color: #64748b;
}
</style>
