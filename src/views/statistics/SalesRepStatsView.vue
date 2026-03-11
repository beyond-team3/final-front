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
import { useLayoutState } from '@/composables/layoutState'
import { useAuthStore } from '@/stores/auth'
import { useStatisticsStore } from '@/stores/statisticsStore'
import { ROLES } from '@/utils/constants'

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

const authStore = useAuthStore()
const statisticsStore = useStatisticsStore()
const layoutState = useLayoutState()

const currentYear = new Date().getFullYear()
const viewType = ref('personal')

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

const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 3 + index)
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)

const clientDropdownOpen = ref(false)
const selectedClients = ref([])
const clientPeriodType = ref('monthly')
const clientStartYear = ref(currentYear - 1)
const clientStartMonth = ref(1)
const clientEndYear = ref(currentYear - 1)
const clientEndMonth = ref(12)
const clientCompareYear = ref(false)
const clientChartType = ref('line')

const varietyDropdownOpen = ref(false)
const selectedVarieties = ref([])
const varietyPeriodType = ref('monthly')
const varietyStartYear = ref(currentYear - 1)
const varietyStartMonth = ref(1)
const varietyEndYear = ref(currentYear - 1)
const varietyEndMonth = ref(12)
const varietyCompareYear = ref(false)
const varietyChartType = ref('line')

const employeeDropdownOpen = ref(false)
const selectedEmployees = ref([])
const employeePeriodType = ref('monthly')
const employeeStartYear = ref(currentYear - 1)
const employeeStartMonth = ref(1)
const employeeEndYear = ref(currentYear - 1)
const employeeEndMonth = ref(12)
const employeeCompareYear = ref(false)
const employeeChartType = ref('line')

const personalUnit = ref('month')
const personalStartYear = ref(currentYear - 1)
const personalStartMonth = ref(1)
const personalEndYear = ref(currentYear - 1)
const personalEndMonth = ref(12)
const personalCompareYear = ref(false)

const personalCanvas = ref(null)
const clientCanvas = ref(null)
const varietyCanvas = ref(null)
const employeeCanvas = ref(null)
const loadSequence = ref(0)

let personalChart = null
let clientChart = null
let varietyChart = null
let employeeChart = null

const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const employees = computed(() => statisticsStore.employeeOptions)
const clients = computed(() => statisticsStore.clientOptions)
const varieties = computed(() => statisticsStore.varietyOptions)

const activeStatsState = computed(() => {
  if (viewType.value === 'employee') {
    return statisticsStore.employee
  }
  if (viewType.value === 'client') {
    return statisticsStore.client
  }
  if (viewType.value === 'variety') {
    return statisticsStore.variety
  }
  return statisticsStore.personal
})

const activeLoading = computed(() => statisticsStore.optionsLoading || activeStatsState.value.loading)
const activeError = computed(() => activeStatsState.value.error || statisticsStore.optionsError)

const selectedClientText = computed(() => {
  if (selectedClients.value.length === 0) {
    return '선택하세요'
  }

  const names = selectedClients.value
    .map((id) => clients.value.find((item) => item.id === id)?.name)
    .filter(Boolean)

  return names.length <= 2 ? names.join(', ') : `${names[0]} 외 ${names.length - 1}개`
})

const selectedVarietyText = computed(() => {
  if (selectedVarieties.value.length === 0) {
    return '선택하세요'
  }

  const names = selectedVarieties.value
    .map((id) => varieties.value.find((item) => item.id === id)?.name)
    .filter(Boolean)

  return names.length <= 2 ? names.join(', ') : `${names[0]} 외 ${names.length - 1}개`
})

const selectedEmployeeText = computed(() => {
  if (selectedEmployees.value.length === 0) {
    return '선택하세요'
  }

  const names = selectedEmployees.value
    .map((id) => employees.value.find((item) => item.id === id)?.name)
    .filter(Boolean)

  return names.length <= 2 ? names.join(', ') : `${names[0]} 외 ${names.length - 1}개`
})

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

const padMonth = (value) => String(value).padStart(2, '0')
const getLastDayOfMonth = (year, month) => new Date(year, month, 0).getDate()

const buildQueryParams = (periodType, startYear, startMonth, endYear, endMonth, extra = {}) => ({
  from: `${startYear}-${padMonth(startMonth)}-01`,
  to: `${endYear}-${padMonth(endMonth)}-${padMonth(getLastDayOfMonth(endYear, endMonth))}`,
  period: periodType === 'quarterly' ? 'QUARTERLY' : 'MONTHLY',
  ...extra,
})

