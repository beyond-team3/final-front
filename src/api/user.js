import api from './index'

export function getUsers(params) {
  return api.get('/users', { params })
}

export function getUserDetail(id) {
  return api.get(`/users/${id}`)
}

export function createUser(data) {
  return api.post('/users', data)
}

export function updateMyPage(data) {
  return api.put('/users/me', data)
}
