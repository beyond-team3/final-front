import api from './index'

export function getQuotationRequest(id) {
    return api.get(`requests/${id}`)
}

export function createQuotationRequest(data) {
    return api.post('requests', data)
}

export function getPendingQuotationRequests() {
    return api.get('requests/pending')
}

export function getApprovedQuotations() {
    return api.get('quotations/approved')
}

export function getRejectedQuotationRequests() {
    return api.get('requests/rejected')
}

export function getRejectedQuotations() {
    return api.get('quotations/rejected')
}

export function getQuotation(id) {
    return api.get(`quotations/${id}`)
}

export function createQuotation(data) {
    return api.post('quotations', data)
}

export function getContract(id) {
    return api.get(`contracts/${id}`)
}

export function createContract(data) {
    return api.post('contracts', data)
}

export function createOrder(data) {
    return api.post('orders', data)
}

export function createStatement(data) {
    return api.post('statements', data)
}

export function createInvoice(data) {
    return api.post('invoices', data)
}

export function getActiveContracts(clientId) {
    return api.get('/contracts', { params: { clientId } })
}

export function getDocuments(params) {
    return api.get('documents', { params })
}

export function getDocumentSummaries(params) {
    return api.get('documents', { params, disableCache: true })
}

export function getDocumentDetail(id) {
    return api.get(`documents/${id}`)
}

export function getStatements(params) {
    return api.get('statements', { params })
}

export function getOrders(params) {
    return api.get('orders', { params })
}

export function getOrder(orderId) {
    return api.get(`orders/${orderId}`)
}

export function cancelOrder(orderId) {
    return api.patch(`orders/${orderId}/cancel`)
}

export function confirmOrder(orderId) {
    return api.patch(`orders/${orderId}/confirm`)
}

export function getInvoices(params) {
    return api.get('invoices', { params })
}

export function getInvoicesByClient() {
    return api.get('invoices/clients/me')
}

export function getInvoice(invoiceId) {
    return api.get(`invoices/${invoiceId}`)
}

// 청구서 상세 조회 (영업사원용) - contractId + statements[included] 포함
export function getInvoiceDetail(invoiceId) {
    return api.get(`invoices/${invoiceId}/detail`)
}

// 명세서 포함/제외 토글 - DRAFT 상태에서만 가능
export function toggleInvoiceStatement(invoiceId, statementId) {
    return api.patch(`invoices/${invoiceId}/statements/${statementId}/toggle`)
}

export function getContractsByClient(clientId) {
    return api.get('/contracts/active', { params: { clientId } })
}

export function publishInvoice(invoiceId) {
    return api.patch(`invoices/${invoiceId}/publish`)
}

export function cancelInvoice(invoiceId) {
    return api.patch(`invoices/${invoiceId}/cancel`)
}

export function updateDocumentStatus(id, data) {
    return api.patch(`documents/${id}`, data)
}

export function deleteDocument(id) {
    return api.delete(`documents/${id}`)
}

export function deleteQuotationRequest(id) {
    return api.delete(`requests/${id}`)
}

export function deleteQuotation(id) {
    return api.delete(`quotations/${id}`)
}

export function deleteContract(id) {
    return api.delete(`contracts/${id}`)
}