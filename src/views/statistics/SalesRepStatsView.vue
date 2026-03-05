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
import CedarCheckbox from '@/components/common/CedarCheckbox.vue'

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

const CHART_COLORS = {
  primary: '#7A8C42',
  secondary: '#C8622A',
  info: '#8A9BAE',
  error: '#B85C5C',
  neutral: '#9A8C7E',
  placeholderLine: '#BFB3A5',
  placeholderFill: '#E8E3D8',
}

const palette = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.info,
  CHART_COLORS.error,
  CHART_COLORS.neutral,
]

const hexToRgb = (hexColor) => {
  const normalized = hexColor.replace('#', '')
  const fullHex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized

  const value = Number.parseInt(fullHex, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

const getLightenedColor = (hexColor, ratio = 0.35) => {
  const { r, g, b } = hexToRgb(hexColor)
  const lighten = (channel) => Math.round(channel + ((255 - channel) * ratio))
  return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`
}

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
const yearOptions = [2023, 2024, 2025, 2026]
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)

const clientDropdownOpen = ref(false)
const selectedClients = ref([])
const clientPeriodType = ref('monthly')
const clientStartYear = ref(2025)
const clientStartMonth = ref(1)
const clientEndYear = ref(2025)
const clientEndMonth = ref(12)
const clientCompareYear = ref(false)
const clientChartType = ref('line')

const varietyDropdownOpen = ref(false)
const selectedVarieties = ref([])
const varietyPeriodType = ref('monthly')
const varietyStartYear = ref(2025)
const varietyStartMonth = ref(1)
const varietyEndYear = ref(2025)
const varietyEndMonth = ref(12)
const varietyCompareYear = ref(false)
const varietyChartType = ref('line')

const employeeDropdownOpen = ref(false)
const selectedEmployees = ref([])
const employeePeriodType = ref('monthly')
const employeeStartYear = ref(2025)
const employeeStartMonth = ref(1)
const employeeEndYear = ref(2025)
const employeeEndMonth = ref(12)
const employeeCompareYear = ref(false)
const employeeChartType = ref('line')

const personalUnit = ref('month')
const personalStartYear = ref(2025)
const personalStartMonth = ref(1)
const personalEndYear = ref(2025)
const personalEndMonth = ref(12)
const personalCompareYear = ref(false)

const personalCanvas = ref(null)
const clientCanvas = ref(null)
const varietyCanvas = ref(null)
const employeeCanvas = ref(null)
let personalChart = null
let clientChart = null
let varietyChart = null
let employeeChart = null

const toMonthIndex = (year, month) => (Number(year) * 12) + (Number(month) - 1)
const fromMonthIndex = (index) => ({ year: Math.floor(index / 12), month: (index % 12) + 1 })
const createZeroValues = (length) => Array.from({ length }, () => 0)

const getNormalizedMonthRange = (startYear, startMonth, endYear, endMonth) => {
  const startIndex = toMonthIndex(startYear, startMonth)
  const endIndex = toMonthIndex(endYear, endMonth)
  const normalizedStartIndex = Math.min(startIndex, endIndex)
  const normalizedEndIndex = Math.max(startIndex, endIndex)
  const start = fromMonthIndex(normalizedStartIndex)
  const end = fromMonthIndex(normalizedEndIndex)
  return {
    ...start,
    endYear: end.year,
    endMonth: end.month,
    startIndex: normalizedStartIndex,
    endIndex: normalizedEndIndex,
    isMultiYear: start.year !== end.year,
  }
}

const createMonthPoints = (range) => {
  const points = []
  for (let index = range.startIndex; index <= range.endIndex; index += 1) {
    points.push(fromMonthIndex(index))
  }
  return points
}

const formatMonthLabel = (point, isMultiYear) => {
  if (isMultiYear && (point.month === 1 || point.month === 12)) {
    return `${point.year}.${point.month}월`
  }
  return monthLabels[point.month - 1]
}

const MAX_MONTH_TICKS = 12
const toMonthlyContexts = (monthPoints) => monthPoints.map((point) => ({ points: [point] }))

const compressMonthlyContexts = (monthPoints) => {
  if (monthPoints.length <= MAX_MONTH_TICKS) {
    return toMonthlyContexts(monthPoints)
  }
  const groupSize = Math.ceil(monthPoints.length / MAX_MONTH_TICKS)
  const contexts = []
  for (let index = 0; index < monthPoints.length; index += groupSize) {
    contexts.push({
      points: monthPoints.slice(index, index + groupSize),
    })
  }
  return contexts
}

const formatMonthlyContextLabel = (context, isMultiYear) => {
  const start = context.points[0]
  return formatMonthLabel(start, isMultiYear)
}

const getPeriodContexts = (monthPoints, periodType, isMultiYear) => {
  if (periodType === 'monthly') {
    const contexts = compressMonthlyContexts(monthPoints)
    return {
      labels: contexts.map((context) => formatMonthlyContextLabel(context, isMultiYear)),
      contexts,
    }
  }

  const quarterMap = new Map()
  monthPoints.forEach((point) => {
    const quarter = Math.floor((point.month - 1) / 3) + 1
    const key = `${point.year}-${quarter}`
    if (!quarterMap.has(key)) {
      quarterMap.set(key, {
        year: point.year,
        quarter,
        points: [],
      })
    }
    quarterMap.get(key).points.push(point)
  })
  const contexts = Array.from(quarterMap.values())
  return {
    labels: contexts.map((context) => (isMultiYear ? `${context.year} Q${context.quarter}` : `Q${context.quarter}`)),
    contexts,
  }
}

const getValuesByContexts = (contexts, periodType, resolver) => {
  if (periodType === 'monthly') {
    return contexts.map((context) => context.points.reduce((sum, point) => sum + resolver(point), 0))
  }
  return contexts.map((context) => context.points.reduce((sum, point) => sum + resolver(point), 0))
}

const getPersonalMonthlyValue = (year, month) => personalSales?.[year]?.[month - 1] ?? 0
const getEntityMonthlyValue = (source, id, year, month) => source?.[year]?.[id]?.[month - 1] ?? 0

const enforceMonthOrder = (startYearRef, startMonthRef, endYearRef, endMonthRef) => {
  watch([startYearRef, startMonthRef, endYearRef, endMonthRef], ([startY, startM, endY, endM]) => {
    if (toMonthIndex(startY, startM) <= toMonthIndex(endY, endM)) {
      return
    }
    const nextStartYear = endY
    const nextStartMonth = endM
    endYearRef.value = startY
    endMonthRef.value = startM
    startYearRef.value = nextStartYear
    startMonthRef.value = nextStartMonth
  })
}

enforceMonthOrder(personalStartYear, personalStartMonth, personalEndYear, personalEndMonth)
enforceMonthOrder(clientStartYear, clientStartMonth, clientEndYear, clientEndMonth)
enforceMonthOrder(varietyStartYear, varietyStartMonth, varietyEndYear, varietyEndMonth)
enforceMonthOrder(employeeStartYear, employeeStartMonth, employeeEndYear, employeeEndMonth)

const getPersonalData = () => {
  const range = getNormalizedMonthRange(
    personalStartYear.value,
    personalStartMonth.value,
    personalEndYear.value,
    personalEndMonth.value,
  )
  const monthPoints = createMonthPoints(range)
  const periodType = personalUnit.value === 'month' ? 'monthly' : 'quarterly'
  const { labels, contexts } = getPeriodContexts(monthPoints, periodType, range.isMultiYear)

  return {
    labels,
    current: getValuesByContexts(contexts, periodType, (point) => getPersonalMonthlyValue(point.year, point.month)),
    previous: getValuesByContexts(contexts, periodType, (point) => getPersonalMonthlyValue(point.year - 1, point.month)),
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

const toggleSelectedItem = (listRef, id, checked) => {
  const numericId = Number(id)
  if (checked) {
    if (!listRef.value.includes(numericId)) {
      listRef.value = [...listRef.value, numericId]
    }
    return
  }
  listRef.value = listRef.value.filter((itemId) => itemId !== numericId)
}

const toggleEmployeeSelection = (id, checked) => {
  toggleSelectedItem(selectedEmployees, id, checked)
}

const toggleClientSelection = (id, checked) => {
  toggleSelectedItem(selectedClients, id, checked)
}

const toggleVarietySelection = (id, checked) => {
  toggleSelectedItem(selectedVarieties, id, checked)
}

const createLineOrBarDatasets = (items, source, periodType, range, compareYear, chartType) => {
  const monthPoints = createMonthPoints(range)
  const { labels, contexts } = getPeriodContexts(monthPoints, periodType, range.isMultiYear)
  const emptyValues = createZeroValues(labels.length)

  if (items.length === 0) {
    return {
      labels,
      datasets: [{
        label: '항목을 선택하세요',
        data: emptyValues,
        borderColor: CHART_COLORS.placeholderLine,
        backgroundColor: CHART_COLORS.placeholderFill,
      }],
    }
  }

  if (chartType === 'bar') {
    const currentTotals = items.map((item) => {
      const values = monthPoints.map((point) => getEntityMonthlyValue(source, item.id, point.year, point.month))
      return { name: item.name, amount: values.reduce((sum, value) => sum + value, 0), id: item.id }
    }).sort((a, b) => b.amount - a.amount)

    if (!compareYear) {
      return {
        labels: currentTotals.map((item) => item.name),
        datasets: [{
          label: '선택 기간 누적 매출',
          data: currentTotals.map((item) => item.amount),
          backgroundColor: currentTotals.map((_, index) => palette[index % palette.length]),
          borderColor: currentTotals.map((_, index) => palette[index % palette.length]),
          borderWidth: 2,
        }],
      }
    }

    const previousTotals = items.map((item) => {
      const values = monthPoints.map((point) => getEntityMonthlyValue(source, item.id, point.year - 1, point.month))
      return { name: item.name, amount: values.reduce((sum, value) => sum + value, 0) }
    })

    return {
      labels: currentTotals.map((item) => item.name),
      datasets: [
        {
          label: '조회 기간',
          data: currentTotals.map((item) => item.amount),
          backgroundColor: CHART_COLORS.primary,
          borderColor: CHART_COLORS.primary,
          borderWidth: 2,
        },
        {
          label: '전년도 동기간',
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
    const current = getValuesByContexts(
      contexts,
      periodType,
      (point) => getEntityMonthlyValue(source, item.id, point.year, point.month),
    )

    datasets.push({
      label: `${item.name} (조회 기간)`,
      data: current,
      borderColor: palette[index % palette.length],
      backgroundColor: `${palette[index % palette.length]}33`,
      tension: 0.35,
      borderWidth: 3,
    })

    if (compareYear) {
      const baseColor = palette[index % palette.length]
      const compareColor = getLightenedColor(baseColor)
      const previous = getValuesByContexts(
        contexts,
        periodType,
        (point) => getEntityMonthlyValue(source, item.id, point.year - 1, point.month),
      )

      datasets.push({
        label: `${item.name} (전년도 동기간)`,
        data: previous,
        borderColor: compareColor,
        backgroundColor: `${compareColor.replace('rgb', 'rgba').replace(')', ', 0.22)')}`,
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
          borderColor: CHART_COLORS.primary,
          backgroundColor: `${CHART_COLORS.primary}33`,
          tension: 0.35,
          borderWidth: 3,
        },
        ...(personalCompareYear.value
          ? [{
            label: '전년도',
            data: data.previous,
            borderColor: CHART_COLORS.info,
            backgroundColor: `${CHART_COLORS.info}33`,
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

  const range = getNormalizedMonthRange(
    clientStartYear.value,
    clientStartMonth.value,
    clientEndYear.value,
    clientEndMonth.value,
  )
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

  const range = getNormalizedMonthRange(
    varietyStartYear.value,
    varietyStartMonth.value,
    varietyEndYear.value,
    varietyEndMonth.value,
  )
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

  const range = getNormalizedMonthRange(
    employeeStartYear.value,
    employeeStartMonth.value,
    employeeEndYear.value,
    employeeEndMonth.value,
  )
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

watch([
  personalUnit,
  personalStartYear,
  personalStartMonth,
  personalEndYear,
  personalEndMonth,
  personalCompareYear,
], renderPersonalChart)
watch([
  clientPeriodType,
  clientStartYear,
  clientStartMonth,
  clientEndYear,
  clientEndMonth,
  clientCompareYear,
  clientChartType,
  selectedClients,
], renderClientChart, { deep: true })
watch([
  varietyPeriodType,
  varietyStartYear,
  varietyStartMonth,
  varietyEndYear,
  varietyEndMonth,
  varietyCompareYear,
  varietyChartType,
  selectedVarieties,
], renderVarietyChart, { deep: true })
watch([
  employeePeriodType,
  employeeStartYear,
  employeeStartMonth,
  employeeEndYear,
  employeeEndMonth,
  employeeCompareYear,
  employeeChartType,
  selectedEmployees,
], renderEmployeeChart, { deep: true })
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
              <div v-for="item in employees" :key="item.id" class="multi-select-option">
                <CedarCheckbox
                  :id="`employee-option-${item.id}`"
                  :label="item.name"
                  :model-value="selectedEmployees.includes(item.id)"
                  @update:model-value="(checked) => toggleEmployeeSelection(item.id, checked)"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="viewType === 'client'" class="filter-group" style="min-width: 280px;">
          <label class="filter-label">거래처 선택</label>
          <div class="multi-select">
            <button type="button" class="multi-select-trigger" @click="clientDropdownOpen = !clientDropdownOpen">{{ selectedClientText }}</button>
            <div v-if="clientDropdownOpen" class="multi-select-dropdown">
              <div v-for="item in clients" :key="item.id" class="multi-select-option">
                <CedarCheckbox
                  :id="`client-option-${item.id}`"
                  :label="item.name"
                  :model-value="selectedClients.includes(item.id)"
                  @update:model-value="(checked) => toggleClientSelection(item.id, checked)"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="viewType === 'variety'" class="filter-group" style="min-width: 280px;">
          <label class="filter-label">품종 선택</label>
          <div class="multi-select">
            <button type="button" class="multi-select-trigger" @click="varietyDropdownOpen = !varietyDropdownOpen">{{ selectedVarietyText }}</button>
            <div v-if="varietyDropdownOpen" class="multi-select-dropdown">
              <div v-for="item in varieties" :key="item.id" class="multi-select-option">
                <CedarCheckbox
                  :id="`variety-option-${item.id}`"
                  :label="item.name"
                  :model-value="selectedVarieties.includes(item.id)"
                  @update:model-value="(checked) => toggleVarietySelection(item.id, checked)"
                />
              </div>
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
          <select v-model.number="personalStartYear">
            <option v-for="year in yearOptions" :key="`personal-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="personalStartMonth">
            <option v-for="month in monthOptions" :key="`personal-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span>~</span>
          <select v-model.number="personalEndYear">
            <option v-for="year in yearOptions" :key="`personal-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="personalEndMonth">
            <option v-for="month in monthOptions" :key="`personal-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
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
          <select v-model.number="clientStartYear">
            <option v-for="year in yearOptions" :key="`client-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="clientStartMonth">
            <option v-for="month in monthOptions" :key="`client-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span>~</span>
          <select v-model.number="clientEndYear">
            <option v-for="year in yearOptions" :key="`client-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="clientEndMonth">
            <option v-for="month in monthOptions" :key="`client-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
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
          <select v-model.number="employeeStartYear">
            <option v-for="year in yearOptions" :key="`employee-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="employeeStartMonth">
            <option v-for="month in monthOptions" :key="`employee-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span>~</span>
          <select v-model.number="employeeEndYear">
            <option v-for="year in yearOptions" :key="`employee-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="employeeEndMonth">
            <option v-for="month in monthOptions" :key="`employee-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
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
          <select v-model.number="varietyStartYear">
            <option v-for="year in yearOptions" :key="`variety-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="varietyStartMonth">
            <option v-for="month in monthOptions" :key="`variety-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span>~</span>
          <select v-model.number="varietyEndYear">
            <option v-for="year in yearOptions" :key="`variety-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="varietyEndMonth">
            <option v-for="month in monthOptions" :key="`variety-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
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

<style scoped>.screen-title { font-size: 24px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ecf0f1; }
.filter-section {
  background: var(--cdr-color-background-page-default, var(--color-bg-section, var(--color-sidebar-hover)));
  border: 1px solid var(--cdr-color-border-separator-weak, var(--color-border-card, var(--color-border)));
  padding: 18px;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(61, 53, 41, 0.06);
}
.filter-row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 8px; }
.filter-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-sub, var(--color-muted));
  letter-spacing: 0.2px;
}
.radio-group {
  display: flex;
  gap: 14px;
  background: var(--cdr-color-background-input-default, var(--color-bg-input, var(--color-surface)));
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--cdr-color-border-input-default, var(--color-border-card, var(--color-border)));
}
.radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-text-body, var(--color-text));
  cursor: pointer;
}
.multi-select { position: relative; min-width: 250px; }
.multi-select-trigger {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--cdr-color-border-input-default, var(--color-border-card, var(--color-border)));
  border-radius: 8px;
  background: var(--cdr-color-background-input-default, var(--color-bg-input, var(--color-surface)));
  text-align: left;
  color: var(--color-text-body, var(--color-text));
  cursor: pointer;
}
.multi-select-trigger:hover {
  border-color: var(--cdr-color-border-input-default-hover, var(--color-olive-light, var(--color-border-focus)));
}
.multi-select-trigger:focus-visible {
  outline: none;
  border-color: var(--cdr-color-border-input-default-active, var(--color-olive, var(--color-border-focus)));
  box-shadow: 0 0 0 3px rgba(122, 140, 66, 0.18);
}
.multi-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--cdr-color-background-input-default, var(--color-bg-input, var(--color-surface)));
  border: 1px solid var(--cdr-color-border-input-default, var(--color-border-card, var(--color-border)));
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 8px 20px rgba(41, 37, 36, 0.12);
}
.multi-select-option { display: flex; gap: 8px; align-items: center; padding: 10px 12px; cursor: pointer; }
.multi-select-option:hover { background: var(--color-bg-section, var(--color-sidebar-hover)); }
.section-block { margin-top: 10px; }
.control-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.inline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--color-border-card, var(--color-border));
  border-radius: 10px;
  background: var(--color-bg-input, var(--color-surface));
}
.inline-row label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-body, var(--color-text));
  margin-right: 2px;
}
.inline-row span {
  color: var(--color-text-sub, var(--color-muted));
  font-weight: 600;
}
.inline-row select,
.inline-row input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--cdr-color-border-input-default, var(--color-border-card, var(--color-border)));
  border-radius: 8px;
  background: var(--cdr-color-background-input-default, var(--color-bg-input, var(--color-surface)));
  color: var(--color-text-body, var(--color-text));
  font-size: 13px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}
