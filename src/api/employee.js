import api from './index'

// --- Mock 데이터 (백엔드 연결 시 삭제) ---
let MOCK_EMPLOYEES = [
  {
    id: 'E-001',
    name: '김영업',
    email: 'kim.sales@seedflow.com',
    phone: '010-1000-2000',
    address: '서울특별시 강남구 테헤란로 100',
    status: 'ACTIVE',
    createdAt: '2026-02-10 09:30',
  },
  {
    id: 'E-002',
    name: '이영업',
    email: 'lee.sales@seedflow.com',
    phone: '010-3000-4000',
    address: '경기도 수원시 권선구 산업로 88',
    status: 'ACTIVE',
    createdAt: '2026-02-12 14:10',
  },
  {
    id: 'E-003',
    name: '박영업',
    email: 'park.sales@seedflow.com',
    phone: '010-5555-6666',
    address: '충청북도 청주시 흥덕구 직지대로 50',
    status: 'INACTIVE',
    createdAt: '2026-02-14 11:20',
  },
]

function makeEmployeeId() {
  return `E-${String(MOCK_EMPLOYEES.length + 1).padStart(3, '0')}`
}

function nowString() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function toEmployeeEntity(payload = {}) {
  return {
    id: makeEmployeeId(),
    name: payload.empName,
    email: payload.empEmail,
    phone: payload.empPhone || '-',
    address: payload.empAddress || '-',
    status: 'ACTIVE',
    createdAt: nowString(),
  }
}

// --- API 함수 ---

export function getEmployees(params) {
  // return api.get('/employees', { params })
  void params
  return Promise.resolve({ data: [...MOCK_EMPLOYEES] })
}

export function getEmployeeDetail(id) {
  // return api.get(`/employees/${id}`)
  const found = MOCK_EMPLOYEES.find((employee) => employee.id === id)
  return Promise.resolve({ data: found || null })
}

export function createEmployee(data) {
  // return api.post('/employees', data)
  const created = toEmployeeEntity(data)
  MOCK_EMPLOYEES = [created, ...MOCK_EMPLOYEES]
  return Promise.resolve({ data: created })
}

export function updateEmployee(id, data) {
  // return api.put(`/employees/${id}`, data)
  MOCK_EMPLOYEES = MOCK_EMPLOYEES.map((employee) => {
    if (employee.id !== id) {
      return employee
    }
    return { ...employee, ...data }
  })

  const found = MOCK_EMPLOYEES.find((employee) => employee.id === id)
  return Promise.resolve({ data: found || null })
}

export { api }
