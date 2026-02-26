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
      class="modal-overlay p-4"
      @click.self="onBackdropClick"
    >
      <section class="modal max-h-[90vh] w-full overflow-hidden" :class="widthClass">
        <header class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button
            type="button"
            class="modal-close"
            aria-label="닫기"
            @click="close"
          />
        </header>

        <div class="modal-body max-h-[calc(90vh-120px)] overflow-y-auto">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" :close="close" />
        </footer>
      </section>
    </div>
  </teleport>
</template>