const buildPreviousQueryParams = (periodType, startYear, startMonth, endYear, endMonth, extra = {}) => (
  buildQueryParams(periodType, startYear - 1, startMonth, endYear - 1, endMonth, extra)
)

const createPeriodAxis = (range, periodType) => {
  const monthPoints = createMonthPoints(range)

  if (periodType === 'quarterly') {
    const periods = []
    const seen = new Set()

    monthPoints.forEach((point) => {
      const quarter = Math.floor((point.month - 1) / 3) + 1
      const key = `${point.year}-Q${quarter}`

      if (!seen.has(key)) {
        seen.add(key)
        periods.push(key)
      }
    })

    return periods
  }

  return monthPoints.map((point) => `${point.year}-${padMonth(point.month)}`)
}

const formatPeriodLabel = (period, isMultiYear) => {
  if (period.includes('-Q')) {
    const [year, quarter] = period.split('-Q')
    return isMultiYear ? `${year} Q${quarter}` : `Q${quarter}`
  }

  const [year, month] = period.split('-')
  return isMultiYear ? `${year}.${Number(month)}월` : `${Number(month)}월`
}

const mapTrendSeries = (items, axisPeriods) => (
  Array.isArray(items)
    ? items.map((item) => {
      const salesByPeriod = new Map(
        Array.isArray(item?.data)
          ? item.data.map((entry) => [String(entry?.period ?? ''), Number(entry?.sales ?? 0)])
          : [],
      )

      return {
        id: String(item?.targetId ?? ''),
        name: item?.targetName || '미지정',
        values: axisPeriods.map((period) => salesByPeriod.get(period) ?? 0),
      }
    })
    : []
)

const sumSales = (values = []) => values.reduce((total, value) => total + Number(value || 0), 0)

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

const toggleSelectedItem = (listRef, id, checked) => {
  const normalizedId = typeof id === 'number' ? Number(id) : String(id)

  if (checked) {
    if (!listRef.value.includes(normalizedId)) {
      listRef.value = [...listRef.value, normalizedId]
    }
    return
  }

  listRef.value = listRef.value.filter((itemId) => itemId !== normalizedId)
}

const toggleEmployeeSelection = (id, checked) => {
  toggleSelectedItem(selectedEmployees, Number(id), checked)
}

const toggleClientSelection = (id, checked) => {
  toggleSelectedItem(selectedClients, Number(id), checked)
}

const toggleVarietySelection = (id, checked) => {
  toggleSelectedItem(selectedVarieties, String(id), checked)
}

const buildPlaceholderChartData = (message) => ({
  labels: [''],
  datasets: [{
    label: message,
    data: [0],
    borderColor: CHART_COLORS.placeholderLine,
    backgroundColor: CHART_COLORS.placeholderFill,
    borderWidth: 2,
  }],
})

const getPersonalChartData = () => {
  const range = getNormalizedMonthRange(
    personalStartYear.value,
    personalStartMonth.value,
    personalEndYear.value,
    personalEndMonth.value,
  )
  const periodType = personalUnit.value === 'month' ? 'monthly' : 'quarterly'
  const axisPeriods = createPeriodAxis(range, periodType)
  const labels = axisPeriods.map((period) => formatPeriodLabel(period, range.isMultiYear))
  const currentSeries = mapTrendSeries(statisticsStore.personal.current, axisPeriods)[0]
  const previousSeries = mapTrendSeries(statisticsStore.personal.previous, axisPeriods)[0]

  return {
    labels,
    current: currentSeries?.values ?? createZeroValues(labels.length),
    previous: previousSeries?.values ?? createZeroValues(labels.length),
    currentLabel: currentSeries?.name || (isAdmin.value ? '전체' : '개인'),
  }
}

