<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const productStore = useProductStore()

const favoriteProducts = computed(() => {
  return productStore.favoriteItems
    .map((id) => productStore.getProductById(id))
    .filter(Boolean)
})

const openCompare = () => {
  if (productStore.compareItems.length < 2) {
    window.alert('비교하려면 최소 2개 이상의 상품을 선택해주세요.')
    return
  }

  router.push('/products/compare')
}

const toggleCompare = (id) => {
  const result = productStore.toggleCompareItem(id)
  if (!result.ok && result.reason === 'limit') {
    window.alert('비교함에는 최대 3개까지만 담을 수 있습니다.')
  }
}
</script>

<template>
  <section>
    <PageHeader title="즐겨찾기">
      <template #actions>
        <button
          type="button"
          class="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          @click="openCompare"
        >
          비교함 ({{ productStore.compareItems.length }}/3)
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="router.push('/products/catalog')"
        >
          전체 목록으로
        </button>
      </template>
    </PageHeader>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="item in favoriteProducts"
        :key="item.id"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="relative h-48 bg-slate-100">
          <img :src="item.imageUrl" :alt="item.name" class="h-full w-full object-cover" />

          <div class="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold"
              :class="productStore.isInCompare(item.id) ? 'text-emerald-700 ring-1 ring-emerald-500' : 'text-slate-600'"
              @click="toggleCompare(item.id)"
            >
              {{ productStore.isInCompare(item.id) ? '담기 완료' : '+ 비교담기' }}
            </button>
            <button
              type="button"
              class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-amber-600"
              @click="productStore.removeFavoriteItem(item.id)"
            >
              ★
            </button>
          </div>
        </div>

        <button type="button" class="block w-full p-4 text-left" @click="router.push(`/products/${item.id}`)">
          <p class="text-xs font-semibold text-blue-600">{{ item.category }}</p>
          <h3 class="mt-1 text-base font-bold text-slate-800">{{ item.name }}</h3>
          <p class="mt-2 line-clamp-2 text-sm text-slate-500">{{ item.desc }}</p>
        </button>
      </article>

      <div
        v-if="favoriteProducts.length === 0"
        class="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500"
      >
        즐겨찾기한 상품이 없습니다.
      </div>
    </section>
  </section>
</template>
