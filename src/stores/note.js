import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { getClients } from '@/api/client'
import { getActiveContracts } from '@/api/document'
import {
  updateNote as updateNoteApi,
  createNote as createNoteApi,
  getAIBriefing,
  getNotes,
  deleteNote as deleteNoteApi,
  askRagSeed as askRagSeedApi,
} from '@/api/note'

/* -----------------------------
  Utils
----------------------------- */

function today() {
  return new Date().toISOString().slice(0, 10)
}

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  const data = error?.response?.data
  return (
    data?.data?.message ||
    data?.message ||
    error?.message ||
    fallback
  )
}

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? res
}

function normalizeList(data) {
  if (Array.isArray(data)) return data
  const actualData = data?.data ?? data
  if (Array.isArray(actualData)) return actualData
  if (Array.isArray(data?.items)) return data.items
  return []
}

/* -----------------------------
  DTO Normalizer
----------------------------- */

function normalizeNote(note) {
  if (!note) return null

  return {
    id: Number(note.id ?? 0),
    clientId: Number(note.clientId ?? 0),
    authorId: note.authorId ?? null,
    contractId: note.contractId ?? note.contractCode ?? null, // contractCode 대응
    // 날짜 우선순위 처리
    activityDate: note.activityDate ?? note.date ?? today(),
    content: String(note.content ?? '').trim(),
    aiSummary: Array.isArray(note.aiSummary) ? note.aiSummary : [],
    isEdited: Boolean(note.isEdited),
  }
}

function normalizeClient(c) {
  return {
    id: Number(c.id ?? 0),
    code: c.clientCode ?? '-',
    name: c.clientName ?? '-',
    manager: c.managerName ?? '-',
    type: c.clientType || '-',
  }
}

/* -----------------------------
  Store
----------------------------- */

