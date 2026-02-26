import api from './index'

export function getSalesHistory(params) {
  return api.get('/history', { params })
}

export function getPipelineDetail(id) {
  return api.get(`/history/pipeline/${id}`)
}

export function getSalesDocuments(contractId) {
  return api.get(`/history/${contractId}/documents`)
}

export function createPipeline(data) {
  return api.post('/history/sales', data)
}

export function updatePipeline(id, data) {
  return api.patch(`/history/pipeline/${id}`, data)
}

export function deletePipeline(id) {
    return api.delete(`/history/pipeline/${id}`)
}