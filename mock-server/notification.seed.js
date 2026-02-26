function toDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function unreadPattern(index) {
  return index % 3 === 0 || index % 7 === 0
}

function buildRoleData(role, receivers, templates, startOffsetHours, startId) {
  const baseDate = new Date('2026-02-21T19:40:00')
  const list = []
  let id = startId

  for (let i = 0; i < 24; i += 1) {
    const template = templates[i % templates.length]
    const createdAt = new Date(baseDate.getTime() - ((startOffsetHours + i) * 60 * 60 * 1000) - ((i % 4) * 7 * 60 * 1000))
    const read = !unreadPattern(i)

    list.push({
      id,
      role,
      targetRole: role,
      receiverType: 'USER',
      receiverId: receivers[i % receivers.length],
      category: template.category,
      type: template.type,
      title: template.title,
      message: template.message,
      url: template.url,
      read,
      isRead: read,
      readAt: read ? toDateTime(new Date(createdAt.getTime() + 25 * 60 * 1000)) : null,
      createdAt: toDateTime(createdAt),
      related: template.related,
    })

    id += 1
  }

  return list
}

function getSeedIdSet(items = []) {
  return new Set(items.map((item) => Number(item.id)).filter(Number.isFinite))
}

function assertContains(set, ids, label) {
  ids.forEach((id) => {
    if (!set.has(id)) {
      throw new Error(`[notification.seed] Missing ${label} id in db.seed.json: ${id}`)
    }
  })
}

