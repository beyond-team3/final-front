import api from './index'

export function getClients(params) {
    console.log('[DEBUG] getClients 호출됨, params:', params)
    return api.get('/accounts/clients', { params })
}

export function getClientDetail(id) {
    return api.get(`/accounts/clients/${id}`)
}

export function getClientCrops(id) {
    return api.get(`/accounts/clients/${id}/crops`)
}

export function createClient(data) {
    return api.post('/accounts/clients/register', data)
}

export function updateClient(id, data) {
    return api.patch(`/accounts/clients/${id}`, data)
}

export function addClientCrop(id, data) {
    return api.post(`/accounts/clients/${id}/crops`, data)
}

export function deleteClientCrop(cropId) {
    return api.delete(`/accounts/clients/crops/${cropId}`)
}
