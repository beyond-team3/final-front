const routeStartByPath = new Map()

function now() {
  return Date.now()
}

function logPerf(message) {
  console.log(`[PERF] ${message}`)
}

export function startRouteMeasure(to) {
  if (!to?.fullPath) {
    return
  }

  routeStartByPath.set(to.fullPath, now())
}

export function endRouteMeasure(to) {
  if (!to?.fullPath) {
    return
  }

  const startedAt = routeStartByPath.get(to.fullPath)

  if (!startedAt) {
    return
  }

  const elapsed = now() - startedAt
  routeStartByPath.delete(to.fullPath)
  logPerf(`ROUTE ${to.fullPath} ${elapsed}ms`)
}

export function startApiMeasure(config = {}) {
  config.__perfStartedAt = now()
}

export function endApiMeasure(config = {}, status = 0, failed = false) {
  const startedAt = config.__perfStartedAt

  if (!startedAt) {
    return
  }

  const elapsed = now() - startedAt
  const method = String(config.method || 'get').toUpperCase()
  const url = config.url || ''
  const result = failed ? 'ERROR' : status

  logPerf(`API ${method} ${url} ${result} ${elapsed}ms`)
}
