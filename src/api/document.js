import api from './index'

export function createQuotationRequest(data) {
    return api.post('/documents/quotation-request', data)
}

export function createQuotation(data) {
    return api.post('/documents/quotation', data)
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


export function createStatement(data) {
    return api.post('/documents/statement', data)
}

export function createInvoice(data) {
    return api.post('/documents/invoice', data)
}

export function getDocuments(params) {
    return api.get('/documents', { params })
}

export function getDocumentSummaries(params) {
    return api.get('/documents', { params, disableCache: true })
}

export function getDocumentDetail(id) {
    return api.get(`/documents/${id}`)
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
        dealId: data.dealId || null,
        items: data.items.map(item => ({
            contractDetailId: item.detailId,  // ContractResponse.ItemResponse.detailId
            quantity: item.quantity,
        }))
    })
}

export function getOrders(params) {
    return api.get('/orders', { params })
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

export function getInvoices(params) {
    return api.get('/invoices', { params })
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

export function updateDocumentStatus(id, data) {
    return api.patch(`/documents/${id}`, data)
}

export function deleteDocument(id) {
    return api.delete(`/documents/${id}`)
}
