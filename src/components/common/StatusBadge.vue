<script setup>
import { computed } from 'vue'
import { DOC_STATUS } from '@/utils/constants'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  status: {
    type: String, // e.g., 'PENDING', 'COMPLETED'
    default: 'default',
  },
  type: {
    type: String, // e.g., 'QUOTATION_REQUEST', 'QUOTATION', 'CONTRACT', 'ORDER', 'STATEMENT', 'INVOICE'
    default: '',
  },
  variantMap: {
    type: Object,
    default: () => ({}),
  },
})

const TYPE_MAP = {
  RFQ: 'QUOTATION_REQUEST',
  QUO: 'QUOTATION',
  CNT: 'CONTRACT',
  ORD: 'ORDER',
  STMT: 'STATEMENT',
  INV: 'INVOICE',
}

// DOC_STATUS에서 해당 타입과 상태에 맞는 설정을 가져옴
const docStatusConfig = computed(() => {
  const typeKey = TYPE_MAP[props.type] || props.type
  if (!typeKey || !DOC_STATUS[typeKey]) return null
  return DOC_STATUS[typeKey][props.status] || null
})

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
  ACTIVE: 'status-approved',
  ACTIVE_CONTRACT: 'status-approved',
}

const normalizedStatus = computed(() => normalizeStatus(props.status))

const badgeClass = computed(() => {
  // 1. DOC_STATUS에 정의된 variant가 있으면 우선 사용
  if (docStatusConfig.value?.variant) {
    const variant = docStatusConfig.value.variant
    return baseVariants[variant] || `status-${variant.toLowerCase()}`
  }

  // 2. 그 외 기존 로직 유지
  const merged = { ...baseVariants, ...props.variantMap }
  return merged[normalizedStatus.value] || merged[props.status] || merged.default
})

const displayLabel = computed(() => {
  // 1. 직접 전달된 label이 있으면 우선 사용
  if (props.label) return props.label

  // 2. DOC_STATUS에 정의된 label이 있으면 사용
  if (docStatusConfig.value?.label) return docStatusConfig.value.label

  // 3. 기존 fallback
  return String(props.status || '').toUpperCase() || 'DRAFT'
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
  white-space: nowrap;
}

.status-requested {
  --status-bg: var(--color-orange-light);
  --status-text: var(--color-orange-dark);
  --status-border: var(--color-orange);
}

.status-draft {
  --status-bg: #FEF3C7;
  --status-text: #6B5F50;
  --status-border: #6B5F50;
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
  --status-bg: #F5F5F5; /* 연한 회색 */
  --status-text: #999999; /* 중간 회색 */
  --status-border: #D1D1D1; /* 테두리 회색 */
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
