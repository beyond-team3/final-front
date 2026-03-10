<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

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

const tempMultiSelect = ref([])

// 부모 컴포넌트에서 초기화(modelValue 변경) 시 임시 선택값 동기화
watch(() => props.modelValue, (newVal) => {
  if (activeFieldKey.value) {
    const activeField = props.fields?.find(f => f.key === activeFieldKey.value)
    if (activeField && activeField.type === 'multi-select-grid') {
      const parentVal = newVal[activeField.key]
      if (!parentVal || parentVal.length === 0) {
        tempMultiSelect.value = []
      }
    }
  }
}, { deep: true })

const openDropdown = (field) => {
  if (activeFieldKey.value === field.key) {
    activeFieldKey.value = null
  } else {
    activeFieldKey.value = field.key
    if (field.type === 'multi-select-grid') {
      tempMultiSelect.value = Array.isArray(props.modelValue[field.key]) ? [...props.modelValue[field.key]] : []
    }
  }
}

const toggleMultiSelectOption = (value) => {
  const index = tempMultiSelect.value.indexOf(value)
  if (index > -1) {
    tempMultiSelect.value.splice(index, 1)
  } else {
    tempMultiSelect.value.push(value)
  }
}

const resetMultiSelect = () => {
  tempMultiSelect.value = []
}

const confirmMultiSelect = (key) => {
  updateField(key, [...tempMultiSelect.value])
  activeFieldKey.value = null
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
              @click.stop="openDropdown(field)"
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

        <!-- 멀티 셀렉트 그리드 (체크박스 타일 형태) -> 드롭다운 방식으로 변경 -->
        <template v-else-if="field.type === 'multi-select-grid'">
          <div
              class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
              :class="activeFieldKey === field.key ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-divider)]'"
              @click.stop="openDropdown(field)"
          >
            <span
                class="font-bold text-sm"
                :class="modelValue[field.key]?.length ? 'text-[var(--color-text-strong)]' : 'text-[var(--color-text-placeholder)]'"
            >
              {{ modelValue[field.key]?.length ? `${modelValue[field.key].length}개 선택됨` : field.placeholder || '품목 선택' }}
            </span>
            <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': activeFieldKey === field.key }">▼</span>
          </div>

          <div
              v-if="activeFieldKey === field.key"
              class="absolute z-50 left-0 mt-1 w-[calc(100vw-40px)] md:w-[600px] lg:w-[700px] max-w-[800px] rounded-lg border border-[var(--color-border-card)] bg-[#FAFAFA] p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200"
              @click.stop
          >
            <p class="text-sm font-bold text-[var(--color-text-sub)] mb-4 pb-3 border-b border-[var(--color-border-divider)]">
              작물을 선택하면 등록 제품이 정렬됩니다.
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                  v-for="option in field.options || []"
                  :key="String(option.value)"
                  type="button"
                  class="flex items-center justify-between px-3 py-2.5 rounded bg-white border text-sm font-semibold transition-colors"
                  :class="tempMultiSelect.includes(option.value) ? 'border-[var(--color-olive)] text-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-divider)] text-[var(--color-text-body)] hover:bg-gray-50'"
                  @click="toggleMultiSelectOption(option.value)"
              >
                {{ option.label }}
                <span 
                    class="flex items-center justify-center w-5 h-5 rounded-sm border"
                    :class="tempMultiSelect.includes(option.value) ? 'bg-[#548E1D] border-[#548E1D]' : 'bg-gray-100 border-gray-200'"
                >
                  <svg v-if="tempMultiSelect.includes(option.value)" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </span>
              </button>
            </div>
            
            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="px-5 py-2.5 text-sm font-semibold rounded-lg border border-[var(--color-border-divider)] text-[var(--color-text-body)] hover:bg-gray-100 bg-white transition-colors" @click="resetMultiSelect">초기화</button>
              <button type="button" class="px-5 py-2.5 text-sm font-semibold rounded-lg border border-[var(--color-border-divider)] text-[var(--color-text-body)] hover:bg-gray-100 bg-white transition-colors" @click="activeFieldKey = null">취소</button>
              <button type="button" class="px-5 py-2.5 text-sm font-bold rounded-lg bg-[var(--color-olive)] text-white hover:opacity-90 shadow-sm transition-opacity" @click="confirmMultiSelect(field.key)">적용</button>
            </div>
          </div>
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
            class="h-11 rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)] whitespace-nowrap"
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
