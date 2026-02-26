<script setup>
defineProps({
  message: {
    type: String,
    default: '요청 처리 중 오류가 발생했습니다.',
  },
  retryLabel: {
    type: String,
    default: '다시 시도',
  },
})

defineEmits(['retry'])
</script>

<template>
  <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
    <p class="text-sm font-medium">{{ message }}</p>
    <button
      type="button"
      class="mt-3 rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </div>
</template>
