import api from './index'

export function getUsers(params) {
    return api.get('/accounts/users', { params })
}

export function getUserDetail(id) {
    return api.get(`/accounts/users/${id}`)
}

export function createUser(data) {
    return api.post('/accounts/users/create', data)
}

export function updateMyPage(data) {
    return api.patch('/accounts/users/me', data)
}
