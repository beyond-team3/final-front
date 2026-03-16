import axios from 'axios'
import { useApiCache } from '@/composables/useApiCache'
import { endApiMeasure, startApiMeasure } from '@/utils/performance'

const { buildCacheKey, getCachedValue, invalidateRelatedCache, setCachedValue } = useApiCache()

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

function emitApiEvent(type, detail = {}) {
    if (typeof window === 'undefined') {
        return
    }

    window.dispatchEvent(new CustomEvent(type, { detail }))
}

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        // Axios가 FormData를 보낼 때 브라우저가 자동으로 boundary를 포함한 Content-Type을
        // 설정하도록, 전역에 세팅된 application/json 헤더를 삭제해줍니다.
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']
        }

        startApiMeasure(config)

        config.headers['X-Request-Started-At'] = String(Date.now())
        emitApiEvent('api:request:start', {
            method: config.method,
            url: config.url,
        })

        if (String(config.method || 'get').toLowerCase() === 'get' && !config.disableCache) {
            const cacheKey = buildCacheKey(config)
            config.__cacheKey = cacheKey

            const cachedData = getCachedValue(cacheKey)

            if (cachedData !== null) {
                config.adapter = () => Promise.resolve({
                    data: cachedData,
                    status: 200,
                    statusText: 'OK',
                    headers: config.headers,
                    config,
                    request: { fromCache: true },
                })
            }
        }

        return config
    },
    (error) => Promise.reject(error),
)

api.interceptors.response.use(
    (response) => {
        const method = String(response.config?.method || 'get').toLowerCase()

        if (method === 'get' && response.config?.__cacheKey && !response.request?.fromCache) {
            setCachedValue(response.config.__cacheKey, response.data)
        }

        if (['post', 'put', 'patch', 'delete'].includes(method)) {
            invalidateRelatedCache(response.config?.url)
        }

        endApiMeasure(response.config, response.status, false)

        emitApiEvent('api:request:end', {
            method: response.config?.method,
            url: response.config?.url,
            status: response.status,
            fromCache: Boolean(response.request?.fromCache),
        })

        return response.data
    },
    async (error) => {
        const status = error?.response?.status
        const requestConfig = error?.config || {}
        const method = String(requestConfig.method || '').toLowerCase()

        if (['post', 'put', 'patch', 'delete'].includes(method)) {
            invalidateRelatedCache(requestConfig.url)
        }

        endApiMeasure(requestConfig, status || 0, true)

        emitApiEvent('api:request:end', {
            method: requestConfig.method,
            url: requestConfig.url,
            status: status || 0,
            failed: true,
        })

        if (status === 401) {
            let router = null

            try {
                const [{ useAuthStore }, routerModule] = await Promise.all([
                    import('@/stores/auth'),
                    import('@/router'),
                ])

                router = routerModule.default
                const authStore = useAuthStore()
                await authStore.logout()
            } catch (logoutError) {
                console.error('401 처리 중 로그아웃 실패:', logoutError)
            }

            if (router && window.location.pathname !== '/login') {
                router.push('/login')
            }
        }

        if (status === 403) {
            emitApiEvent('api:error', {
                status,
                message: '권한이 없습니다.',
            })
            console.warn('권한이 없습니다.')
        }

        if (status >= 500) {
            emitApiEvent('api:error', {
                status,
                message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            })
            console.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        }

        if (!error.response) {
            const isTimeout = error.code === 'ECONNABORTED'
            const message = isTimeout
                ? '요청 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.'
                : '네트워크 연결을 확인해주세요.'

            emitApiEvent('api:error', {
                status: 0,
                message,
            })

            console.error(message)
        }

        return Promise.reject(error)
    },
)

export default api
