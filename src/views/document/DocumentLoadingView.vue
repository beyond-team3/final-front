<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const title = computed(() => route.query.title || '문서를 반영하는 중입니다')
const description = computed(() => route.query.description || '최신 문서 목록으로 이동합니다.')
const nextPath = computed(() => route.query.next || '/documents/all')
const delayMs = computed(() => {
  const parsed = Number(route.query.delay)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1600
})

let timerId = null

onMounted(() => {
  timerId = window.setTimeout(() => {
    router.replace(String(nextPath.value))
  }, delayMs.value)
})

onBeforeUnmount(() => {
  if (timerId) {
    window.clearTimeout(timerId)
  }
})
</script>

<template>
  <div class="content-wrapper flex min-h-screen items-center justify-center p-6" style="background: radial-gradient(circle at top, #f7f3ec 0%, #ede8df 55%, #e4ddd2 100%);">
    <section class="w-full max-w-xl rounded-[28px] border px-8 py-10 text-center shadow-[0_28px_80px_rgba(61,53,41,0.12)]" style="background-color: rgba(247, 243, 236, 0.96); border-color: #ddd7ce;">
      <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#E8E3D8] border-t-[#C8622A] animate-spin" />
      <h1 class="mt-8 text-2xl font-bold tracking-[-0.02em]" style="color: #3D3529;">{{ title }}</h1>
      <p class="mt-3 text-sm leading-6" style="color: #6B5F50;">{{ description }}</p>
      <p class="mt-6 text-xs font-semibold uppercase tracking-[0.18em]" style="color: #9A8C7E;">Please wait</p>
    </section>
  </div>
</template>
