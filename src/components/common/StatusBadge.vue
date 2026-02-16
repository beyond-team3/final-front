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

const baseVariants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
}

const badgeClass = computed(() => {
  const merged = { ...baseVariants, ...props.variantMap }
  return merged[props.status] || merged.default
})
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" :class="badgeClass">
    <slot>{{ label || status }}</slot>
  </span>
</template>
