import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as documentApi from '../document'
import api from '../index'

vi.mock('../index', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('document API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createQuotationRequest', () => {
    it('should post quotation request data', async () => {
      const mockData = { clientId: 1, items: [], requirements: 'Test' }
      const mockResponse = { id: 'RQ-123', ...mockData }
      api.post.mockResolvedValue(mockResponse)

      const result = await documentApi.createQuotationRequest(mockData)

      expect(api.post).toHaveBeenCalledWith('/documents/quotation-request', mockData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle empty items array', async () => {
      const mockData = { clientId: 1, items: [], requirements: '' }
      api.post.mockResolvedValue({ id: 'RQ-124' })

      await documentApi.createQuotationRequest(mockData)

      expect(api.post).toHaveBeenCalledWith('/documents/quotation-request', mockData)
    })
  })

  describe('createQuotation', () => {
    it('should post quotation data', async () => {
      const mockData = { requestId: 'RQ-123', items: [], memo: 'Test' }
      const mockResponse = { id: 'QT-123', ...mockData }
      api.post.mockResolvedValue(mockResponse)

      const result = await documentApi.createQuotation(mockData)

      expect(api.post).toHaveBeenCalledWith('/documents/quotation', mockData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createContract', () => {
    it('should post contract data', async () => {
      const mockData = { quotationId: 'QT-123', items: [], startDate: '2026-01-01' }
      const mockResponse = { id: 'CT-123', ...mockData }
      api.post.mockResolvedValue(mockResponse)

      const result = await documentApi.createContract(mockData)

      expect(api.post).toHaveBeenCalledWith('/documents/contract', mockData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createOrder', () => {
    it('should post order data', async () => {
      const mockData = { contractId: 'CT-123', items: [] }
      const mockResponse = { id: 'OD-123', ...mockData }
      api.post.mockResolvedValue(mockResponse)

      const result = await documentApi.createOrder(mockData)

      expect(api.post).toHaveBeenCalledWith('/documents/order', mockData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createStatement', () => {
    it('should post statement data', async () => {
      const mockData = { orderId: 'OD-123', items: [] }
      const mockResponse = { id: 'ST-123', ...mockData }
      api.post.mockResolvedValue(mockResponse)

      const result = await documentApi.createStatement(mockData)

      expect(api.post).toHaveBeenCalledWith('/documents/statement', mockData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createInvoice', () => {
    it('should post invoice data', async () => {
      const mockData = { orderId: 'OD-123', items: [] }
      const mockResponse = { id: 'IV-123', ...mockData }
      api.post.mockResolvedValue(mockResponse)

      const result = await documentApi.createInvoice(mockData)

      expect(api.post).toHaveBeenCalledWith('/documents/invoice', mockData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getDocuments', () => {
    it('should get documents with params', async () => {
      const mockParams = { type: 'quotation', limit: 10 }
      const mockResponse = [{ id: 'QT-123' }, { id: 'QT-124' }]
      api.get.mockResolvedValue(mockResponse)

      const result = await documentApi.getDocuments(mockParams)

      expect(api.get).toHaveBeenCalledWith('/documents', { params: mockParams })
      expect(result).toEqual(mockResponse)
    })

    it('should get documents without params', async () => {
      const mockResponse = []
      api.get.mockResolvedValue(mockResponse)

      const result = await documentApi.getDocuments()

      expect(api.get).toHaveBeenCalledWith('/documents', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getDocumentDetail', () => {
    it('should get document detail by id', async () => {
      const mockId = 'QT-123'
      const mockResponse = { id: mockId, type: 'quotation' }
      api.get.mockResolvedValue(mockResponse)

      const result = await documentApi.getDocumentDetail(mockId)

      expect(api.get).toHaveBeenCalledWith(`/documents/${mockId}`)
      expect(result).toEqual(mockResponse)
    })

    it('should handle numeric ids', async () => {
      const mockId = 123
      api.get.mockResolvedValue({ id: mockId })

      await documentApi.getDocumentDetail(mockId)

      expect(api.get).toHaveBeenCalledWith(`/documents/${mockId}`)
    })
  })
})