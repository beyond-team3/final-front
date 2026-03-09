import api from './index'

export function login(credentials) {
    return api.post('/auth/login', credentials)
}

export function logout() {
    return api.post('/auth/logout')
}

export function getMyInfo() {
    return api.get('/accounts/employees/me')
}
