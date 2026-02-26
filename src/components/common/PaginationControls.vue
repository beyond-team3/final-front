<script setup>
const props = defineProps({
  modelValue: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const setPage = (page) => {
  if (page < 1 || page > props.totalPages || page === props.modelValue) {
    return
  }
  emit('update:modelValue', page)
}
</script>

<template>
  <div class="pager">
    <button type="button" class="page-btn" :disabled="modelValue === 1" @click="setPage(modelValue - 1)">이전</button>
    <button
      v-for="p in totalPages"
      :key="p"
      type="button"
      class="page-btn"
      :class="{ active: modelValue === p }"
      @click="setPage(p)"
    >
      {{ p }}
    </button>
    <button type="button" class="page-btn" :disabled="modelValue === totalPages" @click="setPage(modelValue + 1)">다음</button>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  gap: 6px;
}
</style>
