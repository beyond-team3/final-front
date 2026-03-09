import api from './index'

export function getEmployees(params) {
    return api.get('/accounts/employees', { params })
}

export function getEmployeeDetail(id) {
    return api.get(`/accounts/employees/${id}`)
}

export function createEmployee(data) {
    return api.post('/accounts/employees/register', data)
}

export function updateEmployee(id, data) {
    return api.patch(`/accounts/employees/${id}`, data)
}
