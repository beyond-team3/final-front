import api from './index'

export function getRecommendations(params) {
  return api.get('/recommendations', { params })
}
