<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'default',
  },
  variantMap: {
    type: Object,
    default: () => ({}),
  },
})

const DOC_STATUS_LABELS = {
  DRAFT: 'DRAFT',
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
}

const normalizeStatus = (status) => {
  const raw = String(status || '').trim().toUpperCase()

  if (!raw) return 'DRAFT'
  if (['DRAFT', '초안'].includes(raw)) return 'DRAFT'
  if (['REQUESTED', 'REQUEST', 'PENDING', '승인대기', '요청', '대기중'].includes(raw)) return 'REQUESTED'
  if (['APPROVED', 'ACTIVE', 'SIGNED', 'ISSUED', 'QUOTED', 'CONTRACTED', '체결', '완료', '발행완료'].includes(raw)) return 'APPROVED'
  if (['REJECTED', 'REJECT', '반려'].includes(raw)) return 'REJECTED'
  if (['CANCELED', 'CANCELLED', 'CANCEL', '취소'].includes(raw)) return 'CANCELED'

  return raw
}

const baseVariants = {
  default: 'status-default',
  success: 'status-success',
  warning: 'status-warning',
  danger: 'status-danger',
  info: 'status-info',
  DRAFT: 'status-draft',
  REQUESTED: 'status-requested',
  APPROVED: 'status-approved',
  REJECTED: 'status-rejected',
  CANCELED: 'status-canceled',
}

const normalizedStatus = computed(() => normalizeStatus(props.status))

const badgeClass = computed(() => {
  const merged = { ...baseVariants, ...props.variantMap }
  return merged[normalizedStatus.value] || merged[props.status] || merged.default
})

const displayLabel = computed(() => {
  if (props.label) {
    return props.label
  }

  return DOC_STATUS_LABELS[normalizedStatus.value] || String(props.status || '').toUpperCase() || 'DRAFT'
})
</script>

<template>
  <span class="status-badge inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" :class="badgeClass">
    <slot>{{ displayLabel }}</slot>
  </span>
</template>

<style scoped>
.status-badge {
  --status-neutral-bg: #f1f5f9;
  --status-neutral-text: #475569;
  --status-neutral-border: #cbd5e1;
  --status-requested-bg: #dbeafe;
  --status-requested-text: #1d4ed8;
  --status-requested-border: #93c5fd;
  --status-approved-bg: #e7f4ed;
  --status-approved-text: #1f5e3b;
  --status-approved-border: #7fb89a;
  --status-rejected-bg: #fbe9e7;
  --status-rejected-text: #c44536;
  --status-rejected-border: #e3a29a;
  --status-canceled-bg: #e2e8f0;
  --status-canceled-text: #64748b;
  --status-canceled-border: #cbd5e1;
  --status-success-bg: #dcfce7;
  --status-success-text: #166534;
  --status-success-border: #86efac;
  --status-warning-bg: #fef3c7;
  --status-warning-text: #92400e;
  --status-warning-border: #fcd34d;
  --status-danger-bg: #ffe4e6;
  --status-danger-text: #be123c;
  --status-danger-border: #fda4af;
  --status-info-bg: #e0f2fe;
  --status-info-text: #0369a1;
  --status-info-border: #7dd3fc;
}

.status-default,
.status-draft {
  background-color: var(--status-neutral-bg);
  border: 1px solid var(--status-neutral-border);
  color: var(--status-neutral-text);
}

.status-requested {
  background-color: var(--status-requested-bg);
  border: 1px solid var(--status-requested-border);
  color: var(--status-requested-text);
}

.status-approved {
  background-color: var(--status-approved-bg);
  border: 1px solid var(--status-approved-border);
  color: var(--status-approved-text);
}

.status-rejected {
  background-color: var(--status-rejected-bg);
  border: 1px solid var(--status-rejected-border);
  color: var(--status-rejected-text);
}

.status-canceled {
  background-color: var(--status-canceled-bg);
  border: 1px solid var(--status-canceled-border);
  color: var(--status-canceled-text);
}

.status-success {
  background-color: var(--status-success-bg);
  border: 1px solid var(--status-success-border);
  color: var(--status-success-text);
}

.status-warning {
  background-color: var(--status-warning-bg);
  border: 1px solid var(--status-warning-border);
  color: var(--status-warning-text);
}

.status-danger {
  background-color: var(--status-danger-bg);
  border: 1px solid var(--status-danger-border);
  color: var(--status-danger-text);
}

.status-info {
  background-color: var(--status-info-bg);
  border: 1px solid var(--status-info-border);
  color: var(--status-info-text);
}
</style>
