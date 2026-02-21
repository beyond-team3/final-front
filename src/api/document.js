import api from './index'

export function createQuotationRequest(data) {
    return api.post('/documents', data)
}

export function createQuotation(data) {
    return api.post('/documents', data)
}

export function createContract(data) {
    return api.post('/documents', data)
}

export function createOrder(data) {
    return api.post('/documents', data)
}

export function createStatement(data) {
    return api.post('/documents', data)
}

export function createInvoice(data) {
    return api.post('/documents', data)
}

export function getDocuments(params) {
    return api.get('/documents', { params })
}

export function getDocumentDetail(id) {
    return api.get(`/documents/${id}`)
}

export function getStatements(params) {
    return api.get('/statements', { params })
}
