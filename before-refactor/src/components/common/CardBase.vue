<script setup>
defineProps({
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  padding: {
    type: String,
    default: 'p-5',
  },
  elevated: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <section
    class="rounded-xl border border-slate-200 bg-white"
    :class="elevated ? 'shadow-sm' : ''"
  >
    <header
      v-if="title || subtitle || $slots.header"
      class="border-b border-slate-200 px-5 py-4"
    >
      <slot name="header">
        <h3 v-if="title" class="text-base font-semibold text-slate-800">{{ title }}</h3>
        <p v-if="subtitle" class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
      </slot>
    </header>

    <div :class="padding">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="border-t border-slate-200 px-5 py-3">
      <slot name="footer" />
    </footer>
  </section>
</template>
