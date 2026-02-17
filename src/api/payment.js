import api from './index'

export function getPayments(params) {
  return api.get('/payments', { params })
}

export function processPayment(data) {
  return api.post('/payments', data)
}
