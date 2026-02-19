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
  getStatements
} from '@/api/document'
import { getClients } from '@/api/client'
import { getProducts } from '@/api/product'
import { useHistoryStore } from '@/stores/history'

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
  historyId: doc.historyId || doc.pipelineId || null,
})

export const useDocumentStore = defineStore('document', () => {
  const historyStore = useHistoryStore()
  const productMaster = ref([])
  const clientMaster = ref([])

  const quotationRequests = ref([])
  const quotations = ref([])
  const contracts = ref([])
  const orders = ref([])
  const invoices = ref([])
  const statements = ref([])

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

    async function fetchStatements(params) {
        try {
            const data = await getStatements(params)
            statements.value = normalizeList(data)
            return statements.value
        } catch (e) {
            error.value = getErrorMessage(e, '명세서 목록을 불러오지 못했습니다.')
            return []
        }
    }

  const createQuotationRequest = ({ client, items, requirements }) => {
    const id = makeId('RQ')
    const lineItems = (items || []).map(withAmount)
    const next = normalizeDocument({
      id,
      type: 'quotation-request',
      client,
      items: lineItems,
      requirements: requirements || '',
      status: 'REQUESTED',
      createdAt: formatDate(),
      totalAmount: totalAmountOf(lineItems),
      historyId: null,
    })

    quotationRequests.value.unshift(next)
    const createdPipeline = historyStore.createPipeline(client, next)
    if (createdPipeline) {
      next.historyId = createdPipeline.id
    }
    emitDocumentCreated('quotation-request', id)

    createQuotationRequestApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = quotationRequests.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          quotationRequests.value[idx] = normalizeDocument({
            ...created,
            historyId: created?.historyId || next.historyId,
          })
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '견적 요청서 생성에 실패했습니다.')
      })

    return next
  }

  const createQuotation = ({ requestId, client, items, memo, historyId }) => {
    const id = makeId('QT')
    const lineItems = (items || []).map(withAmount)
    const request = requestId ? getRequestById(requestId) : null
    const linkedHistoryId = historyId || request?.historyId || null
    const next = normalizeDocument({
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
      historyId: linkedHistoryId,
    })

    quotations.value.unshift(next)
    const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
    if (targetPipeline) {
      next.historyId = targetPipeline.id
    }
    emitDocumentCreated('quotation', id)

    if (request) {
      request.status = 'QUOTED'
      request.historyId = next.historyId || request.historyId || null
    }

    createQuotationApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = quotations.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          quotations.value[idx] = normalizeDocument({
            ...created,
            historyId: created?.historyId || next.historyId,
          })
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '견적서 생성에 실패했습니다.')
      })

    return next
  }

  const createContract = ({ quotationId, client, items, startDate, endDate, billingCycle, specialTerms, historyId }) => {
    const id = makeId('CT')
    const lineItems = (items || []).map(withAmount)
    const quotation = quotationId ? getQuotationById(quotationId) : null
    const linkedHistoryId = historyId || quotation?.historyId || null
    const next = normalizeDocument({
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
      historyId: linkedHistoryId,
    })

    contracts.value.unshift(next)
    const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
    if (targetPipeline) {
      next.historyId = targetPipeline.id
    }
    emitDocumentCreated('contract', id)

    if (quotation) {
      quotation.status = 'CONTRACTED'
      quotation.historyId = next.historyId || quotation.historyId || null
    }

    createContractApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = contracts.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          contracts.value[idx] = normalizeDocument({
            ...created,
            historyId: created?.historyId || next.historyId,
          })
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '계약서 생성에 실패했습니다.')
      })

    return next
  }

  const createOrder = ({ contractId, client, items, deliveryDate, memo, historyId }) => {
    const id = makeId('OD')
    const lineItems = (items || []).map(withAmount)
    const contract = contractId ? getContractById(contractId) : null
    const linkedHistoryId = historyId || contract?.historyId || null
    const next = normalizeDocument({
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
      historyId: linkedHistoryId,
    })

    orders.value.unshift(next)
    const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
    if (targetPipeline) {
      next.historyId = targetPipeline.id
    }
    if (contract) {
      contract.historyId = next.historyId || contract.historyId || null
    }
    emitDocumentCreated('order', id)

    createOrderApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = orders.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          orders.value[idx] = normalizeDocument({
            ...created,
            historyId: created?.historyId || next.historyId,
          })
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '주문서 생성에 실패했습니다.')
      })

    return next
  }

  const createInvoice = ({ orderId, client, items, remarks, mode = 'pending', historyId }) => {
    const id = makeId('IV')
    const lineItems = (items || []).map(withAmount)
    const supplyAmount = totalAmountOf(lineItems)
    const taxAmount = Math.round(supplyAmount * 0.1)
    const order = orderId ? getOrderById(orderId) : null
    const linkedHistoryId = historyId || order?.historyId || null
    const next = normalizeDocument({
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
      historyId: linkedHistoryId,
    })

    invoices.value.unshift(next)
    const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
    if (targetPipeline) {
      next.historyId = targetPipeline.id
    }
    if (order) {
      order.historyId = next.historyId || order.historyId || null
    }
    emitDocumentCreated('invoice', id)

    createInvoiceApi(next)
      .then((created) => {
        if (!created) {
          return
        }

        const idx = invoices.value.findIndex((item) => item.id === id)
        if (idx >= 0) {
          invoices.value[idx] = normalizeDocument({
            ...created,
            historyId: created?.historyId || next.historyId,
          })
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
        fetchStatements(),
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
    statements,
    fetchStatements,
  }
})
