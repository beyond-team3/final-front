import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import eventBus from '@/utils/eventBus'
import {
  createContract as createContractApi,
  createInvoice as createInvoiceApi,
  createOrder as createOrderApi,
  createQuotation as createQuotationApi,
  createQuotationRequest as createQuotationRequestApi,
  getDocuments,
} from '@/api/document'
import { getClients } from '@/api/client'
import { getProducts } from '@/api/product'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return error?.response?.data?.message || error?.message || fallback
}

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  return []
}

const withAmount = (item) => ({
  ...item,
  amount: Number(item.quantity || 0) * Number(item.unitPrice || 0),
})

const normalizeClient = (doc = {}) => {
  if (doc.client && typeof doc.client === 'object') {
    return {
      id: doc.client.id ?? doc.clientId ?? null,
      name: doc.client.name ?? doc.clientName ?? '-',
      contact: doc.client.contact ?? doc.client.managerName ?? '-',
    }
  }

  return {
    id: doc.clientId ?? doc.client ?? null,
    name: doc.clientName || (typeof doc.client === 'string' ? doc.client : '-'),
    contact: doc.clientContact || '-',
  }
}

const normalizeDocument = (doc = {}) => ({
  ...doc,
  client: normalizeClient(doc),
  items: Array.isArray(doc.items) ? doc.items : [],
  totalAmount: Number(doc.totalAmount ?? doc.amount ?? 0),
  createdAt: doc.createdAt || doc.date || new Date().toISOString().slice(0, 10),
})

