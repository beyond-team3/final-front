import api from './index'

export function getNotes(params) {
  return api.get('/notes', { params })
}

export function createNote(data) {
  return api.post('/notes', data)
}

export function searchNotes(params) {
  return api.get('/notes/search', { params })
}

export function getAIBriefing(clientId) {
  return api.get(`/notes/ai-briefing/${clientId}`)
}

export function getClientNote(clientId) {
  return api.get(`/notes/client/${clientId}`)
}
