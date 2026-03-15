import api from './index'

// 1. 예찰 데이터 및 추천 품종 조회 API
export function getForecasts(params) {
    // 예: params = { cropCode: 'PEPPER', pestCode: 'PP01' }
    return api.get('/map/forecasts', { params })
}

// 2. 영업처 마커 조회 API
export function getSalesOffices() {
    return api.get('/map/offices')
}