import api from './index'

export function createQuotationRequest(data) {
    return api.post('/requests', data)
}

export function deleteQuotationRequest(id) {
    return api.delete(`/requests/${id}`)
}

export function getQuotationRequest(id) {
    return api.get(`/requests/${id}`)
}

export function getPendingQuotationRequests() {
    return api.get('/requests/pending')
}


export function deleteQuotation(id) {
    return api.delete(`/quotations/${id}`)
}

export function createQuotation(data) {
    return api.post('/quotations', data)
}

export function createContract(data) {
    return api.post('/contracts', data)
}

export function getContractsByClient(clientId) {
    return api.get('/contracts', { params: { clientId } })
}

export function getContracts(params) {
    return api.get('/contracts', { params })
}

export function getQuotations(params) {
    return api.get('/quotations', { params })
}

export function getQuotation(id) {
    return api.get(`/quotations/${id}`)
}

export function getContract(id) {
    return api.get(`/contracts/${id}`)
}

export function getQuotationRequests(params) {
    return api.get('/requests', { params })
}


//주문
export function createOrder(data) {
    return api.post('/orders', {
        headerId: data.contractId,
        shippingName: data.deliveryRecipient,
        shippingPhone: data.deliveryPhone,
        shippingAddress: data.deliveryAddress,
        shippingAddressDetail: null,
        deliveryRequest: data.memo,
        items: data.items.map(item => ({
            contractDetailId: item.detailId,  // ContractResponse.ItemResponse.detailId
            quantity: item.quantity,
        }))
    })
}

export function getOrders() {
    return api.get('/orders')
}

export function getOrder(orderId) {
    return api.get(`/orders/${orderId}`)
}

export function cancelOrder(orderId) {
    return api.patch(`/orders/${orderId}/cancel`)
}

export function confirmOrder(orderId) {
    return api.patch(`/orders/${orderId}/confirm`)
}

// 명세서
export function getStatements() {
    return api.get('/statements')
}

export function getStatement(statementId) {
    return api.get(`/statements/${statementId}`)
}

export function cancelStatement(statementId) {
    return api.patch(`/statements/${statementId}/cancel`)
}

// 청구서
export function createInvoice(data) {
    return api.post('/invoices', data)
}

export function getInvoices() {
    return api.get('/invoices')
}

export function getInvoicesByClient() {
    return api.get('/invoices/clients/me')
}

export function getInvoice(invoiceId) {
    return api.get(`/invoices/${invoiceId}`)
}

export function publishInvoice(invoiceId) {
    return api.patch(`/invoices/${invoiceId}/publish`)
}

export function getDocumentDetail(id) {
    return api.get(`/documents/${id}`)
}

export function updateDocumentStatus(id, data) {
    return api.patch(`/documents/${id}`, data)
}

export function deleteDocument(id) {
    return api.delete(`/documents/${id}`)
}
