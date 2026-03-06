<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

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
  showSearch: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const activeFieldKey = ref(null)
const containerRef = ref(null)

const updateField = (key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const toggleDropdown = (key) => {
  if (activeFieldKey.value === key) {
    activeFieldKey.value = null
  } else {
    activeFieldKey.value = key
  }
}

const selectOption = (key, value) => {
  updateField(key, value)
  activeFieldKey.value = null
}

const handleClickOutside = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    activeFieldKey.value = null
  }
}

const isDesktop = ref(false)

const updateIsDesktop = () => {
  isDesktop.value = window.innerWidth >= 768
}

onMounted(() => {
  updateIsDesktop()
  window.addEventListener('resize', updateIsDesktop)
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsDesktop)
  window.removeEventListener('click', handleClickOutside)
})

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
  <section ref="containerRef" class="mb-5 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-5 shadow-sm">
    <div class="grid gap-4 md:grid-cols-12">
      <div
          v-for="field in fields"
          :key="field.key"
          class="col-span-12 md:col-span-3 relative"
          :style="field.colSpan && isDesktop ? { gridColumn: `span ${field.colSpan} / span ${field.colSpan}` } : undefined"
      >
        <label class="mb-1.5 block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider">{{ field.label }}</label>

        <!-- 커스텀 드롭다운 -->
        <template v-if="field.type === 'select'">
          <div
              class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
              :class="activeFieldKey === field.key ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-divider)]'"
              @click="toggleDropdown(field.key)"
          >
            <span
                class="font-bold text-sm"
                :class="modelValue[field.key] ? 'text-[var(--color-text-strong)]' : 'text-[var(--color-text-placeholder)]'"
            >
              {{ field.options.find(o => String(o.value) === String(modelValue[field.key]))?.label || field.placeholder || '전체' }}
            </span>
            <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': activeFieldKey === field.key }">▼</span>
          </div>

          <ul
              v-if="activeFieldKey === field.key"
              class="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0 overflow-y-auto max-h-60"
          >
            <li
                class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                :class="!modelValue[field.key] ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'"
                @click="selectOption(field.key, '')"
            >
              {{ field.placeholder || '전체' }}
            </li>
            <li
                v-for="option in field.options || []"
                :key="String(option.value)"
                class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                :class="String(modelValue[field.key]) === String(option.value) ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'"
                @click="selectOption(field.key, option.value)"
            >
              {{ option.label }}
            </li>
          </ul>
        </template>

        <input
            v-else
            class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm placeholder:[var(--color-text-placeholder)]"
            :type="field.type || 'text'"
            :value="modelValue[field.key] ?? ''"
            :placeholder="field.placeholder || ''"
            @input="updateField(field.key, $event.target.value)"
            @keyup.enter="triggerSearch"
        />
      </div>

      <div v-if="showSearch || showReset" class="flex items-end gap-2 col-span-12 md:col-span-3 w-full">
        <button
            v-if="showSearch"
            type="button"
            class="h-11 w-full rounded-lg bg-[var(--color-text-strong)] px-6 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
            @click="triggerSearch"
        >
          {{ searchLabel }}
        </button>
        <button
            v-if="showReset"
            type="button"
            class="h-11 rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
            @click="triggerReset"
        >
          {{ resetLabel }}
        </button>
      </div>
    </div>

    <div v-if="$slots.extra" class="mt-4 border-t border-[var(--color-border-divider)] pt-4">
      <slot name="extra" />
    </div>
  </section>
</template>

<style scoped>
.animate-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
