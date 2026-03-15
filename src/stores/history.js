import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
    getDealLogs,
    getDealV2Detail,
    getDealV2Documents,
    getDealV2Kpis,
    getDealV2Notifications,
    getDealV2Schedules,
    getSalesDeals,
} from '@/api/history'
import { useDealV2 } from '@/config/featureFlags'
import {
    mapDealV2DetailToViewModel,
    mapDealV2DocumentsToTimelineItems,
    mapDealV2NotificationsToTimelineItems,
    mapDealV2SchedulesToTimelineItems,
    mapDealV2SummaryToViewModel,
    mergeDealV2Timeline,
} from '@/mappers/dealV2'
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatRelativeTime,
    getStageMeta,
    getStageOrder,
    getStatusMeta,
    makeSteps,
    toActionLabel,
    toActivityDescription,
} from '@/utils/dealHistory'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
    return error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback
}

function unwrapResult(payload) {
    return payload?.data !== undefined ? payload.data : payload
}

function unwrapPage(payload) {
    const pageData = unwrapResult(payload)
    if (Array.isArray(pageData)) {
        return { content: pageData, totalElements: pageData.length, totalPages: 1, number: 0, size: pageData.length }
    }

    if (Array.isArray(pageData?.content)) {
        return pageData
    }

    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 0 }
}

function statusColorByTone(tone) {
    if (tone === 'success') return 'var(--color-olive)'
    if (tone === 'warning') return 'var(--color-orange)'
    if (tone === 'danger') return 'var(--color-status-error)'
    if (tone === 'info') return 'var(--color-status-info)'
    return 'var(--color-text-placeholder)'
}

function normalizeDeal(raw = {}) {
    const stageMeta = getStageMeta(raw.latestDocType)
    const statusMeta = getStatusMeta(raw.currentStatus)
    const lastActivityText = formatDateTime(raw.lastActivityAt)
    const isClosed = Boolean(raw.closedAt)

    return {
        id: String(raw.dealId),
        clientId: raw.clientId ?? null,
        clientName: raw.clientName || '-',
        ownerEmpId: raw.ownerEmpId ?? null,
        ownerEmpName: raw.ownerEmpName || '미지정',
        ownerInitial: String(raw.ownerEmpName || '미').slice(0, 1),
        latestDocType: stageMeta.code,
        latestDocTypeLabel: stageMeta.label,
        latestTargetCode: raw.latestTargetCode || '-',
        latestRefId: raw.latestRefId ?? null,
        stageOrder: stageMeta.order,
        currentStatus: raw.currentStatus || 'CREATED',
        currentStatusLabel: statusMeta.label,
        currentStatusTone: statusMeta.tone,
        railColor: statusColorByTone(statusMeta.tone),
        summaryMemo: raw.summaryMemo || '',
        lastActivityAt: raw.lastActivityAt || null,
        lastActivityText,
        lastActivityAgo: formatRelativeTime(raw.lastActivityAt),
        closedAt: raw.closedAt || null,
        closedAtText: formatDate(raw.closedAt),
        isClosed,
        steps: makeSteps(stageMeta.code),
        documents: [],
        summaryDocuments: [],
        timeline: [],
        timelinePreview: [],
        documentCount: 0,
        latestAmount: null,
        logsLoaded: false,
    }
}

function buildDocumentSummary(log) {
    const stageMeta = getStageMeta(log.docType)
    const statusMeta = getStatusMeta(log.toStatus)

    return {
        documentKey: `${log.docType}-${log.refId}`,
        id: String(log.refId),
        dealLogId: log.dealLogId,
        refId: log.refId,
        targetCode: log.targetCode || `${stageMeta.shortLabel}-${log.refId}`,
        displayCode: log.targetCode || `${stageMeta.shortLabel}-${log.refId}`,
        type: log.docType,
        typeLabel: stageMeta.label,
        stageNumber: stageMeta.order,
        status: log.toStatus || 'CREATED',
        statusLabel: statusMeta.label,
        actionType: log.actionType,
        actionLabel: toActionLabel(log.actionType),
        actionAt: log.actionAt,
        actionAtText: formatDateTime(log.actionAt),
        actionAtDate: formatDate(log.actionAt),
        amount: null,
        color: statusColorByTone(statusMeta.tone),
    }
}

