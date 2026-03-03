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
    <PageHeader title="품종 비교(관리자)">
      <template #actions>
        <button
          type="button"
          class="rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          @click="saveCompare"
        >
          현재 비교 저장
        </button>
        <button
          type="button"
          class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="router.push('/products/catalog')"
        >
          목록으로
        </button>
        <button
          type="button"
          class="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          @click="clearCompare"
        >
          비교함 비우기
        </button>
      </template>
    </PageHeader>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div class="grid min-w-[980px] grid-cols-[190px_repeat(3,minmax(240px,1fr))]">
        <div class="border-r border-slate-200 bg-slate-50 p-4">
          <div class="mb-6 h-44 rounded-lg bg-slate-100 p-3 text-sm font-semibold text-slate-600">상품정보</div>
          <div v-for="row in labelRows" :key="row.key" class="flex min-h-20 items-center border-t border-slate-100 py-2 text-sm font-semibold text-slate-600">
            {{ row.label }}
          </div>
        </div>

        <div
          v-for="product in compareProducts"
          :key="product.id"
          class="border-r border-slate-200 p-4 last:border-r-0"
        >
          <div class="relative mb-4 rounded-lg border border-slate-200 p-3">
            <button
              type="button"
              class="absolute right-2 top-2 rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              @click="removeCompare(product.id)"
            >
              ×
            </button>
            <p class="text-xs font-semibold text-blue-600">{{ product.category }}</p>
            <img :src="product.imageUrl" :alt="product.name" class="mt-2 h-24 w-full rounded object-cover" />
            <p class="mt-2 text-sm font-bold text-slate-800">{{ product.name }}</p>
          </div>

          <div v-for="row in labelRows" :key="`${product.id}-${row.key}`" class="flex min-h-20 flex-wrap items-center gap-2 border-t border-slate-100 py-2">
            <span
              v-for="tag in product.tags[row.key]"
              :key="`${product.id}-${row.key}-${tag}`"
              class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {{ tag }}
            </span>
            <span v-if="(product.tags[row.key] || []).length === 0" class="text-xs text-slate-300">-</span>
          </div>
        </div>

        <div v-for="slot in emptySlotCount" :key="`slot-${slot}`" class="border-r border-slate-200 p-4 last:border-r-0">
          <div class="mb-4 flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400">
            비교할 상품을 담아보세요
          </div>
          <div v-for="row in labelRows" :key="`slot-${slot}-${row.key}`" class="min-h-20 border-t border-slate-100" />
        </div>
      </div>
    </div>
    <section v-if="productStore.compareHistories && productStore.compareHistories.length > 0" class="mt-8 rounded-xl border border-slate-200 bg-white p-6">
      <h3 class="mb-4 text-base font-bold text-slate-800">나의 저장된 비교 내역</h3>
      <div class="space-y-3">
        <div v-for="history in productStore.compareHistories" :key="history.compareId" class="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div>
            <p class="font-bold text-slate-800 text-sm">{{ history.title || '비교 내역' }}</p>
            <p class="text-xs font-semibold text-slate-500 mt-1">{{ (history.products || []).map(p => p?.name).filter(Boolean).join(' vs ') }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ history.createdAt ? new Date(history.createdAt).toLocaleString() : '' }}</p>
          </div>
          <button type="button" class="rounded px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-200 bg-white" @click="deleteHistory(history.compareId)">
            삭제
          </button>
        </div>
      </div>
    </section>
  </section>
</template>
