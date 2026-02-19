import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDocumentStore } from '../document'
import * as documentApi from '@/api/document'
import * as clientApi from '@/api/client'
import * as productApi from '@/api/product'

vi.mock('@/api/document')
vi.mock('@/api/client')
vi.mock('@/api/product')
vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({
    createPipeline: vi.fn(() => ({ id: 'H-123' })),
    addDocumentToPipeline: vi.fn(() => ({ id: 'H-123' })),
  }),
}))

describe('document store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('createQuotationRequest', () => {
    it('should create quotation request optimistically', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }
      const items = [{ variety: 'Test', quantity: 10, unitPrice: 1000 }]

      documentApi.createQuotationRequest.mockResolvedValue({})

      const result = store.createQuotationRequest({ client, items, requirements: 'Test' })

      expect(result.type).toBe('quotation-request')
      expect(result.client).toEqual(client)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].amount).toBe(10000)
      expect(store.quotationRequests).toHaveLength(1)
    })

    it('should update after API response', async () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }

      const apiResponse = { id: 'RQ-API', type: 'quotation-request', client }
      documentApi.createQuotationRequest.mockResolvedValue(apiResponse)

      store.createQuotationRequest({ client, items: [], requirements: '' })

      await vi.waitFor(() => {
        expect(store.quotationRequests[0].id).toBe('RQ-API')
      })
    })
  })

  describe('createQuotation', () => {
    it('should create quotation with linked request', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }
      const request = store.createQuotationRequest({ client, items: [], requirements: '' })

      documentApi.createQuotation.mockResolvedValue({})

      const quotation = store.createQuotation({
        requestId: request.id,
        client,
        items: [],
        memo: 'Test memo',
      })

      expect(quotation.type).toBe('quotation')
      expect(quotation.requestId).toBe(request.id)
      expect(store.quotations).toHaveLength(1)
      expect(request.status).toBe('QUOTED')
    })

    it('should calculate total amount from items', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }
      const items = [
        { variety: 'A', quantity: 10, unitPrice: 100 },
        { variety: 'B', quantity: 5, unitPrice: 200 },
      ]

      documentApi.createQuotation.mockResolvedValue({})

      const quotation = store.createQuotation({ client, items, memo: '' })

      expect(quotation.totalAmount).toBe(2000)
    })
  })

  describe('createContract', () => {
    it('should create contract from quotation', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }
      const quotation = store.createQuotation({ client, items: [], memo: '' })

      documentApi.createContract.mockResolvedValue({})

      const contract = store.createContract({
        quotationId: quotation.id,
        client,
        items: [],
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })

      expect(contract.type).toBe('contract')
      expect(contract.quotationId).toBe(quotation.id)
      expect(store.contracts).toHaveLength(1)
      expect(quotation.status).toBe('CONTRACTED')
    })
  })

  describe('createOrder', () => {
    it('should create order with delivery date', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }
      const items = [{ variety: 'Test', quantity: 10, unitPrice: 100 }]

      documentApi.createOrder.mockResolvedValue({})

      const order = store.createOrder({
        client,
        items,
        deliveryDate: '2026-03-01',
        memo: 'Rush order',
      })

      expect(order.type).toBe('order')
      expect(order.deliveryDate).toBe('2026-03-01')
      expect(order.memo).toBe('Rush order')
      expect(store.orders).toHaveLength(1)
    })
  })

  describe('createInvoice', () => {
    it('should create invoice with tax calculation', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }
      const items = [{ variety: 'Test', quantity: 10, unitPrice: 1000 }]

      documentApi.createInvoice.mockResolvedValue({})

      const invoice = store.createInvoice({
        client,
        items,
        remarks: 'Test invoice',
        mode: 'pending',
      })

      expect(invoice.type).toBe('invoice')
      expect(invoice.supplyAmount).toBe(10000)
      expect(invoice.taxAmount).toBe(1000)
      expect(invoice.totalAmount).toBe(11000)
      expect(invoice.status).toBe('pending')
      expect(store.invoices).toHaveLength(1)
    })

    it('should create issued invoice when mode is issued', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }

      documentApi.createInvoice.mockResolvedValue({})

      const invoice = store.createInvoice({
        client,
        items: [],
        remarks: '',
        mode: 'issued',
      })

      expect(invoice.status).toBe('issued')
    })
  })

  describe('markInvoiceIssued', () => {
    it('should mark invoice as issued', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }

      documentApi.createInvoice.mockResolvedValue({})

      const invoice = store.createInvoice({
        client,
        items: [],
        remarks: '',
        mode: 'pending',
      })

      expect(invoice.status).toBe('pending')

      store.markInvoiceIssued(invoice.id)

      expect(invoice.status).toBe('issued')
    })

    it('should handle non-existent invoice id', () => {
      const store = useDocumentStore()

      expect(() => {
        store.markInvoiceIssued('nonexistent')
      }).not.toThrow()
    })
  })

  describe('getRequestById', () => {
    it('should return quotation request by id', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }

      documentApi.createQuotationRequest.mockResolvedValue({})

      const request = store.createQuotationRequest({ client, items: [], requirements: '' })
      const found = store.getRequestById(request.id)

      expect(found).toEqual(request)
    })

    it('should return undefined for non-existent id', () => {
      const store = useDocumentStore()
      const found = store.getRequestById('nonexistent')

      expect(found).toBeUndefined()
    })
  })

  describe('computed properties', () => {
    it('should filter pending invoices', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }

      documentApi.createInvoice.mockResolvedValue({})

      store.createInvoice({ client, items: [], remarks: '', mode: 'pending' })
      store.createInvoice({ client, items: [], remarks: '', mode: 'issued' })

      expect(store.pendingInvoices).toHaveLength(1)
      expect(store.pendingInvoices[0].status).toBe('pending')
    })

    it('should filter issued invoices', () => {
      const store = useDocumentStore()
      const client = { id: 1, name: 'Test Client' }

      documentApi.createInvoice.mockResolvedValue({})

      store.createInvoice({ client, items: [], remarks: '', mode: 'pending' })
      store.createInvoice({ client, items: [], remarks: '', mode: 'issued' })

      expect(store.issuedInvoices).toHaveLength(1)
      expect(store.issuedInvoices[0].status).toBe('issued')
    })
  })

  describe('totalAmountOf', () => {
    it('should calculate total amount from items', () => {
      const store = useDocumentStore()
      const items = [
        { amount: 1000 },
        { amount: 2000 },
        { amount: 3000 },
      ]

      const total = store.totalAmountOf(items)

      expect(total).toBe(6000)
    })

    it('should handle empty array', () => {
      const store = useDocumentStore()
      const total = store.totalAmountOf([])

      expect(total).toBe(0)
    })

    it('should handle items without amount', () => {
      const store = useDocumentStore()
      const items = [{ name: 'Test' }, { amount: 1000 }]

      const total = store.totalAmountOf(items)

      expect(total).toBe(1000)
    })
  })
})