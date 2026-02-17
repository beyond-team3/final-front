<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
)

const props = defineProps({
  includeEmployeeOption: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '매출 통계(영업사원)',
  },
})

const viewType = ref('personal')

const clients = [
  { id: 1, name: '(주)대한종묘' },
  { id: 2, name: '농협종묘센터' },
  { id: 3, name: '그린팜' },
  { id: 4, name: '바이오시드' },
  { id: 5, name: '한국농산' },
]

const varieties = [
  { id: 1, name: '신녹광고추' },
  { id: 2, name: '스피드꿀수박' },
  { id: 3, name: '불암3호배추' },
  { id: 4, name: '썸머킹토마토' },
  { id: 5, name: '청정백다다기오이' },
]

const employees = [
  { id: 1, name: '김철수' },
  { id: 2, name: '이영희' },
  { id: 3, name: '박민수' },
  { id: 4, name: '정수진' },
  { id: 5, name: '최동욱' },
]

const palette = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6']

// TODO: API 연결
const personalSales = {
  2024: [108, 123, 119, 141, 154, 167, 185, 181, 203, 219, 210, 236],
  2025: [120, 140, 135, 160, 175, 190, 210, 205, 230, 250, 240, 270],
}

const makeSeries = (base, growth) => base.map((value, idx) => Math.round(value * (1 + growth + idx * 0.01)))

const clientMonthlySales = {
  2024: {
    1: makeSeries([950, 1020, 1080, 1150, 1220, 1290, 1250, 1330, 1400, 1470, 1530, 1580], 0),
    2: makeSeries([820, 880, 930, 990, 1050, 1110, 1070, 1140, 1200, 1260, 1310, 1350], 0),
    3: makeSeries([650, 700, 740, 790, 840, 880, 850, 910, 960, 1000, 1040, 1080], 0),
    4: makeSeries([780, 840, 890, 950, 1000, 1060, 1020, 1090, 1140, 1200, 1240, 1290], 0),
    5: makeSeries([600, 650, 680, 730, 770, 820, 790, 840, 890, 930, 970, 1000], 0),
  },
  2025: {
    1: makeSeries([1120, 1300, 1200, 1380, 1450, 1550, 1470, 1600, 1680, 1750, 1800, 1870], 0),
    2: makeSeries([970, 1120, 1030, 1190, 1250, 1340, 1270, 1380, 1450, 1510, 1560, 1620], 0),
    3: makeSeries([770, 890, 820, 950, 1000, 1070, 1010, 1100, 1150, 1210, 1240, 1290], 0),
    4: makeSeries([920, 1070, 980, 1130, 1190, 1270, 1210, 1310, 1370, 1440, 1480, 1540], 0),
    5: makeSeries([720, 830, 770, 890, 930, 1000, 950, 1030, 1080, 1130, 1170, 1210], 0),
  },
}

const varietyMonthlySales = {
  2024: {
    1: makeSeries([650, 710, 730, 790, 820, 880, 860, 910, 940, 980, 1020, 1070], 0),
    2: makeSeries([590, 620, 680, 720, 760, 800, 820, 840, 890, 930, 980, 1020], 0),
    3: makeSeries([700, 760, 810, 880, 920, 960, 980, 1040, 1090, 1130, 1180, 1210], 0),
    4: makeSeries([730, 790, 850, 900, 960, 1020, 1060, 1120, 1170, 1230, 1280, 1320], 0),
    5: makeSeries([560, 610, 660, 710, 740, 790, 820, 860, 900, 950, 980, 1030], 0),
  },
  2025: {
    1: makeSeries([730, 800, 820, 900, 940, 990, 980, 1040, 1080, 1130, 1180, 1230], 0),
    2: makeSeries([650, 700, 760, 810, 860, 910, 930, 970, 1020, 1070, 1120, 1160], 0),
    3: makeSeries([760, 830, 890, 960, 1020, 1080, 1110, 1180, 1240, 1290, 1350, 1400], 0),
    4: makeSeries([810, 880, 940, 1010, 1080, 1140, 1190, 1260, 1320, 1380, 1450, 1510], 0),
    5: makeSeries([620, 680, 730, 790, 840, 900, 940, 980, 1040, 1090, 1140, 1190], 0),
  },
}

