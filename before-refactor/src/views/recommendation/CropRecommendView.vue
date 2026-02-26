<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProductCatalogCard from '@/components/product/ProductCatalogCard.vue'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const productStore = useProductStore()

// TODO: API 연결
const monthData = ref([
  { month: 1, summary: '저온기 관리에 강한 품종 중심으로 추천합니다.', tags: ['저온기', '초세안정', '하우스'], productIds: [1, 4, 5] },
  { month: 2, summary: '정식 준비 시즌, 생육 밸런스가 좋은 품종을 추천합니다.', tags: ['정식준비', '활착', '생육균형'], productIds: [2, 6, 8] },
  { month: 3, summary: '본격 파종/정식 시작, 수량성과 균일도가 좋은 품종을 추천합니다.', tags: ['파종', '정식', '균일도'], productIds: [1, 3, 9] },
  { month: 4, summary: '기온 상승기, 병해 리스크를 고려한 품종을 추천합니다.', tags: ['병해', '내병성', '환기'], productIds: [1, 4, 8] },
  { month: 5, summary: '생육이 빠른 시기, 관리 편의성이 높은 품종을 추천합니다.', tags: ['관리', '생육속도', '하우스'], productIds: [2, 6, 7] },
  { month: 6, summary: '고온기 초입, 스트레스 대응 품종을 추천합니다.', tags: ['고온기', '스트레스', '활착'], productIds: [1, 4, 8] },
  { month: 7, summary: '고온다습, 병해 저항성을 우선한 품종을 추천합니다.', tags: ['고온다습', '병해저항', '환기'], productIds: [1, 5, 8] },
  { month: 8, summary: '작기 전환기, 회복력이 좋은 품종을 추천합니다.', tags: ['작기전환', '회복력', '균일도'], productIds: [2, 3, 9] },
  { month: 9, summary: '가을작기 진입, 수량성과 상품성이 좋은 품종을 추천합니다.', tags: ['가을작기', '상품성', '수량성'], productIds: [5, 7, 9] },
  { month: 10, summary: '일교차 확대, 내한성과 생육 안정 품종을 추천합니다.', tags: ['일교차', '내한성', '안정'], productIds: [3, 5, 7] },
  { month: 11, summary: '저온기 시작, 초기 생육이 안정적인 품종을 추천합니다.', tags: ['저온기', '초기생육', '하우스'], productIds: [2, 4, 6] },
  { month: 12, summary: '연중 최저온, 관리 난이도가 낮은 품종을 추천합니다.', tags: ['최저온', '관리용이', '안정'], productIds: [3, 5, 8] },
])

const selectedMonth = ref(new Date().getMonth() + 1)

const selectedInfo = computed(() => monthData.value.find((item) => item.month === selectedMonth.value) || monthData.value[0])
const selectedProducts = computed(() => (selectedInfo.value.productIds || [])
  .map((id) => productStore.getProductById(id))
  .filter(Boolean))

const moveMonth = (delta) => {
  const next = selectedMonth.value + delta
  if (next < 1 || next > 12) {
    return
  }
  selectedMonth.value = next
}

const goDetail = (id) => {
  router.push(`/products/${id}`)
}
</script>

<template>
  <section class="screen-content">
    <h2 class="screen-title">재배적기 품종 추천</h2>

    <div class="cultivate-wrap">
      <div class="month-bar" aria-label="월 선택 바">
        <button
          v-for="item in monthData"
          :key="item.month"
          type="button"
          class="month-chip"
          :class="{ active: selectedMonth === item.month }"
          @click="selectedMonth = item.month"
        >
          {{ item.month }}월
        </button>
      </div>

      <div class="hint">
        • 상단에서 달을 선택하면 해당 달의 추천 상품 리스트가 아래에 표시됩니다.
      </div>

      <div class="month-feature" tabindex="0" @keydown.left.prevent="moveMonth(-1)" @keydown.right.prevent="moveMonth(1)">
        <div class="month-feature-title">{{ selectedInfo.month }}월 농사 특징</div>
        <div class="month-feature-desc">{{ selectedInfo.summary }}</div>
        <div class="month-feature-tags">
          <span v-for="tag in selectedInfo.tags" :key="tag" class="month-feature-tag">#{{ tag }}</span>
        </div>
      </div>

      <div class="product-panel">
        <div class="product-panel-header">
          <div class="product-panel-title">{{ selectedInfo.month }}월 추천 상품 리스트</div>
        </div>

        <div class="product-grid">
          <ProductCatalogCard
            v-for="item in selectedProducts"
            :key="item.id"
            :item="item"
            :show-compare="false"
            :show-favorite="false"
            @select="goDetail"
          />
        </div>

        <div class="hint" style="margin-top: 12px;">
          • 상품 클릭 시: 상품 상세 조회 페이지로 이동합니다.
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.screen-content { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, .1); min-height: 500px; }
.screen-title { font-size: 24px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ecf0f1; }
.cultivate-wrap { display: flex; flex-direction: column; gap: 18px; }
.month-bar { display: flex; gap: 10px; align-items: center; padding: 12px; border: 1px solid #ecf0f1; border-radius: 10px; background: #fafbfc; overflow-x: auto; }
.month-chip { flex: 0 0 auto; padding: 10px 14px; border: 1px solid #dfe6e9; background: #fff; border-radius: 999px; font-size: 14px; cursor: pointer; }
.month-chip.active { border-color: #3498db; background: rgba(52, 152, 219, 0.10); font-weight: 600; }
.hint { margin-top: 6px; color: #7f8c8d; font-size: 13px; line-height: 1.5; }
.product-panel { border: 1px solid #ecf0f1; border-radius: 12px; background: #fff; padding: 16px; }
.product-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.product-panel-title { font-size: 16px; font-weight: 700; color: #2c3e50; }
.month-feature { border: 1px solid #ecf0f1; border-radius: 12px; background: #f8fbff; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.month-feature-title { font-weight: 700; color: #2c3e50; font-size: 15px; }
.month-feature-desc { color: #51606d; font-size: 13px; line-height: 1.6; }
.month-feature-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.month-feature-tag { padding: 4px 8px; border-radius: 999px; background: #fff; border: 1px solid #dfe6e9; font-size: 12px; color: #3b4a57; }
.product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 920px) { .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .product-grid { grid-template-columns: 1fr; } }
</style>
