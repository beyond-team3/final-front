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
import {
  buildPreviousTrendQuery,
  buildRankingQuery,
  buildTrendQuery,
  mapRankingToChartData,
  mapTrendSeriesToChartData,
} from '@/api/statistics'
import { useBillingStatsV2 } from '@/config/featureFlags'
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
const clientDropdownOpen = ref(false)
const selectedClients = ref([])
const clientPeriodType = ref('monthly')
const clientStartYear = ref(currentYear)
const clientStartMonth = ref(1)
const clientEndYear = ref(currentYear)
const clientEndMonth = ref(12)
const clientCompareYear = ref(false)
const clientChartType = ref('line')
const varietyDropdownOpen = ref(false)
const selectedVarieties = ref([])
const varietyPeriodType = ref('monthly')
const varietyStartYear = ref(currentYear)
const varietyStartMonth = ref(1)
const varietyEndYear = ref(currentYear)
const varietyEndMonth = ref(12)
const varietyCompareYear = ref(false)
const varietyChartType = ref('line')
const employeeDropdownOpen = ref(false)
const selectedEmployees = ref([])
const employeePeriodType = ref('monthly')
const employeeStartYear = ref(currentYear)
const employeeStartMonth = ref(1)
const employeeEndYear = ref(currentYear)
const employeeEndMonth = ref(12)
const employeeCompareYear = ref(false)
const employeeChartType = ref('line')
const personalUnit = ref('month')
const personalStartYear = ref(currentYear)
const personalStartMonth = ref(1)
const personalEndYear = ref(currentYear)
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
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const employees = computed(() => statisticsStore.employeeOptions)
const clients = computed(() => statisticsStore.clientOptions)
const varieties = computed(() => statisticsStore.varietyOptions)
const isRankingView = computed(() => (
  (viewType.value === 'employee' && employeeChartType.value === 'bar')
  || (viewType.value === 'client' && clientChartType.value === 'bar')
  || (viewType.value === 'variety' && varietyChartType.value === 'bar')
))

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

const activeLoading = computed(() => (
  statisticsStore.optionsLoading
  || activeStatsState.value.loading
  || (isRankingView.value ? activeStatsState.value.rankingLoading : false)
))

const activeError = computed(() => (
  activeStatsState.value.error
  || (isRankingView.value ? activeStatsState.value.rankingError : null)
  || statisticsStore.optionsError
))

const activeRankingItems = computed(() => {
  if (viewType.value === 'employee') {
    return statisticsStore.employee.ranking
  }
  if (viewType.value === 'client') {
    return statisticsStore.client.ranking
  }
  if (viewType.value === 'variety') {
    return statisticsStore.variety.ranking
  }
  return []
})

const showRankingTable = computed(() => isRankingView.value && activeRankingItems.value.length > 0)
const showBillingRevenueSection = computed(() => useBillingStatsV2())
const billingRevenue = computed(() => statisticsStore.billingRevenue)
const billingRevenueDateRange = computed(() => ({
  from: `${personalStartYear.value}-${String(personalStartMonth.value).padStart(2, '0')}-01`,
  to: `${personalEndYear.value}-${String(personalEndMonth.value).padStart(2, '0')}-31`,
}))

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

const createZeroValues = (length) => Array.from({ length }, () => 0)

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
  const current = mapTrendSeriesToChartData(statisticsStore.personal.current)
  const previous = mapTrendSeriesToChartData(statisticsStore.personal.previous)
  const currentSeries = current.series[0]
  const previousSeries = previous.series[0]
  const labels = current.labels.length > 0 ? current.labels : previous.labels

  return {
    labels,
    current: currentSeries?.values ?? createZeroValues(labels.length),
    previous: previousSeries?.values ?? createZeroValues(labels.length),
    currentLabel: currentSeries?.name || (isAdmin.value ? '전체' : '개인'),
  }
}