const employeeMonthlySales = {
  2024: {
    1: makeSeries([780, 850, 880, 920, 980, 1020, 990, 1060, 1100, 1160, 1210, 1260], 0),
    2: makeSeries([720, 760, 810, 860, 900, 940, 920, 970, 1010, 1060, 1110, 1160], 0),
    3: makeSeries([640, 690, 730, 770, 820, 860, 840, 890, 930, 980, 1020, 1070], 0),
    4: makeSeries([690, 740, 790, 840, 880, 920, 900, 960, 1000, 1050, 1090, 1140], 0),
    5: makeSeries([620, 660, 710, 750, 790, 830, 810, 860, 900, 940, 980, 1020], 0),
  },
  2025: {
    1: makeSeries([860, 930, 970, 1020, 1080, 1130, 1090, 1170, 1230, 1290, 1340, 1400], 0),
    2: makeSeries([790, 840, 900, 960, 1010, 1060, 1020, 1100, 1150, 1210, 1260, 1320], 0),
    3: makeSeries([700, 760, 810, 870, 920, 970, 940, 1000, 1060, 1110, 1160, 1220], 0),
    4: makeSeries([760, 820, 880, 940, 990, 1040, 1010, 1080, 1130, 1190, 1240, 1300], 0),
    5: makeSeries([680, 730, 790, 840, 890, 940, 910, 980, 1030, 1080, 1130, 1180], 0),
  },
}

const monthLabels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const clientDropdownOpen = ref(false)
const selectedClients = ref([])
const clientPeriodType = ref('monthly')
const clientStartDate = ref('2025-01-01')
const clientEndDate = ref('2025-12-31')
const clientCompareYear = ref(false)
const clientChartType = ref('line')

const varietyDropdownOpen = ref(false)
const selectedVarieties = ref([])
const varietyPeriodType = ref('monthly')
const varietyStartDate = ref('2025-01-01')
const varietyEndDate = ref('2025-12-31')
const varietyCompareYear = ref(false)
const varietyChartType = ref('line')

const employeeDropdownOpen = ref(false)
const selectedEmployees = ref([])
const employeePeriodType = ref('monthly')
const employeeStartDate = ref('2025-01-01')
const employeeEndDate = ref('2025-12-31')
const employeeCompareYear = ref(false)
const employeeChartType = ref('line')

const personalUnit = ref('month')
const personalStartDate = ref('2025-01-01')
const personalEndDate = ref('2025-12-31')
const personalCompareYear = ref(false)

const personalCanvas = ref(null)
const clientCanvas = ref(null)
const varietyCanvas = ref(null)
const employeeCanvas = ref(null)
let personalChart = null
let clientChart = null
let varietyChart = null
let employeeChart = null

const getMonthRange = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startMonth = Number.isNaN(start.getTime()) ? 0 : start.getMonth()
  const endMonth = Number.isNaN(end.getTime()) ? 11 : end.getMonth()
  if (endMonth < startMonth) {
    return { startMonth: endMonth, endMonth: startMonth }
  }
  return { startMonth, endMonth }
}

const sumQuarter = (months, startMonth, endMonth) => {
  const data = [0, 0, 0, 0]
  for (let m = startMonth; m <= endMonth; m += 1) {
    data[Math.floor(m / 3)] += months[m]
  }
  const startQ = Math.floor(startMonth / 3)
  const endQ = Math.floor(endMonth / 3)
  return {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'].slice(startQ, endQ + 1),
    values: data.slice(startQ, endQ + 1),
  }
}

const getPersonalData = () => {
  const { startMonth, endMonth } = getMonthRange(personalStartDate.value, personalEndDate.value)
  if (personalUnit.value === 'month') {
    return {
      labels: monthLabels.slice(startMonth, endMonth + 1),
      current: personalSales[2025].slice(startMonth, endMonth + 1),
      previous: personalSales[2024].slice(startMonth, endMonth + 1),
    }
  }

  const currentQuarter = sumQuarter(personalSales[2025], startMonth, endMonth)
  const previousQuarter = sumQuarter(personalSales[2024], startMonth, endMonth)
  return {
    labels: currentQuarter.labels,
    current: currentQuarter.values,
    previous: previousQuarter.values,
  }
}

