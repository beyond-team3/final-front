<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchFilter from '@/components/common/SearchFilter.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import ProductCatalogCard from '@/components/product/ProductCatalogCard.vue'
import { useProductStore } from '@/stores/product'
import { GROWING_SEASON_MONTH_OPTIONS, matchesGrowingSeason } from '@/utils/growingSeason'

const router = useRouter()
const productStore = useProductStore()

const filters = ref({
  category: '',
  env: '',
  growingSeasonMonth: '',
  keyword: '',
})
const visibleCount = ref(12)

const filterFields = computed(() => [
  {
    key: 'category',
    label: '품목',
    type: 'select',
    options: (productStore.categoryOptions || []).map((item) => ({ label: item, value: item })),
  },
  {
    key: 'env',
    label: '재배환경',
    type: 'select',
    options: (productStore.envOptions || []).map((item) => ({ label: item, value: item })),
  },
  {
    key: 'growingSeasonMonth',
    label: '재배적기',
    type: 'select',
    placeholder: '전체 월',
    options: GROWING_SEASON_MONTH_OPTIONS,
  },
  {
    key: 'keyword',
    label: '검색어',
    placeholder: '상품명 또는 태그 검색',
  },
])

const filteredProducts = computed(() => {
  const keyword = (filters.value.keyword || '').trim().toLowerCase()
  const allProducts = productStore.products || []

  return allProducts.filter((item) => {
    if (!item) return false
    const matchCategory = !filters.value.category || item.category === filters.value.category
    const matchEnv = !filters.value.env || (item.tags?.env || []).includes(filters.value.env)
    const matchGrowingSeason = matchesGrowingSeason(item, filters.value.growingSeasonMonth)
    const allTags = Object.values(item.tags || {}).flat().join(' ').toLowerCase()
    const allTraits = Array.isArray(item.traits) ? item.traits.join(' ').toLowerCase() : ''
    const matchKeyword = !keyword || (item.name || '').toLowerCase().includes(keyword) || allTags.includes(keyword)
      || allTraits.includes(keyword)

    return matchCategory && matchEnv && matchGrowingSeason && matchKeyword
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

const goDetail = (id) => {
  router.push(`/products/${id}`)
}

const toggleCompare = async (id) => {
  const result = await productStore.toggleCompareItem(id)
  if (result && !result.ok && result.reason === 'limit') {
    window.alert('비교함에는 최대 3개까지만 담을 수 있습니다.')
  }
}

const toggleFavorite = async (id) => {
  await productStore.toggleFavoriteItem(id)
}

const openCompare = () => {
  if (!productStore.compareItems || productStore.compareItems.length < 2) {
    window.alert('비교하려면 최소 2개 이상의 상품을 선택해주세요.')
    return
  }
  router.push('/products/compare')
}

onMounted(async () => {
  try {
    // 상품 목록이 이미 있다면 초기화 생략 가능하지만, 안전을 위해 호출
    await Promise.all([
      productStore.fetchCategories(),
      productStore.fetchProducts(),
      productStore.fetchFavorites(),
      productStore.fetchCompareList(),
    ])
  } catch (err) {
    console.error('Failed to fetch catalog data:', err)
  }
})
</script>

<template>
  <section v-if="productStore">
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
          비교함 ({{ (productStore.compareItems || []).length }}/3)
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

    <LoadingSpinner v-if="productStore.loading" message="상품 목록을 불러오는 중..." />
    <ErrorMessage v-else-if="productStore.error" :message="productStore.error" />

    <template v-else>
      <section class="grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        <ProductCatalogCard
          v-for="item in visibleProducts"
          :key="item.id"
          :item="item"
          :show-price="true"
          :compare-active="productStore.isInCompare(item.id)"
          :favorite-active="productStore.isFavorite(item.id)"
          @select="goDetail"
          @toggle-compare="toggleCompare"
          @toggle-favorite="toggleFavorite"
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
    </template>
  </section>
</template>
