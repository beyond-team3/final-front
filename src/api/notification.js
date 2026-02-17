import api from './index'

export function getNotifications(params) {
  return api.get('/notifications', { params })
}

export function markAsRead(id) {
  return api.put(`/notifications/${id}/read`)
}

export function markAllAsRead() {
  return api.put('/notifications/read-all')
}
