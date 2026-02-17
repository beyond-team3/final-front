import api from './index'

export function getPestMapData(params) {
  return api.get('/pest-map', { params })
}
