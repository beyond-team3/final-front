<script setup>
import { computed, ref, watch } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const props = defineProps({
  month: {
    type: Number,
    default: null,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  nextMonth: {
    type: Number,
    default: null,
  },
  clients: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  errorStatus: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['retry', 'select-client'])

const failedImageMap = ref({})
const rawClients = computed(() => (Array.isArray(props.clients) ? props.clients : []))

const visibleClients = computed(() => (
  rawClients.value
    .map((client) => ({
      ...client,
      crops: Array.isArray(client?.crops)
        ? client.crops.filter((crop) => Array.isArray(crop?.matchedProducts) && crop.matchedProducts.length > 0)
        : [],
    }))
    .filter((client) => client.crops.length > 0)
))
const hasFilteredOutContent = computed(() => rawClients.value.length > 0 && visibleClients.value.length === 0)

const markImageFailed = (productId) => {
  if (productId == null) {
    return
  }

  failedImageMap.value = {
    ...failedImageMap.value,
    [productId]: true,
  }
}

const hasValidImage = (product) => Boolean(product?.imageUrl) && !failedImageMap.value[product.productId]

watch(
  () => [props.month, props.nextMonth, visibleClients.value.length],
  () => {
    failedImageMap.value = {}
  },
)
</script>

<template>
  <section class="calendar-section-card" :class="{ compact }">
    <div class="calendar-section-header">
      <div>
        <h3 class="calendar-section-title">수확 임박 품종</h3>
        <p class="calendar-section-subtitle">
          {{ month }}월 기준{{ nextMonth ? `, ${nextMonth}월까지 수확 일정` : '' }}을 확인하세요.
        </p>
      </div>
    </div>

    <div class="calendar-section-body">
      <LoadingSpinner v-if="loading" text="수확 임박 품종을 불러오는 중입니다." />

      <div v-else-if="errorStatus === 403" class="section-feedback is-muted">
        수확 임박 품종 조회 권한이 없습니다.
      </div>

      <ErrorMessage
        v-else-if="errorMessage"
        :message="errorMessage"
        retry-label="수확 임박 다시 시도"
        @retry="emit('retry')"
      />

      <div v-else-if="hasFilteredOutContent" class="section-feedback is-muted">
        수확 임박 대상 거래처는 조회됐지만, 표시할 매칭 품종이 없어 목록이 비어 있습니다.
      </div>

      <EmptyState
        v-else-if="visibleClients.length === 0"
        title="수확 임박 품종이 없습니다."
        description=""
      />

      <div v-else class="harvest-client-list">
        <article
          v-for="client in visibleClients"
          :key="client.clientId"
          class="client-group"
        >
          <div class="client-group-header">
            <div>
              <h4 class="client-name">{{ client.clientName }}</h4>
              <p class="client-caption">취급 품종 기준 수확 임박 목록</p>
            </div>
            <button
              v-if="client.clientId"
              type="button"
              class="client-link-btn"
              @click="emit('select-client', client.clientId)"
            >
              거래처 보기
            </button>
          </div>

          <div class="crop-list">
            <section
              v-for="crop in client.crops"
              :key="`${client.clientId}-${crop.cropName}`"
              class="crop-group"
            >
              <h5 class="crop-name">{{ crop.cropName }}</h5>

              <div class="product-list">
                <article
                  v-for="product in crop.matchedProducts"
                  :key="product.productId"
                  class="product-card"
                >
                  <div class="product-image-wrap">
                    <img
                      v-if="hasValidImage(product)"
                      :src="product.imageUrl"
                      :alt="product.productName"
                      class="product-image"
                      @error="markImageFailed(product.productId)"
                    >
                    <div v-else class="product-image placeholder">
                      <span>{{ product.productCategoryLabel || crop.cropName || '품종' }}</span>
                    </div>
                  </div>

                  <div class="product-content">
                    <div class="product-category">{{ product.productCategoryLabel || '-' }}</div>
                    <h6 class="product-name">{{ product.productName }}</h6>
                    <p class="product-period">
                      수확 시작 {{ product.harvestingStart ?? '-' }}월 / 종료 {{ product.harvestingEnd ?? '-' }}월
                    </p>
                    <div v-if="product.croppingSystem || product.region" class="product-meta">
                      <span v-if="product.croppingSystem" class="meta-chip">{{ product.croppingSystem }}</span>
                      <span v-if="product.region" class="meta-chip">{{ product.region }}</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calendar-section-card {
  border: 1px solid var(--color-border-card, #DDD7CE);
  border-radius: 12px;
  background: var(--color-bg-input, #FAF7F3);
  overflow: hidden;
}

.calendar-section-card.compact .calendar-section-header {
  padding: 14px 16px;
}

.calendar-section-card.compact .calendar-section-title {
  font-size: 15px;
}

.calendar-section-card.compact .calendar-section-body {
  padding: 14px 16px 16px;
}

.calendar-section-header {
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
  background: var(--color-bg-section, #EFEADF);
}

.calendar-section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.calendar-section-subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-sub, #9A8C7E);
}

.calendar-section-body {
  padding: 18px;
}

.section-feedback {
  padding: 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}

.section-feedback.is-muted {
  border: 1px solid rgba(221, 215, 206, 0.9);
  background: var(--color-bg-section, #EFEADF);
  color: var(--color-text-sub, #9A8C7E);
}

.harvest-client-list {
  display: grid;
  gap: 16px;
}

.client-group {
  border: 1px solid var(--color-border-divider, #E8E3D8);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(250, 247, 243, 0.96) 0%, rgba(239, 234, 223, 0.92) 100%);
  padding: 18px;
}

.calendar-section-card.compact .client-group {
  padding: 12px;
  border-radius: 12px;
}

.client-group-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(221, 215, 206, 0.8);
}

.client-name {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.calendar-section-card.compact .client-name {
  font-size: 15px;
}

.client-caption {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-sub, #9A8C7E);
}

.client-link-btn {
  border: 1px solid var(--color-orange-light, #F0C9A8);
  border-radius: 10px;
  background: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
  font-size: 12px;
  font-weight: 800;
  padding: 10px 12px;
  cursor: pointer;
}

.calendar-section-card.compact .client-link-btn {
  padding: 8px 10px;
}

.crop-list {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.crop-group {
  display: grid;
  gap: 10px;
}

.crop-name {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-text-body, #6B5F50);
}

.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.calendar-section-card.compact .product-list {
  grid-template-columns: 1fr;
  gap: 10px;
}

.product-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(221, 215, 206, 0.9);
  background: rgba(255, 255, 255, 0.64);
}

.calendar-section-card.compact .product-card {
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
}

.product-image {
  width: 92px;
  height: 92px;
  display: block;
  border-radius: 12px;
  object-fit: cover;
  background: var(--color-bg-section, #EFEADF);
}

.calendar-section-card.compact .product-image {
  width: 72px;
  height: 72px;
  border-radius: 10px;
}

.product-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-border-card, #DDD7CE);
  color: var(--color-text-sub, #9A8C7E);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  padding: 8px;
}

.product-content {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.product-category {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
  font-size: 11px;
  font-weight: 800;
}

.product-name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.calendar-section-card.compact .product-name {
  font-size: 14px;
}

.product-period {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-orange-dark, #A34E20);
}

.calendar-section-card.compact .product-period {
  font-size: 12px;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-text-sub, #9A8C7E);
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 640px) {
  .calendar-section-header,
  .calendar-section-body,
  .client-group {
    padding: 14px;
  }

  .client-group-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .product-card {
    grid-template-columns: 1fr;
  }

  .product-image {
    width: 100%;
    height: 180px;
  }
}
</style>
