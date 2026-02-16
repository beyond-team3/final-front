const DEFAULT_TIMEOUT = 10000

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

function mergeHeaders(defaultHeaders, headers) {
  return {
    ...(defaultHeaders || {}),
    ...(headers || {}),
  }
}

function buildUrl(path, params) {
  const url = new URL(path, window.location.origin)

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return
      }
      url.searchParams.append(key, value)
    })
  }

  return url.pathname + url.search
}

function createApiClient() {
  const requestHandlers = []
  const responseSuccessHandlers = []
  const responseErrorHandlers = []

  const defaults = {
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const client = {
    defaults,
    interceptors: {
      request: {
        use(onFulfilled, onRejected) {
          requestHandlers.push({ onFulfilled, onRejected })
        },
      },
      response: {
        use(onFulfilled, onRejected) {
          responseSuccessHandlers.push(onFulfilled)
          responseErrorHandlers.push(onRejected)
        },
      },
    },
    async request(config) {
      let nextConfig = {
        method: 'GET',
        headers: mergeHeaders(defaults.headers, config.headers),
        timeout: defaults.timeout,
        ...config,
      }

      for (const handler of requestHandlers) {
        try {
          if (handler?.onFulfilled) {
            // eslint-disable-next-line no-await-in-loop
            nextConfig = await handler.onFulfilled(nextConfig)
          }
        } catch (error) {
          if (handler?.onRejected) {
            // eslint-disable-next-line no-await-in-loop
            await handler.onRejected(error)
          }
          throw error
        }
      }

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), nextConfig.timeout)

      try {
        const requestUrl = buildUrl(`${nextConfig.baseURL || defaults.baseURL}${nextConfig.url}`, nextConfig.params)
        const response = await fetch(requestUrl, {
          method: nextConfig.method,
          headers: nextConfig.headers,
          body: nextConfig.data ? JSON.stringify(nextConfig.data) : undefined,
          signal: controller.signal,
        })

        let data = null
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }

        let normalized = {
          data,
          status: response.status,
          headers: response.headers,
          config: nextConfig,
        }

        if (!response.ok) {
          const error = new Error('API request failed')
          error.response = normalized
          throw error
        }

        for (const handler of responseSuccessHandlers) {
          if (handler) {
            // eslint-disable-next-line no-await-in-loop
            normalized = await handler(normalized)
          }
        }

        return normalized
      } catch (error) {
        let nextError = error

        for (const handler of responseErrorHandlers) {
          if (handler) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await handler(nextError)
            } catch (handledError) {
              nextError = handledError
            }
          }
        }

        throw nextError
      } finally {
        window.clearTimeout(timeoutId)
      }
    },
    get(url, config = {}) {
      return client.request({ ...config, method: 'GET', url })
    },
    post(url, data, config = {}) {
      return client.request({ ...config, method: 'POST', url, data })
    },
    put(url, data, config = {}) {
      return client.request({ ...config, method: 'PUT', url, data })
    },
    delete(url, config = {}) {
      return client.request({ ...config, method: 'DELETE', url })
    },
  }

  return client
}

const api = createApiClient()

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') // TODO: Pinia auth store에서 가져오기
    if (token) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: 토큰 만료 처리 및 로그인 페이지 리다이렉트
    }

    if (error.response?.status === 403) {
      // TODO: 권한 없음 처리
    }

    return Promise.reject(error)
  }
)

export default api
