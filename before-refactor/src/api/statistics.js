import api from './index'

export function getSalesRepStats(params) {
  return api.get('/statistics/sales-rep', { params })
}

export function getAdminStats(params) {
  return api.get('/statistics/admin', { params })
}

export function getStatsByEmployee(params) {
  return api.get('/statistics/by-employee', { params })
}

export function getRanking(params) {
  return api.get('/statistics/ranking', { params })
}
