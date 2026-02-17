const CACHE_TTL_MS = 5000

const responseCache = new Map()

function sortObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }

  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObject(value[key])
      return acc
    }, {})
}

function stringifyParams(params) {
  if (!params) {
    return ''
  }

  return JSON.stringify(sortObject(params))
}

function normalizePath(url = '') {
  if (!url) {
    return ''
  }

  const [path] = String(url).split('?')
  return path.replace(/\/+$/, '') || '/'
}

function extractResource(path) {
  const cleanPath = normalizePath(path)
  const segments = cleanPath.split('/').filter(Boolean)

  if (segments[0] === 'api') {
    return segments[1] || ''
  }

  return segments[0] || ''
}

function buildCacheKey(config = {}) {
  const method = String(config.method || 'get').toUpperCase()
  const path = normalizePath(config.url)
  const params = stringifyParams(config.params)

  return `${method}:${path}?${params}`
}

function getCachedValue(key) {
  const cached = responseCache.get(key)

  if (!cached) {
    return null
  }

  if (cached.expiresAt < Date.now()) {
    responseCache.delete(key)
    return null
  }

  return cached.data
}

function setCachedValue(key, data, ttl = CACHE_TTL_MS) {
  responseCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  })
}

function invalidateRelatedCache(url = '') {
  const resource = extractResource(url)

  if (!resource) {
    responseCache.clear()
    return
  }

  const targetPattern = `/${resource}`

  for (const key of responseCache.keys()) {
    const [, keyPathPart = ''] = key.split(':')
    const keyPath = keyPathPart.split('?')[0]

    if (keyPath.includes(targetPattern)) {
      responseCache.delete(key)
    }
  }
}

function clearApiCache() {
  responseCache.clear()
}

export function useApiCache() {
  return {
    CACHE_TTL_MS,
    buildCacheKey,
    getCachedValue,
    setCachedValue,
    invalidateRelatedCache,
    clearApiCache,
  }
}
