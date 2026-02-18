import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getClients } from '@/api/client'
import { updateNote as updateNoteApi,
  createNote as createNoteApi,
  getAIBriefing,
  getNotes,
} from '@/api/note'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return error?.response?.data?.message || error?.message || fallback
}

const defaultBriefing = (clientName, notes) => {
  const latest = notes[0]
  const previous = notes[1] || notes[0]

  return {
    statusChange: [
      `${latest.date} 활동에서 '${latest.summary?.[0] || '핵심 이슈'}' 논의가 진행되었습니다.`,
      `직전 활동('${previous.summary?.[0] || '이전 활동'}') 대비 고객 니즈가 더 구체화되고 있습니다.`,
    ],
    pattern: [
      '고객은 신품종 테스트에 적극적이며 데이터 기반 설명을 선호합니다.',
      '가격보다 안정적인 품질과 납기 준수에 높은 가중치를 둡니다.',
    ],
    strategy: `'${latest.summary?.[0] || '핵심 이슈'}'에 맞춘 후속 자료를 준비해 다음 미팅에서 실행 계획을 제시하세요.`,
    recentNoteIds: notes.slice(0, 2).map((item) => item.id),
    clientName,
  }
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

function deriveContractsFromNotes(noteList) {
  const map = {}

  noteList.forEach((note) => {
    if (!note?.clientId || !note?.contract) {
      return
    }

    if (!map[note.clientId]) {
      map[note.clientId] = []
    }

    if (!map[note.clientId].includes(note.contract)) {
      map[note.clientId].push(note.contract)
    }
  })

  return map
}

export const useNoteStore = defineStore('note', () => {
  const clients = ref([])
  const contracts = ref({})
  const notes = ref([])
  const briefingByClient = ref({})
  const loading = ref(false)
  const error = ref(null)

  const today = () => new Date().toISOString().slice(0, 10)

  const clientMap = computed(() => Object.fromEntries(clients.value.map((client) => [client.id, client])))

  const cropOptions = computed(() => [...new Set(notes.value.map((note) => note.crop).filter(Boolean))])
  const varietyOptions = computed(() => [...new Set(notes.value.map((note) => note.variety).filter(Boolean))])

  const getClientName = (clientId) => clientMap.value[clientId]?.name || '-'
  const getContractsByClient = (clientId) => (clientId ? contracts.value[clientId] || [] : [])

  const generateSummary = (content) => {
    const normalized = String(content || '').trim()

    if (!normalized) {
      return ['기록 내용 없음', '핵심 포인트를 입력해 주세요', '후속 활동 필요']
    }

    const sentences = normalized
      .split(/(?<=[.!?])\s+|\n+/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (sentences.length >= 3) {
      return sentences.slice(0, 3).map((line) => (line.length > 38 ? `${line.slice(0, 38)}...` : line))
    }

    const fallback = [
      '핵심 요청사항이 기록되었습니다.',
      '후속 미팅/자료 전달 일정이 필요합니다.',
      '다음 액션을 영업 캘린더에 반영하세요.',
    ]

    return [...sentences, ...fallback].slice(0, 3)
  }

  async function fetchClients(params) {
    try {
      const result = await getClients(params)
      clients.value = normalizeList(result).map((client) => ({
        id: client.id,
        name: client.name,
        type: client.typeLabel || client.type || '-',
      }))
      return clients.value
    } catch (e) {
      error.value = getErrorMessage(e, '거래처 목록을 불러오지 못했습니다.')
      return clients.value
    }
  }

  async function fetchNotes(params) {
    try {
      const result = normalizeList(await getNotes(params))
      notes.value = result.map((note) => ({
        ...note,
        summary: Array.isArray(note.summary) ? note.summary : generateSummary(note.content),
      }))
      contracts.value = deriveContractsFromNotes(notes.value)
      return notes.value
    } catch (e) {
      error.value = getErrorMessage(e, '노트 목록을 불러오지 못했습니다.')
      return notes.value
    }
  }

  const createNote = async ({ clientId, contract, date, content }) => {
    const next = {
      clientId,
      contract: contract || '일반 상담',
      date: date || today(),
      content,
      summary: generateSummary(content),
      isEdited: false,
    }

    try {
      const created = await createNoteApi(next)
      const noteWithSummary = {
        ...created,
        summary: Array.isArray(created.summary) ? created.summary : generateSummary(created.content),
      }
      notes.value.unshift(noteWithSummary)

      if (clientId && contract) {
        const nextContracts = new Set(contracts.value[clientId] || [])
        nextContracts.add(contract)
        contracts.value = {
          ...contracts.value,
          [clientId]: [...nextContracts],
        }
      }
      return noteWithSummary
    } catch (e) {
      error.value = getErrorMessage(e, '노트 저장에 실패했습니다.')
      throw e
    }
  }

  const updateNote = async (id, { clientId, contract, date, content }) => {
    const next = {
      clientId,
      contract: contract || '일반 상담',
      date: date || today(),
      content,
      summary: generateSummary(content),
      isEdited: true,
      updatedAt: new Date().toISOString(),
    }

    try {
      const updated = await updateNoteApi(id, next)
      const noteWithSummary = {
        ...updated,
        summary: Array.isArray(updated.summary) ? updated.summary : generateSummary(updated.content),
      }

      const idx = notes.value.findIndex((item) => item.id === id)
      if (idx >= 0) {
        notes.value[idx] = noteWithSummary
      }

      return noteWithSummary
    } catch (e) {
      error.value = getErrorMessage(e, '노트 수정에 실패했습니다.')
      throw e
    }
  }

  const getNotesByClient = (clientId) => notes.value
    .filter((note) => note.clientId === Number(clientId) || note.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

  async function fetchBriefingByClient(clientId) {
    if (!clientId) {
      return null
    }

    try {
      const briefing = await getAIBriefing(clientId)
      briefingByClient.value = {
        ...briefingByClient.value,
        [clientId]: briefing,
      }
      return briefing
    } catch (e) {
      // Fallback logic if API fails or returns 404
      const list = getNotesByClient(clientId)
      if (list.length >= 3) {
        const fallback = defaultBriefing(getClientName(clientId), list)
        briefingByClient.value = {
          ...briefingByClient.value,
          [clientId]: fallback,
        }
        return fallback
      }
      return null
    }
  }

  const getBriefingByClient = (clientId) => {
    if (!clientId) return null
    const list = getNotesByClient(clientId)
    if (list.length < 3) {
      return null
    }

    if (!briefingByClient.value[clientId]) {
      void fetchBriefingByClient(clientId)
      return defaultBriefing(getClientName(clientId), list)
    }

    return briefingByClient.value[clientId]
  }

  const searchClientNotes = ({ clientId, contract, variety, keyword, dateFrom, dateTo, sort = 'desc' } = {}) => {
    const q = String(keyword || '').trim().toLowerCase()

    const result = notes.value.filter((note) => {
      if (clientId && note.clientId !== clientId) {
        return false
      }

      if (contract && note.contract !== contract) {
        return false
      }

      if (variety && note.variety !== variety) {
        return false
      }

      if (dateFrom && note.date < dateFrom) {
        return false
      }

      if (dateTo && note.date > dateTo) {
        return false
      }

      if (q) {
        const haystack = `${getClientName(note.clientId)} ${note.contract} ${note.variety} ${note.content} ${(note.summary || []).join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) {
          return false
        }
      }

      return true
    })

    result.sort((a, b) => {
      if (sort === 'asc') {
        return a.date.localeCompare(b.date) || a.id - b.id
      }

      return b.date.localeCompare(a.date) || b.id - a.id
    })

    return result
  }

  const searchProductNotes = ({ crop, keyword, dateFrom, dateTo } = {}) => {
    const q = String(keyword || '').trim().toLowerCase()

    return notes.value
      .filter((note) => {
        if (crop && note.crop !== crop) {
          return false
        }

        if (dateFrom && note.date < dateFrom) {
          return false
        }

        if (dateTo && note.date > dateTo) {
          return false
        }

        if (q) {
          const haystack = `${note.crop} ${note.variety} ${note.content} ${(note.summary || []).join(' ')}`.toLowerCase()
          if (!haystack.includes(q)) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  }

  async function initialize() {
    loading.value = true
    error.value = null

    try {
      await Promise.all([
        fetchClients(),
        fetchNotes(),
      ])
    } finally {
      loading.value = false
    }
  }

  void initialize()

  return {
    clients,
    contracts,
    notes,
    cropOptions,
    varietyOptions,
    loading,
    error,
    fetchClients,
    fetchNotes,
    fetchBriefingByClient,
    getClientName,
    getContractsByClient,
    generateSummary,
    createNote,
    updateNote,
    getNotesByClient,
    getBriefingByClient,
    searchClientNotes,
    searchProductNotes,
  }
})
