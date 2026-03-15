import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getStageMeta,
  getStatusMeta,
  toActionLabel,
} from '@/utils/dealHistory'

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '')
}

function statusColorByTone(tone) {
  if (tone === 'success') return 'var(--color-olive)'
  if (tone === 'warning') return 'var(--color-orange)'
  if (tone === 'danger') return 'var(--color-status-error)'
  if (tone === 'info') return 'var(--color-status-info)'
  return 'var(--color-text-placeholder)'
}

function normalizeStageCode(value) {
  const raw = String(value || '').trim().toUpperCase()
  const map = {
    QUOTATION: 'QUO',
    CONTRACT: 'CNT',
    ORDER: 'ORD',
    STATEMENT: 'STMT',
    INVOICE: 'INV',
    PAYMENT: 'PAY',
    RFQ: 'RFQ',
    QUO: 'QUO',
    CNT: 'CNT',
    ORD: 'ORD',
    STMT: 'STMT',
    INV: 'INV',
    PAY: 'PAY',
  }
  return map[raw] || 'RFQ'
}

function normalizeStatus(value, fallback = 'CREATED') {
  const raw = String(value || '').trim().toUpperCase()
  const map = {
    WAITING_ADMIN: 'PENDING_ADMIN',
    ADMIN_PENDING: 'PENDING_ADMIN',
    WAITING_CLIENT: 'PENDING_CLIENT',
    WAITING_CLIENT_APPROVAL: 'PENDING_CLIENT',
    CLIENT_PENDING: 'PENDING_CLIENT',
    ADMIN_REJECTED: 'REJECTED_ADMIN',
    CLIENT_REJECTED: 'REJECTED_CLIENT',
    COMPLETED: 'APPROVED',
    CONFIRMED: 'CONFIRMED',
    PUBLISHED: 'ISSUED',
    ACTIVE: 'IN_PROGRESS',
    DRAFT: 'CREATED',
  }
  return map[raw] || raw || fallback
}

function buildTimelineDescription(item) {
  if (item?.description) return item.description

  const stageLabel = getStageMeta(normalizeStageCode(item?.documentType || item?.docType)).label
  const code = pick(item?.documentCode, item?.targetCode, item?.title, item?.eventType, `#${pick(item?.documentId, item?.id, '-')}`)
  const statusLabel = getStatusMeta(normalizeStatus(item?.currentStatus || item?.status)).label
  const actionLabel = toActionLabel(pick(item?.actionType, item?.type, item?.eventType, 'UPDATE'))

  return `${stageLabel} ${code} ${actionLabel} · ${statusLabel}`
}

export function mapDealV2SummaryToViewModel(raw = {}, makeSteps) {
  const snapshot = raw.snapshot || {}
  const stageCode = normalizeStageCode(pick(snapshot.currentStage, raw.currentStage, snapshot.representativeDocumentType, raw.representativeDocumentType))
  const stageMeta = getStageMeta(stageCode)
  const status = normalizeStatus(pick(snapshot.currentStatus, raw.currentStatus))
  const statusMeta = getStatusMeta(status)
  const lastActivityAt = pick(snapshot.lastActivityAt, raw.lastActivityAt, raw.updatedAt, raw.createdAt)

  return {
    id: String(pick(raw.dealId, raw.id, '')),
    dealCode: pick(raw.dealCode, raw.code, ''),
    dealTitle: pick(raw.dealTitle, raw.title, ''),
    clientId: pick(raw.clientId, null),
    clientName: pick(raw.clientName, '-'),
    ownerEmpId: pick(raw.ownerEmpId, raw.ownerEmployeeId, null),
    ownerEmpName: pick(raw.ownerEmpName, raw.ownerEmployeeName, '미지정'),
    ownerInitial: String(pick(raw.ownerEmpName, raw.ownerEmployeeName, '미')).slice(0, 1),
    latestDocType: stageMeta.code,
    latestDocTypeLabel: stageMeta.label,
    latestTargetCode: pick(raw.dealCode, raw.dealTitle, '-'),
    latestRefId: pick(snapshot.representativeDocumentId, raw.representativeDocumentId, null),
    stageOrder: stageMeta.order,
    currentStatus: status,
    currentStatusLabel: statusMeta.label,
    currentStatusTone: statusMeta.tone,
    railColor: statusColorByTone(statusMeta.tone),
    summaryMemo: pick(raw.summaryMemo, raw.dealTitle, ''),
    lastActivityAt: lastActivityAt || null,
    lastActivityText: formatDateTime(lastActivityAt),
    lastActivityAgo: formatRelativeTime(lastActivityAt),
    closedAt: raw.closedAt || null,
    closedAtText: formatDate(raw.closedAt),
    isClosed: Boolean(raw.closedAt ?? raw.closed),
    steps: makeSteps(stageMeta.code),
    documents: [],
    summaryDocuments: [],
    timeline: [],
    timelinePreview: [],
    documentCount: 0,
    latestAmount: null,
    notifications: [],
    schedules: [],
    v2SummaryLoaded: true,
    v2DetailLoaded: false,
    logsLoaded: false,
  }
}

export function mapDealV2DetailToViewModel(raw = {}, currentDeal = {}, makeSteps) {
  const summary = mapDealV2SummaryToViewModel({ ...currentDeal, ...raw }, makeSteps)
  return {
    ...currentDeal,
    ...summary,
    summaryMemo: pick(raw.summaryMemo, currentDeal.summaryMemo, raw.dealTitle, ''),
    latestTargetCode: pick(raw.dealCode, currentDeal.latestTargetCode, raw.dealTitle, '-'),
    v2DetailLoaded: true,
  }
}

