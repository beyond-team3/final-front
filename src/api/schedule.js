import api from './index'

const buildPersonalScheduleCreatePayload = (data = {}) => ({
  title: data.title,
  description: data.description,
  startAt: data.startAt,
  endAt: data.endAt,
  allDay: data.allDay,
  visibility: data.visibility,
})

export function getSchedules(params) {
  return api.get('/schedules', { params })
}

export function getSchedulesByCondition(condition) {
  return api.get('/schedules', { params: condition })
}

export function getPersonalSchedule(id) {
  return api.get(`/schedules/personal/${id}`)
}

export function createPersonalSchedule(data) {
  return api.post('/schedules/personal', buildPersonalScheduleCreatePayload(data))
}

export function updatePersonalSchedule(id, data) {
  return api.put(`/schedules/personal/${id}`, data)
}

export function deletePersonalSchedule(id) {
  return api.delete(`/schedules/personal/${id}`)
}
