<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const cropPestData = {
  crops: [
    { cropCode: 'cabbage', cropName: '배추' },
    { cropCode: 'radish', cropName: '무' },
    { cropCode: 'pepper', cropName: '고추' },
    { cropCode: 'tomato', cropName: '토마토' },
    { cropCode: 'watermelon', cropName: '수박' },
    { cropCode: 'strawberry', cropName: '딸기' },
    { cropCode: 'apple', cropName: '사과' },
    { cropCode: 'pear', cropName: '배' },
    { cropCode: 'grape', cropName: '포도' },
  ],
  pests: {
    cabbage: [
      { pestCode: 'CB01', pestName: '무름병' },
      { pestCode: 'CB02', pestName: '균핵병' },
      { pestCode: 'CB03', pestName: '노균병' },
      { pestCode: 'CB04', pestName: '진딧물' },
      { pestCode: 'CB05', pestName: '배추좀나방' },
    ],
    radish: [
      { pestCode: 'RD01', pestName: '무름병' },
      { pestCode: 'RD02', pestName: '검은무늬병' },
      { pestCode: 'RD03', pestName: '무이축병' },
      { pestCode: 'RD04', pestName: '진딧물' },
    ],
    pepper: [
      { pestCode: 'PP01', pestName: '탄저병' },
      { pestCode: 'PP02', pestName: '역병' },
      { pestCode: 'PP03', pestName: '세균점무늬병' },
      { pestCode: 'PP04', pestName: '총채벌레' },
      { pestCode: 'PP05', pestName: '진딧물' },
    ],
    tomato: [
      { pestCode: 'TM01', pestName: '역병' },
      { pestCode: 'TM02', pestName: '잿빛곰팡이병' },
      { pestCode: 'TM03', pestName: '반점위조병' },
      { pestCode: 'TM04', pestName: '담배가루이' },
    ],
    watermelon: [
      { pestCode: 'WM01', pestName: '탄저병' },
      { pestCode: 'WM02', pestName: '덩굴마름병' },
      { pestCode: 'WM03', pestName: '흰가루병' },
      { pestCode: 'WM04', pestName: '진딧물' },
    ],
    strawberry: [
      { pestCode: 'SB01', pestName: '잿빛곰팡이병' },
      { pestCode: 'SB02', pestName: '흰가루병' },
      { pestCode: 'SB03', pestName: '탄저병' },
      { pestCode: 'SB04', pestName: '응애' },
    ],
    apple: [
      { pestCode: 'AP01', pestName: '탄저병' },
      { pestCode: 'AP02', pestName: '갈색무늬병' },
      { pestCode: 'AP03', pestName: '겹무늬썩음병' },
      { pestCode: 'AP04', pestName: '복숭아순나방' },
    ],
    pear: [
      { pestCode: 'PR01', pestName: '검은별무늬병' },
      { pestCode: 'PR02', pestName: '붉은별무늬병' },
      { pestCode: 'PR03', pestName: '꼬마배나무이' },
    ],
    grape: [
      { pestCode: 'GR01', pestName: '노균병' },
      { pestCode: 'GR02', pestName: '탄저병' },
      { pestCode: 'GR03', pestName: '잿빛곰팡이병' },
      { pestCode: 'GR04', pestName: '꽃매미' },
    ],
  },
}

const pestGeoJsonData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: '청양군',
        PP01: '심각', PP02: '주의', PP03: '보통', PP04: '경고',
        TM01: '주의', TM02: '보통', AP01: '심각', AP02: '경고',
        CB01: '주의', CB02: '보통', RD01: '경고', WM01: '심각', GR01: '주의',
      },
      geometry: { type: 'Polygon', coordinates: [[[126.7, 36.35], [126.9, 36.35], [126.9, 36.55], [126.7, 36.55], [126.7, 36.35]]] },
    },
    {
      type: 'Feature',
      properties: {
        name: '보령시',
        PP01: '경고', PP05: '심각', WM01: '경고', WM02: '주의',
        CB01: '심각', CB02: '경고', TM01: '주의', SB01: '보통',
        RD02: '심각', AP01: '주의', PR01: '경고',
      },
      geometry: { type: 'Polygon', coordinates: [[[126.5, 36.2], [126.7, 36.2], [126.7, 36.4], [126.5, 36.4], [126.5, 36.2]]] },
    },
    {
      type: 'Feature',
      properties: {
        name: '예산군',
        AP01: '심각', AP02: '경고', AP03: '주의', AP04: '보통',
        PR01: '심각', PR02: '경고', GR01: '주의', GR02: '보통',
        RD01: '경고', CB03: '심각', TM02: '경고', SB02: '주의',
      },
      geometry: { type: 'Polygon', coordinates: [[[126.75, 36.6], [126.95, 36.6], [126.95, 36.8], [126.75, 36.8], [126.75, 36.6]]] },
    },
  ],
}

