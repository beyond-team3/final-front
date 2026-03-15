<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  widthClass: {
    type: String,
    default: 'max-w-3xl',
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEsc: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const onBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

const onEsc = (event) => {
  if (!props.closeOnEsc) {
    return
  }

  if (event.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onEsc)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEsc)
})
</script>

<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="onBackdropClick"
    >
      <section class="max-h-[90vh] w-full overflow-hidden rounded-xl bg-white shadow-xl" :class="widthClass">
        <header class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 class="text-base font-semibold text-slate-800">{{ title }}</h3>
          <button
            type="button"
            class="icon-btn"
            @click="close"
          >
            ✕
          </button>
        </header>

        <div class="max-h-[calc(90vh-120px)] overflow-y-auto p-5">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="border-t border-slate-200 px-5 py-3">
          <slot name="footer" :close="close" />
        </footer>
      </section>
    </div>
  </teleport>
</template>
