import api from './index'

const unwrapApiResult = (result) => {
  const payload = result?.data ?? result
  if (payload?.result === 'SUCCESS') {
    return payload.data
  }

  return payload
}

export async function searchApprovals(params) {
  const result = await api.get('/approvals', { params })
  return unwrapApiResult(result)
}

export async function getApprovalDetail(approvalId) {
  const result = await api.get(`/approvals/${approvalId}`)
  return unwrapApiResult(result)
}

export async function decideApprovalStep(approvalId, stepId, payload) {
  const result = await api.post(`/approvals/${approvalId}/steps/${stepId}/decision`, payload)
  return unwrapApiResult(result)
}