function buildNotificationFixtures(seed = {}) {
  const userIds = getSeedIdSet(seed.users)
  const documentIds = getSeedIdSet(seed.documents)
  const clientIds = getSeedIdSet(seed.clients)
  const employeeIds = getSeedIdSet(seed.employees)
  const productIds = getSeedIdSet(seed.products)

  assertContains(userIds, [1, 2, 3, 4, 5], 'user')
  assertContains(documentIds, [1, 2, 3, 4, 5, 6, 7], 'document')
  assertContains(clientIds, [1, 2, 3, 4], 'client')
  assertContains(employeeIds, [1, 2, 3], 'employee')
  assertContains(productIds, [1, 2, 3, 4], 'product')

  const salesTemplates = [
    {
      category: '계정',
      type: 'ACCOUNT_ACTIVATION',
      title: '계정 활성화 완료',
      message: '영업 계정(김민수) 활성화가 승인되었습니다. 신규 거래처 담당 배정을 확인하세요.',
      url: '/users/1',
      related: { entityType: 'user', entityId: 1 },
    },
    {
      category: '영업',
      type: 'QUOTATION_REQUEST_CREATED',
      title: '견적요청서 등록',
      message: '그린팜유통 견적요청서가 등록되었습니다. 문서 검토 후 견적서를 작성하세요. (문서 #1)',
      url: '/documents/all?documentId=1',
      related: { entityType: 'document', entityId: 1 },
    },
    {
      category: '영업',
      type: 'QUOTATION_APPROVAL_RESULT',
      title: '견적서 승인 결과',
      message: '견적서 #2가 관리자 승인 완료되었습니다. 계약서 전환을 진행할 수 있습니다.',
      url: '/documents/all?documentId=2',
      related: { entityType: 'document', entityId: 2 },
    },
    {
      category: '영업',
      type: 'CONTRACT_APPROVAL_RESULT',
      title: '계약서 승인 결과',
      message: '계약서 #3 승인 결과가 반영되었습니다. 납품 일정과 주문서를 확인하세요.',
      url: '/documents/all?documentId=3',
      related: { entityType: 'document', entityId: 3 },
    },
    {
      category: '재고',
      type: 'PRODUCT_STOCK_ALERT',
      title: '재고 임계치 알림',
      message: '토마토 TY-9(상품 #2) 재고가 임계치에 도달했습니다. 대체 품종 제안을 준비하세요.',
      url: '/products/2',
      related: { entityType: 'product', entityId: 2 },
    },
    {
      category: '일정',
      type: 'SCHEDULE_REMINDER',
      title: '일정 리마인드',
      message: '청솔영농조합(거래처 #2) 미팅 일정이 내일 오전 10시에 예정되어 있습니다.',
      url: '/schedule',
      related: { entityType: 'client', entityId: 2 },
    },
  ]

  const adminTemplates = [
    {
      category: '관리',
      type: 'CLIENT_REGISTERED',
      title: '거래처 등록 알림',
      message: '신규 거래처 OO육묘장(거래처 #1)이 등록되었습니다. 계정 활성화 여부를 확인하세요.',
      url: '/clients/1',
      related: { entityType: 'client', entityId: 1 },
    },
    {
      category: '영업',
      type: 'QUOTATION_APPROVAL_REQUEST',
      title: '견적서 승인 요청',
      message: '견적서 #2 승인 요청이 도착했습니다. 단가와 납기 조건을 검토하세요.',
      url: '/approval',
      related: { entityType: 'document', entityId: 2 },
    },
    {
      category: '영업',
      type: 'CONTRACT_APPROVAL_REQUEST',
      title: '계약서 승인 요청',
      message: '계약서 #7 승인 요청이 접수되었습니다. 조건 검토 후 처리해주세요.',
      url: '/approval',
      related: { entityType: 'document', entityId: 7 },
    },
    {
      category: '일정',
      type: 'MEETING_SCHEDULE_UPDATE',
      title: '일정 변경 알림',
      message: '박지훈 사원의 거래처 방문 일정이 변경되었습니다. 캘린더를 확인하세요.',
      url: '/schedule',
      related: { entityType: 'employee', entityId: 2 },
    },
    {
      category: '상품',
      type: 'PRODUCT_PRICE_CHANGE',
      title: '상품 가격 변경 요청',
      message: '고추 PR-21(상품 #1) 가격 변경 요청이 등록되었습니다.',
      url: '/products/1',
      related: { entityType: 'product', entityId: 1 },
    },
    {
      category: '관리',
      type: 'USER_ACTIVATION_REQUEST',
      title: '계정 활성화 요청',
      message: '사원 계정 활성화 요청이 접수되었습니다. 사용자 상세에서 승인/반려를 진행하세요.',
      url: '/users',
      related: { entityType: 'user', entityId: 4 },
    },
  ]

  const clientTemplates = [
    {
      category: '견적요청',
      type: 'QUOTATION_REQUEST_CREATED',
      title: '견적요청서 접수',
      message: '견적요청서 #1이 접수되었습니다. 담당 영업사원이 검토 중입니다.',
      url: '/documents/history?documentId=1',
      related: { entityType: 'document', entityId: 1 },
    },
    {
      category: '계약',
      type: 'CONTRACT_APPROVAL_REQUEST',
      title: '계약서 승인 요청',
      message: '계약서 #3에 대한 최종 확인 요청이 도착했습니다. 승인 여부를 선택해주세요.',
      url: '/documents/all?documentId=3',
      related: { entityType: 'document', entityId: 3 },
    },
    {
      category: '계약',
      type: 'CONTRACT_STATUS_UPDATED',
      title: '계약 상태 업데이트',
      message: '계약서 #7 상태가 ACTIVE로 변경되었습니다. 계약 조건을 다시 확인해주세요.',
      url: '/documents/all?documentId=7',
      related: { entityType: 'document', entityId: 7 },
    },
    {
      category: '명세',
      type: 'STATEMENT_ISSUED',
      title: '명세서 발급',
      message: '주문서 #4 관련 출고 명세서가 발급되었습니다.',
      url: '/documents/order?documentId=4',
      related: { entityType: 'document', entityId: 4 },
    },
    {
      category: '청구',
      type: 'INVOICE_ISSUED',
      title: '청구서 발급',
      message: '청구서 #5가 발급되었습니다. 결제 일정을 확인하세요.',
      url: '/documents/invoices?documentId=5',
      related: { entityType: 'document', entityId: 5 },
    },
    {
      category: '청구',
      type: 'INVOICE_REMINDER',
      title: '청구 예정 알림',
      message: '청구서 #6 결제 예정일이 다가오고 있습니다. 확인 후 준비해주세요.',
      url: '#',
      related: { entityType: 'document', entityId: 6 },
    },
  ]

  const sales = buildRoleData('SALES_REP', [1, 4], salesTemplates, 0, 1001)
  const admin = buildRoleData('ADMIN', [2], adminTemplates, 26, 1025)
  const client = buildRoleData('CLIENT', [3, 5], clientTemplates, 52, 1049)

  const notifications = [...sales, ...admin, ...client]
  notifications[5].url = null
  notifications[31].url = '#'
  notifications[58].url = null

  return notifications
}

module.exports = {
  buildNotificationFixtures,
}