export const useNoteStore = defineStore('note', () => {

  /* -----------------------------
     State
  ----------------------------- */

  const clients = ref([])
  const notes = ref([])
  const briefingByClient = ref({})
  const contractOptions = ref([]) // 현재 선택된 고객의 유효 계약 목록

  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  /* -----------------------------
     Computed (Selectors)
  ----------------------------- */

  const clientMap = computed(() =>
    Object.fromEntries(clients.value.map(c => [c.id, c]))
  )

  const getClientName = (clientId) =>
    clientMap.value[clientId]?.name ?? '알 수 없는 고객'

  /* -----------------------------
     Internal Mutations
  ----------------------------- */

  function upsertNote(note) {
    const normalized = normalizeNote(note)
    if (!normalized || normalized.id === 0) return

    const idx = notes.value.findIndex(n => n.id === normalized.id)

    if (idx === -1) {
      notes.value.unshift(normalized)
    } else {
      notes.value[idx] = normalized
    }
  }

  function removeNote(id) {
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx !== -1) {
      notes.value.splice(idx, 1)
    }
  }

  /* -----------------------------
     API (Fetch)
  ----------------------------- */

  async function fetchClients(params) {
    try {
      const result = unwrap(await getClients(params))
      // 백엔드에서 이미 권한 필터링을 수행하므로 그대로 사용
      clients.value = normalizeList(result).map(normalizeClient)
      return clients.value
    } catch (e) {
      error.value = getErrorMessage(e, '거래처 목록을 불러오지 못했습니다.')
      return []
    }
  }

  async function fetchNotes(params) {
    try {
      const result = unwrap(await getNotes(params))
      notes.value = normalizeList(result)
        .map(normalizeNote)
        .filter(n => n !== null && n.id !== 0)
      return notes.value
    } catch (e) {
      error.value = getErrorMessage(e, '노트 목록을 불러오지 못했습니다.')
      return []
    }
  }

  async function fetchActiveContracts(clientId) {
    if (!clientId) {
      contractOptions.value = []
      return []
    }
    try {
      const result = unwrap(await getActiveContracts(clientId))
      contractOptions.value = normalizeList(result)
      return contractOptions.value
    } catch (e) {
      console.error('계약 목록 로드 실패:', e)
      contractOptions.value = []
      return []
    }
  }

  /* -----------------------------
     CRUD Actions
  ----------------------------- */

  async function createNote({ clientId, contractId, date, content }) {
    const payload = {
      clientId: Number(clientId),
      contractId: contractId || null, // 가이드에 따라 contractCode(String) 전달
      date: date ?? today(),
      content: String(content ?? '').trim(),
    }

    try {
      loading.value = true
      const created = unwrap(await createNoteApi(payload))
      upsertNote(created)
      return normalizeNote(created)
    } catch (e) {
      error.value = getErrorMessage(e, '노트 저장에 실패했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateNote(id, { clientId, contractId, date, content }) {
    const payload = {
      clientId: Number(clientId),
      contractId: contractId || null,
      date: date ?? today(),
      content: String(content ?? '').trim(),
    }

    try {
      loading.value = true
      const updated = unwrap(await updateNoteApi(id, payload))
      upsertNote(updated)
      return normalizeNote(updated)
    } catch (e) {
      error.value = getErrorMessage(e, '노트 수정에 실패했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteNote(id) {
    try {
      loading.value = true
      await deleteNoteApi(id)
      removeNote(id)
    } catch (e) {
      error.value = getErrorMessage(e, '노트 삭제에 실패했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  /* -----------------------------
     AI & Analytics
  ----------------------------- */

  async function fetchBriefingByClient(clientId) {
    if (!clientId) return null
    try {
      const briefing = unwrap(await getAIBriefing(clientId))
      if (briefing) {
        briefingByClient.value[clientId] = briefing
      }
      return briefing
    } catch (e) {
      error.value = getErrorMessage(e, '브리핑 정보를 불러오지 못했습니다.')
      return null
    }
  }

  const getBriefingByClient = (clientId) =>
    briefingByClient.value[clientId] ?? null

  async function askRagSeed({ clientId, contractId, query }) {
    try {
      loading.value = true
      const result = unwrap(await askRagSeedApi({ clientId, contractId, query }))
      return result
    } catch (e) {
      error.value = getErrorMessage(e, '전략 인출에 실패했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  /* -----------------------------
     Pure Selectors
  ----------------------------- */

  const getNotesByClient = (clientId) => {
    const id = Number(clientId)
    return notes.value
      .filter(n => n.clientId === id)
      .sort((a, b) => {
        const cmp = (b.activityDate ?? '').localeCompare(a.activityDate ?? '')
        return cmp !== 0 ? cmp : b.id - a.id
      })
  }

  const getContractsByClient = (clientId) => {
    const id = Number(clientId)
    const set = new Set()
    for (const n of notes.value) {
      if (n.clientId === id && n.contractId) {
        set.add(n.contractId)
      }
    }
    return [...set].sort()
  }

  /* -----------------------------
     Complex Logic (Search)
  ----------------------------- */

  function searchClientNotes({
    clientId,
    contractId,
    keyword,
    dateFrom,
    dateTo,
    sort = 'desc',
  } = {}) {
    const q = String(keyword ?? '').toLowerCase().trim()

    const result = notes.value.filter(n => {
      if (clientId && n.clientId !== Number(clientId)) return false
      if (contractId && n.contractId !== contractId) return false
      if (dateFrom && n.activityDate < dateFrom) return false
      if (dateTo && n.activityDate > dateTo) return false

      if (q) {
        const haystack = [
          getClientName(n.clientId),
          n.contractId,
          n.content,
          ...(n.aiSummary || [])
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!haystack.includes(q)) return false
      }
      return true
    })

    result.sort((a, b) => {
      const cmp = (a.activityDate ?? '').localeCompare(b.activityDate ?? '') || a.id - b.id
      return sort === 'asc' ? cmp : -cmp
    })

    return result
  }

  /* -----------------------------
     Initialize
  ----------------------------- */

  async function initialize() {
    if (isInitialized.value || loading.value) return
    
    loading.value = true
    try {
      await Promise.all([fetchClients(), fetchNotes()])
      isInitialized.value = true
    } finally {
      loading.value = false
    }
  }

  // 자동 초기화 실행
  void initialize()

  return {
    // State
    clients,
    notes,
    loading,
    error,
    contractOptions,
    // Actions
    fetchClients,
    fetchNotes,
    fetchActiveContracts,
    createNote,
    updateNote,
    deleteNote,
    fetchBriefingByClient,
    askRagSeed,
    initialize,
    // Getters / Selectors
    getClientName,
    getContractsByClient,
    getNotesByClient,
    getBriefingByClient,
    searchClientNotes,
  }
})
