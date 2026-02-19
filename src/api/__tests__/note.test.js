import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as noteApi from '../note'
import api from '../index'

vi.mock('../index', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('note API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotes', () => {
    it('should get notes with params', async () => {
      const mockParams = { clientId: 1, limit: 10 }
      const mockResponse = [{ id: 1, content: 'Test note' }]
      api.get.mockResolvedValue(mockResponse)

      const result = await noteApi.getNotes(mockParams)

      expect(api.get).toHaveBeenCalledWith('/notes', { params: mockParams })
      expect(result).toEqual(mockResponse)
    })

    it('should get notes without params', async () => {
      const mockResponse = []
      api.get.mockResolvedValue(mockResponse)

      const result = await noteApi.getNotes()

      expect(api.get).toHaveBeenCalledWith('/notes', { params: undefined })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createNote', () => {
    it('should post note data', async () => {
      const mockData = { clientId: 1, content: 'Test note', date: '2026-02-19' }
      const mockResponse = { id: 1, ...mockData }
      api.post.mockResolvedValue(mockResponse)

      const result = await noteApi.createNote(mockData)

      expect(api.post).toHaveBeenCalledWith('/notes', mockData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle empty content', async () => {
      const mockData = { clientId: 1, content: '', date: '2026-02-19' }
      api.post.mockResolvedValue({ id: 2, ...mockData })

      await noteApi.createNote(mockData)

      expect(api.post).toHaveBeenCalledWith('/notes', mockData)
    })
  })

  describe('searchNotes', () => {
    it('should search notes with params', async () => {
      const mockParams = { keyword: 'test', clientId: 1 }
      const mockResponse = [{ id: 1, content: 'Test note' }]
      api.get.mockResolvedValue(mockResponse)

      const result = await noteApi.searchNotes(mockParams)

      expect(api.get).toHaveBeenCalledWith('/notes/search', { params: mockParams })
      expect(result).toEqual(mockResponse)
    })

    it('should handle empty search results', async () => {
      const mockParams = { keyword: 'nonexistent' }
      api.get.mockResolvedValue([])

      const result = await noteApi.searchNotes(mockParams)

      expect(result).toEqual([])
    })
  })

  describe('getAIBriefing', () => {
    it('should get AI briefing for client', async () => {
      const clientId = 1
      const mockResponse = {
        statusChange: ['Recent activity'],
        pattern: ['Pattern analysis'],
        strategy: 'Recommended strategy',
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await noteApi.getAIBriefing(clientId)

      expect(api.get).toHaveBeenCalledWith(`/notes/ai-briefing/${clientId}`)
      expect(result).toEqual(mockResponse)
    })

    it('should handle string client id', async () => {
      const clientId = 'client-123'
      api.get.mockResolvedValue({})

      await noteApi.getAIBriefing(clientId)

      expect(api.get).toHaveBeenCalledWith(`/notes/ai-briefing/${clientId}`)
    })
  })

  describe('getClientNote', () => {
    it('should get notes for specific client', async () => {
      const clientId = 1
      const mockResponse = [{ id: 1, clientId, content: 'Client note' }]
      api.get.mockResolvedValue(mockResponse)

      const result = await noteApi.getClientNote(clientId)

      expect(api.get).toHaveBeenCalledWith(`/notes/client/${clientId}`)
      expect(result).toEqual(mockResponse)
    })

    it('should handle empty client notes', async () => {
      const clientId = 999
      api.get.mockResolvedValue([])

      const result = await noteApi.getClientNote(clientId)

      expect(result).toEqual([])
    })
  })
})