export function mapDealV2DocumentsToTimelineItems(documents = []) {
  const normalized = Array.isArray(documents)
    ? documents.map((item, index) => {
      const stageCode = normalizeStageCode(item?.documentType || item?.docType)
      const stageMeta = getStageMeta(stageCode)
      const status = normalizeStatus(item?.currentStatus || item?.status, 'IN_PROGRESS')
      const statusMeta = getStatusMeta(status)
      const actionAt = pick(item?.createdAt, item?.updatedAt, item?.issuedAt)
      const documentId = pick(item?.documentId, item?.id, index)
      const code = pick(item?.documentCode, item?.displayCode, `${stageMeta.shortLabel}-${documentId}`)

      return {
        documentKey: `${stageCode}-${documentId}`,
        id: String(documentId),
        dealLogId: `doc-${documentId}`,
        refId: documentId,
        targetCode: code,
        displayCode: code,
        type: stageCode,
        typeLabel: stageMeta.label,
        stageNumber: stageMeta.order,
        status,
        statusLabel: statusMeta.label,
        actionType: 'UPDATE',
        actionLabel: '반영',
        actionAt,
        actionAtText: formatDateTime(actionAt),
        actionAtDate: formatDate(actionAt),
        amount: Number(item?.amount ?? 0) || null,
        color: statusColorByTone(statusMeta.tone),
      }
    })
    : []

  return normalized.sort((a, b) => String(b.actionAt || '').localeCompare(String(a.actionAt || '')))
}

export function mapDealV2NotificationsToTimelineItems(notifications = []) {
  const normalized = Array.isArray(notifications)
    ? notifications.map((item, index) => {
      const actionAt = pick(item?.createdAt, item?.updatedAt, item?.readAt)
      const isRead = Boolean(item?.readAt)

      return {
        dealLogId: `noti-${pick(item?.id, index)}`,
        documentKey: `NOTI-${pick(item?.targetId, item?.id, index)}`,
        docType: normalizeStageCode(item?.targetType),
        refId: pick(item?.targetId, item?.id, index),
        targetCode: pick(item?.title, item?.targetType, '알림'),
        actionType: isRead ? 'APPROVE' : 'CREATE',
        actionLabel: isRead ? '확인' : '알림',
        actionAt,
        actionAtText: formatDateTime(actionAt),
        actionAtAgo: formatRelativeTime(actionAt),
        fromStatus: null,
        toStatus: isRead ? 'APPROVED' : 'IN_PROGRESS',
        statusLabel: isRead ? '확인됨' : '미확인',
        actorType: 'SYSTEM',
        actorId: null,
        description: pick(item?.title, 'Deal 알림'),
        color: isRead ? 'var(--color-status-info)' : 'var(--color-orange)',
      }
    })
    : []

  return normalized.sort((a, b) => String(b.actionAt || '').localeCompare(String(a.actionAt || '')))
}

export function mapDealV2SchedulesToTimelineItems(schedules = []) {
  const normalized = Array.isArray(schedules)
    ? schedules.map((item, index) => {
      const actionAt = pick(item?.startAt, item?.endAt)
      return {
        dealLogId: `sch-${pick(item?.id, index)}`,
        documentKey: `SCH-${pick(item?.id, index)}`,
        docType: normalizeStageCode(item?.docType),
        refId: pick(item?.dealId, item?.id, index),
        targetCode: pick(item?.title, item?.eventType, '일정'),
        actionType: 'UPDATE',
        actionLabel: '일정',
        actionAt,
        actionAtText: formatDateTime(actionAt),
        actionAtAgo: formatRelativeTime(actionAt),
        fromStatus: null,
        toStatus: normalizeStatus(item?.status, 'IN_PROGRESS'),
        statusLabel: getStatusMeta(normalizeStatus(item?.status, 'IN_PROGRESS')).label,
        actorType: 'SYSTEM',
        actorId: pick(item?.assigneeUserId, item?.ownerUserId, null),
        description: `${pick(item?.title, '거래 일정')} · ${pick(item?.eventType, item?.docType, 'DEAL')}`,
        color: 'var(--color-olive)',
      }
    })
    : []

  return normalized.sort((a, b) => String(b.actionAt || '').localeCompare(String(a.actionAt || '')))
}

export function mergeDealV2Timeline({ documents = [], notifications = [], schedules = [] } = {}) {
  return [
    ...documents.map((item) => ({
      dealLogId: item.dealLogId,
      documentKey: item.documentKey,
      docType: item.type,
      refId: item.refId,
      targetCode: item.targetCode,
      actionType: item.actionType,
      actionLabel: item.actionLabel,
      actionAt: item.actionAt,
      actionAtText: item.actionAtText,
      actionAtAgo: formatRelativeTime(item.actionAt),
      fromStatus: null,
      toStatus: item.status,
      statusLabel: item.statusLabel,
      actorType: 'SYSTEM',
      actorId: null,
      description: buildTimelineDescription(item),
      color: item.color,
    })),
    ...notifications,
    ...schedules,
  ].sort((a, b) => String(b.actionAt || '').localeCompare(String(a.actionAt || '')))
}
