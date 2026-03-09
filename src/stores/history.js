import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
    createPipeline as createPipelineApi,
    getSalesHistory,
    updatePipeline as updatePipelineApi,
    deletePipeline as deletePipelineApi,
} from '@/api/history'
import { getClients } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const STAGES = [
    { type: 'quotation-request', name: '견적요청', number: 1, docLabel: '견적요청서' },
    { type: 'quotation', name: '견적', number: 2, docLabel: '견적서' },
    { type: 'contract', name: '계약', number: 3, docLabel: '계약서' },
    { type: 'order', name: '주문', number: 4, docLabel: '주문서' },
    { type: 'statement', name: '명세', number: 5, docLabel: '명세서' },
    { type: 'invoice', name: '청구', number: 6, docLabel: '청구서' },
    { type: 'payment', name: '결제완료', number: 7, docLabel: '결제완료' },
]

const STEP_NAMES = ['견적요청', '견적', '계약', '주문', '명세', '청구', '결제완료']

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
    return error?.response?.data?.message || error?.message || fallback
}

function normalizeList(data) {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    const actualData = data.data !== undefined ? data.data : data
    if (Array.isArray(actualData)) return actualData
    return []
}

function normalizeType(type = '') {
    return String(type).toLowerCase().replace(/_/g, '-')
}

function stageByType(type) {
    const normalized = normalizeType(type)
    return STAGES.find((stage) => stage.type === normalized) || STAGES[0]
}

function stageByName(name = '') {
    return STAGES.find((stage) => stage.name === name) || STAGES[0]
}

function toDateText(date = new Date()) {
    return new Date(date).toISOString().slice(0, 10)
}

function normalizeDocumentSummary(doc = {}) {
    const stage = stageByType(doc.type)
    const amount = Number(doc.totalAmount ?? doc.amount ?? 0)
    return {
        id: String(doc.id),
        type: stage.type,
        typeLabel: stage.docLabel,
        stage: stage.name,
        stageNumber: stage.number,
        status: doc.status || '진행중',
        date: doc.createdAt || doc.date || toDateText(),
        amount,
    }
}

function buildSteps(currentStageNumber) {
    return STEP_NAMES.map((name, index) => {
        const order = index + 1
        if (order < currentStageNumber) return { name, state: 'completed', statusText: '완료' }
        if (order === currentStageNumber) return { name, state: 'in-progress', statusText: '진행중' }
        return { name, state: 'waiting', statusText: '대기' }
    })
}

function statusToneByStage(stageNumber) {
    if (stageNumber >= 6) return 'success'
    if (stageNumber <= 2) return 'warning'
    return 'primary'
}

function normalizePipeline(raw = {}) {
    const stage = raw.stageNumber
        ? STAGES.find((item) => item.number === Number(raw.stageNumber)) || stageByName(raw.pipelineStage)
        : stageByName(raw.pipelineStage)
    const documents = Array.isArray(raw.documents)
        ? raw.documents.map(normalizeDocumentSummary)
        : raw.documentId
            ? [{
                id: String(raw.documentId),
                type: stage.type,
                typeLabel: stage.docLabel,
                stage: stage.name,
                stageNumber: stage.number,
                status: '진행중',
                date: raw.updatedAt || toDateText(),
                amount: Number(raw.amount || 0),
                remark: '',
            }]
            : []
    return {
        id: String(raw.id),
        clientId: raw.clientId ?? null,
        clientName: raw.clientName || '-',
        salesRepName: raw.salesRepName || '-',
        salesRepPhone: raw.salesRepPhone || '-',
        stage: stage.name,
        stageNumber: stage.number,
        status: raw.status || '진행중',
        startDate: raw.startDate || raw.updatedAt || toDateText(),
        updatedAt: raw.updatedAt || toDateText(),
        amount: Number(raw.amount || 0),
        documents,
        nextAction: raw.nextAction || '',
    }
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
}

