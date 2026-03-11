<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import CultivationTimeTable from '@/components/product/CultivationTimeTable.vue'
import { useProductStore } from '@/stores/product'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()

const productId = computed(() => Number(route.params.id))
const product = computed(() => productStore.getProductById(productId.value))

const formattedPrice = computed(() => {
  if (!product.value?.priceData?.price) return ''
  return Number(product.value.priceData.price).toLocaleString()
})


const tagRows = computed(() => {
  const rows = [
    { key: '재배환경', label: '재배환경' },
    { key: '내병성', label: '내병성' },
    { key: '생육및숙기', label: '생육/숙기' },
    { key: '과실품질', label: '과실품질' },
    { key: '재배편의성', label: '재배편의성' },
  ]
  if (!product.value) return []
  return rows.filter((row) => (product.value.tags?.[row.key] || []).length > 0)
})

onMounted(() => {
  if (!productStore.products || productStore.products.length === 0) {
    productStore.fetchProducts()
  }
})

const deleteProduct = () => {
  if (!product.value) return
  if (window.confirm('정말로 이 상품 정보를 삭제하시겠습니까?')) {
    productStore.deleteProduct(product.value.id)
    router.push('/products/catalog')
  }
}

const toggleCompare = async () => {
  const result = await productStore.toggleCompareItem(productId.value)
  if (result && !result.ok && result.reason === 'limit') {
    window.alert('비교함에는 최대 3개까지만 담을 수 있습니다.')
  }
}
</script>

<template>
  <section v-if="product">
    <PageHeader title="상품 상세 정보(관리자)">
      <template #actions>
        <button
          type="button"
          class="rounded border border-[var(--color-border-card)] px-3 py-2 text-sm font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]"
          @click="router.push('/products/catalog')"
        >
          목록으로
        </button>
        <button
          type="button"
          class="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          @click="deleteProduct"
        >
          삭제
        </button>
        <button
          type="button"
          class="rounded bg-[var(--color-olive)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-olive-dark)]"
          @click="router.push(`/products/register?id=${product.id}`)"
        >
          수정
        </button>
      </template>
    </PageHeader>

    <div class="grid gap-6 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 lg:grid-cols-[380px_1fr]">
      <div class="overflow-hidden rounded-xl bg-[var(--color-bg-section)] h-[380px]">
        <img :src="product.imageUrl" :alt="product.name" class="h-full w-full object-cover" />
      </div>

      <div class="flex flex-col">
        <div class="flex items-start justify-between gap-3 border-b border-[var(--color-border-card)] pb-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-blue-600">{{ product.category }}</p>
            <h3 class="mt-2 text-3xl font-bold text-[var(--color-text-strong)]">{{ product.name }}</h3>
            
            <!-- 단가 정보 추가 -->
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-[var(--color-text-strong)]">₩{{ (product.price || 0).toLocaleString() }}</span>
              <span class="text-sm text-[var(--color-text-sub)]">/ {{ product.amount || '' }}{{ product.unit || '단위 미정' }}</span>
            </div>

            <div class="mt-2 flex items-center gap-3">
              <span class="rounded px-2 py-1 text-xs font-semibold"
                :class="product.status === 'SALE' || !product.status ? 'bg-[var(--color-olive-light)] text-[var(--color-olive-dark)]' : (product.status === 'HIDDEN' ? 'bg-gray-100 text-gray-500' : 'bg-[#F0D4D4] text-[var(--color-status-error)]')"
              >
                {{ product.status === 'SOLDOUT' ? '일시 품절' : (product.status === 'STOP' ? '단종' : (product.status === 'HIDDEN' ? '숨김' : '판매 중')) }}
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-sm font-semibold"
              :class="productStore.isInCompare(product.id) ? 'border-[var(--color-olive)] text-[var(--color-olive-dark)] bg-[var(--color-olive-light)]' : 'border-[var(--color-border-card)] text-[var(--color-text-body)]'"
              @click="toggleCompare"
            >
              {{ productStore.isInCompare(product.id) ? '담기 완료' : '+ 비교담기' }}
            </button>
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-sm font-semibold"
              :class="productStore.isFavorite(product.id) ? 'border-[var(--color-orange)] text-[var(--color-orange-dark)] bg-[var(--color-orange-light)]' : 'border-[var(--color-border-card)] text-[var(--color-text-body)]'"
              @click="productStore.toggleFavoriteItem(product.id)"
            >
              {{ productStore.isFavorite(product.id) ? '★ 즐겨찾기' : '☆ 즐겨찾기' }}
            </button>
          </div>
        </div>

        <p class="mt-4 flex-1 rounded-lg bg-[var(--color-bg-section)] p-4 text-sm leading-6 text-[var(--color-text-body)] whitespace-pre-wrap">{{ product.desc }}</p>

        <div class="mt-6 mb-8 space-y-3">
          <div v-for="row in tagRows" :key="row.key" class="grid gap-2 border-b border-[var(--color-border-divider)] pb-3 md:grid-cols-[100px_1fr]">
            <p class="text-sm font-semibold text-[var(--color-text-sub)]">{{ row.label }}</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in (product.tags?.[row.key] || [])"
                :key="`${row.key}-${tag}`"
                class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>

        <!-- 재배적기표 컴포넌트 -->
        <CultivationTimeTable :productId="productId" />
      </div>
    </div>
  </section>

  <section v-else class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-8 text-center text-sm text-[var(--color-text-sub)]">
    상품 정보가 없습니다.
  </section>
</template>
