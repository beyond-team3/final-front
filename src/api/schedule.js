import api from './index'

export function getSchedules(params) {
  return api.get('/schedules', { params })
}

export function getSchedulesByDate(date) {
  return api.get('/schedules', { params: { date } })
}

export function createSchedule(data) {
  return api.post('/schedules', data)
}

export function updateSchedule(id, data) {
  return api.put(`/schedules/${id}`, data)
}

export function deleteSchedule(id) {
  return api.delete(`/schedules/${id}`)
}