const selectedClientText = computed(() => {
  if (selectedClients.value.length === 0) return '선택하세요'
  const names = selectedClients.value.map((id) => clients.find((item) => item.id === id)?.name).filter(Boolean)
  return names.length <= 2 ? names.join(', ') : `${names[0]} 외 ${names.length - 1}개`
})

const selectedVarietyText = computed(() => {
  if (selectedVarieties.value.length === 0) return '선택하세요'
  const names = selectedVarieties.value.map((id) => varieties.find((item) => item.id === id)?.name).filter(Boolean)
  return names.length <= 2 ? names.join(', ') : `${names[0]} 외 ${names.length - 1}개`
})

const selectedEmployeeText = computed(() => {
  if (selectedEmployees.value.length === 0) return '선택하세요'
  const names = selectedEmployees.value.map((id) => employees.find((item) => item.id === id)?.name).filter(Boolean)
  return names.length <= 2 ? names.join(', ') : `${names[0]} 외 ${names.length - 1}개`
})

const createLineOrBarDatasets = (items, source, periodType, range, compareYear, chartType) => {
  const labels = periodType === 'monthly'
    ? monthLabels.slice(range.startMonth, range.endMonth + 1)
    : sumQuarter(source[2025][items[0].id], range.startMonth, range.endMonth).labels

  if (items.length === 0) {
    return {
      labels,
      datasets: [{
        label: '항목을 선택하세요',
        data: labels.map(() => 0),
        borderColor: '#d1d5db',
        backgroundColor: '#e5e7eb',
      }],
    }
  }

  if (chartType === 'bar') {
    const currentTotals = items.map((item) => {
      const monthly = source[2025][item.id]
      const values = monthly.slice(range.startMonth, range.endMonth + 1)
      return { name: item.name, amount: values.reduce((sum, value) => sum + value, 0), id: item.id }
    }).sort((a, b) => b.amount - a.amount)

    if (!compareYear) {
      return {
        labels: currentTotals.map((item) => item.name),
        datasets: [{
          label: '2025년 누적 매출',
          data: currentTotals.map((item) => item.amount),
          backgroundColor: currentTotals.map((_, index) => palette[index % palette.length]),
          borderColor: currentTotals.map((_, index) => palette[index % palette.length]),
          borderWidth: 2,
        }],
      }
    }

    const previousTotals = items.map((item) => {
      const monthly = source[2024][item.id]
      const values = monthly.slice(range.startMonth, range.endMonth + 1)
      return { name: item.name, amount: values.reduce((sum, value) => sum + value, 0) }
    })

    return {
      labels: currentTotals.map((item) => item.name),
      datasets: [
        {
          label: '2025년',
          data: currentTotals.map((item) => item.amount),
          backgroundColor: '#3498db',
          borderColor: '#3498db',
          borderWidth: 2,
        },
        {
          label: '2024년 (전년도)',
          data: currentTotals.map((item) => previousTotals.find((prev) => prev.name === item.name)?.amount || 0),
          backgroundColor: '#d1d5db',
          borderColor: '#9ca3af',
          borderWidth: 2,
        },
      ],
    }
  }

  const datasets = []
  items.forEach((item, index) => {
    const monthlyCurrent = source[2025][item.id]
    const current = periodType === 'monthly'
      ? monthlyCurrent.slice(range.startMonth, range.endMonth + 1)
      : sumQuarter(monthlyCurrent, range.startMonth, range.endMonth).values

    datasets.push({
      label: `${item.name} (2025)`,
      data: current,
      borderColor: palette[index % palette.length],
      backgroundColor: `${palette[index % palette.length]}33`,
      tension: 0.35,
      borderWidth: 3,
    })

    if (compareYear) {
      const monthlyPrevious = source[2024][item.id]
      const previous = periodType === 'monthly'
        ? monthlyPrevious.slice(range.startMonth, range.endMonth + 1)
        : sumQuarter(monthlyPrevious, range.startMonth, range.endMonth).values

      datasets.push({
        label: `${item.name} (2024)`,
        data: previous,
        borderColor: '#9ca3af',
        backgroundColor: '#9ca3af33',
        tension: 0.35,
        borderWidth: 2,
        borderDash: [6, 6],
      })
    }
  })

  return { labels, datasets }
}