const salesOffices = [
  { id: 'S1', name: '(주)중부농약사', lat: 36.45, lng: 126.8, score: 96, handledCrops: ['THE강한탄청양고추', '티탄불패고추', 'TS탑스타토마토'] },
  { id: 'S2', name: '대덕종묘', lat: 36.33, lng: 126.6, score: 85, handledCrops: ['통큰싱싱배추', '삼다조은무', '열정수박'] },
  { id: 'S3', name: '예산농약사', lat: 36.68, lng: 126.84, score: 92, handledCrops: ['홍로사과 (묘목)', '탐나배 (묘목)', '샤인스타포도 (묘목)'] },
  { id: 'S4', name: '보령종묘', lat: 36.25, lng: 126.55, score: 70, handledCrops: ['더퍼펙트고추', '미소지움딸기'] },
]

const recommendedProducts = {
  pepper: {
    PP01: [
      { name: 'THE강한탄청양고추', desc: '탄저병 복합내병성 품종으로, 매운맛이 강하고 수량성이 우수합니다.', resistance: '탄저병 저항성', isFavorite: true },
      { name: '칼탄패스 고추', desc: '탄저병과 칼라병에 강한 이중 저항성 품종입니다. 고품질 다수확 가능.', resistance: '탄저병, 칼라병 저항성', isFavorite: false },
    ],
    PP02: [
      { name: '티탄불패고추', desc: '역병 저항성이 뛰어나며 재배 안정성이 높은 품종입니다.', resistance: '역병 저항성', isFavorite: false },
      { name: '슈퍼고추왕', desc: '역병에 강하고 초세가 강하여 극한 환경에서도 잘 자랍니다.', resistance: '역병 저항성', isFavorite: true },
    ],
    PP03: [
      { name: '금강초', desc: '세균점무늬병에 강한 내성을 가진 조생종 품종입니다. 붉은색 발현 우수.', resistance: '세균점무늬병 저항성', isFavorite: false },
    ],
    PP04: [
      { name: '총채뚝 고추', desc: '총채벌레 피해 경감에 도움을 주는 품종입니다. 초형이 안정적.', resistance: '총채벌레 내충성', isFavorite: false },
    ],
    PP05: [
      { name: '진딧뚝 고추', desc: '진딧물에 대한 저항성이 있어 초기 생육에 유리합니다.', resistance: '진딧물 저항성', isFavorite: true },
    ],
  },
  cabbage: {
    CB01: [
      { name: '통큰싱싱배추', desc: '무름병 내병성이 강화되어 여름철 재배에 유리합니다.', resistance: '무름병 내병성', isFavorite: false },
      { name: '싱싱한가을배추', desc: '무름병에 강하고 고소한 맛이 일품인 가을 배추입니다.', resistance: '무름병 저항성', isFavorite: true },
    ],
    CB02: [{ name: '단단한금가루배추', desc: '균핵병에 강한 저항성을 가진 품종입니다. 결구력이 우수.', resistance: '균핵병 저항성', isFavorite: false }],
    CB03: [{ name: '강한노균배추', desc: '노균병에 강한 내성을 지녀 안정적인 수확을 보장합니다.', resistance: '노균병 저항성', isFavorite: false }],
  },
  radish: {
    RD01: [
      { name: '삼다조은무', desc: '무름병에 비교적 강하며 근형이 우수한 가을무 품종입니다.', resistance: '무름병 중도저항성', isFavorite: false },
      { name: '튼튼무', desc: '무름병에 강하고 뿌리 비대가 빠른 품종입니다. 아삭한 식감.', resistance: '무름병 저항성', isFavorite: true },
    ],
    RD02: [{ name: '흑심무', desc: '검은무늬병에 강한 내성을 가진 품종입니다. 육질이 단단.', resistance: '검은무늬병 저항성', isFavorite: false }],
  },
  tomato: {
    TM01: [{ name: '역병뚝토마토', desc: '역병에 강한 저항성을 가진 대과종 토마토입니다. 수확량 증대.', resistance: '역병 저항성', isFavorite: false }],
    TM02: [{ name: 'TS탑스타토마토', desc: 'TYLCV, 잿빛곰팡이병 등에 복합내병성을 가집니다.', resistance: '복합 내병성', isFavorite: true }],
  },
  watermelon: {
    WM01: [
      { name: '열정수박', desc: '탄저병 내병성을 가진 고품질 수박 품종입니다.', resistance: '탄저병 저항성', isFavorite: false },
      { name: '탄저뚝수박', desc: '탄저병에 강하며 당도가 매우 높은 품종입니다. 과육이 아삭.', resistance: '탄저병 저항성', isFavorite: true },
    ],
  },
  strawberry: {
    SB01: [
      { name: '미소지움딸기', desc: '잿빛곰팡이병에 강한 저항성을 가진 고당도 딸기 품종입니다.', resistance: '잿빛곰팡이병 저항성', isFavorite: true },
      { name: '회색곰팡이안녕 딸기', desc: '잿빛곰팡이병에 특화된 내병성을 지닌 딸기입니다.', resistance: '잿빛곰팡이병 저항성', isFavorite: false },
    ],
  },
  apple: {
    AP01: [
      { name: '홍로사과 (묘목)', desc: '탄저병에 강한 홍로 품종의 묘목입니다.', resistance: '탄저병 저항성', isFavorite: false },
      { name: '부사사과 (묘목)', desc: '탄저병에 중도 저항성을 가진 고품질 부사 품종 묘목입니다.', resistance: '탄저병 중도저항성', isFavorite: true },
    ],
  },
  pear: {
    PR01: [
      { name: '탐나배 (묘목)', desc: '검은별무늬병에 강한 탐나 품종의 묘목입니다.', resistance: '검은별무늬병 저항성', isFavorite: false },
      { name: '황금배 (묘목)', desc: '검은별무늬병에 중도 저항성을 가진 황금배 품종 묘목입니다.', resistance: '검은별무늬병 중도저항성', isFavorite: true },
    ],
  },
  grape: {
    GR01: [
      { name: '샤인스타포도 (묘목)', desc: '노균병에 강한 샤인스타 품종의 묘목입니다.', resistance: '노균병 저항성', isFavorite: true },
      { name: '청포도 (묘목)', desc: '노균병에 강하며 달콤한 맛이 일품인 청포도 품종 묘목입니다.', resistance: '노균병 저항성', isFavorite: false },
    ],
  },
}

