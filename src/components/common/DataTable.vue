<script setup>
defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
  rowKey: {
    type: String,
    default: 'id',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  emptyText: {
    type: String,
    default: '데이터가 없습니다.',
  },
})

defineEmits(['row-click'])
</script>

<template>
  <div class="app-data-table overflow-hidden rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-sm">
    <div class="overflow-x-auto">
      <table class="table min-w-full">
        <thead class="bg-[var(--color-bg-section)]">
        <tr>
          <th
              v-for="column in columns"
              :key="column.key"
              :style="column.width ? { width: column.width } : undefined"
          >
            {{ column.label }}
          </th>
        </tr>
        </thead>

        <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length || 1" class="px-4 py-8 text-center" style="color: var(--color-muted);">
            로딩 중...
          </td>
        </tr>

        <tr v-else-if="rows.length === 0">
          <td :colspan="columns.length || 1" class="px-4 py-8 text-center" style="color: var(--color-faint);">
            {{ emptyText }}
          </td>
        </tr>

        <tr
            v-for="(row, rowIndex) in rows"
            v-else
            :key="row[rowKey] ?? rowIndex"
            @click="$emit('row-click', row)"
        >
          <td
              v-for="column in columns"
              :key="column.key"
          >
            <slot
                :name="`cell-${column.key}`"
                :row="row"
                :column="column"
                :value="row[column.key]"
                :row-index="rowIndex"
            >
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div v-if="$slots.footer" class="border-t px-4 py-3" style="border-color: var(--color-border);">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.app-data-table :deep(.btn-primary),
.app-data-table :deep(.btn-sub) {
  font-size: 12px;
  padding: 0.25rem 0.625rem;
}
</style>
