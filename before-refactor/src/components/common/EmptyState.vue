<script setup>
defineProps({
  title: {
    type: String,
    default: '데이터가 없습니다.',
  },
  description: {
    type: String,
    default: '조건을 변경하거나 잠시 후 다시 시도해주세요.',
  },
})
</script>

<template>
  <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <p class="text-base font-semibold text-slate-700">{{ title }}</p>
    <p class="mt-2 text-sm text-slate-500">{{ description }}</p>
  </div>
</template>