.inline-row select:hover,
.inline-row input:hover {
  border-color: var(--cdr-color-border-input-default-hover, var(--color-olive-light, var(--color-border-focus)));
}
.inline-row select:focus,
.inline-row input:focus {
  outline: none;
  border-color: var(--cdr-color-border-input-default-active, var(--color-olive, var(--color-border-focus)));
  box-shadow: 0 0 0 3px rgba(122, 140, 66, 0.18);
}
.compare-btn {
  border: 1px solid var(--color-border-card, var(--color-border));
  background: var(--color-bg-input, var(--color-surface));
  color: var(--color-text-body, var(--color-text));
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.compare-btn:hover {
  background: var(--color-bg-section, var(--color-sidebar-hover));
  border-color: var(--color-olive-light, var(--color-border-focus));
}
.compare-btn.active {
  border-color: var(--color-olive, var(--color-border-focus));
  background: var(--color-olive-light, #ecf3e5);
  color: var(--color-olive-dark, var(--color-olive));
}
.chart-toggle { display: flex; gap: 10px; margin-bottom: 16px; }
.chart-toggle-btn {
  padding: 10px 20px;
  background: var(--color-bg-input, var(--color-surface));
  border: 1px solid var(--color-border-card, var(--color-border));
  color: var(--color-text-body, var(--color-text));
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.chart-toggle-btn:hover {
  background: var(--color-bg-section, var(--color-sidebar-hover));
}
.chart-toggle-btn.active {
  background: var(--color-olive, #7a8c42);
  border-color: var(--color-olive-dark, #586830);
  color: #fff;
}
.chart-container { position: relative; height: 420px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; overflow: hidden; }
.chart-container :deep(canvas) { display: block; width: 100% !important; max-width: 100% !important; }
@media (max-width: 768px) {
  .filter-row { flex-direction: column; align-items: stretch; }
  .radio-group { flex-direction: column; align-items: flex-start; }
  .chart-toggle { flex-direction: column; }
}
</style>