const mapEl = ref(null)
const selectedCrop = ref(cropPestData.crops[0].cropCode)
const selectedPest = ref(cropPestData.pests[cropPestData.crops[0].cropCode][0].pestCode)
const hasQueried = ref(false)
const areaTitle = ref('지역을 선택하세요')
const selectedSeverity = ref(null)
const selectedOffice = ref(null)

let map = null
let geojsonLayer = null
let officeMarkerGroup = null

const pestOptions = computed(() => cropPestData.pests[selectedCrop.value] || [])

const products = computed(() => {
  if (!hasQueried.value) {
    return []
  }

  return (recommendedProducts[selectedCrop.value] && recommendedProducts[selectedCrop.value][selectedPest.value])
    ? recommendedProducts[selectedCrop.value][selectedPest.value]
    : []
})

const cropLabel = computed(() => cropPestData.crops.find((item) => item.cropCode === selectedCrop.value)?.cropName || '')
const pestLabel = computed(() => pestOptions.value.find((item) => item.pestCode === selectedPest.value)?.pestName || '')

const strategyContent = computed(() => {
  if (!hasQueried.value) {
    return "상단 필터에서 작물과 관심 병해충을 선택하고 '데이터 조회'를 클릭하면, 지도와 함께 관련 정보가 표시됩니다."
  }

  if (selectedOffice.value) {
    return `• <b>${selectedOffice.value.name}</b>은(는) 현재 방문 우선순위 ${selectedOffice.value.score}점 입니다.<br>• 현재 조회된 '작물: ${cropLabel.value} - 병해충: ${pestLabel.value}' 기준 추천 품종을 기반으로 판촉 활동을 강화하세요.`
  }

  if (areaTitle.value !== '지역 또는 영업처 선택' && selectedSeverity.value) {
    return `• <b>${areaTitle.value}</b> 지역에 <b>${cropLabel.value} ${pestLabel.value} ${selectedSeverity.value}</b> 단계 발령 중.<br>• 고위험 지역의 영업처 (점수 90점 이상) 우선 방문 권장.<br>• ${pestLabel.value} 저항성 품종 및 예방 품종 교체 수요가 높을 것으로 예상됩니다.`
  }

  return '지역을 클릭하면 해당 지역의 영업 전략을 확인할 수 있습니다.'
})

