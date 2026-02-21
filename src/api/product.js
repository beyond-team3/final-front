import api from './index'

export function getProducts(params) {
  return api.get('/products', { params })
}

export function getProductDetail(id) {
  return api.get(`/products/${id}`)
}

export function createProduct(data) {
  return api.post('/products', data)
}

export function updateProduct(id, data) {
  return api.put(`/products/${id}`, data)
}

export function getSimilarProducts(id) {
  return api.get(`/products/${id}/similarity`)
}

export function getFavorites() {
  return api.get('/products/favorites')
}

export function addFavorite(data) {
  return api.post('/products/favorites', data)
}

export function removeFavorite(id) {
  return api.delete(`/products/favorites/${id}`)
}

export function getCompareList() {
  return api.get('/products/compare')
}

export function addToCompare(data) {
  return api.post('/products/compare', data)
}

export function removeFromCompare(id) {
  return api.delete(`/products/compare/${id}`)
}

export function submitFeedback(productId, data) {
  return api.post(`/products/${productId}/feedback`, data)
}
