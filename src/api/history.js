import api from './index'

export function getSalesHistory(params) {
  return api.get('/history/sales', { params })
}

export function getPipelineDetail(id) {
  return api.get(`/history/pipeline/${id}`)
}

export function getSalesDocuments(contractId) {
  return api.get(`/history/${contractId}/documents`)
}
