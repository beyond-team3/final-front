import api from './index'

export function getApprovalList(params) {
  return api.get('/approvals', { params })
}

export function approveRequest(id) {
  return api.put(`/approvals/${id}/approve`)
}

export function rejectRequest(id, reason) {
  return api.put(`/approvals/${id}/reject`, { reason })
}
