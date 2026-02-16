<script setup>
import { computed, ref } from 'vue'
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
    const allTags = Object.values(item.tags || {}).flat().join(' ').toLowerCase()
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword) || allTags.includes(keyword)

    return matchCategory && matchEnv && matchKeyword
  })
})

const goDetail = (id) => {
  router.push(`/products/${id}`)
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
</script>

<template>
  <section>
    <PageHeader title="전체 상품 목록(관리자)" subtitle="상품 조회, 비교함, 즐겨찾기를 관리합니다.">
      <template #actions>
        <button
          type="button"
          class="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          @click="router.push('/products/favorites')"
        >
          ★ 즐겨찾기
        </button>
        <button
          type="button"
          class="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          @click="openCompare"
        >
          비교함 ({{ productStore.compareItems.length }}/3)
        </button>
        <button
          type="button"
          class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="router.push('/products/register')"
        >
          + 상품 등록
        </button>
      </template>
    </PageHeader>

    <SearchFilter v-model="filters" :fields="filterFields" search-label="검색" reset-label="초기화" />

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ProductCatalogCard
        v-for="item in filteredProducts"
        :key="item.id"
        :item="item"
        :compare-active="productStore.isInCompare(item.id)"
        :favorite-active="productStore.isFavorite(item.id)"
        @select="goDetail"
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
  </section>
</template>
