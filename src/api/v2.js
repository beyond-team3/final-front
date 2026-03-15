import api from './index'

function request(method, url, options = {}) {
  return api.request({
    method,
    url,
    baseURL: '',
    ...options,
  })
}

export function getV2(url, options = {}) {
  return request('get', url, options)
}

export function postV2(url, data, options = {}) {
  return request('post', url, { data, ...options })
}

export function patchV2(url, data, options = {}) {
  return request('patch', url, { data, ...options })
}
