<script setup>
defineProps({
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
</script>

<template>
  <article 
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    @click="emit('select', item.id)"
  >
    <div class="relative h-48 bg-slate-100">
      <img 
        v-if="item.imageUrl" 
        :src="item.imageUrl" 
        :alt="item.name" 
        class="h-full w-full object-cover"
        @error="$event.target.style.display='none'" 
      />
      <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
        <span class="text-4xl">🌱</span>
      </div>

      <div v-if="showCompare || showFavorite" class="absolute right-2 top-2 flex gap-1">
        <button
          v-if="showCompare"
          type="button"
          class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold hover:bg-white"
          :class="compareActive ? 'text-emerald-700 ring-1 ring-emerald-500' : 'text-slate-600'"
          @click.stop="emit('toggle-compare', item.id)"
        >
          {{ compareActive ? '담기 완료' : '+ 비교담기' }}
        </button>
        <button
          v-if="showFavorite"
          type="button"
          class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold hover:bg-white"
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
  </article>
</template>
