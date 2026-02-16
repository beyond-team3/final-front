<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
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
  if (!product.value) {
    return []
  }

  return [
    { key: 'env', label: '재배환경' },
    { key: 'res', label: '내병성' },
    { key: 'growth', label: '생육/숙기' },
    { key: 'quality', label: '과실품질' },
    { key: 'conv', label: '재배편의성' },
  ].filter((row) => (product.value.tags?.[row.key] || []).length > 0)
})

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)

watch(productId, (nextId) => {
  noteDraft.value = productStore.getProductNote(nextId)
}, { immediate: true })

const toggleCompare = () => {
  const result = productStore.toggleCompareItem(productId.value)
  if (!result.ok && result.reason === 'limit') {
    window.alert('비교함에는 최대 3개까지만 담을 수 있습니다.')
  }
}

const saveNote = () => {
  if (!product.value) {
    return
  }

  productStore.setProductNote(product.value.id, noteDraft.value.trim())
  window.alert('피드백이 저장되었습니다.')
}
</script>

<template>
  <section v-if="product">
    <PageHeader title="상품 상세 정보">
      <template #actions>
        <button
          type="button"
          class="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          @click="router.push(`/products/similarity?base=${product.id}`)"
        >
          유사도 분석
        </button>
        <button
          v-if="!isClient"
          type="button"
          class="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
          @click="router.push(`/products/feedback?id=${product.id}`)"
        >
          피드백 커뮤니티
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="router.push('/products/catalog')"
        >
          목록으로
        </button>
      </template>
    </PageHeader>

    <div class="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 lg:grid-cols-[380px_1fr]">
      <div class="overflow-hidden rounded-xl bg-slate-100">
        <img :src="product.imageUrl" :alt="product.name" class="h-full w-full object-cover" />
      </div>

      <div>
        <div class="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-blue-600">{{ product.category }}</p>
            <h3 class="mt-2 text-3xl font-bold text-slate-800">{{ product.name }}</h3>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-sm font-semibold"
              :class="productStore.isInCompare(product.id) ? 'border-emerald-500 text-emerald-700' : 'border-slate-300 text-slate-600'"
              @click="toggleCompare"
            >
              {{ productStore.isInCompare(product.id) ? '담기 완료' : '+ 비교담기' }}
            </button>
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-sm font-semibold"
              :class="productStore.isFavorite(product.id) ? 'border-amber-500 text-amber-600' : 'border-slate-300 text-slate-600'"
              @click="productStore.toggleFavoriteItem(product.id)"
            >
              {{ productStore.isFavorite(product.id) ? '★ 즐겨찾기' : '☆ 즐겨찾기' }}
            </button>
          </div>
        </div>

        <p class="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">{{ product.desc }}</p>

        <div class="mt-6 space-y-3">
          <div v-for="row in tagRows" :key="row.key" class="grid gap-2 border-b border-slate-100 pb-3 md:grid-cols-[110px_1fr]">
            <p class="text-sm font-semibold text-slate-500">{{ row.label }}</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in product.tags[row.key]"
                :key="`${row.key}-${tag}`"
                class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section
      v-if="isSalesRep"
      class="mt-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-base font-bold text-slate-800">영업 피드백</h3>
        <button
          type="button"
          class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="saveNote"
        >
          피드백 저장
        </button>
      </div>
      <textarea
        v-model="noteDraft"
        class="h-28 w-full rounded border border-slate-300 p-3 text-sm"
        placeholder="상품별 영업 피드백을 기록하세요."
      />
    </section>
  </section>

  <section v-else class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
    상품 정보가 없습니다.
  </section>
</template>
