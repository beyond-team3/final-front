<script setup>
defineProps({
  text: {
    type: String,
    default: '데이터를 불러오는 중입니다.',
  },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-8 text-slate-600">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    <p class="text-sm">{{ text }}</p>
  </div>
</template>
