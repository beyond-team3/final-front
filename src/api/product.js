import api from './index'

export function getProducts(params) {
  return api.get('/products/list', { params })
}

export function getProductDetail(id) {
  return api.get(`/products/${id}`)
}

export function createProduct(data) {
  return api.post('/products/create', data)
}

export function getCultivationTimes(productId) {
  return api.get(`/products/${productId}/cultivation-time`)
}

export function updateProduct(id, data) {
  return api.put(`/products/${id}`, data)
}

export function deleteProduct(id) {
  return api.delete(`/products/${id}`)
}

export function getSimilarProducts(id) {
  return api.get(`/products/${id}/similar`)
}

export function getFavorites() {
  return api.get('/products/bookmarks')
}

export function toggleBookmark(id) {
  return api.post(`/products/${id}/bookmark`)
}

export function getCompareHistory() {
  return api.get('/products/compare/history')
}

export function getCompareProducts(productIds) {
  return api.get('/products/compare', { params: { productIds: productIds.join(',') } })
}

export function addToCompare(data) {
  return api.post('/products/compare', data)
}

export function removeFromCompare(id) {
  return api.delete(`/products/compare/${id}`)
}

export function getFeedbacks(productId) {
  return api.get(`/products/${productId}/feedbacks`)
}

export function submitFeedback(productId, data) {
  return api.post(`/products/${productId}/feedbacks`, data)
}

export async function getCategories() {
  const categories = await api.get('/products/categories')
  return categories || []
}
