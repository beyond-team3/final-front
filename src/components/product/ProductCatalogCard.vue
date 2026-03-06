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
  showPrice: {
    type: Boolean,
    default: false,
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
    class="overflow-hidden rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-[0_1px_3px_rgba(61,53,41,0.06)] cursor-pointer transition-shadow hover:shadow-[0_4px_6px_rgba(61,53,41,0.08)] hover:border-[var(--color-olive)]"
    tabindex="0"
    role="button"
    @click="emit('select', item.id)"
    @keydown="onKeyActivate($event, item.id)"
  >
    <div class="relative h-48 bg-[var(--color-bg-section)]">
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
          class="rounded-full bg-[var(--color-bg-card)]/90 px-2 py-1 text-xs font-semibold"
          :class="compareActive ? 'text-[var(--color-olive-dark)] ring-1 ring-[var(--color-olive)]' : 'text-[var(--color-text-sub)]'"
          @click.stop="emit('toggle-compare', item.id)"
        >
          {{ compareActive ? '담기 완료' : '+ 비교담기' }}
        </button>
        <button
          v-if="showFavorite"
          type="button"
          class="rounded-full bg-[var(--color-bg-card)]/90 px-2 py-1 text-xs font-semibold"
          :class="favoriteActive ? 'text-[var(--color-orange-dark)]' : 'text-[var(--color-text-sub)]'"
          :aria-label="favoriteActive ? '즐겨찾기 해제' : '즐겨찾기 추가'"
          :aria-pressed="favoriteActive"
          @click.stop="emit('toggle-favorite', item.id)"
        >
          {{ favoriteActive ? '★' : '☆' }}
        </button>
      </div>
    </div>

    <div class="block w-full p-4 text-left">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold text-[var(--color-olive)]">{{ item.category }}</p>
        <!-- showPrice props가 true일 때만 노출 -->
        <p v-if="showPrice && item.price" class="text-xs font-bold text-[var(--color-text-strong)]">
          ₩{{ item.price.toLocaleString() }} <span class="font-normal text-[var(--color-text-sub)]">/ {{ item.unit }}</span>
        </p>
      </div>
      <h3 class="mt-1 text-base font-bold text-[var(--color-text-strong)]">{{ item.name }}</h3>
      <p class="mt-2 line-clamp-2 text-sm text-[var(--color-text-body)]">{{ item.desc }}</p>
    </div>
  </div>
</template>
