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
  <nav class="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium"
      :class="tab.key === modelValue ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50'"
      :disabled="tab.disabled"
      @click="selectTab(tab.key, tab.disabled)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge !== undefined" class="rounded bg-white/20 px-1.5 text-xs">{{ tab.badge }}</span>
    </button>
  </nav>
</template>
