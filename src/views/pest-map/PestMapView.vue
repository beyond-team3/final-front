<template>
  <div class="pest-map-view">
    <!-- ───────────────── 사이드바 ───────────────── -->
    <aside class="sidebar">
      <!-- 헤더 -->
      <div class="sidebar-header">
        <div class="sidebar-title-row">
          <svg class="icon-bug" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1h-2v-1a1 1 0 0 0-1-1h-1v1a6 6 0 0 1-12 0v-1H3a1 1 0 0 0-1 1v1H0v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4h4zM9 6h6V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v1z"/>
            <path d="M2 12H0M24 12h-2M2 17H0M24 17h-2"/>
          </svg>
          <h1 class="sidebar-title">병해충-품종 매칭 지도</h1>
        </div>
        <p class="sidebar-subtitle">SeedFlow+ Pest Surveillance</p>
      </div>

      <!-- 필터 섹션 -->
      <div class="filter-section">
        <h2 class="section-label">작물 · 병해충 선택</h2>

        <div class="filter-group">
          <label class="filter-label">작물</label>
          <div class="select-wrapper">
            <select v-model="selectedCrop" class="filter-select">
              <option value="">작물을 선택하세요</option>
              <option v-for="crop in crops" :key="crop.code" :value="crop.code">
                {{ crop.label }}
              </option>
            </select>
            <svg class="select-arrow" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">병해충</label>
          <div class="select-wrapper">
            <select v-model="selectedPest" :disabled="!filteredPests.length" class="filter-select">
              <option value="">병해충을 선택하세요</option>
              <option v-for="pest in filteredPests" :key="pest.code" :value="pest.code">
                {{ pest.label }}
              </option>
            </select>
            <svg class="select-arrow" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </div>
        </div>

        <button
            class="search-btn"
            :disabled="!selectedCrop || !selectedPest || isLoading"
            @click="fetchForecasts"
        >
          <span v-if="isLoading" class="btn-spinner"></span>
          <svg v-else class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          {{ isLoading ? '조회 중...' : '예찰 데이터 조회' }}
        </button>
      </div>

      <!-- 심각도 범례 -->
      <div v-if="forecasts.length > 0" class="legend-section">
        <h2 class="section-label">위험도 범례</h2>
        <div class="legend-list">
          <div v-for="level in severityLevels" :key="level.key" class="legend-item">
            <span class="legend-dot" :style="{ background: level.color }"></span>
            <span class="legend-text">{{ level.label }}</span>
            <span class="legend-count">
              {{ forecasts.filter(f => f.severity === level.key).length }}건
            </span>
          </div>
        </div>
      </div>

      <!-- 추천 품종 섹션 -->
      <div class="products-section">
        <div class="products-header">
          <h2 class="section-label">추천 품종</h2>
          <span v-if="recommendedProducts.length" class="product-count">
            {{ recommendedProducts.length }}종
          </span>
        </div>

        <!-- 빈 상태 -->
        <div v-if="!recommendedProducts.length && !isLoading" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/>
            <path d="M22 32c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="32" cy="22" r="2" fill="currentColor"/>
          </svg>
          <p>작물과 병해충을 선택 후<br>조회하면 내병성 품종이 표시됩니다.</p>
        </div>

        <!-- 품종 카드 목록 -->
        <div v-else class="product-list">
          <div
              v-for="product in recommendedProducts"
              :key="product.id"
              class="product-card"
              :class="{ 'is-favorite': product.isFavorite }"
          >
            <div class="product-card-top">
              <div class="product-info">
                <span class="product-name">{{ product.name }}</span>
                <p class="product-desc">{{ product.description }}</p>
              </div>
              <button
                  class="favorite-btn"
                  :class="{ active: product.isFavorite }"
                  @click="toggleFavorite(product)"
                  :title="product.isFavorite ? '북마크 해제' : '북마크'"
              >
                <svg viewBox="0 0 24 24" :fill="product.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>

            <!-- 내병성 태그 -->
            <div v-if="product.resistance" class="resistance-tags">
              <span
                  v-for="tag in product.resistance.split(',')"
                  :key="tag.trim()"
                  class="resistance-tag"
              >
                {{ tag.trim() }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ───────────────── 지도 영역 ───────────────── -->
    <main class="map-container">
      <div id="kakao-map" ref="mapRef" class="kakao-map"></div>

      <!-- 지도 위 오버레이: 예찰 지역 리스트 -->
      <transition name="slide-up">
        <div v-if="forecasts.length > 0" class="forecast-overlay">
          <div class="overlay-header">
            <svg viewBox="0 0 20 20" fill="currentColor" class="overlay-icon">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
            </svg>
            <span>예찰 지역 현황</span>
            <span class="overlay-total">총 {{ forecasts.length }}개 시군구</span>
          </div>
          <div class="overlay-list">
            <div
                v-for="forecast in sortedForecasts"
                :key="forecast.areaName"
                class="overlay-item"
                @click="focusForecastArea(forecast)"
            >
              <span
                  class="severity-badge"
                  :class="`severity-${getSeverityClass(forecast.severity)}`"
              >
                {{ forecast.severity }}
              </span>
              <span class="area-name">{{ forecast.areaName }}</span>
            </div>
          </div>
        </div>
      </transition>

      <!-- 지도 로딩 오버레이 -->
      <transition name="fade">
        <div v-if="!mapReady" class="map-loading">
          <div class="loading-spinner"></div>
          <p>카카오맵 로딩 중...</p>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

// ─── 상태 ───────────────────────────────────────────
const mapRef = ref(null)
const mapReady = ref(false)
const isLoading = ref(false)
const selectedCrop = ref('')
const selectedPest = ref('')
const forecasts = ref([])
const recommendedProducts = ref([])

let kakaoMap = null
let officeMarkers = []
let forecastOverlays = []

// ─── 작물 / 병해충 메타데이터 ────────────────────────
const crops = [
  { code: 'PEPPER',    label: '🌶 고추' },
  { code: 'CABBAGE',   label: '🥬 배추' },
  { code: 'RADISH',    label: '🌿 무'   },
  { code: 'TOMATO',    label: '🍅 토마토' },
  { code: 'GARLIC',    label: '🧄 마늘'  },
]

const pestsByCrop = {
  PEPPER:  [
    { code: 'PP01', label: '탄저병' },
    { code: 'PP02', label: '역병'   },
    { code: 'P03',  label: '탄저병(공통)' },
  ],
  CABBAGE: [
    { code: 'CB01', label: '무름병' },
    { code: 'CB03', label: '노균병' },
  ],
  RADISH:  [
    { code: 'RD01', label: '무름병' },
  ],
  TOMATO:  [
    { code: 'TM01', label: '역병' },
  ],
  GARLIC:  [
    { code: 'GR01', label: '노균병' },
  ],
}

const filteredPests = computed(() =>
    selectedCrop.value ? (pestsByCrop[selectedCrop.value] || []) : []
)

watch(selectedCrop, () => { selectedPest.value = '' })

// ─── 심각도 설정 ──────────────────────────────────────
const severityLevels = [
  { key: '심각', label: '심각', color: '#B85C5C' },
  { key: '경고', label: '경고', color: '#C8622A' },
  { key: '주의', label: '주의', color: '#C8A042' },
  { key: '보통', label: '보통', color: '#7A8C42' },
]

const severityOrder = { '심각': 0, '경고': 1, '주의': 2, '보통': 3 }

const sortedForecasts = computed(() =>
    [...forecasts.value].sort((a, b) =>
        (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
    )
)

function getSeverityClass(severity) {
  const map = { '심각': 'critical', '경고': 'warning', '주의': 'caution', '보통': 'normal' }
  return map[severity] || 'normal'
}

function getSeverityColor(severity) {
  const found = severityLevels.find(l => l.key === severity)
  return found ? found.color : '#9A8C7E'
}

// ─── 카카오맵 초기화 ─────────────────────────────────
function initKakaoMap() {
  if (!window.kakao || !window.kakao.maps) {
    console.warn('[PestMap] 카카오맵 SDK가 로드되지 않았습니다.')
    mapReady.value = true // 에러 상태에서도 UI 표시
    return
  }

  window.kakao.maps.load(() => {
    const options = {
      center: new window.kakao.maps.LatLng(36.5, 127.8), // 한국 중심
      level: 8,
    }
    kakaoMap = new window.kakao.maps.Map(mapRef.value, options)
    mapReady.value = true
    fetchOffices()
  })
}

// ─── 영업처 마커 조회 ─────────────────────────────────
async function fetchOffices() {
  try {
    const { data } = await axios.get('/api/v1/map/offices')
    renderOfficeMarkers(data)
  } catch (err) {
    console.error('[PestMap] 영업처 조회 실패:', err)
    // 개발 환경 더미 데이터
    renderOfficeMarkers(DUMMY_OFFICES)
  }
}

function renderOfficeMarkers(offices) {
  if (!kakaoMap || !window.kakao) return

  officeMarkers.forEach(m => m.setMap(null))
  officeMarkers = []

  offices.forEach(office => {
    const position = new window.kakao.maps.LatLng(office.lat, office.lng)

    // 커스텀 오버레이로 영업처 마커 생성
    const content = `
      <div class="custom-office-marker" title="${office.name}">
        <div class="office-marker-dot"></div>
        <div class="office-marker-label">${office.name}</div>
      </div>
    `
    const overlay = new window.kakao.maps.CustomOverlay({
      position,
      content,
      yAnchor: 1,
    })
    overlay.setMap(kakaoMap)
    officeMarkers.push(overlay)
  })
}

// ─── 예찰 데이터 조회 ─────────────────────────────────
async function fetchForecasts() {
  if (!selectedCrop.value || !selectedPest.value) return
  isLoading.value = true
  forecasts.value = []
  recommendedProducts.value = []
  clearForecastOverlays()

  try {
    const { data } = await axios.get('/api/v1/map/forecasts', {
      params: { cropCode: selectedCrop.value, pestCode: selectedPest.value }
    })
    forecasts.value = data.forecasts || []
    recommendedProducts.value = data.recommendedProducts || []
  } catch (err) {
    console.error('[PestMap] 예찰 데이터 조회 실패:', err)
    // 개발 더미 데이터
    forecasts.value = DUMMY_FORECASTS
    recommendedProducts.value = DUMMY_PRODUCTS
  } finally {
    isLoading.value = false
    renderForecastOverlays()
  }
}

// ─── 예찰 오버레이 렌더링 ─────────────────────────────
//   실제 행정구역 폴리곤 구현 전 단계:
//   areaName → 대략적인 위경도 매핑 후 컬러 서클 오버레이 표시
function renderForecastOverlays() {
  if (!kakaoMap || !window.kakao) return
  clearForecastOverlays()

  forecasts.value.forEach(forecast => {
    const coord = AREA_COORDS[forecast.areaName]
    if (!coord) return

    const color = getSeverityColor(forecast.severity)
    const position = new window.kakao.maps.LatLng(coord.lat, coord.lng)

    // 반투명 원형 오버레이 (폴리곤 대체)
    const circle = new window.kakao.maps.Circle({
      center: position,
      radius: 12000,
      strokeWeight: 2,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
      fillColor: color,
      fillOpacity: 0.25,
    })
    circle.setMap(kakaoMap)

    // 라벨 오버레이
    const labelContent = `
      <div class="forecast-label" style="border-color:${color}; color:${color}">
        <span class="fl-name">${forecast.areaName}</span>
        <span class="fl-badge" style="background:${color}">${forecast.severity}</span>
      </div>
    `
    const label = new window.kakao.maps.CustomOverlay({
      position,
      content: labelContent,
      yAnchor: 2.2,
    })
    label.setMap(kakaoMap)

    forecastOverlays.push(circle, label)
  })
}

function clearForecastOverlays() {
  forecastOverlays.forEach(o => o.setMap(null))
  forecastOverlays = []
}

function focusForecastArea(forecast) {
  if (!kakaoMap || !window.kakao) return
  const coord = AREA_COORDS[forecast.areaName]
  if (!coord) return
  kakaoMap.setCenter(new window.kakao.maps.LatLng(coord.lat, coord.lng))
  kakaoMap.setLevel(6)
}

// ─── 즐겨찾기 토글 ────────────────────────────────────
function toggleFavorite(product) {
  product.isFavorite = !product.isFavorite
  // 실제 구현: axios.post/delete('/api/v1/products/{id}/bookmark')
}

// ─── 라이프사이클 ─────────────────────────────────────
onMounted(() => {
  // 카카오맵 SDK가 이미 로드된 경우 즉시 초기화
  if (window.kakao && window.kakao.maps) {
    initKakaoMap()
  } else {
    // SDK 스크립트 동적 삽입 (index.html에 이미 있으면 이 블록 생략 가능)
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false`
    script.onload = initKakaoMap
    document.head.appendChild(script)
  }
})

// ─── 더미 데이터 (개발/백엔드 미연결 시 사용) ─────────
const DUMMY_OFFICES = [
  { id: '1', name: '청양지사', lat: 36.46, lng: 126.80, handledCrops: ['고추'] },
  { id: '2', name: '안동지사', lat: 36.57, lng: 128.73, handledCrops: ['마늘', '고추'] },
  { id: '3', name: '나주지사', lat: 35.02, lng: 126.71, handledCrops: ['배추'] },
  { id: '4', name: '춘천지사', lat: 37.88, lng: 127.73, handledCrops: ['토마토'] },
]

const DUMMY_FORECASTS = [
  { areaName: '청양군',   severity: '심각' },
  { areaName: '홍성군',   severity: '경고' },
  { areaName: '공주시',   severity: '경고' },
  { areaName: '예산군',   severity: '주의' },
  { areaName: '천안시',   severity: '보통' },
  { areaName: '아산시',   severity: '보통' },
  { areaName: '부여군',   severity: '주의' },
  { areaName: '서천군',   severity: '심각' },
]

const DUMMY_PRODUCTS = [
  { id: 1, name: '청양마니따', description: '탄저병 내성이 강한 청양 계열 고추 품종', resistance: '탄저병, 역병', isFavorite: true },
  { id: 2, name: '빅레드', description: '대과종 홍고추, 수량성 우수', resistance: '탄저병', isFavorite: false },
  { id: 3, name: '스파이시킹', description: '강한 매운맛과 우수한 내병성', resistance: '탄저병, 바이러스', isFavorite: false },
  { id: 4, name: '강력홍', description: '고온기 탄저병에 강한 주력 품종', resistance: '탄저병', isFavorite: true },
]

// 주요 시군구 좌표 (실제 행정구역 폴리곤 전 더미 매핑)
const AREA_COORDS = {
  '청양군': { lat: 36.46, lng: 126.80 },
  '홍성군': { lat: 36.60, lng: 126.66 },
  '공주시': { lat: 36.45, lng: 127.12 },
  '예산군': { lat: 36.68, lng: 126.85 },
  '천안시': { lat: 36.81, lng: 127.15 },
  '아산시': { lat: 36.79, lng: 126.99 },
  '부여군': { lat: 36.27, lng: 126.91 },
  '서천군': { lat: 36.08, lng: 126.69 },
  '안동시': { lat: 36.57, lng: 128.73 },
  '나주시': { lat: 35.02, lng: 126.71 },
  '춘천시': { lat: 37.88, lng: 127.73 },
  '제주시': { lat: 33.50, lng: 126.52 },
  '서귀포시': { lat: 33.25, lng: 126.56 },
  '여주시': { lat: 37.30, lng: 127.63 },
  '광주시': { lat: 37.41, lng: 127.25 },
  '이천시': { lat: 37.27, lng: 127.44 },
  '화성시': { lat: 37.20, lng: 126.83 },
  '평택시': { lat: 36.99, lng: 127.11 },
}
</script>

<style scoped>
/* ════════════════════════════════════════
   CSS 변수 (DESIGN.md 준수)
════════════════════════════════════════ */
:root {
  --color-bg-base: #EDE8DF;
  --color-bg-sidebar: #E4DDD2;
  --color-bg-card: #F7F3EC;
  --color-bg-section: #EFEADF;
  --color-bg-input: #FAF7F3;
  --color-olive: #7A8C42;
  --color-olive-light: #C8D4A0;
  --color-olive-dark: #586830;
  --color-orange: #C8622A;
  --color-orange-light: #F0C9A8;
  --color-orange-dark: #A34E20;
  --color-text-strong: #3D3529;
  --color-text-body: #6B5F50;
  --color-text-sub: #9A8C7E;
  --color-text-placeholder: #BFB3A5;
  --color-border-card: #DDD7CE;
  --color-border-divider: #E8E3D8;
  --color-status-error: #B85C5C;
}

/* ════════════════════════════════════════
   레이아웃
════════════════════════════════════════ */
.pest-map-view {
  display: flex;
  width: 100%;
  height: 100vh;
  background: var(--color-bg-base);
  font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  overflow: hidden;
}

/* ════════════════════════════════════════
   사이드바
════════════════════════════════════════ */
.sidebar {
  width: 340px;
  min-width: 340px;
  height: 100%;
  background: var(--color-bg-sidebar);
  border-right: 1px solid var(--color-border-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 헤더 */
.sidebar-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--color-border-divider);
  background: var(--color-bg-sidebar);
}

.sidebar-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.icon-bug {
  width: 20px;
  height: 20px;
  color: var(--color-olive);
}

.sidebar-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-strong);
  margin: 0;
  letter-spacing: -0.3px;
}

.sidebar-subtitle {
  font-size: 11px;
  color: var(--color-text-placeholder);
  margin: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* 필터 섹션 */
.filter-section {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--color-border-divider);
  background: var(--color-bg-sidebar);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-sub);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin: 0 0 14px;
}

.filter-group {
  margin-bottom: 12px;
}

.filter-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-body);
  margin-bottom: 6px;
}

.select-wrapper {
  position: relative;
}

.filter-select {
  width: 100%;
  appearance: none;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-card);
  border-radius: 8px;
  padding: 9px 36px 9px 12px;
  font-size: 13px;
  color: var(--color-text-body);
  cursor: pointer;
  transition: border-color 0.15s;
  font-family: inherit;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-olive);
  box-shadow: 0 0 0 2px rgba(122, 140, 66, 0.15);
}

.filter-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--color-text-sub);
  pointer-events: none;
}

.search-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 16px;
  padding: 11px 16px;
  background: var(--color-olive);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  font-family: inherit;
  letter-spacing: 0.2px;
}

.search-btn:hover:not(:disabled) {
  background: var(--color-olive-dark);
}

.search-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.search-btn:disabled {
  background: var(--color-text-placeholder);
  cursor: not-allowed;
}

.btn-icon {
  width: 15px;
  height: 15px;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* 범례 */
.legend-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-divider);
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  font-size: 12px;
  color: var(--color-text-body);
  flex: 1;
}

.legend-count {
  font-size: 11px;
  color: var(--color-text-sub);
}

/* 추천 품종 */
.products-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px 20px;
}

.products-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.product-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-olive);
  background: var(--color-olive-light);
  padding: 2px 8px;
  border-radius: 10px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-placeholder);
  text-align: center;
}

.empty-icon {
  width: 52px;
  height: 52px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
}

.product-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}

.product-list::-webkit-scrollbar { width: 4px; }
.product-list::-webkit-scrollbar-track { background: transparent; }
.product-list::-webkit-scrollbar-thumb { background: var(--color-border-card); border-radius: 2px; }

.product-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-card);
  border-radius: 10px;
  padding: 13px 14px;
  box-shadow: 0 1px 3px rgba(61, 53, 41, 0.06);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.product-card.is-favorite {
  border-color: var(--color-orange-light);
}

.product-card:hover {
  box-shadow: 0 2px 6px rgba(61, 53, 41, 0.1);
}

.product-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-strong);
  margin-bottom: 4px;
}

.product-desc {
  font-size: 11px;
  color: var(--color-text-sub);
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.favorite-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-placeholder);
  padding: 4px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-btn:hover { background: var(--color-bg-section); }
.favorite-btn.active { color: var(--color-orange); }
.favorite-btn svg { width: 16px; height: 16px; }

.resistance-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.resistance-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-olive-dark);
  background: var(--color-olive-light);
  padding: 2px 8px;
  border-radius: 10px;
}

/* ════════════════════════════════════════
   지도
════════════════════════════════════════ */
.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.kakao-map {
  width: 100%;
  height: 100%;
}

/* ────── 예찰 지역 오버레이 패널 ────── */
.forecast-overlay {
  position: absolute;
  bottom: 24px;
  left: 20px;
  width: 220px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-card);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(61, 53, 41, 0.12);
  overflow: hidden;
  z-index: 10;
}

.overlay-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 14px;
  background: var(--color-bg-section);
  border-bottom: 1px solid var(--color-border-divider);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-strong);
}

.overlay-icon {
  width: 13px;
  height: 13px;
  color: var(--color-olive);
}

.overlay-total {
  margin-left: auto;
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-sub);
}

.overlay-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 6px 0;
}

.overlay-list::-webkit-scrollbar { width: 3px; }
.overlay-list::-webkit-scrollbar-thumb { background: var(--color-border-card); border-radius: 2px; }

.overlay-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.1s;
}

.overlay-item:hover { background: var(--color-bg-section); }

.severity-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.severity-critical { background: #F0D4D4; color: #B85C5C; }
.severity-warning   { background: var(--color-orange-light); color: var(--color-orange-dark); }
.severity-caution   { background: #F5E9C0; color: #8B6914; }
.severity-normal    { background: var(--color-olive-light); color: var(--color-olive-dark); }

.area-name {
  font-size: 12px;
  color: var(--color-text-body);
}

/* 지도 로딩 */
.map-loading {
  position: absolute;
  inset: 0;
  background: var(--color-bg-base);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--color-text-sub);
  font-size: 13px;
  z-index: 20;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border-card);
  border-top-color: var(--color-olive);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ════════════════════════════════════════
   애니메이션
════════════════════════════════════════ */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active { transition: transform 0.3s ease, opacity 0.3s; }
.slide-up-enter-from  { transform: translateY(20px); opacity: 0; }
.slide-up-leave-active { transition: transform 0.2s ease, opacity 0.2s; }
.slide-up-leave-to    { transform: translateY(10px); opacity: 0; }
</style>

<!-- ───────────────────────────────────────────────────────
  카카오맵 커스텀 오버레이 전역 스타일
  (scoped 미적용 — CustomOverlay DOM은 Vue 컴포넌트 외부에 주입됨)
──────────────────────────────────────────────────────── -->
<style>
/* 영업처 마커 */
.custom-office-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transform: translateX(-50%);
}

.office-marker-dot {
  width: 12px;
  height: 12px;
  background: #7A8C42;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  transition: transform 0.15s;
}

.custom-office-marker:hover .office-marker-dot {
  transform: scale(1.3);
}

.office-marker-label {
  margin-top: 4px;
  background: #F7F3EC;
  border: 1px solid #DDD7CE;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  color: #3D3529;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(61,53,41,0.12);
}

/* 예찰 지역 라벨 */
.forecast-label {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #F7F3EC;
  border: 1.5px solid;
  border-radius: 8px;
  padding: 4px 8px;
  transform: translateX(-50%);
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  cursor: pointer;
}

.fl-name {
  font-size: 11px;
  font-weight: 600;
  color: #3D3529;
}

.fl-badge {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  padding: 1px 5px;
  border-radius: 6px;
}
</style>