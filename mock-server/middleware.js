module.exports = (req, res, next) => {
  const start = Date.now()
  const origin = req.headers.origin || ''
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  const requestedHeaders = req.headers['access-control-request-headers']

  // Allow local frontend dev origins (vite port can change: 5173, 5174, ...)
  res.setHeader('Access-Control-Allow-Origin', isLocalOrigin ? origin : 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    requestedHeaders || 'Content-Type, Authorization, X-Request-Started-At',
  )

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  const delay = Math.floor(Math.random() * 301) + 200

  res.on('finish', () => {
    const elapsed = Date.now() - start
    console.log(`[${req.method}] ${req.originalUrl} ${res.statusCode} - ${elapsed}ms`)
  })

  setTimeout(next, delay)
}
