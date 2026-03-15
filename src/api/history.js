import api from './index'
import { getV2 } from './v2'
import { useDealV2 } from '@/config/featureFlags'

export function getSalesDeals(params) {
    if (useDealV2()) {
        return getV2('/api/v2/deals', { params })
    }
    return api.get('/deals', { params })
}

export function getDealLogs(dealId, params) {
    return api.get(`/deals/${dealId}/logs`, { params })
}

export function getDealLogDetail(dealLogId) {
    return api.get(`/deal-logs/${dealLogId}/detail`)
}

export function getDealV2Detail(dealId) {
    return getV2(`/api/v2/deals/${dealId}`)
}

export function getDealV2Documents(dealId) {
    return getV2(`/api/v2/deals/${dealId}/documents`)
}

export function getDealV2Notifications(dealId, params) {
    return getV2(`/api/v2/deals/${dealId}/notifications`, { params })
}

export function getDealV2Schedules(dealId, params) {
    return getV2(`/api/v2/deals/${dealId}/schedules`, { params })
}

export function getDealV2Kpis(params) {
    return getV2('/api/v2/deals/kpis', { params })
}
