import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import {
  getAdminStats,
  getRanking,
  getSalesRepStats,
  getStatsByClient,
  getStatsByEmployee,
  getStatsByVariety,
  STATISTICS_RANKING_TYPE,
  unwrapStatisticsData,
} from '@/api/statistics'

const DEFAULT_STATE = () => ({
  current: [],
  previous: [],
  ranking: [],
  loading: false,
  rankingLoading: false,
  error: null,
  rankingError: null,
})

function getErrorMessage(error, fallback = '통계 데이터를 불러오지 못했습니다.') {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback
}

function normalizeTrendList(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => ({
    targetId: String(item?.targetId ?? ''),
    targetName: item?.targetName || '미지정',
    data: Array.isArray(item?.data)
      ? item.data.map((entry) => ({
        period: String(entry?.period ?? ''),
        sales: Number(entry?.sales ?? 0),
      }))
      : [],
  }))
}

function normalizeRankingList(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => ({
    rank: Number(item?.rank ?? 0),
    targetId: String(item?.targetId ?? ''),
    targetName: item?.targetName || '미지정',
    sales: Number(item?.sales ?? 0),
  }))
}

function normalizeClientOption(item = {}) {
  return {
    id: Number(item.id ?? item.clientId),
    name: item.clientName || item.name || '거래처',
  }
}

function normalizeEmployeeOption(item = {}) {
  return {
    id: Number(item.employeeId ?? item.id),
    name: item.employeeName || item.name || '사원',
  }
}

function normalizeVarietyOption(item = {}) {
  const code = String(item.code || item.category || item.name || '').trim()

  return {
    id: code,
    name: item.name || item.productCategory || item.description || code,
  }
}

export const useStatisticsStore = defineStore('statistics', () => {
  const personal = ref(DEFAULT_STATE())
  const employee = ref(DEFAULT_STATE())
  const client = ref(DEFAULT_STATE())
  const variety = ref(DEFAULT_STATE())

  const clientOptions = ref([])
  const employeeOptions = ref([])
  const varietyOptions = ref([])
  const optionsLoading = ref(false)
  const optionsError = ref(null)

  const scopedStateMap = computed(() => ({
    personal: personal.value,
    employee: employee.value,
    client: client.value,
    variety: variety.value,
  }))

  async function loadOptions({ includeEmployees = false } = {}) {
    optionsLoading.value = true
    optionsError.value = null

    try {
      const requests = [
        api.get('/accounts/clients'),
        api.get('/products/categories'),
      ]

      if (includeEmployees) {
        requests.push(api.get('/accounts/employees'))
      }

      const [clientsResult, categoriesResult, employeesResult] = await Promise.all(requests)

      clientOptions.value = unwrapStatisticsData(clientsResult)
        .map(normalizeClientOption)
        .filter((item) => Number.isFinite(item.id))

      varietyOptions.value = unwrapStatisticsData(categoriesResult)
        .map(normalizeVarietyOption)
        .filter((item) => item.id)

      employeeOptions.value = includeEmployees
        ? unwrapStatisticsData(employeesResult)
          .map(normalizeEmployeeOption)
          .filter((item) => Number.isFinite(item.id))
        : []
    } catch (error) {
      optionsError.value = getErrorMessage(error, '통계 필터 선택지를 불러오지 못했습니다.')
      throw error
    } finally {
      optionsLoading.value = false
    }
  }

  async function loadPersonalStats({ isAdmin = false, currentParams, previousParams = null }) {
    personal.value.loading = true
    personal.value.error = null

    try {
      const endpoint = isAdmin ? getAdminStats : getSalesRepStats
      const currentResult = await endpoint(currentParams)
      const previousResult = previousParams ? await endpoint(previousParams) : []

      personal.value.current = normalizeTrendList(unwrapStatisticsData(currentResult))
      personal.value.previous = normalizeTrendList(unwrapStatisticsData(previousResult))
    } catch (error) {
      personal.value.error = getErrorMessage(error)
      personal.value.current = []
      personal.value.previous = []
    } finally {
      personal.value.loading = false
    }
  }

  async function loadScopedTrend(scope, { currentParams, previousParams = null }) {
    const target = scopedStateMap.value[scope]

    if (!target) {
      return
    }

    target.loading = true
    target.error = null

    const endpointMap = {
      employee: getStatsByEmployee,
      client: getStatsByClient,
      variety: getStatsByVariety,
    }

    try {
      const endpoint = endpointMap[scope]
      const currentResult = await endpoint(currentParams)
      const previousResult = previousParams ? await endpoint(previousParams) : []

      target.current = normalizeTrendList(unwrapStatisticsData(currentResult))
      target.previous = normalizeTrendList(unwrapStatisticsData(previousResult))
    } catch (error) {
      target.error = getErrorMessage(error)
      target.current = []
      target.previous = []
    } finally {
      target.loading = false
    }
  }

  async function loadScopedRanking(scope, { rankingParams }) {
    const target = scopedStateMap.value[scope]

    if (!target) {
      return
    }

    target.rankingLoading = true
    target.rankingError = null

    const typeMap = {
      employee: STATISTICS_RANKING_TYPE.EMPLOYEE,
      client: STATISTICS_RANKING_TYPE.CLIENT,
      variety: STATISTICS_RANKING_TYPE.VARIETY,
    }

    try {
      const result = await getRanking({
        ...rankingParams,
        type: typeMap[scope],
      })

      target.ranking = normalizeRankingList(unwrapStatisticsData(result))
    } catch (error) {
      target.rankingError = getErrorMessage(error, '랭킹 데이터를 불러오지 못했습니다.')
      target.ranking = []
    } finally {
      target.rankingLoading = false
    }
  }

  function clearStats(scope) {
    const target = scopedStateMap.value[scope]

    if (!target) {
      return
    }

    target.current = []
    target.previous = []
    target.error = null
    target.loading = false
  }

  function clearRanking(scope) {
    const target = scopedStateMap.value[scope]

    if (!target) {
      return
    }

    target.ranking = []
    target.rankingError = null
    target.rankingLoading = false
  }

  return {
    personal,
    employee,
    client,
    variety,
    clientOptions,
    employeeOptions,
    varietyOptions,
    optionsLoading,
    optionsError,
    loadOptions,
    loadPersonalStats,
    loadScopedTrend,
    loadScopedRanking,
    clearStats,
    clearRanking,
  }
})