const getScopedChartData = (scope, chartType, periodType, startYear, startMonth, endYear, endMonth, compareYear) => {
  const range = getNormalizedMonthRange(startYear, startMonth, endYear, endMonth)
  const axisPeriods = createPeriodAxis(range, periodType)
  const labels = axisPeriods.map((period) => formatPeriodLabel(period, range.isMultiYear))
  const currentSeries = mapTrendSeries(statisticsStore[scope].current, axisPeriods)
  const previousSeries = mapTrendSeries(statisticsStore[scope].previous, axisPeriods)

  if (currentSeries.length === 0) {
    return buildPlaceholderChartData('항목을 선택하세요')
  }

  if (chartType === 'bar') {
    const totals = currentSeries.map((item) => ({
      id: item.id,
      name: item.name,
      amount: sumSales(item.values),
    })).sort((left, right) => right.amount - left.amount)

    if (!compareYear) {
      return {
        labels: totals.map((item) => item.name),
        datasets: [{
          label: '선택 기간 누적 매출',
          data: totals.map((item) => item.amount),
          backgroundColor: totals.map((_, index) => palette[index % palette.length]),
          borderColor: totals.map((_, index) => palette[index % palette.length]),
          borderWidth: 2,
        }],
      }
    }

    return {
      labels: totals.map((item) => item.name),
      datasets: [
        {
          label: '조회 기간',
          data: totals.map((item) => item.amount),
          backgroundColor: CHART_COLORS.primary,
          borderColor: CHART_COLORS.primary,
          borderWidth: 2,
        },
        {
          label: '전년도 동기간',
          data: totals.map((item) => sumSales(previousSeries.find((series) => series.id === item.id)?.values)),
          backgroundColor: '#d1d5db',
          borderColor: '#9ca3af',
          borderWidth: 2,
        },
      ],
    }
  }

  const datasets = []

  currentSeries.forEach((item, index) => {
    const baseColor = palette[index % palette.length]

    datasets.push({
      label: `${item.name} (조회 기간)`,
      data: item.values,
      borderColor: baseColor,
      backgroundColor: `${baseColor}33`,
      tension: 0.35,
      borderWidth: 3,
    })

    if (compareYear) {
      const compareColor = getLightenedColor(baseColor)
      datasets.push({
        label: `${item.name} (전년도 동기간)`,
        data: previousSeries.find((series) => series.id === item.id)?.values ?? createZeroValues(labels.length),
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

const createChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
    tooltip: {
      callbacks: {
        label(context) {
          const value = Number(context.parsed.y ?? context.parsed ?? 0)
          return `${context.dataset.label}: ${value.toLocaleString()}원`
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback(value) {
          return `${Number(value).toLocaleString()}원`
        },
      },
    },
  },
})

const renderPersonalChart = () => {
  if (!personalCanvas.value) {
    return
  }

  personalChart?.destroy()

  const data = getPersonalChartData()
  personalChart = new Chart(personalCanvas.value.getContext('2d'), {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: `${data.currentLabel} 매출`,
          data: data.current,
          borderColor: CHART_COLORS.primary,
          backgroundColor: `${CHART_COLORS.primary}33`,
          tension: 0.35,
          borderWidth: 3,
        },
        ...(personalCompareYear.value
          ? [{
            label: '전년도 동기간',
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
    options: createChartOptions(),
  })
}

const renderClientChart = () => {
  if (!clientCanvas.value) {
    return
  }

  clientChart?.destroy()

  const chartData = getScopedChartData(
    'client',
    clientChartType.value,
    clientPeriodType.value,
    clientStartYear.value,
    clientStartMonth.value,
    clientEndYear.value,
    clientEndMonth.value,
    clientCompareYear.value,
  )

  clientChart = new Chart(clientCanvas.value.getContext('2d'), {
    type: clientChartType.value,
    data: chartData,
    options: createChartOptions(),
  })
}

const renderVarietyChart = () => {
  if (!varietyCanvas.value) {
    return
  }

  varietyChart?.destroy()

  const chartData = getScopedChartData(
    'variety',
    varietyChartType.value,
    varietyPeriodType.value,
    varietyStartYear.value,
    varietyStartMonth.value,
    varietyEndYear.value,
    varietyEndMonth.value,
    varietyCompareYear.value,
  )

  varietyChart = new Chart(varietyCanvas.value.getContext('2d'), {
    type: varietyChartType.value,
    data: chartData,
    options: createChartOptions(),
  })
}

const renderEmployeeChart = () => {
  if (!employeeCanvas.value) {
    return
  }

  employeeChart?.destroy()

  const chartData = getScopedChartData(
    'employee',
    employeeChartType.value,
    employeePeriodType.value,
    employeeStartYear.value,
    employeeStartMonth.value,
    employeeEndYear.value,
    employeeEndMonth.value,
    employeeCompareYear.value,
  )

  employeeChart = new Chart(employeeCanvas.value.getContext('2d'), {
    type: employeeChartType.value,
    data: chartData,
    options: createChartOptions(),
  })
}

const renderCurrentChart = () => {
  if (viewType.value === 'client') {
    renderClientChart()
    return
  }

  if (viewType.value === 'variety') {
    renderVarietyChart()
    return
  }

  if (viewType.value === 'employee') {
    renderEmployeeChart()
    return
  }

  renderPersonalChart()
}

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

const loadPersonalStats = async () => {
  const periodType = personalUnit.value === 'month' ? 'monthly' : 'quarterly'
  const currentParams = buildQueryParams(
    periodType,
    personalStartYear.value,
    personalStartMonth.value,
    personalEndYear.value,
    personalEndMonth.value,
  )
  const previousParams = personalCompareYear.value
    ? buildPreviousQueryParams(
      periodType,
      personalStartYear.value,
      personalStartMonth.value,
      personalEndYear.value,
      personalEndMonth.value,
    )
    : null

  await statisticsStore.loadPersonalStats({
    isAdmin: isAdmin.value,
    currentParams,
    previousParams,
  })
}

const loadScopedStats = async (scope) => {
  const scopeMap = {
    employee: {
      periodType: employeePeriodType.value,
      startYear: employeeStartYear.value,
      startMonth: employeeStartMonth.value,
      endYear: employeeEndYear.value,
      endMonth: employeeEndMonth.value,
      compareYear: employeeCompareYear.value,
      extra: { employeeIds: selectedEmployees.value },
      selectedIds: selectedEmployees.value,
    },
    client: {
      periodType: clientPeriodType.value,
      startYear: clientStartYear.value,
      startMonth: clientStartMonth.value,
      endYear: clientEndYear.value,
      endMonth: clientEndMonth.value,
      compareYear: clientCompareYear.value,
      extra: { clientIds: selectedClients.value },
      selectedIds: selectedClients.value,
    },
    variety: {
      periodType: varietyPeriodType.value,
      startYear: varietyStartYear.value,
      startMonth: varietyStartMonth.value,
      endYear: varietyEndYear.value,
      endMonth: varietyEndMonth.value,
      compareYear: varietyCompareYear.value,
      extra: { varietyCodes: selectedVarieties.value },
      selectedIds: selectedVarieties.value,
    },
  }

  const target = scopeMap[scope]

  if (!target || target.selectedIds.length === 0) {
    statisticsStore.clearStats(scope)
    return
  }

  const currentParams = buildQueryParams(
    target.periodType,
    target.startYear,
    target.startMonth,
    target.endYear,
    target.endMonth,
    target.extra,
  )
  const previousParams = target.compareYear
    ? buildPreviousQueryParams(
      target.periodType,
      target.startYear,
      target.startMonth,
      target.endYear,
      target.endMonth,
      target.extra,
    )
    : null

  await statisticsStore.loadScopedStats(scope, {
    currentParams,
    previousParams,
  })
}

const loadCurrentViewData = async () => {
  if (viewType.value === 'employee' && (!props.includeEmployeeOption || !isAdmin.value)) {
    viewType.value = 'personal'
    return
  }

  const sequence = loadSequence.value + 1
  loadSequence.value = sequence

  if (viewType.value === 'employee') {
    await loadScopedStats('employee')
  } else if (viewType.value === 'client') {
    await loadScopedStats('client')
  } else if (viewType.value === 'variety') {
    await loadScopedStats('variety')
  } else {
    await loadPersonalStats()
  }

  if (sequence !== loadSequence.value) {
    return
  }

  await nextTick()
  renderCurrentChart()
}

enforceMonthOrder(personalStartYear, personalStartMonth, personalEndYear, personalEndMonth)
enforceMonthOrder(clientStartYear, clientStartMonth, clientEndYear, clientEndMonth)
enforceMonthOrder(varietyStartYear, varietyStartMonth, varietyEndYear, varietyEndMonth)
enforceMonthOrder(employeeStartYear, employeeStartMonth, employeeEndYear, employeeEndMonth)

watch(() => props.includeEmployeeOption, (enabled) => {
  if (!enabled && viewType.value === 'employee') {
    viewType.value = 'personal'
  }
})

watch([
  viewType,
  personalUnit,
  personalStartYear,
  personalStartMonth,
  personalEndYear,
  personalEndMonth,
  personalCompareYear,
  clientPeriodType,
  clientStartYear,
  clientStartMonth,
  clientEndYear,
  clientEndMonth,
  clientCompareYear,
  selectedClients,
  varietyPeriodType,
  varietyStartYear,
  varietyStartMonth,
  varietyEndYear,
  varietyEndMonth,
  varietyCompareYear,
  selectedVarieties,
  employeePeriodType,
  employeeStartYear,
  employeeStartMonth,
  employeeEndYear,
  employeeEndMonth,
  employeeCompareYear,
  selectedEmployees,
], () => {
  void loadCurrentViewData()
}, { deep: true })

watch([
  clientChartType,
  varietyChartType,
  employeeChartType,
], async () => {
  await nextTick()
  renderCurrentChart()
})

watch(() => layoutState?.resizeTick?.value, async () => {
  await nextTick()
  renderCurrentChart()
})

onMounted(async () => {
  try {
    await statisticsStore.loadOptions({ includeEmployees: props.includeEmployeeOption && isAdmin.value })
  } catch {
    // 선택지 로드 실패 시에도 차트 조회는 진행한다.
  }

  await loadCurrentViewData()
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
    <h2 class="mb-5 border-b-2 border-seed-border-divider pb-[15px] text-2xl font-semibold text-seed-text-strong">{{ title }}</h2>

    <div class="mb-5 rounded-[10px] border border-seed-border-card bg-seed-bg-section p-[18px] shadow-[0_1px_2px_rgba(61,53,41,0.06)]">
      <div class="flex flex-wrap items-center gap-5 max-md:flex-col max-md:items-stretch">
        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold tracking-[0.2px] text-seed-text-sub">조회 타입</label>
          <div class="flex gap-3.5 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 py-2.5 max-md:flex-col max-md:items-start">
            <label class="flex cursor-pointer items-center gap-1.5 text-sm text-seed-text-body"><input v-model="viewType" type="radio" value="personal"> 개인 매출</label>
            <label v-if="includeEmployeeOption && isAdmin" class="flex cursor-pointer items-center gap-1.5 text-sm text-seed-text-body"><input v-model="viewType" type="radio" value="employee"> 사원별</label>
            <label class="flex cursor-pointer items-center gap-1.5 text-sm text-seed-text-body"><input v-model="viewType" type="radio" value="client"> 거래처별</label>
            <label class="flex cursor-pointer items-center gap-1.5 text-sm text-seed-text-body"><input v-model="viewType" type="radio" value="variety"> 품종별</label>
          </div>
        </div>

        <div v-if="viewType === 'employee' && includeEmployeeOption && isAdmin" class="min-w-[280px] flex flex-col gap-2">
          <label class="text-xs font-bold tracking-[0.2px] text-seed-text-sub">사원 선택</label>
          <div class="relative min-w-[250px]">
            <button type="button" class="h-[38px] w-full rounded-lg border border-seed-border-card bg-seed-bg-input bg-[var(--color-bg-input)] px-3 text-left text-seed-text-body transition-colors hover:border-seed-olive-light focus-visible:border-seed-olive focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seed-olive/20" @click="employeeDropdownOpen = !employeeDropdownOpen">{{ selectedEmployeeText }}</button>
            <div v-if="employeeDropdownOpen" class="absolute left-0 right-0 top-[calc(100%+4px)] z-[100] max-h-[220px] overflow-y-auto rounded-lg border border-seed-border-card bg-seed-bg-input bg-[var(--color-bg-input)] shadow-[0_8px_20px_rgba(41,37,36,0.12)]">
              <div v-for="item in employees" :key="item.id" class="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-seed-bg-section">
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

        <div v-if="viewType === 'client'" class="min-w-[280px] flex flex-col gap-2">
          <label class="text-xs font-bold tracking-[0.2px] text-seed-text-sub">거래처 선택</label>
          <div class="relative min-w-[250px]">
            <button type="button" class="h-[38px] w-full rounded-lg border border-seed-border-card bg-seed-bg-input bg-[var(--color-bg-input)] px-3 text-left text-seed-text-body transition-colors hover:border-seed-olive-light focus-visible:border-seed-olive focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seed-olive/20" @click="clientDropdownOpen = !clientDropdownOpen">{{ selectedClientText }}</button>
            <div v-if="clientDropdownOpen" class="absolute left-0 right-0 top-[calc(100%+4px)] z-[100] max-h-[220px] overflow-y-auto rounded-lg border border-seed-border-card bg-seed-bg-input bg-[var(--color-bg-input)] shadow-[0_8px_20px_rgba(41,37,36,0.12)]">
              <div v-for="item in clients" :key="item.id" class="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-seed-bg-section">
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

        <div v-if="viewType === 'variety'" class="min-w-[280px] flex flex-col gap-2">
          <label class="text-xs font-bold tracking-[0.2px] text-seed-text-sub">품종 선택</label>
          <div class="relative min-w-[250px]">
            <button type="button" class="h-[38px] w-full rounded-lg border border-seed-border-card bg-seed-bg-input bg-[var(--color-bg-input)] px-3 text-left text-seed-text-body transition-colors hover:border-seed-olive-light focus-visible:border-seed-olive focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seed-olive/20" @click="varietyDropdownOpen = !varietyDropdownOpen">{{ selectedVarietyText }}</button>
            <div v-if="varietyDropdownOpen" class="absolute left-0 right-0 top-[calc(100%+4px)] z-[100] max-h-[220px] overflow-y-auto rounded-lg border border-seed-border-card bg-seed-bg-input bg-[var(--color-bg-input)] shadow-[0_8px_20px_rgba(41,37,36,0.12)]">
              <div v-for="item in varieties" :key="item.id" class="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-seed-bg-section">
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

    <div v-if="activeError" class="mb-4 rounded-lg border border-[#e8d3d3] bg-[#fff7f7] px-4 py-3 text-sm text-[#9b3d3d]">
      {{ activeError }}
    </div>

    <div v-if="activeLoading" class="mb-4 rounded-lg border border-seed-border-card bg-seed-bg-section px-4 py-3 text-sm text-seed-text-sub">
      통계 데이터를 불러오는 중입니다.
    </div>

    <div v-if="viewType === 'personal'" class="mt-2.5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 rounded-[10px] border border-seed-border-card bg-seed-bg-input px-3 py-2.5">
          <label class="mr-0.5 text-[13px] font-bold text-seed-text-body">기간 단위</label>
          <select v-model="personalUnit" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20"><option value="month">월별</option><option value="quarter">분기별</option></select>
          <select v-model.number="personalStartYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`personal-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="personalStartMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`personal-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span class="font-semibold text-seed-text-sub">~</span>
          <select v-model.number="personalEndYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`personal-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="personalEndMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`personal-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
        </div>
        <button class="rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors" :class="personalCompareYear ? 'border-seed-olive bg-seed-olive-light text-seed-olive-dark' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:border-seed-olive-light hover:bg-seed-bg-section'" type="button" @click="personalCompareYear = !personalCompareYear">전년도 대비</button>
      </div>
      <div class="chart-canvas-full relative h-[420px] overflow-hidden rounded-xl border border-seed-border-card p-3"><canvas ref="personalCanvas" /></div>
    </div>

    <div v-if="viewType === 'client'" class="mt-2.5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 rounded-[10px] border border-seed-border-card bg-seed-bg-input px-3 py-2.5">
          <label class="mr-0.5 text-[13px] font-bold text-seed-text-body">기간 단위</label>
          <select v-model="clientPeriodType" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20"><option value="monthly">월별</option><option value="quarterly">분기별</option></select>
          <select v-model.number="clientStartYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`client-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="clientStartMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`client-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span class="font-semibold text-seed-text-sub">~</span>
          <select v-model.number="clientEndYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`client-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="clientEndMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`client-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
        </div>
        <button class="rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors" :class="clientCompareYear ? 'border-seed-olive bg-seed-olive-light text-seed-olive-dark' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:border-seed-olive-light hover:bg-seed-bg-section'" type="button" @click="clientCompareYear = !clientCompareYear">전년도 대비</button>
      </div>
      <div class="mb-4 flex gap-2.5 max-md:flex-col">
        <button class="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors" :class="clientChartType === 'line' ? 'border-seed-olive-dark bg-seed-olive text-white' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:bg-seed-bg-section'" @click="clientChartType = 'line'">추이 보기</button>
        <button class="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors" :class="clientChartType === 'bar' ? 'border-seed-olive-dark bg-seed-olive text-white' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:bg-seed-bg-section'" @click="clientChartType = 'bar'">순위 비교</button>
      </div>
      <div class="chart-canvas-full relative h-[420px] overflow-hidden rounded-xl border border-seed-border-card p-3"><canvas ref="clientCanvas" /></div>
    </div>

    <div v-if="viewType === 'employee'" class="mt-2.5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 rounded-[10px] border border-seed-border-card bg-seed-bg-input px-3 py-2.5">
          <label class="mr-0.5 text-[13px] font-bold text-seed-text-body">기간 단위</label>
          <select v-model="employeePeriodType" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20"><option value="monthly">월별</option><option value="quarterly">분기별</option></select>
          <select v-model.number="employeeStartYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`employee-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="employeeStartMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`employee-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span class="font-semibold text-seed-text-sub">~</span>
          <select v-model.number="employeeEndYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`employee-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="employeeEndMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`employee-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
        </div>
        <button class="rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors" :class="employeeCompareYear ? 'border-seed-olive bg-seed-olive-light text-seed-olive-dark' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:border-seed-olive-light hover:bg-seed-bg-section'" type="button" @click="employeeCompareYear = !employeeCompareYear">전년도 대비</button>
      </div>
      <div class="mb-4 flex gap-2.5 max-md:flex-col">
        <button class="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors" :class="employeeChartType === 'line' ? 'border-seed-olive-dark bg-seed-olive text-white' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:bg-seed-bg-section'" @click="employeeChartType = 'line'">추이 보기</button>
        <button class="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors" :class="employeeChartType === 'bar' ? 'border-seed-olive-dark bg-seed-olive text-white' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:bg-seed-bg-section'" @click="employeeChartType = 'bar'">순위 비교</button>
      </div>
      <div class="chart-canvas-full relative h-[420px] overflow-hidden rounded-xl border border-seed-border-card p-3"><canvas ref="employeeCanvas" /></div>
    </div>

    <div v-if="viewType === 'variety'" class="mt-2.5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 rounded-[10px] border border-seed-border-card bg-seed-bg-input px-3 py-2.5">
          <label class="mr-0.5 text-[13px] font-bold text-seed-text-body">기간 단위</label>
          <select v-model="varietyPeriodType" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20"><option value="monthly">월별</option><option value="quarterly">분기별</option></select>
          <select v-model.number="varietyStartYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`variety-start-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="varietyStartMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`variety-start-month-${month}`" :value="month">{{ month }}월</option>
          </select>
          <span class="font-semibold text-seed-text-sub">~</span>
          <select v-model.number="varietyEndYear" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="year in yearOptions" :key="`variety-end-year-${year}`" :value="year">{{ year }}년</option>
          </select>
          <select v-model.number="varietyEndMonth" class="h-9 rounded-lg border border-seed-border-card bg-seed-bg-input px-3 text-[13px] text-seed-text-body transition-colors hover:border-seed-olive-light focus:border-seed-olive focus:outline-none focus:ring-4 focus:ring-seed-olive/20">
            <option v-for="month in monthOptions" :key="`variety-end-month-${month}`" :value="month">{{ month }}월</option>
          </select>
        </div>
        <button class="rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors" :class="varietyCompareYear ? 'border-seed-olive bg-seed-olive-light text-seed-olive-dark' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:border-seed-olive-light hover:bg-seed-bg-section'" type="button" @click="varietyCompareYear = !varietyCompareYear">전년도 대비</button>
      </div>
      <div class="mb-4 flex gap-2.5 max-md:flex-col">
        <button class="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors" :class="varietyChartType === 'line' ? 'border-seed-olive-dark bg-seed-olive text-white' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:bg-seed-bg-section'" @click="varietyChartType = 'line'">추이 보기</button>
        <button class="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors" :class="varietyChartType === 'bar' ? 'border-seed-olive-dark bg-seed-olive text-white' : 'border-seed-border-card bg-seed-bg-input text-seed-text-body hover:bg-seed-bg-section'" @click="varietyChartType = 'bar'">순위 비교</button>
      </div>
      <div class="chart-canvas-full relative h-[420px] overflow-hidden rounded-xl border border-seed-border-card p-3"><canvas ref="varietyCanvas" /></div>
    </div>
  </section>
</template>

<style scoped>
.chart-canvas-full :deep(canvas) {
  display: block;
  width: 100% !important;
  max-width: 100% !important;
}
</style>
