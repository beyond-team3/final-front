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

// ────────────────────────────────────────────────
// 영업사원 대시보드  GET /api/dashboard/sales
// ────────────────────────────────────────────────
function normalizeSalesRepDashboard(payload) {
    const raw = pickRecord(payload)

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

        // 백엔드 응답 필드명 그대로 유지
        priorityAccounts: Array.isArray(raw.priorityAccounts) ? raw.priorityAccounts : [],

        timelineFilters: Array.isArray(raw.timelineFilters)
            ? raw.timelineFilters
            : ['전체', '견적', '계약', '주문'],
    }
}

// ────────────────────────────────────────────────
// 관리자 대시보드  GET /api/dashboard/admin
// ────────────────────────────────────────────────
function normalizeAdminDashboard(payload) {
    const raw = pickRecord(payload)

    // 백엔드 kpis는 배열이 아닌 객체 형태로 내려옴
    // { totalMonthlySales, salesGrowthRate, pendingDocumentCount, pendingDetail }
    const kpisRaw = raw.kpis || {}
    const kpis = [
        {
            label: '이번 달 매출',
            icon: 'KRW',
            iconClass: 'blue',
            value: kpisRaw.totalMonthlySales || '-',
            change: kpisRaw.salesGrowthRate || '-',
            positive: true,
        },
        {
            label: '대기 문서',
            icon: '!',
            iconClass: 'orange',
            value: kpisRaw.pendingDocumentCount || '-',
            change: kpisRaw.pendingDetail || '처리 필요',
            positive: false,
        },
    ]

    // dashboard.js normalizeAdminDashboard 수정
    return {
        title: raw.title || '관리자 대시보드',
        trendPeriod: raw.trendPeriod || '이번 달',
        kpis: raw.kpis || {},          // ← 배열 변환 없이 객체 그대로
        salesTrend: raw.salesTrend || { lastYear: [], thisYear: [] },
        rankings: Array.isArray(raw.rankings) ? raw.rankings : [],
        approvalCount: Number(raw.approvalCount || 0),
        approvals: Array.isArray(raw.approvals) ? raw.approvals : [],
    }
}

// ────────────────────────────────────────────────
// 거래처 대시보드  GET /api/dashboard/client
// ────────────────────────────────────────────────
function normalizeClientDashboard(payload) {
    const raw = pickRecord(payload)

    return {
        title: raw.title || '내 거래 현황',
        subtitle: raw.subtitle || '',

        billingCycle: raw.billingCycle || { value: '-', next: '-' },

        orders: Array.isArray(raw.orders) ? raw.orders : [],

        billings: Array.isArray(raw.billings) ? raw.billings : [],

        // 백엔드 필드명은 `new`, 프론트 컴포넌트는 `isNew` 로 사용하므로 여기서 변환
        notifications: Array.isArray(raw.notifications)
            ? raw.notifications.map((n) => ({
                time: n.time,
                title: n.title,
                detail: n.detail,
                isNew: n.new ?? false,   // `new` → `isNew`
            }))
            : [],
    }
}

// ────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────
export function getSalesRepDashboard() {
    return api.get('/dashboard/sales').then(normalizeSalesRepDashboard)
}

export function getAdminDashboard() {
    return api.get('/dashboard/admin').then(normalizeAdminDashboard)
}

export function getClientDashboard() {
    return api.get('/dashboard/client').then(normalizeClientDashboard)
}

export function getPriorityContacts() {
    return api.get('/v1/scoring/priority-list').then(normalizePriorityContacts)
}

function normalizePriorityContacts(payload) {
    if (!Array.isArray(payload)) return []
    return payload.map((item) => ({
        accountId: item.accountId || 0,
        accountName: item.accountName || '-',
        totalScore: item.totalScore || 0,
        primaryReason: item.primaryReason || '',
        detailDescription: item.detailDescription || '',
        breakdown: item.breakdown || { ... },
    }))
}