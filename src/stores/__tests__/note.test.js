import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../note'
import * as noteApi from '@/api/note'
import * as clientApi from '@/api/client'

vi.mock('@/api/note')
vi.mock('@/api/client')

describe('note store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    noteApi.getNotes.mockResolvedValue([])
    noteApi.createNote.mockResolvedValue({})
    clientApi.getClients.mockResolvedValue([])
  })

  describe('createNote', () => {
    it('should create note with generated summary', () => {
      const store = useNoteStore()

      const note = store.createNote({
        clientId: 1,
        contract: 'Test Contract',
        date: '2026-02-19',
        content: 'This is a test note. It has multiple sentences. And a third one.',
      })

      expect(note.id).toBeDefined()
      expect(note.clientId).toBe(1)
      expect(note.contract).toBe('Test Contract')
      expect(note.summary).toHaveLength(3)
      expect(store.notes).toHaveLength(1)
    })

    it('should generate default summary for short content', () => {
      const store = useNoteStore()

      const note = store.createNote({
        clientId: 1,
        date: '2026-02-19',
        content: 'Short note',
      })

      expect(note.summary).toHaveLength(3)
      expect(note.summary[0]).toContain('Short note')
    })

    it('should handle empty content', () => {
      const store = useNoteStore()

      const note = store.createNote({
        clientId: 1,
        date: '2026-02-19',
        content: '',
      })

      expect(note.summary).toHaveLength(3)
      expect(note.summary[0]).toBe('기록 내용 없음')
    })

    it('should add contract to contracts map', () => {
      const store = useNoteStore()

      store.createNote({
        clientId: 1,
        contract: 'Contract A',
        date: '2026-02-19',
        content: 'Test',
      })

      store.createNote({
        clientId: 1,
        contract: 'Contract B',
        date: '2026-02-19',
        content: 'Test',
      })

      const contracts = store.contracts[1]
      expect(contracts).toContain('Contract A')
      expect(contracts).toContain('Contract B')
      expect(contracts).toHaveLength(2)
    })

    it('should not duplicate contracts', () => {
      const store = useNoteStore()

      store.createNote({
        clientId: 1,
        contract: 'Contract A',
        date: '2026-02-19',
        content: 'Test 1',
      })

      store.createNote({
        clientId: 1,
        contract: 'Contract A',
        date: '2026-02-19',
        content: 'Test 2',
      })

      const contracts = store.contracts[1]
      expect(contracts).toHaveLength(1)
    })
  })

  describe('getNotesByClient', () => {
    it('should return notes for specific client sorted by date', () => {
      const store = useNoteStore()

      store.createNote({
        clientId: 1,
        date: '2026-02-15',
        content: 'Old note',
      })

      store.createNote({
        clientId: 1,
        date: '2026-02-20',
        content: 'New note',
      })

      store.createNote({
        clientId: 2,
        date: '2026-02-18',
        content: 'Other client',
      })

      const notes = store.getNotesByClient(1)

      expect(notes).toHaveLength(2)
      expect(notes[0].date).toBe('2026-02-20')
      expect(notes[1].date).toBe('2026-02-15')
    })

    it('should return empty array for client with no notes', () => {
      const store = useNoteStore()
      const notes = store.getNotesByClient(999)

      expect(notes).toEqual([])
    })
  })

  describe('searchClientNotes', () => {
    beforeEach(() => {
      const store = useNoteStore()
      store.clients = [
        { id: 1, name: 'Client A' },
        { id: 2, name: 'Client B' },
      ]
    })

    it('should filter by clientId', () => {
      const store = useNoteStore()

      store.createNote({ clientId: 1, date: '2026-02-19', content: 'Note 1' })
      store.createNote({ clientId: 2, date: '2026-02-19', content: 'Note 2' })

      const results = store.searchClientNotes({ clientId: 1 })

      expect(results).toHaveLength(1)
      expect(results[0].clientId).toBe(1)
    })

    it('should filter by contract', () => {
      const store = useNoteStore()

      store.createNote({ clientId: 1, contract: 'Contract A', date: '2026-02-19', content: 'Note 1' })
      store.createNote({ clientId: 1, contract: 'Contract B', date: '2026-02-19', content: 'Note 2' })

      const results = store.searchClientNotes({ contract: 'Contract A' })

      expect(results).toHaveLength(1)
      expect(results[0].contract).toBe('Contract A')
    })

    it('should filter by date range', () => {
      const store = useNoteStore()

      store.createNote({ clientId: 1, date: '2026-02-10', content: 'Early note' })
      store.createNote({ clientId: 1, date: '2026-02-15', content: 'Mid note' })
      store.createNote({ clientId: 1, date: '2026-02-20', content: 'Late note' })

      const results = store.searchClientNotes({
        dateFrom: '2026-02-12',
        dateTo: '2026-02-18',
      })

      expect(results).toHaveLength(1)
      expect(results[0].date).toBe('2026-02-15')
    })

    it('should filter by keyword in content', () => {
      const store = useNoteStore()

      store.createNote({ clientId: 1, date: '2026-02-19', content: 'Important meeting discussion' })
      store.createNote({ clientId: 1, date: '2026-02-19', content: 'Regular followup call' })

      const results = store.searchClientNotes({ keyword: 'meeting' })

      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('meeting')
    })

    it('should sort by date ascending when sort is asc', () => {
      const store = useNoteStore()

      store.createNote({ clientId: 1, date: '2026-02-20', content: 'New' })
      store.createNote({ clientId: 1, date: '2026-02-15', content: 'Old' })

      const results = store.searchClientNotes({ sort: 'asc' })

      expect(results[0].date).toBe('2026-02-15')
      expect(results[1].date).toBe('2026-02-20')
    })

    it('should sort by date descending by default', () => {
      const store = useNoteStore()

      store.createNote({ clientId: 1, date: '2026-02-15', content: 'Old' })
      store.createNote({ clientId: 1, date: '2026-02-20', content: 'New' })

      const results = store.searchClientNotes({})

      expect(results[0].date).toBe('2026-02-20')
      expect(results[1].date).toBe('2026-02-15')
    })
  })

  describe('getBriefingByClient', () => {
    it('should return null if less than 3 notes', () => {
      const store = useNoteStore()

      store.createNote({ clientId: 1, date: '2026-02-19', content: 'Note 1' })
      store.createNote({ clientId: 1, date: '2026-02-18', content: 'Note 2' })

      const briefing = store.getBriefingByClient(1)

      expect(briefing).toBeNull()
    })

    it('should return default briefing if no cached briefing', () => {
      const store = useNoteStore()
      store.clients = [{ id: 1, name: 'Test Client' }]

      store.createNote({ clientId: 1, date: '2026-02-19', content: 'Note 1. Summary point.' })
      store.createNote({ clientId: 1, date: '2026-02-18', content: 'Note 2. Another point.' })
      store.createNote({ clientId: 1, date: '2026-02-17', content: 'Note 3. Third point.' })

      const briefing = store.getBriefingByClient(1)

      expect(briefing).toBeDefined()
      expect(briefing.statusChange).toBeDefined()
      expect(briefing.pattern).toBeDefined()
      expect(briefing.strategy).toBeDefined()
      expect(briefing.recentNoteIds).toHaveLength(2)
    })
  })

  describe('generateSummary', () => {
    it('should extract first 3 sentences from content', () => {
      const store = useNoteStore()

      const summary = store.generateSummary(
        'First sentence. Second sentence. Third sentence. Fourth sentence.'
      )

      expect(summary).toHaveLength(3)
      expect(summary[0]).toBe('First sentence.')
      expect(summary[1]).toBe('Second sentence.')
      expect(summary[2]).toBe('Third sentence.')
    })

    it('should handle content with line breaks', () => {
      const store = useNoteStore()

      const summary = store.generateSummary('Line 1\nLine 2\nLine 3\nLine 4')

      expect(summary).toHaveLength(3)
    })

    it('should truncate long sentences', () => {
      const store = useNoteStore()

      const longSentence = 'A'.repeat(50)
      const summary = store.generateSummary(longSentence)

      expect(summary[0]).toHaveLength(41) // 38 + '...'
      expect(summary[0]).toEndWith('...')
    })

    it('should use fallback for short content', () => {
      const store = useNoteStore()

      const summary = store.generateSummary('Short')

      expect(summary).toHaveLength(3)
      expect(summary).toContain('Short')
    })
  })

  describe('getClientName', () => {
    it('should return client name by id', () => {
      const store = useNoteStore()
      store.clients = [
        { id: 1, name: 'Client A' },
        { id: 2, name: 'Client B' },
      ]

      expect(store.getClientName(1)).toBe('Client A')
      expect(store.getClientName(2)).toBe('Client B')
    })

    it('should return dash for unknown client', () => {
      const store = useNoteStore()
      store.clients = []

      expect(store.getClientName(999)).toBe('-')
    })
  })

  describe('getContractsByClient', () => {
    it('should return contracts for client', () => {
      const store = useNoteStore()
      store.contracts = {
        1: ['Contract A', 'Contract B'],
        2: ['Contract C'],
      }

      expect(store.getContractsByClient(1)).toEqual(['Contract A', 'Contract B'])
      expect(store.getContractsByClient(2)).toEqual(['Contract C'])
    })

    it('should return empty array for client with no contracts', () => {
      const store = useNoteStore()
      store.contracts = {}

      expect(store.getContractsByClient(999)).toEqual([])
    })
  })
})