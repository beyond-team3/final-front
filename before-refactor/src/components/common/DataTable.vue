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
  <div class="app-data-table overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-sm">
        <thead class="bg-slate-100 text-left text-slate-700">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="border-b border-slate-200 px-4 py-3 font-semibold"
              :style="column.width ? { width: column.width } : undefined"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length || 1" class="px-4 py-8 text-center text-slate-500">
              로딩 중...
            </td>
          </tr>

          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length || 1" class="px-4 py-8 text-center text-slate-400">
              {{ emptyText }}
            </td>
          </tr>

          <tr
            v-for="(row, rowIndex) in rows"
            v-else
            :key="row[rowKey] ?? rowIndex"
            class="border-b border-slate-100 hover:bg-slate-50"
            @click="$emit('row-click', row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-3 text-slate-700"
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

    <div v-if="$slots.footer" class="border-t border-slate-200 px-4 py-3">
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
