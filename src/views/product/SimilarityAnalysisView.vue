<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import CedarCheckbox from '@/components/common/CedarCheckbox.vue'
import { useProductStore } from '@/stores/product'
import { getSimilarProducts as getSimilarProductsApi } from '@/api/product'

const route = useRoute()
const productStore = useProductStore()

onMounted(async () => {
  if (productStore.products.length === 0) {
    await productStore.fetchProducts()
  }

  const rawBase = Array.isArray(route.query.base) ? route.query.base[0] : route.query.base
  if (rawBase) {
    productStore.setSelectedBaseProduct(Number(rawBase))
  }


  if (baseProduct.value) {
    fetchSimilarProductsFromApi()
  }
})

const criteriaRows = [
  { key: '재배환경', label: '재배환경' },
  { key: '내병성', label: '내병성' },
  { key: '생육및숙기', label: '생육 및 숙기' },
  { key: '과실품질', label: '과실 품질' },
  { key: '재배편의성', label: '재배 편의성' },
]
const criteriaKeys = criteriaRows.map((row) => row.key)

const selectedKeys = computed({
  get() {
    return new Set(criteriaKeys.filter((key) => productStore.similarityCriteria[key]))
  },
  set(nextSet) {
    criteriaKeys.forEach((key) => {
      productStore.setSimilarityCriterion(key, nextSet.has(key))
    })
  },
})

const allChecked = computed({
  get() {
    return selectedKeys.value.size === criteriaKeys.length
  },
  set(checked) {
    selectedKeys.value = checked ? new Set(criteriaKeys) : new Set()
  },
})

const isIndeterminate = computed(() =>
    selectedKeys.value.size > 0 && selectedKeys.value.size < criteriaKeys.length
)

function onCriterionChange(key, checked) {
  const next = new Set(selectedKeys.value)
  if (checked) next.add(key)
  else next.delete(key)
  selectedKeys.value = next
}

function onToggleAllCriteria(checked) {
  allChecked.value = checked
}

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

// ✅ API 유사 상품 조회
const apiSimilarProducts = ref([])
const loadingSimilar = ref(false)

// race condition 방지용 요청 카운터
let requestId = 0

const fetchSimilarProductsFromApi = async () => {
  if (!baseProduct.value) return

  const currentId = ++requestId
  loadingSimilar.value = true

  try {
    const criteria = productStore.enabledSimilarityKeys
    const response = await getSimilarProductsApi(baseProduct.value.id, {
      limit: 5,
      threshold: productStore.similarityThreshold,
      criteria: criteria.length > 0 ? criteria : undefined
    })
    // 가장 마지막 요청의 응답만 반영
    if (currentId === requestId) {
      apiSimilarProducts.value = response?.similarProducts || []
    }
  } catch (error) {
    if (currentId === requestId) {
      console.error('유사 상품 조회 실패:', error)
      apiSimilarProducts.value = []
    }
  } finally {
    if (currentId === requestId) {
      loadingSimilar.value = false
    }
  }
}

watch(
    [
      () => baseProduct.value?.id,
      () => productStore.similarityThreshold,
      () => [...productStore.enabledSimilarityKeys], // 배열 복사로 참조 변경 감지
    ],
    () => {
      if (baseProduct.value) {
        fetchSimilarProductsFromApi()
      }
    },
    { deep: true }
)

const graphNodes = computed(() => {
  return apiSimilarProducts.value.slice(0, 5).map((node) => ({
    graphProductId: Number(node.productId),
    productName: node.productName,
    similarityScore: node.similarityScore,
  }))
})

const localCompareIds = ref([])

const isInLocalCompare = (id) => localCompareIds.value.includes(Number(id))

const slotProducts = computed(() => {
  const filled = localCompareIds.value.map((id) => productStore.getProductById(id)).filter(Boolean)
  return [filled[0] || null, filled[1] || null, filled[2] || null]
})

const addToCompare = (productId) => {
  const id = Number(productId)
  // store products에서 실제로 존재하는지 확인 후 추가
  const product = productStore.getProductById(id)
  if (!product) return
  if (isInLocalCompare(id)) return
  if (localCompareIds.value.length >= 3) {
    window.alert('최대 3개의 상품만 비교할 수 있습니다.')
    return
  }
  localCompareIds.value.push(Number(product.id))
}