const severityColor = (level) => {
  switch (level) {
    case '심각': return '#ef4444'
    case '경고': return '#f97316'
    case '주의': return '#eab308'
    case '보통': return '#22c55e'
    default: return '#d1d5db'
  }
}

const onCropChange = () => {
  const nextPest = pestOptions.value[0]
  selectedPest.value = nextPest ? nextPest.pestCode : ''
}

const renderOfficeMarkers = () => {
  if (!map) {
    return
  }

  if (officeMarkerGroup) {
    map.removeLayer(officeMarkerGroup)
  }

  officeMarkerGroup = L.layerGroup().addTo(map)

  salesOffices.forEach((office) => {
    const markerColor = office.score >= 90 ? '#ef4444' : '#1d4ed8'
    const marker = L.circleMarker([office.lat, office.lng], {
      radius: 8,
      fillColor: markerColor,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.9,
      pane: 'officeMarkerPane',
    }).addTo(officeMarkerGroup)

    marker.bindPopup(`<b>${office.name}</b><br>방문점수: ${office.score}점<br><hr style="margin: 5px 0;"><b>주요 취급 품종:</b><br>- ${office.handledCrops.join('<br>- ')}`)

    marker.on('click', () => {
      selectedOffice.value = office
      areaTitle.value = office.name
      selectedSeverity.value = null
    })
  })
}

const renderGeoJson = () => {
  if (!map) {
    return
  }

  if (geojsonLayer) {
    map.removeLayer(geojsonLayer)
  }

  geojsonLayer = L.geoJSON(pestGeoJsonData, {
    style: (feature) => ({
      fillColor: severityColor(feature?.properties?.[selectedPest.value]),
      weight: 2,
      opacity: 1,
      color: '#fff',
      dashArray: '3',
      fillOpacity: 0.7,
    }),
    onEachFeature: (feature, layer) => {
      layer.on('click', () => {
        areaTitle.value = feature.properties.name
        selectedSeverity.value = feature.properties[selectedPest.value] || '정보없음'
        selectedOffice.value = null
      })
    },
    pane: 'pestPolygonPane',
  }).addTo(map)
}

const updateView = () => {
  if (!selectedPest.value) {
    window.alert('조회할 병해충을 선택하세요.')
    return
  }

  hasQueried.value = true
  areaTitle.value = '지역 또는 영업처 선택'
  selectedSeverity.value = null
  selectedOffice.value = null
  renderGeoJson()
}

const toggleFav = (item) => {
  item.isFavorite = !item.isFavorite
}