function normalizeLogs(logs = []) {
    const orderedLogs = [...logs].sort((a, b) => String(b.actionAt || '').localeCompare(String(a.actionAt || '')))
    const documentsMap = new Map()

    const timeline = orderedLogs.map((log) => {
        const statusMeta = getStatusMeta(log.toStatus)
        const documentKey = `${log.docType}-${log.refId}`

        if (!documentsMap.has(documentKey)) {
            documentsMap.set(documentKey, buildDocumentSummary(log))
        }

        return {
            dealLogId: log.dealLogId,
            documentKey,
            docType: log.docType,
            refId: log.refId,
            targetCode: log.targetCode,
            actionType: log.actionType,
            actionLabel: toActionLabel(log.actionType),
            actionAt: log.actionAt,
            actionAtText: formatDateTime(log.actionAt),
            actionAtAgo: formatRelativeTime(log.actionAt),
            fromStatus: log.fromStatus,
            toStatus: log.toStatus,
            statusLabel: getStatusMeta(log.toStatus).label,
            actorType: log.actorType,
            actorId: log.actorId,
            description: toActivityDescription(log),
            color: statusColorByTone(statusMeta.tone),
        }
    })

    const documents = [...documentsMap.values()].sort((a, b) => String(b.actionAt || '').localeCompare(String(a.actionAt || '')))

    return {
        documents,
        documentCount: documents.length,
        latestAmount: documents.find((document) => Number.isFinite(Number(document.amount)))?.amount ?? null,
        timeline,
        timelinePreview: timeline.slice(0, 3),
    }
}

