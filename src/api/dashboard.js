import api from './index'

export function getSalesRepDashboard() {
  return api.get('/dashboard/sales-rep')
}

export function getAdminDashboard() {
  return api.get('/dashboard/admin')
}

export function getClientDashboard() {
  return api.get('/dashboard/client')
}
