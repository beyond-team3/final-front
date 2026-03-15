<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
  fields: {
    type: Array,
    default: () => [],
  },
  searchLabel: {
    type: String,
    default: '검색',
  },
  resetLabel: {
    type: String,
    default: '초기화',
  },
  showReset: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const updateField = (key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const triggerSearch = () => {
  emit('search', props.modelValue)
}

const triggerReset = () => {
  const resetValue = {}
  props.fields.forEach((field) => {
    resetValue[field.key] = field.defaultValue ?? ''
  })

  emit('update:modelValue', resetValue)
  emit('reset', resetValue)
}
</script>

<template>
  <section class="mb-5 rounded-lg border border-slate-200 bg-white p-4">
    <div class="grid gap-3 md:grid-cols-12">
      <div
        v-for="field in fields"
        :key="field.key"
        class="md:col-span-3"
        :style="field.colSpan ? { gridColumn: `span ${field.colSpan} / span ${field.colSpan}` } : undefined"
      >
        <label class="mb-1 block text-xs font-semibold text-slate-600">{{ field.label }}</label>

        <select
          v-if="field.type === 'select'"
          class="h-10 w-full rounded border border-slate-300 px-2 text-sm"
          :value="modelValue[field.key] ?? ''"
          @change="updateField(field.key, $event.target.value)"
        >
          <option value="">{{ field.placeholder || '전체' }}</option>
          <option v-for="option in field.options || []" :key="String(option.value)" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <input
          v-else
          class="h-10 w-full rounded border border-slate-300 px-2 text-sm"
          :type="field.type || 'text'"
          :value="modelValue[field.key] ?? ''"
          :placeholder="field.placeholder || ''"
          @input="updateField(field.key, $event.target.value)"
          @keyup.enter="triggerSearch"
        />
      </div>

      <div class="flex items-end gap-2 md:col-span-3">
        <button
          type="button"
          class="h-10 rounded bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700"
          @click="triggerSearch"
        >
          {{ searchLabel }}
        </button>
        <button
          v-if="showReset"
          type="button"
          class="h-10 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="triggerReset"
        >
          {{ resetLabel }}
        </button>
      </div>
    </div>

    <div v-if="$slots.extra" class="mt-3 border-t border-slate-100 pt-3">
      <slot name="extra" />
    </div>
  </section>
</template>
