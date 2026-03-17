export const DEAL_PIPELINE = [
    { code: 'RFQ', label: '견적요청서', shortLabel: '요청', order: 1 },
    { code: 'QUO', label: '견적서', shortLabel: '견적', order: 2 },
    { code: 'CNT', label: '계약서', shortLabel: '계약', order: 3 },
    { code: 'ORD', label: '주문서', shortLabel: '주문', order: 4 },
    { code: 'STMT', label: '명세서', shortLabel: '명세', order: 5 },
    { code: 'INV', label: '청구서', shortLabel: '청구', order: 6 },
    { code: 'PAY', label: '결제', shortLabel: '결제', order: 7 },
]

export const DEAL_STATUS_META = {
    CREATED: { label: '초안', tone: 'default' },
    IN_PROGRESS: { label: '진행중', tone: 'success' },
    PENDING_ADMIN: { label: '관리자 승인 대기', tone: 'warning' },
    REJECTED_ADMIN: { label: '관리자 반려', tone: 'danger' },
    PENDING_CLIENT: { label: '거래처 승인 대기', tone: 'warning' },
    REJECTED_CLIENT: { label: '거래처 반려', tone: 'danger' },
    CONFIRMED: { label: '확정', tone: 'success' },
    ISSUED: { label: '발행', tone: 'info' },
    PAID: { label: '결제 완료', tone: 'success' },
    APPROVED: { label: '완료', tone: 'success' },
    EXPIRED: { label: '만료', tone: 'warning' },
    CANCELED: { label: '취소', tone: 'danger' },
}

export const ACTION_TYPE_META = {
    CREATE: '생성',
    UPDATE: '수정',
    APPROVE: '승인',
    REJECT: '반려',
    SUBMIT: '제출',
    ISSUE: '발행',
    PAY: '결제',
    CANCEL: '취소',
    CONFIRM: '확정',
    CONVERT: '전환',
    RESUBMIT: '재제출',
    EXPIRE: '만료',
}

function toDate(value) {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export function getStageMeta(code) {
    return DEAL_PIPELINE.find((stage) => stage.code === String(code || '').toUpperCase()) || DEAL_PIPELINE[0]
}

export function getStageOrder(code) {
    return getStageMeta(code).order
}

export function getStatusMeta(status) {
    return DEAL_STATUS_META[String(status || '').toUpperCase()] || { label: status || '-', tone: 'default' }
}

export function formatDateTime(value) {
    const date = toDate(value)
    if (!date) return '-'

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}.${mm}.${dd} ${hh}:${mi}`
}

export function formatDate(value) {
    const date = toDate(value)
    if (!date) return '-'

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}.${mm}.${dd}`
}

export function formatRelativeTime(value) {
    const date = toDate(value)
    if (!date) return '-'

    const diffMs = Date.now() - date.getTime()
    const minutes = Math.max(1, Math.floor(diffMs / 60000))
    if (minutes < 60) return `${minutes}분 전`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}시간 전`

    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}일 전`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months}개월 전`

    const years = Math.floor(months / 12)
    return `${years}년 전`
}

export function formatCurrency(value) {
    const amount = Number(value || 0)
    if (!Number.isFinite(amount) || amount <= 0) return '-'
    return `${amount.toLocaleString()}원`
}

export function toActionLabel(actionType) {
    const key = String(actionType || '').toUpperCase()
    return ACTION_TYPE_META[key] || key || '-'
}

export function toActivityDescription(log) {
    const stageLabel = getStageMeta(log?.docType).label
    const statusLabel = getStatusMeta(log?.toStatus).label
    const code = log?.targetCode || `#${log?.refId || '-'}`
    const actionLabel = toActionLabel(log?.actionType)
    return `${stageLabel} ${code} ${actionLabel} · ${statusLabel}`
}

export function makeSteps(currentDocType) {
    const currentOrder = getStageOrder(currentDocType)
    return DEAL_PIPELINE.map((stage) => {
        if (stage.order < currentOrder) {
            return { ...stage, state: 'completed', statusText: '완료' }
        }

        if (stage.order === currentOrder) {
            return { ...stage, state: 'active', statusText: '진행중' }
        }

        return { ...stage, state: 'pending', statusText: '대기' }
    })
}
