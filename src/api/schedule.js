import api from './index'

export function getSchedules(params) {
  return api.get('/schedules', { params })
}

// ScheduleSearchCondition 기반 조회
export function getSchedulesByCondition(condition) {
  return api.get('/schedules', { params: condition })
}

export function getSchedulesByDate(date) {
  return api.get('/schedules', {
    params: {
      rangeStart: `${date}T00:00:00`,
      rangeEnd: `${date}T23:59:59`,
    },
  })
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
