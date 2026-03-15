import api from './index'

export function login(credentials) {
    return api.post('/auth/login', credentials)
}

export function logout() {
    return api.post('/auth/logout')
}

export function getEmployeeInfo() {
    return api.get('/accounts/employees/me')
}

export function getClientInfo() {
    return api.get('/accounts/clients/me')
}

export function changePassword(data) {
    return api.patch('/accounts/password', data)
}