const renderPersonalChart = () => {
  if (!personalCanvas.value) {
    return
  }

  if (personalChart) {
    personalChart.destroy()
  }

  const data = getPersonalData()
  personalChart = new Chart(personalCanvas.value.getContext('2d'), {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '조회 구간',
          data: data.current,
          borderColor: '#3498db',
          backgroundColor: '#3498db33',
          tension: 0.35,
          borderWidth: 3,
        },
        ...(personalCompareYear.value
          ? [{
            label: '전년도',
            data: data.previous,
            borderColor: '#9ca3af',
            backgroundColor: '#9ca3af33',
            borderDash: [6, 6],
            tension: 0.35,
            borderWidth: 2,
          }]
          : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString()}만원`
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return `${value}만원`
            },
          },
        },
      },
    },
  })
}

const renderClientChart = () => {
  if (!clientCanvas.value) {
    return
  }

  if (clientChart) {
    clientChart.destroy()
  }

  const range = getMonthRange(clientStartDate.value, clientEndDate.value)
  const selected = clients.filter((item) => selectedClients.value.includes(item.id))
  const chartData = createLineOrBarDatasets(selected, clientMonthlySales, clientPeriodType.value, range, clientCompareYear.value, clientChartType.value)

  clientChart = new Chart(clientCanvas.value.getContext('2d'), {
    type: clientChartType.value,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return `${Number(value).toLocaleString()}만원`
            },
          },
        },
      },
    },
  })
}

const renderVarietyChart = () => {
  if (!varietyCanvas.value) {
    return
  }

  if (varietyChart) {
    varietyChart.destroy()
  }

  const range = getMonthRange(varietyStartDate.value, varietyEndDate.value)
  const selected = varieties.filter((item) => selectedVarieties.value.includes(item.id))
  const chartData = createLineOrBarDatasets(selected, varietyMonthlySales, varietyPeriodType.value, range, varietyCompareYear.value, varietyChartType.value)

  varietyChart = new Chart(varietyCanvas.value.getContext('2d'), {
    type: varietyChartType.value,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return `${Number(value).toLocaleString()}만원`
            },
          },
        },
      },
    },
  })
}

const renderEmployeeChart = () => {
  if (!employeeCanvas.value) {
    return
  }

  if (employeeChart) {
    employeeChart.destroy()
  }

  const range = getMonthRange(employeeStartDate.value, employeeEndDate.value)
  const selected = employees.filter((item) => selectedEmployees.value.includes(item.id))
  const chartData = createLineOrBarDatasets(selected, employeeMonthlySales, employeePeriodType.value, range, employeeCompareYear.value, employeeChartType.value)

  employeeChart = new Chart(employeeCanvas.value.getContext('2d'), {
    type: employeeChartType.value,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return `${Number(value).toLocaleString()}만원`
            },
          },
        },
      },
    },
  })
}

watch([personalUnit, personalStartDate, personalEndDate, personalCompareYear], renderPersonalChart)
watch([clientPeriodType, clientStartDate, clientEndDate, clientCompareYear, clientChartType, selectedClients], renderClientChart, { deep: true })
watch([varietyPeriodType, varietyStartDate, varietyEndDate, varietyCompareYear, varietyChartType, selectedVarieties], renderVarietyChart, { deep: true })
watch([employeePeriodType, employeeStartDate, employeeEndDate, employeeCompareYear, employeeChartType, selectedEmployees], renderEmployeeChart, { deep: true })
watch(viewType, async () => {
  await nextTick()
  if (viewType.value === 'personal') {
    renderPersonalChart()
  }
  if (viewType.value === 'client') {
    renderClientChart()
  }
  if (viewType.value === 'variety') {
    renderVarietyChart()
  }
  if (viewType.value === 'employee') {
    renderEmployeeChart()
  }
})

onMounted(() => {
  renderPersonalChart()
})

onBeforeUnmount(() => {
  personalChart?.destroy()
  clientChart?.destroy()
  varietyChart?.destroy()
  employeeChart?.destroy()
})
</script>

<template>
  <section class="screen-content">
    <h2 class="screen-title">{{ title }}</h2>

    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">조회 타입</label>
          <div class="radio-group">
            <label class="radio-option"><input v-model="viewType" type="radio" value="personal"> 개인 매출</label>
            <label v-if="includeEmployeeOption" class="radio-option"><input v-model="viewType" type="radio" value="employee"> 사원별</label>
            <label class="radio-option"><input v-model="viewType" type="radio" value="client"> 거래처별</label>
            <label class="radio-option"><input v-model="viewType" type="radio" value="variety"> 품종별</label>
          </div>
        </div>

        <div v-if="viewType === 'employee'" class="filter-group" style="min-width: 280px;">
          <label class="filter-label">사원 선택</label>
          <div class="multi-select">
            <button type="button" class="multi-select-trigger" @click="employeeDropdownOpen = !employeeDropdownOpen">{{ selectedEmployeeText }}</button>
            <div v-if="employeeDropdownOpen" class="multi-select-dropdown">
              <label v-for="item in employees" :key="item.id" class="multi-select-option">
                <input v-model="selectedEmployees" type="checkbox" :value="item.id"> {{ item.name }}
              </label>
            </div>
          </div>
        </div>

        <div v-if="viewType === 'client'" class="filter-group" style="min-width: 280px;">
          <label class="filter-label">거래처 선택</label>
          <div class="multi-select">
            <button type="button" class="multi-select-trigger" @click="clientDropdownOpen = !clientDropdownOpen">{{ selectedClientText }}</button>
            <div v-if="clientDropdownOpen" class="multi-select-dropdown">
              <label v-for="item in clients" :key="item.id" class="multi-select-option">
                <input v-model="selectedClients" type="checkbox" :value="item.id"> {{ item.name }}
              </label>
            </div>
          </div>
        </div>

        <div v-if="viewType === 'variety'" class="filter-group" style="min-width: 280px;">
          <label class="filter-label">품종 선택</label>
          <div class="multi-select">
            <button type="button" class="multi-select-trigger" @click="varietyDropdownOpen = !varietyDropdownOpen">{{ selectedVarietyText }}</button>
            <div v-if="varietyDropdownOpen" class="multi-select-dropdown">
              <label v-for="item in varieties" :key="item.id" class="multi-select-option">
                <input v-model="selectedVarieties" type="checkbox" :value="item.id"> {{ item.name }}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="viewType === 'personal'" class="section-block">
      <div class="control-row">
        <div class="inline-row">
          <label>기간 단위</label>
          <select v-model="personalUnit"><option value="month">월별</option><option value="quarter">분기별</option></select>
          <input v-model="personalStartDate" type="date">
          <span>~</span>
          <input v-model="personalEndDate" type="date">
        </div>
        <button class="compare-btn" :class="{ active: personalCompareYear }" type="button" @click="personalCompareYear = !personalCompareYear">전년도 대비</button>
      </div>
      <div class="chart-container"><canvas ref="personalCanvas" /></div>
    </div>

    <div v-if="viewType === 'client'" class="section-block">
      <div class="control-row">
        <div class="inline-row">
          <label>기간 단위</label>
          <select v-model="clientPeriodType"><option value="monthly">월별</option><option value="quarterly">분기별</option></select>
          <input v-model="clientStartDate" type="date">
          <span>~</span>
          <input v-model="clientEndDate" type="date">
        </div>
        <button class="compare-btn" :class="{ active: clientCompareYear }" type="button" @click="clientCompareYear = !clientCompareYear">전년도 대비</button>
      </div>
      <div class="chart-toggle">
        <button class="chart-toggle-btn" :class="{ active: clientChartType === 'line' }" @click="clientChartType = 'line'">추이 보기</button>
        <button class="chart-toggle-btn" :class="{ active: clientChartType === 'bar' }" @click="clientChartType = 'bar'">순위 비교</button>
      </div>
      <div class="chart-container"><canvas ref="clientCanvas" /></div>
    </div>

    <div v-if="viewType === 'employee'" class="section-block">
      <div class="control-row">
        <div class="inline-row">
          <label>기간 단위</label>
          <select v-model="employeePeriodType"><option value="monthly">월별</option><option value="quarterly">분기별</option></select>
          <input v-model="employeeStartDate" type="date">
          <span>~</span>
          <input v-model="employeeEndDate" type="date">
        </div>
        <button class="compare-btn" :class="{ active: employeeCompareYear }" type="button" @click="employeeCompareYear = !employeeCompareYear">전년도 대비</button>
      </div>
      <div class="chart-toggle">
        <button class="chart-toggle-btn" :class="{ active: employeeChartType === 'line' }" @click="employeeChartType = 'line'">추이 보기</button>
        <button class="chart-toggle-btn" :class="{ active: employeeChartType === 'bar' }" @click="employeeChartType = 'bar'">순위 비교</button>
      </div>
      <div class="chart-container"><canvas ref="employeeCanvas" /></div>
    </div>

    <div v-if="viewType === 'variety'" class="section-block">
      <div class="control-row">
        <div class="inline-row">
          <label>기간 단위</label>
          <select v-model="varietyPeriodType"><option value="monthly">월별</option><option value="quarterly">분기별</option></select>
          <input v-model="varietyStartDate" type="date">
          <span>~</span>
          <input v-model="varietyEndDate" type="date">
        </div>
        <button class="compare-btn" :class="{ active: varietyCompareYear }" type="button" @click="varietyCompareYear = !varietyCompareYear">전년도 대비</button>
      </div>
      <div class="chart-toggle">
        <button class="chart-toggle-btn" :class="{ active: varietyChartType === 'line' }" @click="varietyChartType = 'line'">추이 보기</button>
        <button class="chart-toggle-btn" :class="{ active: varietyChartType === 'bar' }" @click="varietyChartType = 'bar'">순위 비교</button>
      </div>
      <div class="chart-container"><canvas ref="varietyCanvas" /></div>
    </div>
  </section>
</template>

<style scoped>
.screen-content { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, .1); min-height: 500px; }
.screen-title { font-size: 24px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ecf0f1; }
.filter-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
.filter-row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 8px; }
.filter-label { font-size: 13px; font-weight: 600; color: #555; }
.radio-group { display: flex; gap: 15px; background-color: #fff; padding: 8px 12px; border-radius: 6px; border: 1px solid #ddd; }
.radio-option { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #333; cursor: pointer; }
.multi-select { position: relative; min-width: 250px; }
.multi-select-trigger { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; background-color: #fff; text-align: left; cursor: pointer; }
.multi-select-dropdown { position: absolute; top: 100%; left: 0; right: 0; background-color: #fff; border: 1px solid #ddd; border-radius: 6px; margin-top: 4px; max-height: 220px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 12px rgba(0, 0, 0, .15); }
.multi-select-option { display: flex; gap: 8px; align-items: center; padding: 10px 12px; cursor: pointer; }
.multi-select-option:hover { background-color: #f8f9fa; }
.section-block { margin-top: 10px; }
.control-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.inline-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.inline-row label { font-weight: 600; color: #2c3e50; }
.inline-row select, .inline-row input { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.compare-btn { border: 1px solid #d1d5db; background: #fff; color: #1f2937; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
.compare-btn.active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
.chart-toggle { display: flex; gap: 10px; margin-bottom: 16px; }
.chart-toggle-btn { padding: 10px 20px; background-color: #f8f9fa; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
.chart-toggle-btn.active { background-color: #3498db; border-color: #3498db; color: #fff; }
.chart-container { position: relative; height: 420px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
@media (max-width: 768px) {
  .filter-row { flex-direction: column; align-items: stretch; }
  .radio-group { flex-direction: column; align-items: flex-start; }
  .chart-toggle { flex-direction: column; }
}
</style>
