import api from './index'

function pickRecord(payload) {
  if (Array.isArray(payload)) {
    return payload[0] || {}
  }

  if (Array.isArray(payload?.items)) {
    return payload.items[0] || {}
  }

  return payload || {}
}

function hasKeys(obj, keys = []) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(obj, key))
}

function toCurrency(value) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('ko-KR')}원`
}

function normalizeSalesRepDashboard(payload) {
  const raw = pickRecord(payload)

  if (hasKeys(raw, ['header', 'monthlyBars', 'timeline', 'billings'])) {
    return {
      header: raw.header || { title: '내 영업 현황', subtitle: '' },
      monthlySales: raw.monthlySales || {
        periodLabel: '이번 달',
        amount: '-',
        change: '-',
        diff: '-',
        completedCount: '-',
      },
      monthlyBars: Array.isArray(raw.monthlyBars) ? raw.monthlyBars : [],
      billings: Array.isArray(raw.billings) ? raw.billings : [],
      timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
      timelineFilters: Array.isArray(raw.timelineFilters) ? raw.timelineFilters : ['전체', '견적', '계약', '주문'],
    }
  }

  const monthlyTarget = Number(raw.monthlyTarget || 0)
  const monthlySales = Number(raw.monthlySales || 0)
  const progress = monthlyTarget > 0 ? Math.round((monthlySales / monthlyTarget) * 100) : 0

  return {
    header: {
      title: '내 영업 현황',
      subtitle: `진행 중 파이프라인 ${raw.openPipelines || 0}건 · 오늘 일정 ${raw.todaySchedules || 0}건`,
    },
    monthlySales: {
      periodLabel: '이번 달',
      amount: toCurrency(monthlySales),
      change: `목표 대비 ${progress}%`,
      diff: `${toCurrency(monthlyTarget - monthlySales)} 남음`,
      completedCount: `${raw.openPipelines || 0}건`,
    },
    monthlyBars: [
      { month: '목표', height: 70, current: false },
      { month: '실적', height: Math.max(20, Math.min(80, Math.round(progress * 0.8))), current: true },
    ],
    billings: [
      {
        docNo: 'PIPELINE',
        client: '진행 중 계약',
        amount: `${raw.openPipelines || 0}건`,
        status: '영업 진행',
        type: 'pending',
      },
    ],
    timeline: (raw.recentClients || []).map((clientName, index) => ({
      date: `최근 ${index + 1}`,
      title: `${clientName} 업데이트`,
      detail: '거래처 활동 내역이 반영되었습니다.',
      state: 'completed',
    })),
    timelineFilters: ['전체', '견적', '계약', '주문'],
  }
}

function normalizeAdminDashboard(payload) {
  const raw = pickRecord(payload)

  if (hasKeys(raw, ['kpis', 'rankings', 'approvals'])) {
    return {
      title: raw.title || '관리자 대시보드',
      kpis: Array.isArray(raw.kpis) ? raw.kpis : [],
      rankings: Array.isArray(raw.rankings) ? raw.rankings : [],
      approvals: Array.isArray(raw.approvals) ? raw.approvals : [],
      rankingPeriod: raw.rankingPeriod || '',
      trendPeriod: raw.trendPeriod || '',
      approvalCount: Number(raw.approvalCount || 0),
    }
  }

  return {
    title: '관리자 대시보드',
    trendPeriod: '이번 달',
    rankingPeriod: '최근 실적',
    kpis: [
      { label: '총 매출', icon: 'KRW', iconClass: 'blue', value: toCurrency(raw.totalSales), change: '누적 기준', positive: true },
      { label: '신규 거래처', icon: '+', iconClass: 'green', value: `${raw.newClients || 0}개`, change: '당월', positive: true },
      { label: '대기 승인', icon: '!', iconClass: 'orange', value: `${raw.pendingApprovals || 0}건`, change: '처리 필요', positive: false },
      { label: '활성 사원', icon: 'EMP', iconClass: 'blue', value: `${raw.activeEmployees || 0}명`, change: '재직 기준', positive: true },
    ],
    rankings: [
      {
        rank: 1,
        name: raw.topProduct || '집계 중',
        amount: '상위 지표',
        width: 100,
      },
    ],
    approvals: [
      {
        title: '결재 대기 문서',
        meta: `${raw.pendingApprovals || 0}건`,
        time: '방금',
      },
    ],
    approvalCount: Number(raw.pendingApprovals || 0),
  }
}

function normalizeClientDashboard(payload) {
  const raw = pickRecord(payload)

  if (hasKeys(raw, ['orders', 'billings', 'notifications'])) {
    return {
      title: raw.title || '내 거래 현황',
      subtitle: raw.subtitle || '',
      orders: Array.isArray(raw.orders) ? raw.orders : [],
      billings: Array.isArray(raw.billings) ? raw.billings : [],
      notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
      billingCycle: raw.billingCycle || { value: '-', next: '-' },
    }
  }

  return {
    title: '내 거래 현황',
    subtitle: `최근 배송일 ${raw.lastDeliveryDate || '-'}`,
    orders: [
      {
        no: '최근 주문',
        date: raw.lastDeliveryDate || '-',
        statusClass: 'processing',
        status: '진행',
        summary: `최근 주문 ${raw.recentOrders || 0}건`,
        amount: toCurrency(raw.outstandingAmount || 0),
        action: '상세 보기',
      },
    ],
    billings: [
      {
        no: '미수금',
        due: raw.outstandingAmount > 0 ? '결제 필요' : '정상',
        type: raw.outstandingAmount > 0 ? 'due-soon' : 'paid',
        amount: toCurrency(raw.outstandingAmount || 0),
        status: raw.outstandingAmount > 0 ? '미납' : '완납',
      },
    ],
    notifications: (raw.favoriteProducts || []).map((name, index) => ({
      time: `${index + 1}분 전`,
      title: '관심 품목',
      detail: `${name} 품목이 즐겨찾기에 등록되어 있습니다.`,
      isNew: index === 0,
    })),
    billingCycle: {
      value: '월별 정산',
      next: raw.lastDeliveryDate ? `기준일: ${raw.lastDeliveryDate}` : '-',
    },
  }
}

export function getSalesRepDashboard() {
  return api.get('/dashboard/sales-rep').then(normalizeSalesRepDashboard)
}

export function getAdminDashboard() {
  return api.get('/dashboard/admin').then(normalizeAdminDashboard)
}

export function getClientDashboard() {
  return api.get('/dashboard/client').then(normalizeClientDashboard)
}