onMounted(() => {
  if (!mapEl.value) {
    return
  }

  map = L.map(mapEl.value, { zoomControl: false }).setView([36.5, 126.75], 9)

  map.createPane('pestPolygonPane')
  map.getPane('pestPolygonPane').style.zIndex = 400
  map.createPane('officeMarkerPane')
  map.getPane('officeMarkerPane').style.zIndex = 450

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CartoDB',
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  renderOfficeMarkers()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="container">
    <div class="map-area">
      <div class="filter-overlay">
        <select v-model="selectedCrop" @change="onCropChange">
          <option v-for="crop in cropPestData.crops" :key="crop.cropCode" :value="crop.cropCode">작물: {{ crop.cropName }}</option>
        </select>
        <select v-model="selectedPest">
          <option v-for="pest in pestOptions" :key="pest.pestCode" :value="pest.pestCode">병해충: {{ pest.pestName }}</option>
        </select>
        <button type="button" class="btn-query" @click="updateView">데이터 조회</button>
      </div>

      <div ref="mapEl" class="map-surface" />

      <div class="legend">
        <p style="font-weight:700; margin-bottom:8px;">병해충 심각도</p>
        <div class="legend-item"><div class="l-box" style="background:#ef4444" />심각</div>
        <div class="legend-item"><div class="l-box" style="background:#f97316" />경고</div>
        <div class="legend-item"><div class="l-box" style="background:#eab308" />주의</div>
        <div class="legend-item"><div class="l-box" style="background:#22c55e" />보통</div>
      </div>
    </div>

    <div class="info-panel">
      <div class="panel-header">
        <h2>{{ areaTitle }}</h2>
        <p>지도에서 지역을 클릭하거나 영업처를 선택하세요.</p>
      </div>

      <div class="section">
        <div class="section-title">추천 품종</div>

        <div v-if="!hasQueried" class="recommend-card">
          <div class="placeholder">조회 버튼을 눌러 데이터를 확인하세요.</div>
        </div>

        <div v-else-if="products.length === 0" class="recommend-card">
          <div class="placeholder">선택된 조건에 맞는 추천 품종이 없습니다.</div>
        </div>

        <div v-else>
          <div v-for="item in products" :key="item.name" class="recommend-card">
            <span class="badge badge-seed">종자</span>
            <button type="button" class="fav-star" :class="{ active: item.isFavorite }" @click="toggleFav(item)">★</button>
            <div class="prod-name">{{ item.name }}</div>
            <div class="prod-desc">{{ item.desc }}</div>
            <div v-if="item.resistance" class="resistance-tag">{{ item.resistance }}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">현장 영업 전략</div>
        <div class="strategy-box" v-html="strategyContent" />
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }
.container { display: flex; width: 100%; height: calc(100vh - 130px); min-height: 680px; }
.map-area { flex: 7; position: relative; height: 100%; }
.map-surface { width: 100%; height: 100%; z-index: 1; }
.filter-overlay { position: absolute; top: 20px; left: 20px; z-index: 1000; background: #fff; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15); display: flex; gap: 10px; align-items: center; }
.filter-overlay select { padding: 8px; border: 1px solid #ddd; border-radius: 6px; outline: none; min-width: 150px; }
.btn-query { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.legend { position: absolute; bottom: 30px; left: 20px; z-index: 1000; background: #fff; padding: 12px; border-radius: 8px; font-size: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
.legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.l-box { width: 14px; height: 14px; border-radius: 2px; }
.info-panel { flex: 3; height: 100%; background-color: #f1f5f9; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; min-width: 390px; overflow-y: auto; }
.panel-header { padding: 24px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.panel-header h2 { font-size: 1.25rem; color: #1e293b; }
.panel-header p { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
.section { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.section-title { font-size: 0.95rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.recommend-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0; transition: transform 0.2s; position: relative; margin-bottom: 12px; }
.recommend-card:hover { transform: translateY(-2px); border-color: #2563eb; }
.placeholder { text-align: center; color: #94a3b8; padding: 20px 0; }
.badge { font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 600; margin-bottom: 8px; display: inline-block; }
.badge-seed { background: #dcfce7; color: #166534; }
.fav-star { position: absolute; top: 15px; right: 15px; cursor: pointer; font-size: 20px; color: #cbd5e1; border: none; background: transparent; }
.fav-star.active { color: #f59e0b; }
.prod-name { font-weight: 700; font-size: 1.05rem; margin-bottom: 4px; color: #0f172a; }
.prod-desc { font-size: 0.9rem; color: #64748b; line-height: 1.4; }
.resistance-tag { margin-top: 10px; font-size: 0.85rem; color: #ef4444; font-weight: 600; }
.strategy-box { background: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; color: #92400e; font-size: 0.9rem; line-height: 1.6; }
@media (max-width: 1200px) {
  .container { flex-direction: column; height: auto; min-height: 0; }
  .map-area { min-height: 420px; }
  .info-panel { min-width: 0; border-left: none; border-top: 1px solid #e2e8f0; }
}
</style>
