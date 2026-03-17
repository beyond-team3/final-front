<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const productStore = useProductStore()

onMounted(async () => {
  const tasks = []
  if (productStore.products.length === 0) {
    tasks.push(productStore.fetchProducts())
  }
  tasks.push(productStore.fetchCompareList())
  await Promise.all(tasks)
})

const labelRows = [
  { key: 'env', label: '재배환경' },
  { key: 'res', label: '내병성' },
  { key: 'growth', label: '생육 및 숙기' },
  { key: 'quality', label: '과실 품질' },
  { key: 'conv', label: '재배 편의성' },
]

const compareProducts = computed(() => productStore.compareProducts)

const emptySlotCount = computed(() => Math.max(0, 3 - productStore.compareProducts.length))

const clearCompare = () => {
  if (window.confirm('비교함을 모두 비우시겠습니까?')) {
    productStore.clearCompareItems()
    router.push('/products/catalog')
  }
}

const removeCompare = async (id) => {
  await productStore.removeCompareItem(id)
}

const saveCompare = async () => {
  if (productStore.compareItems.length < 2) {
    window.alert('비교하려면 최소 2개 이상의 상품이 있어야 합니다.')
    return
  }
  let title = window.prompt('비교 내역의 제목을 입력해주세요.', '새 비교 내역')
  if (title === null) return

  title = title.trim()
  if (title === '') {
    window.alert('유효한 제목을 입력해주세요.')
    return
  }

  const ok = await productStore.saveCompareHistoryToBackend(title)
  if (ok) {
    window.alert('비교 내역이 저장되었습니다.')
  } else {
    window.alert('저장에 실패했습니다.')
  }
}

const deleteHistory = async (id) => {
  if (window.confirm('저장된 비교 내역을 삭제하시겠습니까?')) {
    await productStore.deleteCompareHistory(id)
  }
}
</script>

<template>
  <section>
    <PageHeader title="품종 비교함">
      <template #actions>
        <button
          type="button"
          class="rounded border border-[var(--color-olive)] bg-[var(--color-olive-light)] px-3 py-2 text-sm font-semibold text-[var(--color-olive-dark)] hover:opacity-80"
          @click="saveCompare"
        >
          현재 비교 저장
        </button>
        <button
          type="button"
          class="rounded border border-[var(--color-border-card)] px-3 py-2 text-sm font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]"
          @click="router.push('/products/catalog')"
        >
          목록으로
        </button>
        <button
          type="button"
          class="rounded border border-transparent bg-[#F0D4D4] px-3 py-2 text-sm font-semibold text-[var(--color-status-error)] hover:opacity-80"
          @click="clearCompare"
        >
          비교함 비우기
        </button>
      </template>
    </PageHeader>

    <div class="overflow-x-auto rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]">
      <div class="grid min-w-[980px] grid-cols-[190px_repeat(3,minmax(240px,1fr))]">
        <div class="border-r border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-4">
          <div class="mb-6 h-44 rounded-lg bg-[var(--color-bg-section)] p-3 text-sm font-semibold text-[var(--color-text-sub)]">품종정보</div>
          <div v-for="row in labelRows" :key="row.key" class="flex min-h-20 items-center border-t border-[var(--color-border-divider)] py-2 text-sm font-semibold text-[var(--color-text-sub)]">
            {{ row.label }}
          </div>
        </div>

        <div
          v-for="product in compareProducts"
          :key="product.id"
          class="border-r border-[var(--color-border-card)] p-4 last:border-r-0"
        >
          <div class="relative mb-4 rounded-lg border border-[var(--color-border-card)] p-3">
            <button
              type="button"
              class="absolute right-2 top-2 rounded-full border border-[var(--color-border-card)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-placeholder)] hover:bg-[var(--color-bg-section)]"
              @click="removeCompare(product.id)"
            >
              x
            </button>
            <p class="text-xs font-semibold text-[var(--color-olive)]">{{ product.category }}</p>
            <img :src="product.imageUrl" :alt="product.name" class="mt-2 h-24 w-full rounded object-cover" />
            <p class="mt-2 text-sm font-bold text-[var(--color-text-strong)]">{{ product.name }}</p>
          </div>

          <div v-for="row in labelRows" :key="`${product.id}-${row.key}`" class="flex min-h-20 flex-wrap items-center gap-2 border-t border-[var(--color-border-divider)] py-2">
            <span
              v-for="tag in ((product.tags || {})[row.key] || [])"
              :key="`${product.id}-${row.key}-${tag}`"
              class="rounded-full bg-[var(--color-bg-section)] px-3 py-1 text-xs font-semibold text-[var(--color-text-body)]"
            >
              {{ tag }}
            </span>
            <span v-if="!((product.tags || {})[row.key] || []).length" class="text-xs text-[var(--color-text-placeholder)]">-</span>
          </div>
        </div>

        <div v-for="slot in emptySlotCount" :key="`slot-${slot}`" class="border-r border-[var(--color-border-card)] p-4 last:border-r-0">
          <div class="mb-4 flex h-44 items-center justify-center rounded-lg border border-dashed border-[var(--color-border-card)] bg-[var(--color-bg-input)] text-sm font-semibold text-[var(--color-text-placeholder)]">
            비교할 품종을 담아보세요
          </div>
          <div v-for="row in labelRows" :key="`slot-${slot}-${row.key}`" class="min-h-20 border-t border-[var(--color-border-divider)]" />
        </div>
      </div>
    </div>
    <section v-if="productStore.compareHistories && productStore.compareHistories.length > 0" class="mt-8 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6">
      <h3 class="mb-4 text-base font-bold text-[var(--color-text-strong)]">나의 저장된 비교 내역</h3>
      <div class="space-y-3">
        <div v-for="history in productStore.compareHistories" :key="history.compareId" class="flex items-center justify-between rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] p-4">
          <div>
            <p class="font-bold text-[var(--color-text-strong)] text-sm">{{ history.title || '비교 내역' }}</p>
            <p class="text-xs font-semibold text-[var(--color-text-placeholder)] mt-1">{{ (history.products || []).map(p => p?.name).filter(Boolean).join(' vs ') }}</p>
            <p class="text-xs text-[var(--color-text-placeholder)] mt-1">{{ history.createdAt ? new Date(history.createdAt).toLocaleString() : '' }}</p>
          </div>
          <button type="button" class="rounded px-3 py-1 text-xs font-semibold text-[var(--color-status-error)] hover:bg-red-50 border border-red-200 bg-[var(--color-bg-card)]" @click="deleteHistory(history.compareId)">
            삭제
          </button>
        </div>
      </div>
    </section>
  </section>
</template>
