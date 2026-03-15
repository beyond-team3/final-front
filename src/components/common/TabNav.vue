<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: null,
  },
  tabs: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectTab = (key, disabled) => {
  if (disabled || key === props.modelValue) {
    return
  }

  emit('update:modelValue', key)
  emit('change', key)
}
</script>

<template>
  <nav class="flex flex-wrap gap-2 border-b border-[var(--color-border-divider)] pb-2">
    <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-bold transition-all"
        :class="tab.key === modelValue
        ? 'bg-[var(--color-olive)] text-white shadow-sm'
        : 'bg-[var(--color-bg-section)] text-[var(--color-text-body)] hover:bg-[var(--color-border-card)] hover:text-[var(--color-text-strong)] disabled:cursor-not-allowed disabled:opacity-50'"
        :disabled="tab.disabled"
        @click="selectTab(tab.key, tab.disabled)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge !== undefined" class="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black leading-none">{{ tab.badge }}</span>
    </button>
  </nav>
</template>
