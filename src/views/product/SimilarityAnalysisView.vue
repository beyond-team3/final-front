<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useProductStore } from '@/stores/product'

const route = useRoute()
const productStore = useProductStore()

const criteriaRows = [
  { key: 'env', label: '재배환경' },
  { key: 'res', label: '내병성' },
  { key: 'growth', label: '생육 및 숙기' },
  { key: 'quality', label: '과실 품질' },
  { key: 'conv', label: '재배 편의성' },
]

watch(
    () => route.query.base,
    (baseId) => {
      if (!baseId) return
      const product = productStore.getProductById(baseId)
      if (product) productStore.setSelectedBaseProduct(product.id)
    },
    { immediate: true },
)

const baseProduct = computed(() => {
  if (!productStore.selectedBaseProductId) return null
  return productStore.getProductById(productStore.selectedBaseProductId)
})

const similarProducts = computed(() => {
  if (!baseProduct.value) return []
  return productStore.getSimilarProducts(baseProduct.value.id, {
    threshold: productStore.similarityThreshold,
    criteriaKeys: productStore.enabledSimilarityKeys,
  })
})

const graphNodes = computed(() => similarProducts.value.slice(0, 5))

const localCompareIds = ref([])

const isInLocalCompare = (id) => localCompareIds.value.includes(Number(id))

const slotProducts = computed(() => {
  const filled = localCompareIds.value.map((id) => productStore.getProductById(id)).filter(Boolean)
  return [filled[0] || null, filled[1] || null, filled[2] || null]
})

const addToCompare = (productId) => {
  const id = Number(productId)
  if (isInLocalCompare(id)) return
  if (localCompareIds.value.length >= 3) {
    window.alert('최대 3개의 상품만 비교할 수 있습니다.')
    return
  }
  localCompareIds.value.push(id)
}

const addNextToSlot = () => {
  const candidate = similarProducts.value.find((item) => !isInLocalCompare(item.id))
  if (!candidate) {
    window.alert('추가 가능한 유사 상품이 없습니다.')
    return
  }
  addToCompare(candidate.id)
}

const removeFromSlot = (productId) => {
  localCompareIds.value = localCompareIds.value.filter((id) => id !== Number(productId))
}

const resetAll = () => {
  localCompareIds.value = []
  productStore.resetSimilarityOptions()
}

const tagsText = (product, key) => {
  if (!product) return '-'
  const tags = product.tags?.[key] || []
  return tags.length ? tags.join(', ') : '-'
}

const similarityText = (product) => {
  if (!baseProduct.value || !product) return '-'
  return `${productStore.getSimilarityScore(baseProduct.value.id, product.id)}%`
}
</script>

