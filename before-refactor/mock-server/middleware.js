module.exports = (req, res, next) => {
  const start = Date.now()

  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

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