const getScopedChartData = (scope, chartType, compareYear) => {
  if (chartType === 'bar') {
    const rankingData = mapRankingToChartData(statisticsStore[scope].ranking)

    if (rankingData.rankings.length === 0) {
      return buildPlaceholderChartData('항목을 선택하세요')
    }

    return {
      labels: rankingData.labels,
      datasets: [{
        label: '매출 랭킹',
        data: rankingData.values,
        backgroundColor: rankingData.values.map((_, index) => palette[index % palette.length]),
        borderColor: rankingData.values.map((_, index) => palette[index % palette.length]),
        borderWidth: 2,
      }],
    }
  }

  const current = mapTrendSeriesToChartData(statisticsStore[scope].current)
  const previous = mapTrendSeriesToChartData(statisticsStore[scope].previous)
  const labels = current.labels.length > 0 ? current.labels : previous.labels

  if (labels.length === 0 || current.series.length === 0) {
    return buildPlaceholderChartData('항목을 선택하세요')
  }

  const datasets = []

  current.series.forEach((item, index) => {
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
        data: previous.series.find((series) => series.id === item.id)?.values ?? createZeroValues(labels.length),
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

  clientChart = new Chart(clientCanvas.value.getContext('2d'), {
    type: clientChartType.value,
    data: getScopedChartData('client', clientChartType.value, clientCompareYear.value),
    options: createChartOptions(),
  })
}

const renderVarietyChart = () => {
  if (!varietyCanvas.value) {
    return
  }

  varietyChart?.destroy()

  varietyChart = new Chart(varietyCanvas.value.getContext('2d'), {
    type: varietyChartType.value,
    data: getScopedChartData('variety', varietyChartType.value, varietyCompareYear.value),
    options: createChartOptions(),
  })
}

const renderEmployeeChart = () => {
  if (!employeeCanvas.value) {
    return
  }

  employeeChart?.destroy()

  employeeChart = new Chart(employeeCanvas.value.getContext('2d'), {
    type: employeeChartType.value,
    data: getScopedChartData('employee', employeeChartType.value, employeeCompareYear.value),
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
    const startIndex = (Number(startY) * 12) + (Number(startM) - 1)
    const endIndex = (Number(endY) * 12) + (Number(endM) - 1)

    if (startIndex <= endIndex) {
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
  await statisticsStore.loadPersonalStats({
    isAdmin: isAdmin.value,
    currentParams: buildTrendQuery({
      periodType: personalUnit.value,
      startYear: personalStartYear.value,
      startMonth: personalStartMonth.value,
      endYear: personalEndYear.value,
      endMonth: personalEndMonth.value,
    }),
    previousParams: personalCompareYear.value
      ? buildPreviousTrendQuery({
        periodType: personalUnit.value,
        startYear: personalStartYear.value,
        startMonth: personalStartMonth.value,
        endYear: personalEndYear.value,
        endMonth: personalEndMonth.value,
      })
      : null,
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
      chartType: employeeChartType.value,
      ids: selectedEmployees.value,
      query: { employeeIds: selectedEmployees.value },
    },
    client: {
      periodType: clientPeriodType.value,
      startYear: clientStartYear.value,
      startMonth: clientStartMonth.value,
      endYear: clientEndYear.value,
      endMonth: clientEndMonth.value,
      compareYear: clientCompareYear.value,
      chartType: clientChartType.value,
      ids: selectedClients.value,
      query: { clientIds: selectedClients.value },
    },
    variety: {
      periodType: varietyPeriodType.value,
      startYear: varietyStartYear.value,
      startMonth: varietyStartMonth.value,
      endYear: varietyEndYear.value,
      endMonth: varietyEndMonth.value,
      compareYear: varietyCompareYear.value,
      chartType: varietyChartType.value,
      ids: selectedVarieties.value,
      query: { varietyCodes: selectedVarieties.value },
    },
  }

  const target = scopeMap[scope]

  if (!target || target.ids.length === 0) {
    statisticsStore.clearStats(scope)
    statisticsStore.clearRanking(scope)
    return
  }

  if (target.chartType === 'bar') {
    statisticsStore.clearStats(scope)
    await statisticsStore.loadScopedRanking(scope, {
      rankingParams: buildRankingQuery({
        periodType: target.periodType,
        startYear: target.startYear,
        startMonth: target.startMonth,
        endYear: target.endYear,
        endMonth: target.endMonth,
        limit: target.ids.length,
        ...target.query,
      }),
    })
    return
  }

  statisticsStore.clearRanking(scope)
  await statisticsStore.loadScopedTrend(scope, {
    currentParams: buildTrendQuery({
      periodType: target.periodType,
      startYear: target.startYear,
      startMonth: target.startMonth,
      endYear: target.endYear,
      endMonth: target.endMonth,
      ...target.query,
    }),
    previousParams: target.compareYear
      ? buildPreviousTrendQuery({
        periodType: target.periodType,
        startYear: target.startYear,
        startMonth: target.startMonth,
        endYear: target.endYear,
        endMonth: target.endMonth,
        ...target.query,
      })
      : null,
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

const loadBillingRevenue = async () => {
  if (!useBillingStatsV2()) {
    return
  }

  await statisticsStore.loadBillingRevenue(billingRevenueDateRange.value)
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
  clientChartType,
  selectedClients,
  varietyPeriodType,
  varietyStartYear,
  varietyStartMonth,
  varietyEndYear,
  varietyEndMonth,
  varietyCompareYear,
  varietyChartType,
  selectedVarieties,
  employeePeriodType,
  employeeStartYear,
  employeeStartMonth,
  employeeEndYear,
  employeeEndMonth,
  employeeCompareYear,
  employeeChartType,
  selectedEmployees,
], () => {
  void loadCurrentViewData()
}, { deep: true })

watch([
  personalStartYear,
  personalStartMonth,
  personalEndYear,
  personalEndMonth,
], () => {
  void loadBillingRevenue()
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
  await loadBillingRevenue()
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

    <div v-if="showRankingTable" class="mt-4 overflow-hidden rounded-xl border border-seed-border-card bg-seed-bg-section">
      <table class="min-w-full divide-y divide-seed-border-card text-sm text-seed-text-body">
        <thead class="bg-seed-bg-input text-seed-text-sub">
          <tr>
            <th class="px-4 py-3 text-left font-semibold">순위</th>
            <th class="px-4 py-3 text-left font-semibold">대상</th>
            <th class="px-4 py-3 text-right font-semibold">매출</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-seed-border-card">
          <tr v-for="item in activeRankingItems" :key="`${viewType}-${item.targetId}-${item.rank}`">
            <td class="px-4 py-3">{{ item.rank }}</td>
            <td class="px-4 py-3">{{ item.targetName }}</td>
            <td class="px-4 py-3 text-right">{{ Number(item.sales).toLocaleString() }}원</td>
          </tr>
        </tbody>
      </table>
    </div>

    <section
      v-if="showBillingRevenueSection"
      class="mt-6 rounded-[18px] border border-seed-border-card bg-seed-bg-section p-5"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-bold text-seed-text-strong">청구 매출 통계</h3>
          <p class="mt-1 text-xs text-seed-text-sub">billing revenue 전용 `v2` 테스트 섹션</p>
        </div>
        <span class="rounded-full border border-[#C8622A] bg-[#FFF3EB] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[#C8622A]">V2 TEST</span>
      </div>

      <div v-if="billingRevenue.loading" class="rounded-lg border border-seed-border-card bg-seed-bg-input px-4 py-3 text-sm text-seed-text-sub">
        청구 매출 데이터를 불러오는 중입니다.
      </div>
      <div v-else-if="billingRevenue.error" class="rounded-lg border border-[#e8d3d3] bg-[#fff7f7] px-4 py-3 text-sm text-[#9b3d3d]">
        {{ billingRevenue.error }}
      </div>
      <div v-else class="grid gap-4 xl:grid-cols-3">
        <article class="overflow-hidden rounded-xl border border-seed-border-card bg-seed-bg-input">
          <header class="border-b border-seed-border-card px-4 py-3 text-sm font-semibold text-seed-text-body">월별</header>
          <div class="max-h-[260px] overflow-y-auto">
            <table class="min-w-full text-sm">
              <tbody>
                <tr v-for="row in billingRevenue.monthly" :key="row.month" class="border-b border-seed-border-card">
                  <td class="px-4 py-3 text-seed-text-sub">{{ row.month }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-seed-text-strong">{{ Number(row.billedRevenue || 0).toLocaleString() }}원</td>
                </tr>
                <tr v-if="billingRevenue.monthly.length === 0">
                  <td colspan="2" class="px-4 py-8 text-center text-seed-text-sub">데이터가 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="overflow-hidden rounded-xl border border-seed-border-card bg-seed-bg-input">
          <header class="border-b border-seed-border-card px-4 py-3 text-sm font-semibold text-seed-text-body">품종별</header>
          <div class="max-h-[260px] overflow-y-auto">
            <table class="min-w-full text-sm">
              <tbody>
                <tr v-for="row in billingRevenue.byCategory" :key="row.category" class="border-b border-seed-border-card">
                  <td class="px-4 py-3 text-seed-text-sub">{{ row.category }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-seed-text-strong">{{ Number(row.billedRevenue || 0).toLocaleString() }}원</td>
                </tr>
                <tr v-if="billingRevenue.byCategory.length === 0">
                  <td colspan="2" class="px-4 py-8 text-center text-seed-text-sub">데이터가 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="overflow-hidden rounded-xl border border-seed-border-card bg-seed-bg-input">
          <header class="border-b border-seed-border-card px-4 py-3 text-sm font-semibold text-seed-text-body">월별/품종별</header>
          <div class="max-h-[260px] overflow-y-auto">
            <table class="min-w-full text-sm">
              <tbody>
                <tr v-for="row in billingRevenue.monthlyByCategory" :key="`${row.month}-${row.category}`" class="border-b border-seed-border-card">
                  <td class="px-4 py-3 text-seed-text-sub">{{ row.month }}</td>
                  <td class="px-4 py-3 text-seed-text-sub">{{ row.category }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-seed-text-strong">{{ Number(row.billedRevenue || 0).toLocaleString() }}원</td>
                </tr>
                <tr v-if="billingRevenue.monthlyByCategory.length === 0">
                  <td colspan="3" class="px-4 py-8 text-center text-seed-text-sub">데이터가 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.chart-canvas-full :deep(canvas) {
  display: block;
  width: 100% !important;
  max-width: 100% !important;
}
</style>
