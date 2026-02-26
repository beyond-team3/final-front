const fs = require('fs')
const path = require('path')

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

require('./server')
