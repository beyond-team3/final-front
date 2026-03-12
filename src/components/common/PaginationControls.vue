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
  <div class="pagination-container">
    <button
      type="button"
      class="page-nav-btn"
      :disabled="modelValue === 1"
      @click="setPage(modelValue - 1)"
    >
      <span class="nav-icon">←</span>
      이전
    </button>

    <div class="page-numbers">
      <button
        v-for="p in totalPages"
        :key="p"
        type="button"
        class="page-num-btn"
        :class="{ active: modelValue === p }"
        @click="setPage(p)"
      >
        {{ p }}
      </button>
    </div>

    <button
      type="button"
      class="page-nav-btn"
      :disabled="modelValue === totalPages"
      @click="setPage(modelValue + 1)"
    >
      다음
      <span class="nav-icon">→</span>
    </button>
  </div>
</template>

<style scoped>
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
  user-select: none;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-num-btn, .page-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-family: var(--font-body);
  font-weight: 600;
  transition: all var(--transition-fast);
  cursor: pointer;
  border: 1px solid var(--color-border-card);
  background-color: var(--color-bg-input);
  color: var(--color-text-body);
}

.page-num-btn {
  min-width: 36px;
  height: 36px;
  font-size: 14px;
}

.page-nav-btn {
  padding: 0 14px;
  height: 36px;
  font-size: 13px;
  gap: 6px;
}

.page-num-btn:hover, .page-nav-btn:not(:disabled):hover {
  border-color: var(--color-olive);
  color: var(--color-olive);
  background-color: var(--color-bg-section);
  transform: translateY(-1px);
}

.page-num-btn.active {
  background-color: var(--color-orange);
  border-color: var(--color-orange);
  color: #FFFFFF;
  box-shadow: 0 2px 6px rgba(200, 98, 42, 0.25);
}

.page-num-btn.active:hover {
  background-color: var(--color-orange-dark);
  border-color: var(--color-orange-dark);
  color: #FFFFFF;
  transform: none;
}

.page-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: var(--color-bg-section);
}

.nav-icon {
  font-size: 16px;
  line-height: 1;
}

@media (max-width: 640px) {
  .pagination-container {
    gap: 8px;
  }
  .page-nav-btn {
    padding: 0 10px;
  }
}
</style>
