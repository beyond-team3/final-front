import api from './index'

const unwrapApiResult = (result) => {
  if (result?.result === 'SUCCESS') {
    return result.data
  }

  return result?.data ?? result
}

export async function searchApprovals(params) {
  const result = await api.get('/approvals', { params })
  return unwrapApiResult(result)
}

export async function getApprovalDetail(approvalId) {
  const result = await api.get(`/approvals/${approvalId}`)
  return unwrapApiResult(result)
}

export async function createApprovalRequest(payload) {
  const result = await api.post('/approvals', payload)
  return unwrapApiResult(result)
}

export async function decideApprovalStep(approvalId, stepId, payload) {
  const result = await api.post(`/approvals/${approvalId}/steps/${stepId}/decision`, payload)
  return unwrapApiResult(result)
}
