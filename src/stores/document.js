import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const PRODUCT_MASTER = [
  { id: 1, variety: '고추', name: '신녹광고추', unit: '립', unitPrice: 50000 },
  { id: 2, variety: '참외', name: '꿀모닝참외', unit: 'kg', unitPrice: 18000 },
  { id: 3, variety: '파', name: '티탄대파', unit: 'kg', unitPrice: 7200 },
  { id: 4, variety: '수박', name: '스피드꿀수박', unit: 'kg', unitPrice: 4100 },
  { id: 5, variety: '배추', name: '불암3호배추', unit: 'kg', unitPrice: 3600 },
]

const CLIENT_MASTER = [
  { id: 'C-001', code: 'AG-001', name: '경기대리점', contact: '박사장' },
  { id: 'C-002', code: 'NUR-001', name: '중앙육묘장', contact: '최대표' },
  { id: 'C-003', code: 'S-010', name: '남부종묘', contact: '김철수' },
]

const withAmount = (item) => ({
  ...item,
  amount: Number(item.quantity || 0) * Number(item.unitPrice || 0),
})

export const useDocumentStore = defineStore('document', () => {
  // TODO: API 연결
  const productMaster = ref([...PRODUCT_MASTER])
  const clientMaster = ref([...CLIENT_MASTER])

  const quotationRequests = ref([])
  const quotations = ref([])
  const contracts = ref([])
  const orders = ref([])
  const invoices = ref([])

  const requestSeq = ref(1)
  const quotationSeq = ref(1)
  const contractSeq = ref(1)
  const orderSeq = ref(1)
  const invoiceSeq = ref(1)

  const formatDate = (date = new Date()) => date.toISOString().slice(0, 10)

  const makeId = (prefix, seq) => `${prefix}-${String(seq).padStart(4, '0')}`

  const totalAmountOf = (items = []) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const getRequestById = (id) => quotationRequests.value.find((item) => item.id === id)
  const getQuotationById = (id) => quotations.value.find((item) => item.id === id)
  const getContractById = (id) => contracts.value.find((item) => item.id === id)
  const getOrderById = (id) => orders.value.find((item) => item.id === id)
  const getInvoiceById = (id) => invoices.value.find((item) => item.id === id)

  const createQuotationRequest = ({ client, items, requirements }) => {
    const id = makeId('RQ', requestSeq.value++)
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
      client,
      items: lineItems,
      requirements: requirements || '',
      status: 'REQUESTED',
      createdAt: formatDate(),
      totalAmount: totalAmountOf(lineItems),
    }

    quotationRequests.value.unshift(next)
    return next
  }

  const createQuotation = ({ requestId, client, items, memo }) => {
    const id = makeId('QT', quotationSeq.value++)
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
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

    if (requestId) {
      const request = getRequestById(requestId)
      if (request) {
        request.status = 'QUOTED'
      }
    }

    return next
  }

  const createContract = ({ quotationId, client, items, startDate, endDate, billingCycle, specialTerms }) => {
    const id = makeId('CT', contractSeq.value++)
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
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

    if (quotationId) {
      const quotation = getQuotationById(quotationId)
      if (quotation) {
        quotation.status = 'CONTRACTED'
      }
    }

    return next
  }

  const createOrder = ({ contractId, client, items, deliveryDate, memo }) => {
    const id = makeId('OD', orderSeq.value++)
    const lineItems = (items || []).map(withAmount)
    const next = {
      id,
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
    return next
  }

  const createInvoice = ({ orderId, client, items, remarks, mode = 'pending' }) => {
    const id = makeId('IV', invoiceSeq.value++)
    const lineItems = (items || []).map(withAmount)
    const supplyAmount = totalAmountOf(lineItems)
    const taxAmount = Math.round(supplyAmount * 0.1)
    const next = {
      id,
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
    return next
  }

  const markInvoiceIssued = (invoiceId) => {
    const invoice = getInvoiceById(invoiceId)
    if (invoice) {
      invoice.status = 'issued'
    }
  }

  const pendingInvoices = computed(() => invoices.value.filter((item) => item.status === 'pending'))
  const issuedInvoices = computed(() => invoices.value.filter((item) => item.status === 'issued'))

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
