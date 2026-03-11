import api from './index'

export const STATISTICS_PERIOD = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
}

export const STATISTICS_RANKING_TYPE = {
  EMPLOYEE: 'EMPLOYEE',
  CLIENT: 'CLIENT',
  VARIETY: 'VARIETY',
}

function buildParamsSerializer(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item))
        }
      })
      return
    }

    searchParams.append(key, String(value))
  })

  return searchParams.toString()
}

function get(url, params) {
  return api.get(url, {
    params,
    paramsSerializer: {
      serialize: buildParamsSerializer,
    },
  })
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function getLastDayOfMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate()
}

function normalizeSelectedIds(ids = []) {
  return Array.isArray(ids)
    ? ids.filter((value) => value !== undefined && value !== null && value !== '')
    : []
}

function appendScopedIds(params, key, values) {
  const normalized = normalizeSelectedIds(values)

  if (normalized.length > 0) {
    params[key] = normalized
  }

  return params
}

export function unwrapStatisticsData(result) {
  if (result?.result && Object.prototype.hasOwnProperty.call(result, 'data')) {
    return result.data
  }

  if (result?.data !== undefined) {
    return result.data
  }

  return result ?? []
}

export function normalizeStatisticsPeriod(periodType) {
  if (periodType === STATISTICS_PERIOD.QUARTERLY || periodType === 'quarter' || periodType === 'quarterly') {
    return STATISTICS_PERIOD.QUARTERLY
  }

  return STATISTICS_PERIOD.MONTHLY
}

export function buildStatisticsDateRange({ startYear, startMonth, endYear, endMonth }) {
  return {
    from: `${startYear}-${pad(startMonth)}-01`,
    to: `${endYear}-${pad(endMonth)}-${pad(getLastDayOfMonth(endYear, endMonth))}`,
  }
}

export function buildTrendQuery({
  startYear,
  startMonth,
  endYear,
  endMonth,
  periodType,
  employeeIds,
  clientIds,
  varietyCodes,
} = {}) {
  const params = {
    ...buildStatisticsDateRange({
      startYear,
      startMonth,
      endYear,
      endMonth,
    }),
    period: normalizeStatisticsPeriod(periodType),
  }

  appendScopedIds(params, 'employeeIds', employeeIds)
  appendScopedIds(params, 'clientIds', clientIds)
  appendScopedIds(params, 'varietyCodes', varietyCodes)

  return params
}

export function buildPreviousTrendQuery(options = {}) {
  return buildTrendQuery({
    ...options,
    startYear: Number(options.startYear) - 1,
    endYear: Number(options.endYear) - 1,
  })
}

export function buildRankingQuery({
  startYear,
  startMonth,
  endYear,
  endMonth,
  periodType,
  rankingType,
  limit,
  employeeIds,
  clientIds,
  varietyCodes,
} = {}) {
  const params = {
    ...buildTrendQuery({
      startYear,
      startMonth,
      endYear,
      endMonth,
      periodType,
      employeeIds,
      clientIds,
      varietyCodes,
    }),
    type: rankingType,
  }

  if (limit !== undefined && limit !== null && limit !== '') {
    params.limit = Math.min(Math.max(Number(limit), 1), 50)
  }

  return params
}

export function mapTrendSeriesToChartData(items) {
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
      id: String(item?.targetId ?? ''),
      name: item?.targetName || '미지정',
      data: Array.isArray(item?.data)
        ? item.data.map((entry) => ({
          period: String(entry?.period ?? ''),
          sales: Number(entry?.sales ?? 0),
        }))
        : [],
    }))
    : []

  const labels = []
  const seen = new Set()

  normalizedItems.forEach((item) => {
    item.data.forEach((entry) => {
      if (!seen.has(entry.period)) {
        seen.add(entry.period)
        labels.push(entry.period)
      }
    })
  })

  const series = normalizedItems.map((item) => {
    const salesByPeriod = new Map(item.data.map((entry) => [entry.period, entry.sales]))

    return {
      id: item.id,
      name: item.name,
      values: labels.map((period) => salesByPeriod.get(period) ?? 0),
    }
  })

  return {
    labels,
    series,
  }
}

export function mapRankingToChartData(items) {
  const rankings = Array.isArray(items)
    ? items.map((item) => ({
      rank: Number(item?.rank ?? 0),
      targetId: String(item?.targetId ?? ''),
      targetName: item?.targetName || '미지정',
      sales: Number(item?.sales ?? 0),
    }))
    : []

  return {
    labels: rankings.map((item) => item.targetName),
    values: rankings.map((item) => item.sales),
    rankings,
  }
}

export function getSalesRepStats(params) {
  return get('/statistics/sales-rep', params)
}

export function getAdminStats(params) {
  return get('/statistics/admin', params)
}

export function getStatsByEmployee(params) {
  return get('/statistics/by-employee', params)
}

export function getStatsByClient(params) {
  return get('/statistics/by-client', params)
}

export function getStatsByVariety(params) {
  return get('/statistics/by-variety', params)
}

export function getRanking(params) {
  return get('/statistics/ranking', params)
}
