import api from './index'

export function getSalesDeals(params) {
    return api.get('/deals', { params })
}

export function getDealLogs(dealId, params) {
    return api.get(`/deals/${dealId}/logs`, { params })
}

export function getDealLogDetail(dealLogId) {
    return api.get(`/deal-logs/${dealLogId}/detail`)
}
