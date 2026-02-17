import api from './index'

export function getClients(params) {
  return api.get('/clients', { params })
}

export function getClientDetail(id) {
  return api.get(`/clients/${id}`)
}

export function createClient(data) {
  return api.post('/clients', data)
}

export function updateClient(id, data) {
  return api.put(`/clients/${id}`, data)
}

export function addClientVariety(id, data) {
  return api.post(`/clients/${id}/varieties`, data)
}