const addNextToSlot = () => {
  // graphNodes 기준으로 후보 탐색 (현재 그래프에 표시된 상품 중에서)
  const candidate = graphNodes.value.find((node) => !isInLocalCompare(node.graphProductId))
  if (!candidate) {
    window.alert('추가 가능한 유사 상품이 없습니다.')
    return
  }
  addToCompare(candidate.graphProductId)
}

const removeFromSlot = (productId) => {
  localCompareIds.value = localCompareIds.value.filter((id) => id !== Number(productId))
}

const resetAll = () => {
  localCompareIds.value = []
  productStore.resetSimilarityOptions()
}

const TAG_KEY_MAP = {
  '재배환경': 'env',
  '내병성': 'res',
  '생육및숙기': 'growth',
  '과실품질': 'quality',
  '재배편의성': 'conv',
}

const tagsText = (product, key) => {
  if (!product) return '-'
  // 한글 키로 먼저 찾고, 없으면 영문 키로 fallback
  const tags = product.tags?.[key] || product.tags?.[TAG_KEY_MAP[key]] || []
  return tags.length ? tags.join(', ') : '-'
}

const similarityText = (product) => {
  if (!baseProduct.value || !product) return '-'
  return `${productStore.getSimilarityScore(baseProduct.value.id, product.id)}%`
}
</script>

