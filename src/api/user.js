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

export function getUnregisteredClients() {
    return api.get('/accounts/clients/unregistered')
}

export function getUnregisteredEmployees() {
    return api.get('/accounts/employees/unregistered')
}

export function getAllEmployeesSimple() {
    return api.get('/accounts/employees/simple')
}

export function updateUserStatus(data) {
    return api.patch('/accounts/users/status', data)
}
