<script setup>
import { computed, ref, watch } from 'vue'

let checkboxIdSeq = 0

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  indeterminate: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])
const inputRef = ref(null)
const localId = `cedar-checkbox-${++checkboxIdSeq}`

const inputId = computed(() => props.id || localId)
const hasVisibleLabel = computed(() => Boolean(props.label))
const resolvedAriaLabel = computed(() => (hasVisibleLabel.value ? undefined : props.ariaLabel || '체크박스'))
const ariaChecked = computed(() => {
  if (props.indeterminate) return 'mixed'
  return props.modelValue ? 'true' : 'false'
})

const syncIndeterminate = () => {
  if (!inputRef.value) return
  inputRef.value.indeterminate = props.indeterminate
}

watch(
  () => props.indeterminate,
  () => syncIndeterminate(),
  { immediate: true }
)

function onChange(event) {
  emit('update:modelValue', event.target.checked)
}
</script>

<template>
  <label
    class="cedar-checkbox"
    :class="{ 'is-disabled': disabled }"
    :for="inputId"
  >
    <input
      :id="inputId"
      ref="inputRef"
      class="cedar-checkbox__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-checked="ariaChecked"
      :aria-label="resolvedAriaLabel"
      @change="onChange"
    >

    <span class="cedar-checkbox__figure" aria-hidden="true">
      <svg viewBox="0 0 16 16" class="cedar-checkbox__check">
        <path d="M6.3 11.7 2.9 8.2l1.2-1.2 2.2 2.2L11.9 3.6l1.2 1.2z" />
      </svg>
    </span>

    <span v-if="hasVisibleLabel" class="cedar-checkbox__label">{{ label }}</span>
    <slot />
  </label>
</template>

<style scoped>
.cedar-checkbox {
  --checkbox-size: 16px;
  --checkbox-radius: 4px;
  --checkbox-border: var(--cdr-color-border-input-default, #958e83);
  --checkbox-border-hover: var(--cdr-color-border-input-default-hover, #2e2e2b);
  --checkbox-bg: var(--cdr-color-background-input-default, #fafbf9);
  --checkbox-bg-active: var(--cdr-color-background-input-default-active, #fafbf9);
  --checkbox-selected-bg: var(--cdr-color-background-input-default-selected, #4b4a48);
  --checkbox-selected-bg-hover: var(--cdr-color-background-input-default-selected-hover, #958e83);
  --checkbox-focus-ring: var(--cdr-color-border-input-default-active, #4b4a48);
  --checkbox-disabled-border: var(--cdr-color-border-input-default-disabled, #d5cfc3);
  --checkbox-disabled-bg: var(--cdr-color-background-input-default-disabled, #fafbf9);
  --checkbox-icon: var(--cdr-color-icon-checkbox-default-selected, #fff);

  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
  line-height: 1.2;
}

.cedar-checkbox.is-disabled {
  cursor: not-allowed;
}

.cedar-checkbox__input {
  position: absolute;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  opacity: 0;
  margin: 0;
}

.cedar-checkbox__figure {
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--checkbox-radius);
  box-shadow: inset 0 0 0 1px var(--checkbox-border);
  background-color: var(--checkbox-bg);
  transition: box-shadow 0.2s ease, background-color 0.2s ease;
  position: relative;
  flex-shrink: 0;
}

.cedar-checkbox__check {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  max-width: var(--checkbox-size);
  max-height: var(--checkbox-size);
  display: block;
  fill: transparent;
  pointer-events: none;
}

.cedar-checkbox__label {
  font-size: 14px;
  line-height: 20px;
  color: #4b4a48;
}

.cedar-checkbox:hover .cedar-checkbox__figure {
  box-shadow: inset 0 0 0 1px var(--checkbox-border-hover), 0 0 0 1px var(--checkbox-border-hover);
}

.cedar-checkbox__input:focus-visible + .cedar-checkbox__figure {
  box-shadow: inset 0 0 0 1px var(--checkbox-focus-ring), 0 0 0 2px var(--checkbox-focus-ring);
}

.cedar-checkbox__input:checked + .cedar-checkbox__figure {
  box-shadow: inset 0 0 0 1px var(--checkbox-selected-bg);
  background-color: var(--checkbox-selected-bg);
}

.cedar-checkbox:hover .cedar-checkbox__input:checked + .cedar-checkbox__figure {
  box-shadow: inset 0 0 0 1px var(--checkbox-selected-bg-hover), 0 0 0 1px var(--checkbox-selected-bg-hover);
  background-color: var(--checkbox-selected-bg-hover);
}

.cedar-checkbox__input:checked + .cedar-checkbox__figure .cedar-checkbox__check {
  fill: var(--checkbox-icon);
}

.cedar-checkbox:active .cedar-checkbox__figure {
  background-color: var(--checkbox-bg-active);
}

.cedar-checkbox__input:indeterminate + .cedar-checkbox__figure {
  box-shadow: inset 0 0 0 1px var(--checkbox-selected-bg);
  background-color: var(--checkbox-bg);
}

.cedar-checkbox__input:indeterminate + .cedar-checkbox__figure::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 2px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background-color: var(--checkbox-selected-bg);
}

.cedar-checkbox:hover .cedar-checkbox__input:indeterminate + .cedar-checkbox__figure {
  box-shadow: inset 0 0 0 2px var(--checkbox-selected-bg);
}

.cedar-checkbox:hover .cedar-checkbox__input:indeterminate + .cedar-checkbox__figure::after {
  background-color: #fff;
}

.cedar-checkbox__input:disabled + .cedar-checkbox__figure {
  box-shadow: inset 0 0 0 1px var(--checkbox-disabled-border) !important;
  background-color: var(--checkbox-disabled-bg) !important;
}

.cedar-checkbox__input:disabled + .cedar-checkbox__figure .cedar-checkbox__check {
  fill: transparent !important;
}

.cedar-checkbox__input:disabled:indeterminate + .cedar-checkbox__figure::after {
  background-color: var(--checkbox-disabled-border) !important;
}
</style>