<template>
  <section style="background-color: #EDE8DF; min-height: 100vh;" class="p-6">
    <PageHeader title="상품 비교 및 유사도 분석" subtitle="기준 상품 선택 후 유사 상품을 비교하세요." />

    <!-- 기준 상품 정보 -->
    <section class="mb-5 rounded-lg border p-5" style="border-color: #DDD7CE; background-color: white;">
      <h3 class="mb-3 text-base font-bold" style="color: #3D3529;">기준 상품 정보 요약</h3>

      <div v-if="baseProduct">
        <div class="mb-3 flex items-center gap-3">
          <div>
            <p class="text-base font-bold" style="color: #3D3529;">{{ baseProduct.name }}</p>
            <p class="text-xs" style="color: #9A8C7E;">{{ baseProduct.category }} · {{ baseProduct.id }}</p>
          </div>
        </div>
        <p class="mb-4 text-sm" style="color: #6B5F50;">{{ baseProduct.desc }}</p>
        <div class="grid gap-3 md:grid-cols-5">
          <div v-for="row in criteriaRows" :key="row.key" class="rounded border p-3" style="border-color: #DDD7CE; background-color: #EFEADF;">
            <p class="text-xs" style="color: #6B5F50;">{{ row.label }}</p>
            <p class="mt-1 text-sm font-semibold" style="color: #3D3529;">{{ tagsText(baseProduct, row.key) }}</p>
          </div>
        </div>
      </div>
      <p v-else class="text-sm" style="color: #BFB3A5;">기준 상품 정보가 없습니다.</p>
    </section>

    <!-- 왼쪽: 기준 설정, 오른쪽: 그래프 -->
    <section class="mb-5 grid gap-5 xl:grid-cols-[280px_1fr]">
      <!-- 유사도 분석 기준 설정 -->
      <article class="rounded-lg border p-4" style="border-color: #DDD7CE; background-color: white;">
        <h3 class="mb-4 text-base font-bold" style="color: #3D3529;">유사도 분석 기준 설정</h3>
        <div class="space-y-2">
          <CedarCheckbox
              id="criteria-all"
              label="전체 선택"
              :model-value="allChecked"
              :indeterminate="isIndeterminate"
              @update:model-value="onToggleAllCriteria"
          />

          <CedarCheckbox
              v-for="row in criteriaRows"
              :id="`criteria-${row.key}`"
              :key="row.key"
              :label="row.label"
              :model-value="selectedKeys.has(row.key)"
              @update:model-value="(checked) => onCriterionChange(row.key, checked)"
          />
        </div>

        <div class="mt-5">
          <div class="mb-1 flex items-center justify-between text-sm font-medium" style="color: #3D3529;">
            <span>유사도 임계값</span>
            <span style="color: #7A8C42;">{{ productStore.similarityThreshold }}%</span>
          </div>
          <input
              :value="productStore.similarityThreshold"
              type="range"
              min="0"
              max="100"
              class="w-full"
              style="accent-color: #7A8C42;"
              @input="productStore.setSimilarityThreshold($event.target.value)"
          >
        </div>
      </article>

      <!-- 유사도 네트워크 그래프 -->
      <article class="rounded-lg border p-4" style="border-color: #DDD7CE; background-color: white;">
        <h3 class="mb-3 text-base font-bold" style="color: #3D3529;">유사도 네트워크 그래프</h3>
        <div v-if="loadingSimilar" class="flex items-center justify-center py-32" style="color: #9A8C7E;">
          <p>유사 상품 분석 중...</p>
        </div>
        <div v-else class="overflow-x-auto rounded border p-2" style="border-color: #DDD7CE; background-color: #EFEADF;">
          <svg viewBox="0 0 800 450" class="h-[420px] w-full min-w-[700px]">
            <!-- 연결선 -->
            <line
                v-for="(node, index) in graphNodes"
                :key="`line-${node.graphProductId}`"
                x1="400"
                y1="225"
                :x2="[300, 500, 250, 550, 350][index]"
                :y2="[150, 150, 300, 300, 350][index]"
                :stroke="node.similarityScore >= 75 ? '#7A8C42' : '#DDD7CE'"
                :stroke-width="node.similarityScore >= 75 ? 2 : 1"
                stroke-opacity="0.7"
            />

            <!-- 기준 상품 -->
            <g transform="translate(400,225)">
              <circle r="30" fill="#C8622A" stroke="#A84F21" stroke-width="3" />
              <text y="50" text-anchor="middle" class="text-[12px]" fill="#3D3529">{{ baseProduct ? baseProduct.name : '기준 상품' }}</text>
              <text y="64" text-anchor="middle" class="text-[10px]" fill="#6B5F50">(기준)</text>
            </g>

            <!-- 유사 상품들 -->
            <g
                v-for="(node, index) in graphNodes"
                :key="`node-${node.graphProductId}`"
                :transform="`translate(${[300, 500, 250, 550, 350][index]}, ${[150, 150, 300, 300, 350][index]})`"
                class="cursor-pointer"
                @click="addToCompare(node.graphProductId)"
            >
              <!-- 선택된 경우 외곽 링 표시 -->
              <circle
                  v-if="isInLocalCompare(node.graphProductId)"
                  :r="(node.similarityScore >= 85 ? 24 : node.similarityScore >= 65 ? 20 : 16) + 7"
                  fill="none"
                  stroke="#7A8C42"
                  stroke-width="2.5"
                  stroke-dasharray="4 2"
              />
              <!-- ✅ 클릭 전까지 항상 회색, 클릭 후 초록색 -->
              <circle
                  :r="node.similarityScore >= 85 ? 24 : node.similarityScore >= 65 ? 20 : 16"
                  :fill="isInLocalCompare(node.graphProductId) ? '#7A8C42' : '#DDD7CE'"
                  :stroke="isInLocalCompare(node.graphProductId) ? '#5F7033' : '#BFB3A5'"
                  stroke-width="2"
              />
              <!-- 선택된 경우 체크 표시 -->
              <text v-if="isInLocalCompare(node.graphProductId)" text-anchor="middle" dominant-baseline="middle" class="fill-white text-[13px]" font-weight="bold">✓</text>
              <text y="38" text-anchor="middle" class="text-[11px]" fill="#3D3529">{{ node.productName }}</text>
              <text y="50" text-anchor="middle" class="text-[10px]" fill="#6B5F50">유사도 {{ node.similarityScore }}%</text>
            </g>
          </svg>
        </div>
      </article>
    </section>

    <!-- 비교 상품 선택 + 결과 -->
    <section class="rounded-lg border p-4" style="border-color: #DDD7CE; background-color: white;">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-base font-bold" style="color: #3D3529;">비교 상품 선택 + 상품 비교 결과</h3>
        <button
            type="button"
            class="rounded px-4 py-1.5 text-sm font-semibold"
            style="border: 1px solid #DDD7CE; background-color: transparent; color: #6B5F50;"
            @click="resetAll"
        >
          전체 초기화
        </button>
      </div>

      <!-- 비교 슬롯 -->
      <div class="mb-4 grid gap-3 md:grid-cols-3">
        <div
            v-for="(slot, idx) in slotProducts"
            :key="idx"
            class="min-h-20 rounded-lg border-2 p-3"
            style="border-color: #DDD7CE; border-style: dashed; background-color: #FAF7F3;"
        >
          <div v-if="slot" class="relative h-full">
            <p class="pr-6 text-sm font-semibold" style="color: #3D3529;">{{ slot.name }}</p>
            <p class="mt-1 text-xs" style="color: #9A8C7E;">{{ slot.category }}</p>
            <button
                type="button"
                class="absolute right-0 top-0 h-6 w-6 rounded-full text-xs"
                style="background-color: #DDD7CE; color: #6B5F50;"
                @click="removeFromSlot(slot.id)"
            >
              ×
            </button>
          </div>
          <button
              v-else
              type="button"
              class="h-full w-full text-sm"
              style="color: #9A8C7E;"
              @click="addNextToSlot"
          >
            + 상품 추가
          </button>
        </div>
      </div>

      <!-- 비교 테이블 -->
      <div class="overflow-x-auto rounded border" style="border-color: #DDD7CE;">
        <table class="min-w-full border-collapse text-sm">
          <thead>
          <tr style="background-color: #3D3529; color: white;">
            <th class="px-4 py-3 text-left">비교 항목</th>
            <th class="px-4 py-3 text-left">{{ baseProduct ? `${baseProduct.name} (기준)` : '-' }}</th>
            <th class="px-4 py-3 text-left">{{ slotProducts[0]?.name || '비교 상품 1' }}</th>
            <th class="px-4 py-3 text-left">{{ slotProducts[1]?.name || '비교 상품 2' }}</th>
            <th class="px-4 py-3 text-left">{{ slotProducts[2]?.name || '비교 상품 3' }}</th>
          </tr>
          </thead>
          <tbody>
          <tr style="border-top: 1px solid #DDD7CE;">
            <td class="px-4 py-3 font-semibold" style="background-color: #EFEADF; color: #3D3529;">품종명</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ baseProduct?.name || '-' }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ slotProducts[0]?.name || '-' }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ slotProducts[1]?.name || '-' }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ slotProducts[2]?.name || '-' }}</td>
          </tr>
          <tr style="border-top: 1px solid #DDD7CE;">
            <td class="px-4 py-3 font-semibold" style="background-color: #EFEADF; color: #3D3529;">품종 특징</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(baseProduct, '과실품질') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[0], '과실품질') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[1], '과실품질') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[2], '과실품질') }}</td>
          </tr>
          <tr style="border-top: 1px solid #DDD7CE;">
            <td class="px-4 py-3 font-semibold" style="background-color: #EFEADF; color: #3D3529;">재배 적기</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(baseProduct, '생육및숙기') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[0], '생육및숙기') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[1], '생육및숙기') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[2], '생육및숙기') }}</td>
          </tr>
          <tr style="border-top: 1px solid #DDD7CE;">
            <td class="px-4 py-3 font-semibold" style="background-color: #EFEADF; color: #3D3529;">병해충 내성</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(baseProduct, '내병성') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[0], '내병성') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[1], '내병성') }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ tagsText(slotProducts[2], '내병성') }}</td>
          </tr>
          <tr style="border-top: 1px solid #DDD7CE;">
            <td class="px-4 py-3 font-semibold" style="background-color: #EFEADF; color: #3D3529;">기준 대비 유사도</td>
            <td class="px-4 py-3" style="color: #3D3529;">100%</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ similarityText(slotProducts[0]) }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ similarityText(slotProducts[1]) }}</td>
            <td class="px-4 py-3" style="color: #3D3529;">{{ similarityText(slotProducts[2]) }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>