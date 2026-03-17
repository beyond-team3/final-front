<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchFilter from '@/components/common/SearchFilter.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import ProductCatalogCard from '@/components/product/ProductCatalogCard.vue'
import { useProductStore } from '@/stores/product'
import { PRODUCT_CATEGORY } from '@/utils/constants'
import { GROWING_SEASON_MONTH_OPTIONS, matchesGrowingSeason } from '@/utils/growingSeason'

const router = useRouter()
const productStore = useProductStore()

const filters = ref({
  category: [],
  env: [],
  growingSeasonMonth: [],
  keyword: '',
})
const visibleCount = ref(12)

const filterFields = computed(() => [
  {
    key: 'category',
    label: '품목',
    type: 'multi-select-grid',
    colSpan: 2,
    defaultValue: [],
    options: Object.entries(PRODUCT_CATEGORY).map(([code, label]) => ({
      label,
      value: label
    })),
  },
  {
    key: 'env',
    label: '재배환경',
    type: 'multi-select-grid',
    colSpan: 2,
    placeholder: '재배환경 선택',
    options: (productStore.envOptions || []).map((item) => ({ label: item, value: item })),
  },
  {
    key: 'growingSeasonMonth',
    label: '재배적기',
    type: 'multi-select-grid',
    colSpan: 2,
    placeholder: '재배적기(월) 선택',
    options: GROWING_SEASON_MONTH_OPTIONS,
  },
  {
    key: 'keyword',
    label: '검색어',
    colSpan: 3,
    placeholder: '상품명 또는 태그 검색',
  },
])

const filteredProducts = computed(() => {
  const keyword = (filters.value.keyword || '').trim().toLowerCase()
  const allProducts = productStore.products || []

  return allProducts.filter((item) => {
    if (!item) return false
    const matchCategory = !filters.value.category?.length || filters.value.category.includes(PRODUCT_CATEGORY[item.category] || item.category)
    const activeEnvs = filters.value.env || []
    const itemEnvs = item.tags?.['재배환경'] || item.tags?.env || []
    const matchEnv = activeEnvs.length === 0 || activeEnvs.some(e => itemEnvs.includes(e))
    
    const activeMonths = filters.value.growingSeasonMonth || []
    const matchGrowingSeason = activeMonths.length === 0 || activeMonths.some(m => matchesGrowingSeason(item, m))
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
    <PageHeader title="품종 카탈로그(관리자)" subtitle="품종 조회, 비교함, 즐겨찾기를 관리합니다.">
      <template #actions>
        <button
          type="button"
          class="rounded border border-[var(--color-orange)] bg-[var(--color-orange-light)] px-3 py-2 text-sm font-semibold text-[var(--color-orange-dark)] hover:opacity-80"
          @click="router.push('/products/favorites')"
        >
          ★ 즐겨찾기
        </button>
        <button
          type="button"
          class="rounded border border-[var(--color-olive)] bg-[var(--color-olive-light)] px-3 py-2 text-sm font-semibold text-[var(--color-olive-dark)] hover:opacity-80"
          @click="openCompare"
        >
          비교함 ({{ (productStore.compareItems || []).length }}/3)
        </button>
        <button
          type="button"
          class="rounded bg-[var(--color-olive)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-olive-dark)]"
          @click="router.push('/products/register')"
        >
          + 품종 등록
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
          class="col-span-full rounded-xl border border-dashed border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-14 text-center text-sm text-[var(--color-text-sub)]"
        >
          검색 결과가 없습니다.
        </div>
      </section>

      <div v-if="hasMoreProducts" class="mt-6 text-center">
        <button
          type="button"
          class="rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-card)] px-10 py-3 text-sm font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]"
          @click="loadMore"
        >
          더 보기 +
        </button>
      </div>
    </template>
  </section>
</template>
