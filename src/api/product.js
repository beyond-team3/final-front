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

export function addFavorite(productId) {
  return api.post('/products/favorites', { productId })
}

export function removeFavorite(productId) {
  return api.delete(`/products/favorites/${productId}`)
}

export function getCompareList() {
  return api.get('/products/compare')
}

export function addToCompare(productId) {
  return api.post('/products/compare', { productId })
}

export function removeFromCompare(productId) {
  return api.delete(`/products/compare/${productId}`)
}

export function submitFeedback(productId, data) {
  return api.post(`/products/${productId}/feedback`, data)
}
