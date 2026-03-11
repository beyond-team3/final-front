import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { getClients } from '@/api/client'
import { getEmployees } from '@/api/employee'
import {
  getAdminStats,
  getSalesRepStats,
  getStatsByClient,
  getStatsByEmployee,
  getStatsByVariety,
} from '@/api/statistics'

const DEFAULT_STATE = () => ({
  current: [],
  previous: [],
  loading: false,
  error: null,
})

const emptyArray = []

function unwrap(result) {
  return result?.data ?? result ?? []
}

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
        getClients({}),
        api.get('/products/categories'),
      ]

      if (includeEmployees) {
        requests.push(getEmployees({}))
      }

      const [clientsResult, categoriesResult, employeesResult] = await Promise.all(requests)

      clientOptions.value = unwrap(clientsResult)
        .map(normalizeClientOption)
        .filter((item) => Number.isFinite(item.id))

      varietyOptions.value = unwrap(categoriesResult)
        .map(normalizeVarietyOption)
        .filter((item) => item.id)

      employeeOptions.value = includeEmployees
        ? unwrap(employeesResult)
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
      const [currentResult, previousResult] = await Promise.all([
        endpoint(currentParams),
        previousParams ? endpoint(previousParams) : Promise.resolve(emptyArray),
      ])

      personal.value.current = normalizeTrendList(unwrap(currentResult))
      personal.value.previous = normalizeTrendList(unwrap(previousResult))
    } catch (error) {
      personal.value.error = getErrorMessage(error)
      personal.value.current = []
      personal.value.previous = []
    } finally {
      personal.value.loading = false
    }
  }

  async function loadScopedStats(scope, { currentParams, previousParams = null }) {
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

    const endpoint = endpointMap[scope]

    try {
      const [currentResult, previousResult] = await Promise.all([
        endpoint(currentParams),
        previousParams ? endpoint(previousParams) : Promise.resolve(emptyArray),
      ])

      target.current = normalizeTrendList(unwrap(currentResult))
      target.previous = normalizeTrendList(unwrap(previousResult))
    } catch (error) {
      target.error = getErrorMessage(error)
      target.current = []
      target.previous = []
    } finally {
      target.loading = false
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
    loadScopedStats,
    clearStats,
  }
})
