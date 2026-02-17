const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()
const customRoutes = require('./routes.json')
const customMiddleware = require('./middleware')

server.use(middlewares)
server.use(jsonServer.rewriter(customRoutes))
server.use(customMiddleware)
server.use(router)

server.listen(3001, () => {
  console.log('Mock Server running on http://localhost:3001')
})
