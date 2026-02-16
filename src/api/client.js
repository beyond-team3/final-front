import api from './index'

// --- Mock 데이터 (백엔드 연결 시 삭제) ---
let MOCK_CLIENTS = [
  {
    id: 'C-001',
    name: 'OO육묘장',
    type: 'NURSERY',
    typeLabel: '육묘장',
    status: 'active',
    bizNo: '123-45-67890',
    ceoName: '김사장',
    companyPhone: '02-123-4567',
    address: '서울특별시 OO구 OO로 00',
    managerName: '김철수 과장',
    managerPhone: '010-1234-5678',
    managerEmail: 'kim@farm.com',
    monthlyAmount: 125000000,
    monthlyInProgress: 3,
    monthlyDone: 15,
    creditLimit: 50000000,
    receivable: 15000000,
    crops: ['토마토', '파프리카', '오이', '고추'],
    pipelines: [
      {
        id: 8,
        startDate: '2026-01-29',
        amount: 15000000,
        status: 'in-progress',
        statusLabel: '주문 진행',
      },
      {
        id: 7,
        startDate: '2026-01-15',
        amount: 8500000,
        status: 'completed',
        statusLabel: '결제 완료',
      },
    ],
  },
  {
    id: 'C-002',
    name: '대한농산',
    type: 'DISTRIBUTOR',
    typeLabel: '대리점',
    status: 'active',
    bizNo: '222-11-54321',
    ceoName: '박대표',
    companyPhone: '031-987-6543',
    address: '경기도 수원시 권선구 산업로 88',
    managerName: '박민수 차장',
    managerPhone: '010-2111-2200',
    managerEmail: 'park@agri.co.kr',
    monthlyAmount: 72000000,
    monthlyInProgress: 2,
    monthlyDone: 9,
    creditLimit: 30000000,
    receivable: 5000000,
    crops: ['양배추', '브로콜리'],
    pipelines: [
      {
        id: 6,
        startDate: '2026-02-01',
        amount: 12000000,
        status: 'in-progress',
        statusLabel: '견적서 검토',
      },
    ],
  },
]

function nextClientId() {
  return `C-${String(MOCK_CLIENTS.length + 1).padStart(3, '0')}`
}

function toClientEntity(payload = {}) {
  return {
    id: nextClientId(),
    name: payload.clientName,
    type: payload.clientType,
    typeLabel: payload.clientType === 'DISTRIBUTOR' ? '대리점' : '기타',
    status: 'active',
    bizNo: payload.bizNo,
    ceoName: payload.ceoName,
    companyPhone: payload.companyPhone || '-',
    address: payload.address,
    managerName: payload.managerName,
    managerPhone: payload.managerPhone,
    managerEmail: payload.managerEmail,
    monthlyAmount: 0,
    monthlyInProgress: 0,
    monthlyDone: 0,
    creditLimit: Number(payload.creditLimit || 0),
    receivable: 0,
    crops: [],
    pipelines: [],
  }
}

// --- API 함수 ---

export function getClients(params) {
  // return api.get('/clients', { params })
  void params
  return Promise.resolve({ data: [...MOCK_CLIENTS] })
}

export function getClientDetail(id) {
  // return api.get(`/clients/${id}`)
  const found = MOCK_CLIENTS.find((client) => client.id === id)
  return Promise.resolve({ data: found || null })
}

export function createClient(data) {
  // return api.post('/clients', data)
  const created = toClientEntity(data)
  MOCK_CLIENTS = [created, ...MOCK_CLIENTS]
  return Promise.resolve({ data: created })
}

export function updateClient(id, data) {
  // return api.put(`/clients/${id}`, data)
  MOCK_CLIENTS = MOCK_CLIENTS.map((client) => {
    if (client.id !== id) {
      return client
    }
    return { ...client, ...data }
  })

  const found = MOCK_CLIENTS.find((client) => client.id === id)
  return Promise.resolve({ data: found || null })
}

export function addClientVariety(id, data) {
  // return api.post(`/clients/${id}/varieties`, data)
  const target = MOCK_CLIENTS.find((client) => client.id === id)
  if (!target) {
    return Promise.resolve({ data: null })
  }

  const crop = data?.crop
  if (crop && !target.crops.includes(crop)) {
    target.crops = [...target.crops, crop]
  }

  return Promise.resolve({ data: target })
}

export { api }
