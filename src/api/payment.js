import api from './index'

/**
 * 결제 목록 조회
 * @param {Object} params - 조회 파라미터 { clientOnly, status, ... }
 */
export function getPayments(params = {}) {
    return api.get('/payments', { params })
}

/**
 * 특정 결제 조회
 * @param {number} paymentId - 결제 ID
 */
export function getPaymentDetail(paymentId) {
    return api.get(`/payments/${paymentId}`)
}

/**
 * 현재 거래처의 결제 목록 조회
 */
export function getMyPayments() {
    return api.get('/payments/clients/me')
}

/**
 * 결제 처리
 * @param {Object} data - { invoiceId, paymentMethod }
 */
export function processPayment(data) {
    return api.post('/payments', data)
}

/**
 * 결제 목록 조회 (상태별 필터)
 * @param {string} status - PENDING, COMPLETED, FAILED 등
 */
export function getPaymentsByStatus(status) {
    return api.get('/payments', { params: { status } })
}

/**
 * 청구서별 결제 조회
 * @param {number} invoiceId - 청구서 ID
 */
export function getPaymentsByInvoice(invoiceId) {
    return api.get('/payments', { params: { invoiceId } })
}