export const useDocumentStore = defineStore('document', () => {
  const productMaster = ref([])
  const clientMaster = ref([])

  const quotationRequests = ref([])
  const quotations = ref([])
  const contracts = ref([])
  const orders = ref([])
  const invoices = ref([])

  const loading = ref(false)
  const error = ref(null)

  const formatDate = (date = new Date()) => date.toISOString().slice(0, 10)
  const makeId = (prefix) => `${prefix}-${Date.now()}`
  const emitDocumentCreated = (type, id) => {
    eventBus.emit('document:created', { type, id })
  }

  const totalAmountOf = (items = []) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const getRequestById = (id) => quotationRequests.value.find((item) => item.id === id)
  const getQuotationById = (id) => quotations.value.find((item) => item.id === id)
  const getContractById = (id) => contracts.value.find((item) => item.id === id)
  const getOrderById = (id) => orders.value.find((item) => item.id === id)
  const getInvoiceById = (id) => invoices.value.find((item) => item.id === id)

  async function fetchProductMaster(params) {
    try {
      const products = await getProducts(params)
      productMaster.value = normalizeList(products).map((item) => ({
        id: item.id,
        variety: item.variety || item.category || '-',
        name: item.name,
        unit: item.unit || item.priceData?.unit || 'ea',
        unitPrice: Number(item.unitPrice ?? item.priceData?.price ?? 0),
      }))
      return productMaster.value
    } catch (e) {
      error.value = getErrorMessage(e, '상품 마스터를 불러오지 못했습니다.')
      return productMaster.value
    }
  }

  async function fetchClientMaster(params) {
    try {
      const clients = await getClients(params)
      clientMaster.value = normalizeList(clients).map((item) => ({
        id: item.id,
        code: item.code || item.bizNo || String(item.id),
        name: item.name,
        contact: item.managerName || item.contact || '-',
      }))
      return clientMaster.value
    } catch (e) {
      error.value = getErrorMessage(e, '거래처 마스터를 불러오지 못했습니다.')
      return clientMaster.value
    }
  }

  async function fetchDocuments(params) {
    try {
      const docs = normalizeList(await getDocuments(params)).map(normalizeDocument)

      quotationRequests.value = docs.filter((doc) => doc.type === 'quotation-request' || doc.type === 'REQUEST')
      quotations.value = docs.filter((doc) => doc.type === 'quotation' || doc.type === 'QUOTATION')
      contracts.value = docs.filter((doc) => doc.type === 'contract' || doc.type === 'CONTRACT')
      orders.value = docs.filter((doc) => doc.type === 'order' || doc.type === 'ORDER')
      invoices.value = docs.filter((doc) => doc.type === 'invoice' || doc.type === 'INVOICE')

      return docs
    } catch (e) {
      error.value = getErrorMessage(e, '문서 목록을 불러오지 못했습니다.')
      return []
    }
  }

  const createQuotationRequest = ({ client, items, requirements }) => {
    const id = makeId('RQ')
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
      type: 'quotation-request',
      client,
      items: lineItems,
      requirements: requirements || '',
      status: 'REQUESTED',
      createdAt: formatDate(),
      totalAmount: totalAmountOf(lineItems),
    }

    quotationRequests.value.unshift(next)
    emitDocumentCreated('quotation-request', id)

    createQuotationRequestApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = quotationRequests.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          quotationRequests.value[idx] = created
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '견적 요청서 생성에 실패했습니다.')
      })

    return next
  }

  const createQuotation = ({ requestId, client, items, memo }) => {
    const id = makeId('QT')
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
      type: 'quotation',
      requestId: requestId || null,
      client,
      items: lineItems,
      memo: memo || '',
      status: 'ISSUED',
      createdAt: formatDate(),
      validUntil: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)),
      totalAmount: totalAmountOf(lineItems),
    }

    quotations.value.unshift(next)
    emitDocumentCreated('quotation', id)

    if (requestId) {
      const request = getRequestById(requestId)
      if (request) {
        request.status = 'QUOTED'
      }
    }

    createQuotationApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = quotations.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          quotations.value[idx] = created
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '견적서 생성에 실패했습니다.')
      })

    return next
  }

  const createContract = ({ quotationId, client, items, startDate, endDate, billingCycle, specialTerms }) => {
    const id = makeId('CT')
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
      type: 'contract',
      quotationId: quotationId || null,
      client,
      items: lineItems,
      startDate,
      endDate,
      billingCycle,
      specialTerms: specialTerms || '',
      status: 'ACTIVE',
      createdAt: formatDate(),
      totalAmount: totalAmountOf(lineItems),
    }

    contracts.value.unshift(next)
    emitDocumentCreated('contract', id)

    if (quotationId) {
      const quotation = getQuotationById(quotationId)
      if (quotation) {
        quotation.status = 'CONTRACTED'
      }
    }

    createContractApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = contracts.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          contracts.value[idx] = created
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '계약서 생성에 실패했습니다.')
      })

    return next
  }

  const createOrder = ({ contractId, client, items, deliveryDate, memo }) => {
    const id = makeId('OD')
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
      type: 'order',
      contractId,
      client,
      items: lineItems,
      deliveryDate,
      memo: memo || '',
      status: 'ORDERED',
      createdAt: formatDate(),
      totalAmount: totalAmountOf(lineItems),
    }

    orders.value.unshift(next)
    emitDocumentCreated('order', id)

    createOrderApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = orders.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          orders.value[idx] = created
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '주문서 생성에 실패했습니다.')
      })

    return next
  }

  const createInvoice = ({ orderId, client, items, remarks, mode = 'pending' }) => {
    const id = makeId('IV')
    const lineItems = (items || []).map(withAmount)
    const supplyAmount = totalAmountOf(lineItems)
    const taxAmount = Math.round(supplyAmount * 0.1)
    const next = {
      id,
      type: 'invoice',
      orderId,
      client,
      items: lineItems,
      remarks: remarks || '',
      status: mode === 'issued' ? 'issued' : 'pending',
      createdAt: formatDate(),
      dueDate: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)),
      supplyAmount,
      taxAmount,
      totalAmount: supplyAmount + taxAmount,
    }

    invoices.value.unshift(next)
    emitDocumentCreated('invoice', id)

    createInvoiceApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = invoices.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          invoices.value[idx] = created
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '청구서 생성에 실패했습니다.')
      })

    return next
  }

  const markInvoiceIssued = (invoiceId) => {
    const invoice = getInvoiceById(invoiceId)
    if (invoice) {
      invoice.status = 'issued'
    }
  }

  async function initialize() {
    loading.value = true
    error.value = null

    try {
      await Promise.all([
        fetchProductMaster(),
        fetchClientMaster(),
        fetchDocuments(),
      ])
    } finally {
      loading.value = false
    }
  }

  const pendingInvoices = computed(() => invoices.value.filter((item) => item.status === 'pending'))
  const issuedInvoices = computed(() => invoices.value.filter((item) => item.status === 'issued'))

  void initialize()

  return {
    productMaster,
    clientMaster,
    quotationRequests,
    quotations,
    contracts,
    orders,
    invoices,
    pendingInvoices,
    issuedInvoices,
    loading,
    error,
    fetchProductMaster,
    fetchClientMaster,
    fetchDocuments,
    totalAmountOf,
    getRequestById,
    getQuotationById,
    getContractById,
    getOrderById,
    getInvoiceById,
    createQuotationRequest,
    createQuotation,
    createContract,
    createOrder,
    createInvoice,
    markInvoiceIssued,
  }
})
