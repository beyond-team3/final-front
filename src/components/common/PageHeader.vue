<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  sticky: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <header
    class="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between"
    :class="sticky ? 'sticky top-0 z-10 bg-slate-50/95 pt-2 backdrop-blur' : ''"
  >
    <div>
      <h2 class="text-2xl font-bold text-slate-800">{{ title }}</h2>
      <p v-if="subtitle" class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
    </div>

    <div class="page-header-actions flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header-actions :deep(.btn-primary),
.page-header-actions :deep(.btn-sub) {
  min-height: 36px;
}
</style>
