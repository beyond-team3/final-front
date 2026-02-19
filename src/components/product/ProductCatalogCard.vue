<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  showCompare: {
    type: Boolean,
    default: true,
  },
  showFavorite: {
    type: Boolean,
    default: true,
  },
  compareActive: {
    type: Boolean,
    default: false,
  },
  favoriteActive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'toggle-compare', 'toggle-favorite'])

const imageLoadError = ref(false)

watch(() => props.item.imageUrl, () => {
  imageLoadError.value = false
})

const onKeyActivate = (event, id) => {
  if (['BUTTON', 'A', 'INPUT'].includes(event.target.tagName)) return
  if (['Enter', ' '].includes(event.key)) {
    event.preventDefault()
    emit('select', id)
  }
}
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer transition-shadow hover:shadow-md"
    tabindex="0"
    role="button"
    @click="emit('select', item.id)"
    @keydown="onKeyActivate($event, item.id)"
  >
    <div class="relative h-48 bg-slate-100">
      <img
        v-if="item.imageUrl && !imageLoadError"
        :src="item.imageUrl"
        :alt="item.name"
        class="h-full w-full object-cover"
        @error="imageLoadError = true"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-4xl">
        📦
      </div>

      <div v-if="showCompare || showFavorite" class="absolute right-2 top-2 flex gap-1">
        <button
          v-if="showCompare"
          type="button"
          class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold"
          :class="compareActive ? 'text-emerald-700 ring-1 ring-emerald-500' : 'text-slate-600'"
          @click.stop="emit('toggle-compare', item.id)"
        >
          {{ compareActive ? '담기 완료' : '+ 비교담기' }}
        </button>
        <button
          v-if="showFavorite"
          type="button"
          class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold"
          :class="favoriteActive ? 'text-amber-600' : 'text-slate-600'"
          @click.stop="emit('toggle-favorite', item.id)"
        >
          {{ favoriteActive ? '★' : '☆' }}
        </button>
      </div>
    </div>

    <div class="block w-full p-4 text-left">
      <p class="text-xs font-semibold text-blue-600">{{ item.category }}</p>
      <h3 class="mt-1 text-base font-bold text-slate-800">{{ item.name }}</h3>
      <p class="mt-2 line-clamp-2 text-sm text-slate-500">{{ item.desc }}</p>
    </div>
  </div>
</template>
