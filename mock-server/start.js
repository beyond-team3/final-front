const fs = require('fs')
const path = require('path')
const { buildNotificationFixtures } = require('./notification.seed')

const dbPath = path.join(__dirname, 'db.json')
const seedPath = path.join(__dirname, 'db.seed.json')

if (!fs.existsSync(dbPath)) {
  if (!fs.existsSync(seedPath)) {
    console.error('[mock-server] db.seed.json 파일이 없어 db.json을 생성할 수 없습니다.')
    process.exit(1)
  }

  fs.copyFileSync(seedPath, dbPath)
  console.log('[mock-server] db.json이 없어 db.seed.json에서 초기 생성했습니다.')
}

try {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'))

  db.notifications = buildNotificationFixtures(seed)
  fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, 'utf8')

  console.log(`[mock-server] notifications fixtures loaded: ${db.notifications.length}`)
} catch (error) {
  console.error('[mock-server] notifications fixtures 생성 실패:', error.message)
  process.exit(1)
}

require('./server')
