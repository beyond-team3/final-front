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
  if (['CREATED'].includes(raw)) return 'DRAFT'
  if (['IN_PROGRESS', '진행중'].includes(raw)) return 'IN_PROGRESS'
  if (['REQUESTED', 'REQUEST', 'PENDING', '승인대기', '요청', '대기중'].includes(raw)) return 'REQUESTED'
  if (['PENDING_ADMIN', 'PENDING_CLIENT'].includes(raw)) return raw
  if (['ISSUED', '발행', '발행완료'].includes(raw)) return 'ISSUED'
  if (['APPROVED', 'ACTIVE', 'SIGNED', 'QUOTED', 'CONTRACTED', '체결', '완료'].includes(raw)) return 'APPROVED'
  if (['CONFIRMED', 'PAID'].includes(raw)) return raw
  if (['REJECTED', 'REJECT', '반려'].includes(raw)) return 'REJECTED'
  if (['REJECTED_ADMIN', 'REJECTED_CLIENT'].includes(raw)) return raw
  if (['EXPIRED', '만료'].includes(raw)) return 'EXPIRED'
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
  IN_PROGRESS: 'status-success',
  PENDING_ADMIN: 'status-requested',
  PENDING_CLIENT: 'status-requested',
  REJECTED_ADMIN: 'status-rejected',
  REJECTED_CLIENT: 'status-rejected',
  CONFIRMED: 'status-approved',
  ISSUED: 'status-info',
  PAID: 'status-approved',
  EXPIRED: 'status-warning',
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
  /* ── Status Base Styles ── */
  background-color: var(--status-bg);
  color: var(--status-text);
  border: 1px solid var(--status-border);
}

.status-default,
.status-draft {
  --status-bg: var(--color-bg-section);
  --status-text: var(--color-text-body);
  --status-border: var(--color-border-card);
}

.status-requested {
  --status-bg: var(--color-orange-light);
  --status-text: var(--color-orange-dark);
  --status-border: var(--color-orange);
}

.status-approved,
.status-success {
  --status-bg: var(--color-olive-light);
  --status-text: var(--color-olive-dark);
  --status-border: var(--color-olive);
}

.status-rejected,
.status-danger,
.status-error {
  --status-bg: #F0D4D4; /* DESIGN.md: Status Error Background */
  --status-text: var(--color-status-error);
  --status-border: var(--color-status-error);
}

.status-canceled {
  --status-bg: var(--color-bg-base);
  --status-text: var(--color-text-placeholder);
  --status-border: var(--color-border-card);
}

.status-warning {
  --status-bg: var(--color-orange-light);
  --status-text: var(--color-orange-dark);
  --status-border: var(--color-status-warning);
}

.status-info {
  --status-bg: #D6DDE6; /* DESIGN.md: Status Info Background */
  --status-text: var(--color-status-info);
  --status-border: var(--color-status-info);
}
</style>
