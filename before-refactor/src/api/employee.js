import api from './index'

export function getEmployees(params) {
  return api.get('/employees', { params })
}

export function getEmployeeDetail(id) {
  return api.get(`/employees/${id}`)
}

export function createEmployee(data) {
  return api.post('/employees', data)
}

export function updateEmployee(id, data) {
  return api.put(`/employees/${id}`, data)
}
