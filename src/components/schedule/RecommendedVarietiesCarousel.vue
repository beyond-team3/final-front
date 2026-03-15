<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  items: {
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

const emit = defineEmits(['retry', 'select-product'])

const activeIndex = ref(0)
const failedImageMap = ref({})

const safeItems = computed(() => (Array.isArray(props.items) ? props.items : []))
const currentItem = computed(() => safeItems.value[activeIndex.value] || null)
const hasMultipleItems = computed(() => safeItems.value.length > 1)

let autoSlideTimer = null

const resetAutoSlide = () => {
  if (autoSlideTimer) {
    clearInterval(autoSlideTimer)
    autoSlideTimer = null
  }

  if (!props.loading && hasMultipleItems.value) {
    autoSlideTimer = window.setInterval(() => {
      activeIndex.value = (activeIndex.value + 1) % safeItems.value.length
    }, 5000)
  }
}

const selectIndex = (index) => {
  activeIndex.value = index
  resetAutoSlide()
}

const prevItem = () => {
  if (!hasMultipleItems.value) {
    return
  }

  activeIndex.value = (activeIndex.value - 1 + safeItems.value.length) % safeItems.value.length
  resetAutoSlide()
}

const nextItem = () => {
  if (!hasMultipleItems.value) {
    return
  }

  activeIndex.value = (activeIndex.value + 1) % safeItems.value.length
  resetAutoSlide()
}

const markImageFailed = (productId) => {
  if (productId == null) {
    return
  }

  failedImageMap.value = {
    ...failedImageMap.value,
    [productId]: true,
  }
}

const hasValidImage = (item) => Boolean(item?.imageUrl) && !failedImageMap.value[item.productId]

watch(
  () => [props.month, safeItems.value.length],
  () => {
    activeIndex.value = 0
    failedImageMap.value = {}
    resetAutoSlide()
  },
)

watch(
  () => props.loading,
  () => {
    resetAutoSlide()
  },
)

onMounted(() => {
  resetAutoSlide()
})

onBeforeUnmount(() => {
  if (autoSlideTimer) {
    clearInterval(autoSlideTimer)
  }
})
</script>

<template>
  <section class="calendar-section-card" :class="{ compact }">
    <div class="calendar-section-header">
      <div>
        <h3 class="calendar-section-title">이번달 추천 품종</h3>
        <p class="calendar-section-subtitle">{{ month }}월 추천 품종을 확인해보세요.</p>
      </div>
      <span v-if="safeItems.length > 1 && !loading" class="calendar-section-caption">자동 슬라이드</span>
    </div>

    <div class="calendar-section-body">
      <LoadingSpinner v-if="loading" text="추천 품종을 불러오는 중입니다." />

      <div v-else-if="errorStatus === 403" class="section-feedback is-muted">
        추천 품종 조회 권한이 없습니다.
      </div>

      <ErrorMessage
        v-else-if="errorMessage"
        :message="errorMessage"
        retry-label="추천 품종 다시 시도"
        @retry="emit('retry')"
      />

      <EmptyState
        v-else-if="safeItems.length === 0"
        title="이번달 추천 품종이 없습니다."
        description=""
      />

      <div v-else class="recommendation-carousel">
        <div class="recommendation-frame">
          <article
            class="recommendation-card"
            role="button"
            tabindex="0"
            @click="emit('select-product', currentItem)"
            @keydown.enter="emit('select-product', currentItem)"
            @keydown.space.prevent="emit('select-product', currentItem)"
          >
            <div class="recommendation-image-wrap">
              <button
                v-if="hasMultipleItems"
                type="button"
                class="carousel-arrow left"
                aria-label="이전 추천 품종"
                @click.stop="prevItem"
              >
                ‹
              </button>

              <img
                v-if="hasValidImage(currentItem)"
                :src="currentItem.imageUrl"
                :alt="currentItem.productName"
                class="recommendation-image"
                @error="markImageFailed(currentItem.productId)"
              >
              <div v-else class="recommendation-image placeholder">
                <span>{{ currentItem.productCategoryLabel || '품종' }}</span>
              </div>

              <button
                v-if="hasMultipleItems"
                type="button"
                class="carousel-arrow right"
                aria-label="다음 추천 품종"
                @click.stop="nextItem"
              >
                ›
              </button>
            </div>

            <div class="recommendation-content">
              <div class="recommendation-category">{{ currentItem.productCategoryLabel || '-' }}</div>
              <h4 class="recommendation-name">{{ currentItem.productName }}</h4>
              <p v-if="currentItem.description" class="recommendation-description">{{ currentItem.description }}</p>
              <p v-else class="recommendation-description is-empty">설명 정보가 없습니다.</p>
              <p class="recommendation-period">
                파종 {{ currentItem.sowingStart ?? '-' }}월 · 정식 {{ currentItem.plantingStart ?? '-' }}월
              </p>
              <div v-if="currentItem.croppingSystem || currentItem.region" class="recommendation-meta">
                <span v-if="currentItem.croppingSystem" class="meta-chip">{{ currentItem.croppingSystem }}</span>
                <span v-if="currentItem.region" class="meta-chip">{{ currentItem.region }}</span>
              </div>
            </div>
          </article>

        </div>

        <div v-if="hasMultipleItems" class="carousel-dots" role="group" aria-label="추천 품종 슬라이드 선택">
          <button
            v-for="(item, index) in safeItems"
            :key="item.productId || index"
            type="button"
            class="carousel-dot"
            :class="{ active: index === activeIndex }"
            :aria-label="`${item.productName} 보기`"
            :aria-pressed="index === activeIndex"
            @click="selectIndex(index)"
          />
        </div>
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
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

.calendar-section-caption {
  font-size: 12px;
  font-weight: 700;
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

.recommendation-carousel {
  display: grid;
  gap: 14px;
}

.recommendation-frame {
  position: relative;
}

.recommendation-card {
  display: grid;
  grid-template-columns: minmax(220px, 34%) minmax(0, 1fr);
  gap: 18px;
  width: 100%;
  border: 1px solid var(--color-border-divider, #E8E3D8);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(250, 247, 243, 0.96) 0%, rgba(239, 234, 223, 0.92) 100%);
  padding: 18px;
  cursor: pointer;
  text-align: left;
}

.calendar-section-card.compact .recommendation-card {
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
}

.recommendation-image-wrap {
  min-width: 0;
  position: relative;
  overflow: hidden;
  border-radius: 14px;
}

.recommendation-image {
  width: 100%;
  height: 220px;
  display: block;
  border-radius: 14px;
  object-fit: cover;
  background: var(--color-bg-section, #EFEADF);
}

.calendar-section-card.compact .recommendation-image {
  height: 168px;
  border-radius: 12px;
}

.recommendation-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-border-card, #DDD7CE);
  color: var(--color-text-sub, #9A8C7E);
  font-size: 14px;
  font-weight: 700;
}

.recommendation-content {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 8px;
}

.recommendation-category {
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
  font-size: 12px;
  font-weight: 800;
}

.recommendation-name {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.calendar-section-card.compact .recommendation-name {
  font-size: 18px;
}

.recommendation-description {
  margin: 0;
  color: var(--color-text-body, #6B5F50);
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.calendar-section-card.compact .recommendation-description {
  font-size: 13px;
}

.recommendation-description.is-empty {
  color: var(--color-text-sub, #9A8C7E);
}

.recommendation-period {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-orange-dark, #A34E20);
}

.calendar-section-card.compact .recommendation-period {
  font-size: 12px;
}

.recommendation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: rgba(255, 255, 255, 0.7);
  color: var(--color-text-sub, #9A8C7E);
  font-size: 12px;
  font-weight: 700;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: rgba(61, 53, 41, 0.72);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  z-index: 1;
}

.carousel-arrow.left {
  left: 14px;
}

.carousel-arrow.right {
  right: 14px;
}

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.carousel-dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--color-border-card, #DDD7CE);
  cursor: pointer;
}

.carousel-dot.active {
  width: 22px;
  background: var(--color-olive, #7A8C42);
}

.calendar-section-card.compact .carousel-arrow {
  width: 32px;
  height: 32px;
  font-size: 20px;
}

.calendar-section-card.compact .carousel-arrow.left {
  left: 10px;
}

.calendar-section-card.compact .carousel-arrow.right {
  right: 10px;
}

@media (max-width: 820px) {
  .recommendation-card {
    grid-template-columns: 1fr;
  }

  .recommendation-image {
    height: 200px;
  }
}

@media (max-width: 640px) {
  .calendar-section-header,
  .calendar-section-body {
    padding: 14px;
  }

  .recommendation-card {
    padding: 14px;
  }

  .recommendation-name {
    font-size: 20px;
  }
}
</style>
