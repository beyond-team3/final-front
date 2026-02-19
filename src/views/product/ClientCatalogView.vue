<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchFilter from '@/components/common/SearchFilter.vue'
import ProductCatalogCard from '@/components/product/ProductCatalogCard.vue'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const productStore = useProductStore()

const filters = ref({
  category: '',
  env: '',
  keyword: '',
})
const visibleCount = ref(12)

const filterFields = computed(() => [
  {
    key: 'category',
    label: '품목',
    type: 'select',
    options: productStore.categoryOptions.map((item) => ({ label: item, value: item })),
  },
  {
    key: 'env',
    label: '재배환경',
    type: 'select',
    options: productStore.envOptions.map((item) => ({ label: item, value: item })),
  },
  {
    key: 'keyword',
    label: '검색어',
    placeholder: '상품명 또는 태그 검색',
  },
])

const filteredProducts = computed(() => {
  const keyword = filters.value.keyword.trim().toLowerCase()

  return productStore.products.filter((item) => {
    const matchCategory = !filters.value.category || item.category === filters.value.category
    const matchEnv = !filters.value.env || (item.tags?.env || []).includes(filters.value.env)
    const tags = Object.values(item.tags || {}).flat().join(' ').toLowerCase()
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword) || tags.includes(keyword)

    return matchCategory && matchEnv && matchKeyword
  })
})

const visibleProducts = computed(() => filteredProducts.value.slice(0, visibleCount.value))
const hasMoreProducts = computed(() => filteredProducts.value.length > visibleCount.value)

watch(filters, () => {
  visibleCount.value = 12
}, { deep: true })

const loadMore = () => {
  visibleCount.value += 6
}

const toggleCompare = (id) => {
  const result = productStore.toggleCompareItem(id)
  if (!result.ok && result.reason === 'limit') {
    window.alert('비교함에는 최대 3개까지만 담을 수 있습니다.')
  }
}

const openCompare = () => {
  if (productStore.compareItems.length < 2) {
    window.alert('비교하려면 최소 2개 이상의 상품을 선택해주세요.')
    return
  }

  router.push('/products/compare')
}

onMounted(() => {
  productStore.fetchProducts()
})
</script>

<template>
  <section>
    <PageHeader title="전체 상품 목록" subtitle="거래처용 카탈로그입니다.">
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
          class="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          @click="router.push('/products/favorites')"
        >
          ★ 즐겨찾기
        </button>
      </template>
    </PageHeader>

    <SearchFilter v-model="filters" :fields="filterFields" search-label="검색" reset-label="초기화" />

    <section class="grid gap-6" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      <ProductCatalogCard
        v-for="item in visibleProducts"
        :key="item.id"
        :item="item"
        :compare-active="productStore.isInCompare(item.id)"
        :favorite-active="productStore.isFavorite(item.id)"
        @select="(id) => router.push(`/products/${id}`)"
        @toggle-compare="toggleCompare"
        @toggle-favorite="productStore.toggleFavoriteItem"
      />

      <div
        v-if="filteredProducts.length === 0"
        class="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500"
      >
        검색 결과가 없습니다.
      </div>
    </section>

    <div v-if="hasMoreProducts" class="mt-6 text-center">
      <button
        type="button"
        class="rounded-full border border-slate-300 bg-white px-10 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        @click="loadMore"
      >
        더 보기 +
      </button>
    </div>
  </section>
</template>