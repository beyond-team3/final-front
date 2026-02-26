<script setup>
import { onErrorCaptured, ref } from 'vue'

const hasError = ref(false)
const errorMessage = ref('')

function resetError() {
  hasError.value = false
  errorMessage.value = ''
}

onErrorCaptured((error, instance, info) => {
  hasError.value = true
  errorMessage.value = error?.message || '화면을 렌더링하는 중 오류가 발생했습니다.'

  console.error('[ErrorBoundary]', {
    error,
    info,
    component: instance?.type?.name || 'unknown',
  })

  return false
})
</script>

<template>
  <div v-if="hasError" class="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
    <h2 class="text-lg font-semibold">화면 오류가 발생했습니다</h2>
    <p class="mt-2 text-sm">{{ errorMessage }}</p>
    <button
      type="button"
      class="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
      @click="resetError"
    >
      다시 시도
    </button>
  </div>
  <slot v-else />
</template>