export const useHistoryStore = defineStore('history', () => {
    const authStore = useAuthStore()
    const pipelines = ref([])
    const loading = ref(false)
    const error = ref(null)
    const loaded = ref(false)

    const isClientRole = computed(() => authStore.currentRole === ROLES.CLIENT)

    const getViewerClientIdentity = () => {
        const me = authStore.me || {}
        // 유저 고유 ID가 아닌 거래처 ID(refId)를 우선 사용
        const byRefId = me.refId ?? me.clientId ?? null
        const byName = String(me.targetPerson || me.clientName || me.name || '').trim()

        if (byRefId !== null && byRefId !== undefined && byRefId !== '') {
            return { clientId: String(byRefId), clientName: byName }
        }
        return { clientId: null, clientName: byName || null }
    }

    const filterRawPipelinesForViewer = (list = [], managedClientIds = []) => {
        const role = authStore.currentRole
        if (role === ROLES.ADMIN) return list

        const identity = getViewerClientIdentity()
        const hasClientId = identity.clientId !== null && identity.clientId !== ''
        const hasClientName = Boolean(identity.clientName)

        if (role === ROLES.CLIENT) {
            if (!hasClientId && !hasClientName) return []
            return list.filter((item) => {
                const clientIdMatch = hasClientId && String(item?.clientId ?? '') === identity.clientId
                const clientNameMatch = hasClientName && normalizeText(item?.clientName) === normalizeText(identity.clientName)
                return clientIdMatch || clientNameMatch
            })
        }

        if (role === ROLES.SALES_REP) {
            // 영업사원의 경우, 인자로 받은 담당 거래처 ID 목록(managedClientIds)에 포함된 데이터만 반환
            return list.filter((item) => {
                const clientId = String(item.clientId || '')
                return managedClientIds.includes(clientId)
            })
        }

        return []
    }

    const pipelinesForView = computed(() => {
        return [...pipelines.value]
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
            .map((pipeline) => ({
                id: pipeline.id,
                clientName: pipeline.clientName,
                startDate: pipeline.startDate,
                amount: pipeline.amount,
                statusText: `${pipeline.stage} ${pipeline.status}`,
                statusTone: statusToneByStage(pipeline.stageNumber),
                steps: buildSteps(pipeline.stageNumber),
            }))
    })

    const getPipelineById = (id) => pipelines.value.find((item) => String(item.id) === String(id)) || null
    const getPipelinesByClient = (clientId) => pipelines.value.filter((item) => String(item.clientId) === String(clientId))
    const getDocumentsByPipeline = (id) => getPipelineById(id)?.documents || []

    async function fetchPipelines(params) {
        loading.value = true
        error.value = null
        try {
            let managedClientIds = []
            if (authStore.currentRole === ROLES.SALES_REP) {
                const myRefId = String(authStore.me?.refId || '')
                // 1단계: 전체 거래처를 조회 (404 방지를 위해 파라미터 없이 {} 전달)
                const allClients = await getClients({})
                const myClients = normalizeList(allClients).filter(c => String(c.managerId) === myRefId)
                // 2단계: 해당 거래처들의 고유 ID 목록을 추출
                managedClientIds = myClients.map(c => String(c.id))
            }

            // 3단계: 서버에서 전체 히스토리를 가져와 추출한 ID 목록으로 필터링
            // FIXME: 백엔드의 /history 통합 조회 API가 제거되었으므로 임시로 빈 배열 처리
            // const response = await getSalesHistory({})
            // const rawList = normalizeList(response)
            const list = [] // filterRawPipelinesForViewer(rawList, managedClientIds).map(normalizePipeline)
            pipelines.value = list
            loaded.value = true
            return list
        } catch (e) {
            console.error('❌ 히스토리 로드 실패 (주소 확인 요망):', e.config?.url, e.message)
            error.value = getErrorMessage(e, '히스토리 목록을 불러오지 못했습니다.')
            return pipelines.value
        } finally {
            loading.value = false
        }
    }

    async function ensureLoaded() {
        if (loaded.value) return
        await fetchPipelines()
    }

    function createPipeline(client, document) {
        const clientId = client?.id ?? document?.client?.id ?? document?.clientId ?? null
        const clientName = client?.name ?? document?.client?.name ?? document?.clientName ?? '-'
        const docSummary = normalizeDocumentSummary(document)
        const now = toDateText()
        const id = `H-${Date.now()}`
        const next = {
            id, clientId, clientName, stage: '견적요청', stageNumber: 1, status: '진행중',
            startDate: now, updatedAt: now, amount: Number(docSummary.amount || 0),
            documents: [docSummary], nextAction: '',
        }
        pipelines.value.unshift(next)
        createPipelineApi({
            id, clientId, clientName, pipelineStage: next.stage, stageNumber: next.stageNumber,
            status: next.status, documentId: docSummary.id, documents: next.documents,
            amount: next.amount, updatedAt: next.updatedAt, startDate: next.startDate, nextAction: next.nextAction,
        }).catch((e) => { error.value = getErrorMessage(e, '파이프라인 생성에 실패했습니다.') })
        return next
    }

    function addDocumentToPipeline(historyId, document, newStage) {
        const targetId = historyId || document?.historyId || null
        let pipeline = targetId ? getPipelineById(targetId) : null
        if (!pipeline) {
            const candidateByClient = pipelines.value
                .filter((item) => String(item.clientId) === String(document?.client?.id ?? document?.clientId ?? ''))
                .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
            pipeline = candidateByClient || null
        }
        if (!pipeline) {
            if (normalizeType(document?.type) === 'quotation-request') return createPipeline(document?.client, document)
            return null
        }
        const stage = newStage
            ? (typeof newStage === 'string' ? stageByName(newStage) : STAGES.find((item) => item.number === Number(newStage)) || stageByType(document?.type))
            : stageByType(document?.type)
        const docSummary = normalizeDocumentSummary(document)
        if (!pipeline.documents.find((item) => String(item.id) === String(docSummary.id))) pipeline.documents.push(docSummary)
        pipeline.stage = stage.name
        pipeline.stageNumber = Math.max(Number(pipeline.stageNumber || 1), stage.number)
        pipeline.status = '진행중'
        pipeline.updatedAt = docSummary.date || toDateText()
        pipeline.amount = Math.max(Number(pipeline.amount || 0), Number(document?.totalAmount ?? document?.amount ?? 0))
        updatePipelineApi(pipeline.id, {
            pipelineStage: pipeline.stage, stageNumber: pipeline.stageNumber, status: pipeline.status,
            documentId: docSummary.id, documents: pipeline.documents, amount: pipeline.amount, updatedAt: pipeline.updatedAt,
        }).catch((e) => { error.value = getErrorMessage(e, '파이프라인 업데이트에 실패했습니다.') })
        return pipeline
    }

    async function deletePipeline(id) {
        try {
            await deletePipelineApi(id)
            pipelines.value = pipelines.value.filter(p => String(p.id) !== String(id))
            return true
        } catch (e) {
            error.value = getErrorMessage(e, '파이프라인 삭제에 실패했습니다.')
            return false
        }
    }

    return {
        pipelines, loading, error, pipelinesForView, fetchPipelines, ensureLoaded,
        getPipelineById, getPipelinesByClient, getDocumentsByPipeline, createPipeline, addDocumentToPipeline,
        deletePipeline,
    }
})