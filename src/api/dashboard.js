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

    return {
        title: raw.title || '관리자 대시보드',
        trendPeriod: raw.trendPeriod || '이번 달',
        kpis: raw.kpis || {},
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

        notifications: Array.isArray(raw.notifications)
            ? raw.notifications.map((n) => ({
                time: n.time,
                title: n.title,
                detail: n.detail,
                isNew: n.new ?? false,
                targetType: n.targetType ?? null,   // 추가
                targetCode: n.targetCode ?? null,   // 추가
            }))
            : [],
    }
}

// ────────────────────────────────────────────────
// 주간 캘린더  GET /api/v1/schedules
// ────────────────────────────────────────────────

/** 이번 주 일요일~토요일의 from/to ISO 문자열을 반환 */
function getCurrentWeekRange() {
    const now = new Date()
    const day = now.getDay() // 0=일 ~ 6=토
    const sunday = new Date(now)
    sunday.setDate(now.getDate() - day)
    sunday.setHours(0, 0, 0, 0)

    const saturday = new Date(sunday)
    saturday.setDate(sunday.getDate() + 6)
    saturday.setHours(23, 59, 59, 999)

    return {
        from: sunday.toISOString(),
        to: saturday.toISOString(),
        sunday,
    }
}

/** eventType / docType → DashboardCalendar의 type 매핑 */
function resolveEventType(schedule) {
    const docType = (schedule.docType || '').toUpperCase()
    const eventType = (schedule.eventType || '').toUpperCase()

    if (docType === 'CONTRACT' || eventType === 'CONTRACT') return 'contract'
    if (docType === 'INVOICE'  || eventType === 'BILLING')  return 'billing'
    return 'default'
}

/** type → 한글 태그 */
const TAG_LABEL = {
    contract: '계약',
    billing:  '청구',
    default:  '영업',
}

/**
 * /api/v1/schedules 응답(data 배열)을 DashboardCalendar props 형태로 변환
 * @param {Array} items - API data 배열
 * @param {Date}  sunday - 이번 주 일요일 Date 객체
 */
function normalizeWeeklySchedules(items, sunday) {
    const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
    const today  = new Date()

    // weekDays: 일~토 7칸
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday)
        d.setDate(sunday.getDate() + i)

        const isToday =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth()    === today.getMonth()    &&
            d.getDate()     === today.getDate()

        return {
            day:  DAY_KO[i],
            date: String(d.getDate()),
            today: isToday || undefined,
        }
    })

    // badge: "M월 D일 - M월 D일"
    const sat = new Date(sunday)
    sat.setDate(sunday.getDate() + 6)
    const badge = `${sunday.getMonth() + 1}월 ${sunday.getDate()}일 - ${sat.getMonth() + 1}월 ${sat.getDate()}일`

    // 요일 인덱스(0=일) 계산 헬퍼
    const dayIndex = (dateStr) => {
        const d = new Date(dateStr)
        // 해당 날짜가 이번 주 범위 안에 있는지 확인
        const diff = Math.floor((d - sunday) / 86400000)
        return diff >= 0 && diff <= 6 ? diff : -1
    }

    // dayEvents: 7개 칸, 각 칸에 이벤트 배열
    const dayEvents = Array.from({ length: 7 }, () => [])

    // listEvents: 이번 주 일정 목록 (날짜순)
    const listEvents = []

    const sorted = [...items].sort(
        (a, b) => new Date(a.startAt) - new Date(b.startAt),
    )

    for (const s of sorted) {
        const idx  = dayIndex(s.startAt)
        if (idx === -1) continue

        const type  = resolveEventType(s)
        const d     = new Date(s.startAt)
        const dateD = new Date(sunday)
        dateD.setDate(sunday.getDate() + idx)

        dayEvents[idx].push({ label: s.title, type })

        listEvents.push({
            date:   String(dateD.getDate()),
            day:    DAY_KO[idx],
            title:  s.title,
            detail: s.description || '',
            type,
            tag:    TAG_LABEL[type],
        })
    }

    return { badge, weekDays, dayEvents, listEvents }
}

/**
 * 주간 캘린더 데이터 조회
 * GET /api/v1/schedules
 * @returns {Promise<{ badge, weekDays, dayEvents, listEvents }>}
 */
export function getWeeklySchedules() {
    const { from, to, sunday } = getCurrentWeekRange()

    return api
        .get('/schedules', {
            params: {
                from,
                to,
                includePersonal: true,
                includeDeal: true,
            },
        })
        .then((payload) => {
            // 응답 구조: { result, data: [...] }  또는  data 배열 직접
            const items = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                    ? payload.data
                    : []

            return normalizeWeeklySchedules(items, sunday)
        })
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

/**
 * 우선거래 연락처 조회 (재시도 로직 포함)
 * GET /api/v1/scoring/priority-list
 */
export async function getPriorityContacts() {
    const maxRetries = 3
    const delayMs    = 1000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await api.get('/scoring/priority-list').then(normalizePriorityContacts)
        } catch (error) {
            if (attempt === maxRetries) throw error
            if (error.response?.status === 500) {
                await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
                continue
            }
            throw error
        }
    }
}

function normalizePriorityContacts(payload) {
    if (!Array.isArray(payload)) return []
    return payload.map((item) => ({
        accountId:         item.accountId         || 0,
        accountName:       item.accountName        || '-',
        totalScore:        item.totalScore         || 0,
        primaryReason:     item.primaryReason      || '',
        detailDescription: item.detailDescription  || '',
        breakdown: item.breakdown || {
            contractScore: 0,
            orderScore:    0,
            visitScore:    0,
        },
    }))
}