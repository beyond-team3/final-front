const listeners = new Map()

function on(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }

  listeners.get(event).add(handler)

  return () => off(event, handler)
}

function off(event, handler) {
  const handlers = listeners.get(event)

  if (!handlers) {
    return
  }

  handlers.delete(handler)

  if (handlers.size === 0) {
    listeners.delete(event)
  }
}

function emit(event, payload) {
  const handlers = listeners.get(event)

  if (!handlers) {
    return
  }

  handlers.forEach((handler) => {
    handler(payload)
  })
}

export default {
  on,
  off,
  emit,
}
