import api from './index'

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