<template>
  <section>
    <PageHeader title="상품 비교 및 유사도 분석" subtitle="기준 상품 선택 후 유사 상품을 비교하세요." />

    <section class="mb-5 rounded-xl border border-slate-200 bg-white p-5">
      <h3 class="mb-3 text-base font-bold text-slate-800">기준 상품 정보 요약</h3>

      <div v-if="baseProduct">
        <div class="mb-3 flex items-center gap-3">
          <div>
            <p class="text-base font-bold text-slate-800">{{ baseProduct.name }}</p>
            <p class="text-xs text-slate-500">{{ baseProduct.category }} · {{ baseProduct.id }}</p>
          </div>
        </div>
        <p class="mb-4 text-sm text-slate-500">{{ baseProduct.desc }}</p>
        <div class="grid gap-3 md:grid-cols-5">
          <div v-for="row in criteriaRows" :key="row.key" class="rounded border border-slate-200 bg-slate-50 p-3">
            <p class="text-xs text-slate-500">{{ row.label }}</p>
            <p class="mt-1 text-sm font-semibold text-slate-700">{{ tagsText(baseProduct, row.key) }}</p>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-slate-400">기준 상품 정보가 없습니다.</p>
    </section>

    <section class="mb-5 grid gap-5 xl:grid-cols-[280px_1fr]">
      <article class="rounded-xl border border-slate-200 bg-white p-4">
        <h3 class="mb-4 text-base font-bold text-slate-800">유사도 분석 기준 설정</h3>
        <div class="space-y-2">
          <label v-for="row in criteriaRows" :key="row.key" class="flex items-center gap-2 text-sm text-slate-700">
            <input
                :checked="productStore.similarityCriteria[row.key]"
                type="checkbox"
                @change="productStore.setSimilarityCriterion(row.key, $event.target.checked)"
            >
            {{ row.label }}
          </label>
        </div>

        <div class="mt-5">
          <div class="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
            <span>유사도 임계값</span>
            <span class="text-blue-600">{{ productStore.similarityThreshold }}%</span>
          </div>
          <input
              :value="productStore.similarityThreshold"
              type="range"
              min="0"
              max="100"
              class="w-full"
              @input="productStore.setSimilarityThreshold($event.target.value)"
          >
        </div>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-4">
        <h3 class="mb-3 text-base font-bold text-slate-800">유사도 네트워크 그래프</h3>
        <div class="overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2">
          <svg viewBox="0 0 800 450" class="h-[420px] w-full min-w-[700px]">
            <line
                v-for="(node, index) in graphNodes"
                :key="`line-${node.id}`"
                x1="400"
                y1="225"
                :x2="[300, 500, 250, 550, 350][index]"
                :y2="[150, 150, 300, 300, 350][index]"
                :class="node.similarity >= 85 ? 'stroke-blue-500 stroke-2' : 'stroke-slate-400 stroke'"
                stroke-opacity="0.7"
            />

            <g transform="translate(400,225)">
              <circle r="30" fill="#667eea" stroke="#5647b8" stroke-width="3" />
              <text y="50" text-anchor="middle" class="fill-slate-700 text-[12px]">{{ baseProduct ? baseProduct.name : '기준 상품' }}</text>
              <text y="64" text-anchor="middle" class="fill-slate-500 text-[10px]">(기준)</text>
            </g>

            <g
                v-for="(node, index) in graphNodes"
                :key="`node-${node.id}`"
                :transform="`translate(${[300, 500, 250, 550, 350][index]}, ${[150, 150, 300, 300, 350][index]})`"
                class="cursor-pointer"
                @click="addToCompare(node.id)"
            >
              <!-- 선택된 경우 외곽 링 표시 -->
              <circle
                  v-if="isInLocalCompare(node.id)"
                  :r="(node.similarity >= 85 ? 24 : node.similarity >= 70 ? 20 : 16) + 7"
                  fill="none"
                  stroke="#22c55e"
                  stroke-width="2.5"
                  stroke-dasharray="4 2"
              />
              <circle
                  :r="node.similarity >= 85 ? 24 : node.similarity >= 70 ? 20 : 16"
                  :fill="isInLocalCompare(node.id) ? '#22c55e' : node.similarity >= 70 ? '#4facfe' : '#95a5a6'"
                  :stroke="isInLocalCompare(node.id) ? '#16a34a' : node.similarity >= 70 ? '#00b7ff' : '#7f8c8d'"
                  stroke-width="2"
              />
              <!-- 선택된 경우 체크 표시 -->
              <text v-if="isInLocalCompare(node.id)" text-anchor="middle" dominant-baseline="middle" class="fill-white text-[13px]" font-weight="bold">✓</text>
              <text y="38" text-anchor="middle" class="fill-slate-700 text-[11px]">{{ node.name }}</text>
              <text y="50" text-anchor="middle" class="fill-slate-500 text-[10px]">유사도 {{ node.similarity }}%</text>
            </g>
          </svg>
        </div>
      </article>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-800">비교 상품 선택 + 상품 비교 결과</h3>
        <button
            type="button"
            class="rounded border-2 border-red-400 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            @click="resetAll"
        >
          전체 초기화
        </button>
      </div>

      <div class="mb-4 grid gap-3 md:grid-cols-3">
        <div
            v-for="(slot, idx) in slotProducts"
            :key="idx"
            class="min-h-20 rounded-lg border-2 border-dashed border-slate-300 p-3"
        >
          <div v-if="slot" class="relative h-full">
            <p class="pr-6 text-sm font-semibold text-slate-800">{{ slot.name }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ slot.category }}</p>
            <button
                type="button"
                class="absolute right-0 top-0 h-6 w-6 rounded-full bg-slate-200 text-xs"
                @click="removeFromSlot(slot.id)"
            >
              ×
            </button>
          </div>
          <button
              v-else
              type="button"
              class="h-full w-full text-sm text-slate-500"
              @click="addNextToSlot"
          >
            + 상품 추가
          </button>
        </div>
      </div>

      <div class="overflow-x-auto rounded border border-slate-200">
        <table class="min-w-full border-collapse text-sm">
          <thead>
          <tr class="bg-slate-700 text-left text-white">
            <th class="px-4 py-3">비교 항목</th>
            <th class="px-4 py-3">{{ baseProduct ? `${baseProduct.name} (기준)` : '-' }}</th>
            <th class="px-4 py-3">{{ slotProducts[0]?.name || '비교 상품 1' }}</th>
            <th class="px-4 py-3">{{ slotProducts[1]?.name || '비교 상품 2' }}</th>
            <th class="px-4 py-3">{{ slotProducts[2]?.name || '비교 상품 3' }}</th>
          </tr>
          </thead>
          <tbody>
          <tr class="border-t border-slate-100">
            <td class="bg-slate-100 px-4 py-3 font-semibold">품종명</td>
            <td class="px-4 py-3">{{ baseProduct?.name || '-' }}</td>
            <td class="px-4 py-3">{{ slotProducts[0]?.name || '-' }}</td>
            <td class="px-4 py-3">{{ slotProducts[1]?.name || '-' }}</td>
            <td class="px-4 py-3">{{ slotProducts[2]?.name || '-' }}</td>
          </tr>
          <tr class="border-t border-slate-100">
            <td class="bg-slate-100 px-4 py-3 font-semibold">품종 특징</td>
            <td class="px-4 py-3">{{ tagsText(baseProduct, 'quality') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[0], 'quality') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[1], 'quality') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[2], 'quality') }}</td>
          </tr>
          <tr class="border-t border-slate-100">
            <td class="bg-slate-100 px-4 py-3 font-semibold">재배 적기</td>
            <td class="px-4 py-3">{{ tagsText(baseProduct, 'growth') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[0], 'growth') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[1], 'growth') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[2], 'growth') }}</td>
          </tr>
          <tr class="border-t border-slate-100">
            <td class="bg-slate-100 px-4 py-3 font-semibold">병해충 내성</td>
            <td class="px-4 py-3">{{ tagsText(baseProduct, 'res') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[0], 'res') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[1], 'res') }}</td>
            <td class="px-4 py-3">{{ tagsText(slotProducts[2], 'res') }}</td>
          </tr>
          <tr class="border-t border-slate-100">
            <td class="bg-slate-100 px-4 py-3 font-semibold">기준 대비 유사도</td>
            <td class="px-4 py-3">100%</td>
            <td class="px-4 py-3">{{ similarityText(slotProducts[0]) }}</td>
            <td class="px-4 py-3">{{ similarityText(slotProducts[1]) }}</td>
            <td class="px-4 py-3">{{ similarityText(slotProducts[2]) }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>