export const useHistoryStore = defineStore('history', () => {
    const pipelines = ref([])
    const loading = ref(false)
    const logsLoading = ref(false)
    const error = ref(null)
    const loaded = ref(false)
    const dealKpis = ref(null)
    const dealKpisLoading = ref(false)
    const dealKpisError = ref(null)
    const pagination = ref({
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
    })

    const pipelinesForView = computed(() => pipelines.value)
    const getPipelineById = (id) => pipelines.value.find((item) => String(item.id) === String(id)) || null
    const getPipelinesByClient = (clientId) => pipelines.value.filter((item) => String(item.clientId) === String(clientId))
    const getDocumentsByPipeline = (id) => getPipelineById(id)?.documents || []
    const getTimelineByPipeline = (id) => getPipelineById(id)?.timeline || []

    async function fetchPipelines(params = {}) {
        loading.value = true
        error.value = null

        try {
            const response = await getSalesDeals(params)
            const pageData = unwrapPage(response)
            pipelines.value = pageData.content.map((item) => (
                useDealV2()
                    ? mapDealV2SummaryToViewModel(item, makeSteps)
                    : normalizeDeal(item)
            ))
            pagination.value = {
                page: Number(pageData.number || 0),
                size: Number(pageData.size || params.size || 20),
                totalElements: Number(pageData.totalElements || pipelines.value.length),
                totalPages: Number(pageData.totalPages || 1),
            }
            loaded.value = true
            return pipelines.value
        } catch (e) {
            error.value = getErrorMessage(e, '영업 히스토리 목록을 불러오지 못했습니다.')
            return pipelines.value
        } finally {
            loading.value = false
        }
    }

    async function ensureLoaded(params = {}) {
        if (loaded.value) return pipelines.value
        return fetchPipelines(params)
    }

    async function fetchDealLogs(dealId, params = { page: 0, size: 100 }) {
        if (!dealId) return []

        if (useDealV2()) {
            return fetchDealContextV2(dealId)
        }

        logsLoading.value = true
        error.value = null

        try {
            const response = await getDealLogs(dealId, params)
            const pageData = unwrapPage(response)
            const rawLogs = Array.isArray(pageData.content) ? pageData.content : []

            const pipeline = getPipelineById(dealId)
            if (pipeline) {
                const normalized = normalizeLogs(rawLogs)
                pipeline.documents = normalized.documents
                pipeline.summaryDocuments = normalized.documents.slice(0, 3)
                pipeline.timeline = normalized.timeline
                pipeline.timelinePreview = normalized.timelinePreview
                pipeline.documentCount = normalized.documentCount
                pipeline.latestAmount = normalized.latestAmount
                pipeline.steps = pipeline.steps.map((step) => ({
                    ...step,
                    documentCount: normalized.documents.filter((document) => document.type === step.code).length,
                }))
                pipeline.logsLoaded = true
            }

            return getTimelineByPipeline(dealId)
        } catch (e) {
            error.value = getErrorMessage(e, '딜 상세 로그를 불러오지 못했습니다.')
            return []
        } finally {
            logsLoading.value = false
        }
    }

    async function ensureDealLogs(dealId) {
        const pipeline = getPipelineById(dealId)
        if (!pipeline) return []
        if (pipeline.logsLoaded || pipeline.v2DetailLoaded) return pipeline.timeline
        return fetchDealLogs(dealId)
    }

    async function fetchDealContextV2(dealId) {
        logsLoading.value = true
        error.value = null

        try {
            const [detailResponse, documentsResponse, notificationsResponse, schedulesResponse] = await Promise.all([
                getDealV2Detail(dealId),
                getDealV2Documents(dealId),
                getDealV2Notifications(dealId, { page: 0, size: 20 }),
                getDealV2Schedules(dealId, buildDealScheduleRange()),
            ])

            const detail = unwrapResult(detailResponse)
            const documents = Array.isArray(unwrapResult(documentsResponse)) ? unwrapResult(documentsResponse) : []
            const notificationPage = unwrapPage(notificationsResponse)
            const notifications = Array.isArray(notificationPage.content) ? notificationPage.content : []
            const schedules = Array.isArray(unwrapResult(schedulesResponse)) ? unwrapResult(schedulesResponse) : []

            const pipeline = getPipelineById(dealId)
            if (!pipeline) {
                return []
            }

            const mappedDetail = mapDealV2DetailToViewModel(detail, pipeline, makeSteps)
            const mappedDocuments = mapDealV2DocumentsToTimelineItems(documents)
            const mappedNotifications = mapDealV2NotificationsToTimelineItems(notifications)
            const mappedSchedules = mapDealV2SchedulesToTimelineItems(schedules)
            const timeline = mergeDealV2Timeline({
                documents: mappedDocuments,
                notifications: mappedNotifications,
                schedules: mappedSchedules,
            })

            Object.assign(pipeline, mappedDetail, {
                documents: mappedDocuments,
                summaryDocuments: mappedDocuments.slice(0, 3),
                timeline,
                timelinePreview: timeline.slice(0, 3),
                documentCount: mappedDocuments.length,
                latestAmount: mappedDocuments.find((document) => Number.isFinite(Number(document.amount)))?.amount ?? null,
                notifications,
                schedules,
                logsLoaded: true,
                v2DetailLoaded: true,
            })

            pipeline.steps = pipeline.steps.map((step) => ({
                ...step,
                documentCount: mappedDocuments.filter((document) => document.type === step.code).length,
            }))

            return pipeline.timeline
        } catch (e) {
            error.value = getErrorMessage(e, '딜 상세 정보를 불러오지 못했습니다.')
            return []
        } finally {
            logsLoading.value = false
        }
    }

    async function fetchDealKpis(params = {}) {
        if (!useDealV2()) {
            dealKpis.value = null
            dealKpisError.value = null
            return null
        }

        dealKpisLoading.value = true
        dealKpisError.value = null

        try {
            const result = unwrapResult(await getDealV2Kpis(params))
            dealKpis.value = result || null
            return dealKpis.value
        } catch (e) {
            dealKpisError.value = getErrorMessage(e, '딜 KPI를 불러오지 못했습니다.')
            dealKpis.value = null
            return null
        } finally {
            dealKpisLoading.value = false
        }
    }

    function updateDocumentStatusLocally(docId, status) {
        pipelines.value.forEach((pipeline) => {
            pipeline.documents.forEach((document) => {
                if (String(document.refId) === String(docId) || String(document.targetCode) === String(docId)) {
                    const statusMeta = getStatusMeta(status)
                    document.status = status
                    document.statusLabel = statusMeta.label
                    document.color = statusColorByTone(statusMeta.tone)
                }
            })
        })
    }

    return {
        pipelines,
        loading,
        logsLoading,
        error,
        pagination,
        dealKpis,
        dealKpisLoading,
        dealKpisError,
        pipelinesForView,
        fetchPipelines,
        fetchDealKpis,
        ensureLoaded,
        fetchDealLogs,
        ensureDealLogs,
        getPipelineById,
        getPipelinesByClient,
        getDocumentsByPipeline,
        getTimelineByPipeline,
        updateDocumentStatusLocally,
        formatCurrency,
    }
})

function buildDealScheduleRange() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const from = new Date(year, month, 1, 0, 0, 0)
    const to = new Date(year, month + 1, 0, 23, 59, 59)

    return {
        from: from.toISOString().slice(0, 19),
        to: to.toISOString().slice(0, 19),
    }
}
