const jsonServer = require('json-server')
const path = require('path')

const server = jsonServer.create()
const dbPath = path.join(__dirname, 'db.json')
const router = jsonServer.router(dbPath)
const middlewares = jsonServer.defaults()
const customRoutes = require('./routes.json')
const customMiddleware = require('./middleware')

const parseId = (value) => {
  const num = Number(value)
  return Number.isNaN(num) ? value : num
}

const getNotifications = (req) => {
  const { role, targetRole, receiverId } = req.query || {}
  let list = router.db.get('notifications').value() || []

  if (role) {
    list = list.filter((item) => item.role === role || item.targetRole === role)
  }

  if (targetRole) {
    list = list.filter((item) => item.targetRole === targetRole)
  }

  if (receiverId) {
    const id = parseId(receiverId)
    list = list.filter((item) => item.receiverId === id)
  }

  return list
}

const getCurrentUser = () => {
  const fallbackUser = (router.db.get('users').value() || [])[0]
  return router.db.get('users').find({ id: 1 }).value() || fallbackUser || {}
}

const getProductCategories = () => {
  const categories = [...new Set(
    (router.db.get('products').value() || [])
      .map((item) => item?.category)
      .filter(Boolean),
  )]
  return categories.map((name) => ({ name }))
}

server.use(customMiddleware)

server.get(['/api/auth/me', '/auth/me'], (req, res) => {
  res.status(200).jsonp(getCurrentUser())
})

server.get(['/api/products/categories', '/products/categories'], (req, res) => {
  res.status(200).jsonp(getProductCategories())
})

server.get('/api/notifications', (req, res) => {
  res.status(200).jsonp(getNotifications(req))
})

server.get('/notifications', (req, res) => {
  res.status(200).jsonp(getNotifications(req))
})

server.put('/api/notifications/read-all', (req, res) => {
  const next = (router.db.get('notifications').value() || [])
    .map((item) => ({ ...item, read: true, isRead: true, readAt: item.readAt || new Date().toISOString() }))
  router.db.set('notifications', next).write()

  res.status(200).jsonp({ ok: true })
})

server.put('/api/notifications/:id/read', (req, res) => {
  const id = parseId(req.params.id)
  const target = router.db.get('notifications').find({ id })

  if (!target.value()) {
    res.status(404).jsonp({})
    return
  }

  target.assign({ read: true, isRead: true, readAt: new Date().toISOString() }).write()
  res.status(200).jsonp(target.value())
})

server.use(middlewares)
server.use(jsonServer.rewriter(customRoutes))
server.use(router)

server.listen(3001, () => {
  console.log('Mock Server running on http://localhost:3001')
  console.log(`[mock-server] db path: ${dbPath}`)
})
