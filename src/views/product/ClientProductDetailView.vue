<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import CultivationTimeTable from '@/components/product/CultivationTimeTable.vue'
import { useProductStore } from '@/stores/product'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()

const productStore = useProductStore()
const authStore = useAuthStore()

const productId = computed(() => Number(route.params.id))
const product = computed(() => productStore.getProductById(productId.value))
const noteDraft = ref('')

const tagRows = computed(() => {
  const rows = [
    { key: 'env', label: '재배환경' },
    { key: 'res', label: '내병성' },
    { key: 'growth', label: '생육/숙기' },
    { key: 'quality', label: '과실품질' },
    { key: 'conv', label: '재배편의성' },
  ]
  if (!product.value) return []
  return rows.filter((row) => (product.value.tags?.[row.key] || []).length > 0)
})

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)

onMounted(() => {
  if (!productStore.products || productStore.products.length === 0) {
    productStore.fetchProducts()
  }
})

watch(productId, (nextId) => {
  noteDraft.value = productStore.getProductNote(nextId)
}, { immediate: true })

const toggleCompare = async () => {
  const result = await productStore.toggleCompareItem(productId.value)
  if (result && !result.ok && result.reason === 'limit') {
    window.alert('비교함에는 최대 3개까지만 담을 수 있습니다.')
  }
}

const saveNote = async () => {
  if (!noteDraft.value.trim()) return;

  try {
    await productStore.addFeedbackMessage(product.value.id, noteDraft.value.trim());
    noteDraft.value = "";
    productStore.setProductNote(product.value.id, "")
    window.alert("피드백이 저장되었습니다.");
  } catch (err) {
    console.error("피드백 저장 실패:", err);
    window.alert("피드백 저장에 실패했습니다.");
  }
};

</script>

<template>
  <section v-if="product">
    <PageHeader title="상품 상세 정보">
      <template #actions>
        <button
          type="button"
          class="rounded border border-[var(--color-olive)] bg-[var(--color-olive-light)] px-3 py-2 text-sm font-semibold text-[var(--color-olive-dark)] hover:opacity-80"
          @click="router.push(`/products/similarity?base=${product.id}`)"
        >
          유사도 분석
        </button>
        <button
          v-if="!isClient"
          type="button"
          class="rounded border border-[var(--color-orange)] bg-[var(--color-orange-light)] px-3 py-2 text-sm font-semibold text-[var(--color-orange-dark)] hover:opacity-80"
          @click="router.push(`/products/feedback?id=${product.id}`)"
        >
          피드백 커뮤니티
        </button>
        <button
          type="button"
          class="rounded border border-[var(--color-border-card)] px-3 py-2 text-sm font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]"
          @click="router.push('/products/catalog')"
        >
          목록으로
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
            
            <!-- 단가 정보 (관리자/영업사원에게만 표시) -->
            <div v-if="!isClient" class="mt-3">
              <div class="flex items-baseline gap-2">
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
          <div v-for="row in tagRows" :key="row.key" class="grid gap-2 border-b border-[var(--color-border-divider)] pb-3 md:grid-cols-[110px_1fr]">
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

    <section
      v-if="isSalesRep"
      class="mt-6 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm"
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-base font-bold text-[var(--color-text-strong)]">나의 영업 피드백</h3>
        <button
          type="button"
          class="rounded bg-[var(--color-olive)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-olive-dark)] transition-colors"
          @click="saveNote"
        >
          피드백 저장
        </button>
      </div>
      <textarea
        v-model="noteDraft"
        class="h-32 w-full rounded-lg border border-[var(--color-border-card)] p-4 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="해당 품종에 대한 영업 현장의 의견이나 고객 반응을 자유롭게 기록하세요."
      />
    </section>
  </section>

  <section v-else class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-12 text-center text-sm text-[var(--color-text-sub)]">
    <div class="mb-2 text-4xl">🔍</div>
    상품 정보를 찾을 수 없습니다.
  </section>
</template>
