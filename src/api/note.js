import api from './index'

// 영업 활동 기록 목록 조회 및 검색
export function getNotes(params) {
  return api.get('/notes', { params })
}

// 영업 활동 기록 저장
export function createNote(data) {
  return api.post('/notes', data)
}

// 영업 활동 기록 수정
export function updateNote(id, data) {
  return api.put(`/notes/${id}`, data)
}

// 영업 활동 기록 삭제
export function deleteNote(id) {
  return api.delete(`/notes/${id}`)
}

// 고객별 표준 AI 브리핑 조회
export function getAIBriefing(clientId) {
  return api.get(`/briefing/${clientId}`)
}

// RAGseed 전략 인출
export function askRagSeed(params) {
  return api.get('/ragseed/ask', { params })
}
