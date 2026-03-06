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
  <div class="rounded-xl border border-dashed border-[var(--color-border-card)] bg-[var(--color-bg-section)] p-12 text-center shadow-sm">
    <p class="text-lg font-bold text-[var(--color-text-strong)]">{{ title }}</p>
    <p class="mt-2 text-sm text-[var(--color-text-sub)]">{{ description }}</p>
  </div>
</template>
