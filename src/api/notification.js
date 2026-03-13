import api from './index'

const NOTIFICATION_BASE_PATH = '/notifications'
const SSE_RETRY_BASE_DELAY = 1500
const SSE_RETRY_MAX_DELAY = 30000

function unwrapApiResult(response) {
  if (!response || response.result !== 'SUCCESS') {
    const message = response?.error?.message || '알림 요청 처리에 실패했습니다.'
    throw new Error(message)
  }

  return response.data
}

function buildSseUrl() {
  const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  if (!configuredBaseUrl) {
    return NOTIFICATION_BASE_PATH + '/subscribe'
  }

  return configuredBaseUrl.replace(/\/$/, '') + NOTIFICATION_BASE_PATH + '/subscribe'
}

function parseSseEventBlock(block) {
  const lines = String(block || '').split('\n')
  let eventName = 'message'
  const dataLines = []

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '')

    if (!line || line.startsWith(':')) {
      continue
    }

    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() || 'message'
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  return {
    event: eventName,
    data: dataLines.join('\n'),
  }
}

export function getNotifications(params) {
  return api.get(NOTIFICATION_BASE_PATH, { params })
    .then(unwrapApiResult)
}

export function getUnreadCount() {
  return api.get(NOTIFICATION_BASE_PATH + '/unread-count')
    .then(unwrapApiResult)
}

export function markAsRead(id) {
  return api.patch(`${NOTIFICATION_BASE_PATH}/${id}/read`)
    .then(unwrapApiResult)
}

export function markAllAsRead() {
  return api.patch(NOTIFICATION_BASE_PATH + '/read-all')
    .then(unwrapApiResult)
}

export function deleteNotification(id) {
  return api.delete(`${NOTIFICATION_BASE_PATH}/${id}`)
    .then(unwrapApiResult)
}

export function deleteAllNotifications() {
  return api.delete(NOTIFICATION_BASE_PATH)
    .then(unwrapApiResult)
}

export function createNotificationSseClient({ token, onMessage, onOpen, onError, onAuthError } = {}) {
  let closed = false
  let attempt = 0
  let reconnectTimer = null
  let controller = null

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (closed) {
      return
    }

    const delay = Math.min(SSE_RETRY_BASE_DELAY * (2 ** attempt), SSE_RETRY_MAX_DELAY)
    attempt += 1

    clearReconnectTimer()
    reconnectTimer = window.setTimeout(() => {
      void connect()
    }, delay)
  }

  const connect = async () => {
    if (closed) {
      return
    }

    controller = new AbortController()

    try {
      const response = await fetch(buildSseUrl(), {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
          Cache: 'no-cache',
        },
        signal: controller.signal,
        cache: 'no-store',
      })

      if (response.status === 401 || response.status === 403) {
        onAuthError?.(response)
        return
      }

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed (${response.status})`)
      }

      attempt = 0
      onOpen?.()

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (!closed) {
        const { value, done } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          const parsed = parseSseEventBlock(block)

          if (parsed.event !== 'notification' || !parsed.data) {
            continue
          }

          try {
            onMessage?.(JSON.parse(parsed.data))
          } catch (parseError) {
            onError?.(parseError)
          }
        }
      }

      if (!closed) {
        scheduleReconnect()
      }
    } catch (error) {
      if (closed || error?.name === 'AbortError') {
        return
      }

      onError?.(error)
      scheduleReconnect()
    }
  }

  void connect()

  return {
    close() {
      closed = true
      clearReconnectTimer()
      controller?.abort()
    },
  }
}
