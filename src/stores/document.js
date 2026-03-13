import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import eventBus from '@/utils/eventBus'
import {
    createContract as createContractApi,
    createInvoice as createInvoiceApi,
    createOrder as createOrderApi,
    cancelOrder as cancelOrderApi,
    publishInvoice as publishInvoiceApi,
    getDocuments,
    getDocumentDetail,
    getOrders,
    getStatements,
    getInvoices,
    getInvoice,
    getInvoice as getInvoiceApi,
    getInvoiceDetail as getInvoiceDetailApi,
    toggleInvoiceStatement as toggleInvoiceStatementApi,
    getOrder as getOrderApi,
    getQuotation as getQuotationApi,
    getContract as getContractApi,
    createQuotation as createQuotationApi,
    createQuotationRequest as createQuotationRequestApi,
    updateDocumentStatus as updateDocumentStatusApi,
    deleteDocument as deleteDocumentApi,
    deleteQuotationRequest as deleteQuotationRequestApi,
    deleteQuotation as deleteQuotationApi,
    deleteContract as deleteContractApi,
    getQuotationRequest as getQuotationRequestApi,
    getPendingQuotationRequests as getPendingQuotationRequestsApi,
    getApprovedQuotations as getApprovedQuotationsApi,
    getRejectedQuotationRequests as getRejectedQuotationRequestsApi,
    getRejectedQuotations as getRejectedQuotationsApi,
    getDocumentSummaries,
} from '@/api/document'
import { getClients } from '@/api/client'
import { getProducts, getProductsForContract, getProductsForQuotationRequest } from '@/api/product'
import { useAuthStore } from '@/stores/auth'
import { useHistoryStore } from '@/stores/history'
import { ROLES } from '@/utils/constants'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
    const backendMessage = error?.response?.data?.message
    if (backendMessage) return backendMessage
    
    if (error?.response?.status === 400) {
        return '필수 정보가 누락되었습니다. 입력 내용을 다시 확인해 주세요.'
    }
    return error?.message || fallback
}

function normalizeList(data) {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (data.result === 'SUCCESS' && Array.isArray(data.data)) return data.data
    const actualData = data.data !== undefined ? data.data : data
    if (Array.isArray(actualData)) return actualData
    if (Array.isArray(actualData?.documents)) return actualData.documents
    if (Array.isArray(actualData?.items)) return actualData.items
    return []
}

function unwrapData(data) {
    if (!data) return null
    // Axios response object case
    if (data.data && data.status) {
        return unwrapData(data.data)
    }
    // ApiResult/Page wrapper case
    if (data.result === 'SUCCESS' && data.data !== undefined) return data.data
    if (data.data !== undefined) return data.data
    return data
}

function normalizePageResponse(response) {
    const payload = response?.data ?? response
    const pageData = payload?.content
        ? payload
        : payload?.result === 'SUCCESS' && payload?.data
            ? payload.data
            : null

    if (!pageData || !Array.isArray(pageData.content)) {
        return { content: [], totalElements: 0, totalPages: 1, size: 10, number: 0 }
    }
    return pageData
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
}

const withAmount = (item) => ({
    ...item,
    amount: Number(item.quantity || 0) * Number(item.unitPrice || 0),
})

const normalizeClient = (doc = {}) => {
    if (doc.client && typeof doc.client === 'object') {
        return {
            id: doc.client.id ?? doc.clientId ?? null,
            name: doc.client.name ?? doc.clientName ?? null,
            contact: doc.client.contact ?? doc.client.managerName ?? doc.managerName ?? null,
        }
    }
    return {
        id: doc.clientId ?? doc.client ?? null,
        name: doc.clientName || (typeof doc.client === 'string' ? doc.client : null),
        contact: doc.clientContact || doc.managerName || null,
    }
}

const normalizeDocument = (doc = {}) => {
    if (!doc) return null

    // 💡 백엔드 필드(docType, docId) -> 프론트엔드 표준 필드(type, id) 매핑 및 정규화
    let type = String(doc.type || doc.docType || '').trim().toLowerCase()
    const id = doc.id || doc.docId || null

    // 타입 코드 정규화 (backend RFQ -> front 표준 코드)
    let docType = ''
    if (['rfq', 'quotation-request', 'quotationrequest'].includes(type) || String(doc.docCode || '').startsWith('RFQ')) {
        docType = 'RFQ'
        type = 'quotation-request'
    } else if (['quo', 'quotation'].includes(type) || String(doc.docCode || '').startsWith('QUO')) {
        docType = 'QUO'
        type = 'quotation'
    } else if (['cnt', 'contract'].includes(type) || String(doc.docCode || '').startsWith('CNT')) {
        docType = 'CNT'
        type = 'contract'
    } else if (['ord', 'order'].includes(type) || String(doc.docCode || '').startsWith('ORD')) {
        docType = 'ORD'
        type = 'order'
    } else if (['stmt', 'statement'].includes(type) || String(doc.docCode || '').startsWith('STMT')) {
        docType = 'STMT'
        type = 'statement'
    } else if (['inv', 'invoice'].includes(type) || String(doc.docCode || '').startsWith('INV')) {
        docType = 'INV'
        type = 'invoice'
    }

    // 품목(items) 표준화: productName -> name, productCategory -> variety 등
    const items = (Array.isArray(doc.items) ? doc.items : []).map(item => ({
        ...item,
        name: item.productName || item.name || '',
        variety: item.productCategory || item.variety || '',
        quantity: item.totalQuantity ?? item.quantity ?? item.count ?? 0,
        unit: item.unit || '',
        unitPrice: Number(item.unitPrice ?? item.price ?? 0),
        amount: Number(item.amount ?? ((item.totalQuantity ?? item.quantity ?? item.count ?? 0) * (item.unitPrice ?? item.price ?? 0)))
    }))

    // 전체 금액 계산 (필드 없을 시 합산)
    const totalAmount = Number(doc.totalAmount ?? doc.amount ?? items.reduce((sum, i) => sum + i.amount, 0))

    // 청구 주기 정규화 (백엔드 Enum -> 프론트 단어)
    let billingCycle = doc.billingCycle || ''
    if (billingCycle === 'MONTHLY') billingCycle = '월'
    else if (billingCycle === 'QUARTERLY') billingCycle = '분기'
    else if (billingCycle === 'HALF_YEARLY') billingCycle = '반기'

    const docCode = doc.docCode || doc.requestCode || doc.quotationCode || doc.contractCode || doc.orderCode || doc.invoiceCode || ''
    const isTemp = String(docCode || id || '').includes('temp-')

    return {
        ...doc,
        id,
        type,
        docType,
        billingCycle,
        // 표시용 코드 (docCode가 없으면 displayCode라도 id 기반으로 생성)
        displayCode: doc.displayCode || doc.docCode || doc.requestCode || doc.quotationCode || doc.contractCode || doc.orderCode || doc.invoiceCode || String(id || ''),
        docCode: isTemp ? '' : (docCode || String(id || '')),
        client: normalizeClient(doc),
        items,
        totalAmount,
        // 요구사항과 비고를 명확히 분리
        requirements: doc.requirements || doc.memo || '',
        memo: (docType === 'RFQ') ? '' : (doc.memo || ''),
        // 작성자 고유 ID (본인 확인용) - 더 많은 필드 시도
        authorId: doc.authorId || doc.writerId || doc.userId || doc.clientId || doc.salesRepId || doc.client?.id || null,
        // 원본 필드 보존
        salesRepName: doc.salesRepName || '',
        managerName: doc.managerName || doc.client?.managerName || doc.client?.contact || '',
        authorName: doc.authorName || doc.writerName || doc.managerName || doc.client?.managerName || '',
        createdAt: doc.createdAt || doc.date || (doc.createdAt ? doc.createdAt : new Date().toISOString().slice(0, 10)),
        historyId: doc.historyId || doc.pipelineId || doc.dealId || null,
        statusHistory: Array.isArray(doc.statusHistory) ? doc.statusHistory : [],
    }
}

const ORDER_STATUS = {
    DRAFT: 'DRAFT',
    REQUESTED: 'REQUESTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CANCELED: 'CANCELED',
}

const INVOICE_STATUS = {
    DRAFT: 'DRAFT',
    ISSUED: 'ISSUED',
    CANCELED: 'CANCELED',
}

function normalizeOrderStatus(status) {
    const raw = String(status || '').trim().toUpperCase()
    if (['ORDERED', 'PENDING', 'REQUESTED', '처리중', '대기'].includes(raw)) return ORDER_STATUS.REQUESTED
    if (['APPROVED', 'ACTIVE', '승인', '완료'].includes(raw)) return ORDER_STATUS.APPROVED
    if (['REJECTED', 'REJECT', '반려'].includes(raw)) return ORDER_STATUS.REJECTED
    if (['CANCELED', 'CANCELLED', 'CANCEL', '취소'].includes(raw)) return ORDER_STATUS.CANCELED
    return ORDER_STATUS.DRAFT
}

const normalizeInvoiceStatus = (status) => {
    const raw = String(status || '').trim().toUpperCase()
    if (['ISSUED', 'PAID'].includes(raw)) return 'ISSUED'
    if (['CANCELED', 'CANCELLED'].includes(raw)) return 'CANCELED'
    return 'DRAFT'
}

function matchesDocumentType(doc, types = []) {
    const normalizedType = String(doc?.type || '').trim().toLowerCase()
    return types.some((type) => normalizedType === String(type).trim().toLowerCase())
}

export const useDocumentStore = defineStore('document', () => {
    const authStore = useAuthStore()
    const historyStore = useHistoryStore()
    const productMaster = ref([])
    const clientMaster = ref([])

    const allRawDocuments = ref([])
    const pendingQuotationRequests = ref([])
    const rejectedQuotationRequests = ref([])
    const approvedQuotations = ref([])
    const rejectedQuotations = ref([])
    const statements = ref([])

    const quotationRequests = computed(() => {
        const _ = clientMaster.value
        const filtered = filterDocsForViewer(allRawDocuments.value)
        return filtered.filter(d => ['quotation-request', 'rfq'].includes(d.type.toLowerCase()))
    })
    const quotations = computed(() => {
        const _ = clientMaster.value
        const filtered = filterDocsForViewer(allRawDocuments.value)
        return filtered.filter(d => d.type.toLowerCase() === 'quotation')
    })
    const contracts = computed(() => {
        const _ = clientMaster.value
        const filtered = filterDocsForViewer(allRawDocuments.value)
        return filtered.filter(d => d.type.toLowerCase() === 'contract')
    })
    const orders = computed(() => {
        const _ = clientMaster.value
        const filtered = filterDocsForViewer(allRawDocuments.value)
        return filtered.filter(d => d.type.toLowerCase() === 'order')
    })
    const invoices = computed(() => {
        const _ = clientMaster.value
        const filtered = filterDocsForViewer(allRawDocuments.value)
        return filtered.filter(d => d.type.toLowerCase() === 'invoice')
    })

    const loading = ref(false)
    const error = ref(null)
    const isClientRole = computed(() => authStore.currentRole === ROLES.CLIENT)

    const getViewerClientIdentity = () => {
        const me = authStore.me || {}
        const byRefId = me.refId ?? me.clientId ?? me.id ?? null
        const byName = String(me.clientName || me.targetPerson || me.name || '').trim()

        if (byRefId !== null && byRefId !== undefined && byRefId !== '') {
            return { clientId: String(byRefId), clientName: byName }
        }
        return { clientId: null, clientName: byName || null }
    }

    const filterClientsForViewer = (list = []) => {
        const role = authStore.currentRole
        if (role === ROLES.ADMIN) return list

        const identity = getViewerClientIdentity()
        if (role === ROLES.CLIENT) {
            if (!identity.clientId && !identity.clientName) return []
            return list.filter((item) => {
                const clientIdMatch = identity.clientId && String(item?.id ?? '') === identity.clientId
                const clientNameMatch = identity.clientName && (
                    normalizeText(item?.name) === normalizeText(identity.clientName) ||
                    normalizeText(item?.clientName) === normalizeText(identity.clientName)
                )
                return clientIdMatch || clientNameMatch
            })
        }

        if (role === ROLES.SALES_REP) {
            const myRefId = String(authStore.me?.refId || '')
            const managedClientIds = clientMaster.value
                .filter(c => String(c.managerId) === myRefId)
                .map(c => String(c.id))

            // clientMaster가 아직 안 로드됐으면 clientId로 직접 필터링하지 말고 전체 반환
            if (managedClientIds.length === 0) {
                return list
            }

            return list.filter((item) => {
                const docClientId = String(item.clientId || item.client?.id || '')
                return managedClientIds.includes(docClientId)
            })
        }

        return []
    }

    const filterDocsForViewer = (list = []) => {
        const role = authStore.currentRole
        if (role === ROLES.ADMIN) return list

        const identity = getViewerClientIdentity()
        if (role === ROLES.CLIENT) {
            if (!identity.clientId && !identity.clientName) return []
            return list.filter((item) => {
                const client = normalizeClient(item)
                const clientIdMatch = identity.clientId && String(client.id ?? '') === identity.clientId
                const clientNameMatch = identity.clientName && normalizeText(client.name) === normalizeText(identity.clientName)
                return clientIdMatch || clientNameMatch
            })
        }

        if (role === ROLES.SALES_REP) {
            const myRefId = String(authStore.me?.refId || authStore.me?.employeeId || '')
            const managedClientIds = clientMaster.value
                .filter(c => String(c.managerId) === myRefId)
                .map(c => String(c.id))

            return list.filter((item) => {
                // 1. 내가 작성한 문서인가?
                const isAuthor = String(item.authorId || '') === myRefId
                // 2. 내가 관리하는 거래처의 문서인가?
                const docClientId = String(item.clientId || item.client?.id || '')
                const isManagedClient = managedClientIds.includes(docClientId)

                return isAuthor || isManagedClient
            })
        }

        return []
    }

    const formatDate = (date = new Date()) => date.toISOString().slice(0, 10)
    const makeId = (prefix) => `${prefix}-temp-${Date.now()}`
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
    const emitDocumentCreated = (type, id) => {
        eventBus.emit('document:created', { type, id })
    }
    const totalAmountOf = (items = []) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const getActorName = () => authStore.me?.targetPerson || authStore.me?.name || authStore.me?.loginId || '알 수 없음'
    const createStatusHistoryEntry = (previousStatus) => ({
        timestamp: new Date().toISOString(),
        actor: getActorName(),
        previousStatus,
    })
    const syncPipelineDocumentStatus = (docId, status) => {
        const targetDoc = allRawDocuments.value.find((item) => String(item.id) === String(docId))
        if (!targetDoc?.historyId) return
        const pipeline = historyStore.getPipelineById(targetDoc.historyId)
        const summary = pipeline?.documents?.find((item) => String(item.id) === String(docId))
        if (summary) {
            summary.status = status
        }
    }

    const getRequestById = (id) => quotationRequests.value.find((item) => String(item.id) === String(id))
    const getQuotationById = (id) => quotations.value.find((item) => String(item.id) === String(id))
    const getContractById = (id) => contracts.value.find((item) => String(item.id) === String(id))
    const getOrderById = (id) => orders.value.find((item) => String(item.id) === String(id))
    const getInvoiceById = (id) => invoices.value.find((item) => String(item.id) === String(id))

    /**
     * contractId 기준으로 해당 계약에 속한 명세서 목록 반환
     * GET /api/v1/statements 응답에 contractId가 없으므로
     * orderId → orders → contractId 역참조로 필터링
     *
     * @param {string|number} contractId
     * @param {Array} [statementPool] - 외부에서 fetch한 명세서 배열 (없으면 store.statements 사용)
     */
    const getStatementsByContract = (contractId, statementPool) => {
        const pool = statementPool ?? statements.value
        if (!contractId || !pool.length) return []

        const cid = String(contractId)

        // invoices 목록에 contractId가 있음 → 같은 contract의 invoice들 수집
        // 그 invoice들에 연결된 statementId Set 구성 (store의 invoices는 목록 API라 statements 없음)
        // 대신 orders 경유: orders[].contractId(headerId) → orderId → statements[].orderId
        const matchingOrderIds = new Set(
            orders.value
                .filter(o => {
                    const oCid = String(
                        o.contractId || o.contract_id ||
                        o.headerId || o.header_id ||
                        o.contractHeaderId || ''
                    )
                    return oCid === cid
                })
                .map(o => String(o.id || o.orderId || ''))
                .filter(Boolean)
        )

        // orders 매핑 성공 시 orderId 기반 필터
        if (matchingOrderIds.size > 0) {
            return pool.filter(s => matchingOrderIds.has(String(s.orderId || s.order_id || '')))
        }

        // orders 매핑 실패 시: invoices[contractId]와 같은 contract의 invoiceId 수집
        // → 나중에 invoice detail에서 statementIds를 얻으므로 여기선 빈 배열
        // (InvoiceView의 loadInvoice → /detail에서 statements를 직접 내려줌)
        console.warn(`[getStatementsByContract] contractId=${cid} orders 매핑 실패. orders:`, orders.value.slice(0, 2))
        return []
    }

    /**
     * 현재 active(DRAFT/PUBLISHED/PAID) 청구서에 포함된 statementId Set
     * → statements의 includedInActiveInvoice 대용으로 사용
     */
    const activeInvoiceStatementIds = computed(() => {
        const set = new Set()
        invoices.value
            .filter(inv => {
                const s = String(inv.status || '').toUpperCase()
                return s === 'DRAFT' || s === 'PUBLISHED' || s === 'PAID'
            })
            .forEach(inv => {
                const stmts = inv.statements || inv.items || inv.statementIds || []
                stmts.forEach(s => {
                    const sid = s?.statementId || s?.id || (typeof s === 'number' ? s : null)
                    if (sid) set.add(String(sid))
                })
            })
        return set
    })

    async function fetchProductMaster(type = 'contract') {
        try {
            // 견적/계약서용 한글 설명이 포함된 상품 목록 호출
            let response = null
            if (type === 'estimate' || type === 'quotation-request') {
                response = await getProductsForQuotationRequest()
            } else {
                response = await getProductsForContract()
            }
            const data = normalizeList(response)

            productMaster.value = data.map((item) => ({
                id: item.productId || item.id,
                category: item.productCategory || item.category || '-',
                variety: item.productCategory || item.category || '-', // 품종명(한글)
                name: item.productName || item.name || '',
                unit: item.unit || '립',
                unitPrice: Number(item.price ?? item.unitPrice ?? 0),
            }))
            return productMaster.value
        } catch (e) {
            console.error('상품 마스터 로드 에러:', e)
            error.value = getErrorMessage(e, '상품 마스터를 불러오지 못했습니다.')
            return []
        }
    }

    async function fetchClientMaster(params) {
        try {
            if (authStore.currentRole === ROLES.CLIENT) {
                if (authStore.me) {
                    const me = authStore.me
                    clientMaster.value = [{
                        id: me.clientId || me.id,
                        code: me.clientCode || String(me.clientId || me.id),
                        name: me.clientName || me.name || '-',
                        contact: me.managerName || '-',
                        managerId: null,
                    }]
                } else {
                    clientMaster.value = []
                }
                return clientMaster.value
            }

            const clients = await getClients({})
            const normalized = normalizeList(clients)
            const filtered = filterClientsForViewer(normalized)

            clientMaster.value = filtered.map((item) => ({
                id: item.id,
                code: item.clientCode || item.code || String(item.id),
                name: item.clientName || item.name || '-',
                contact: item.managerName || item.contact || '-',
                managerId: item.managerId,
            }))
            return clientMaster.value
        } catch (e) {
            error.value = getErrorMessage(e, '거래처 마스터를 불러오지 못했습니다.')
            return clientMaster.value
        }
    }

    async function fetchDocumentsV2() {
        try {
            const data = await getDocuments()
            const docs = normalizeList(data).map((doc) => normalizeDocument(doc))
            const nonStatementDocs = docs.filter((doc) => !matchesDocumentType(doc, ['statement']))

            allRawDocuments.value = [
                ...allRawDocuments.value.filter((doc) => matchesDocumentType(doc, ['statement'])),
                ...nonStatementDocs,
            ]
            return nonStatementDocs
        } catch (e) {
            error.value = getErrorMessage(e, '문서 목록을 불러오지 못했습니다.')
            return []
        }
    }

    async function fetchOrders() {
        try {
            const rawOrders = normalizeList(await getOrders())
            const normalizedOrders = rawOrders.map(doc => normalizeDocument({
                ...doc,
                type: 'order',
                id: doc.orderId,
                displayCode: doc.orderCode,
            }))
            allRawDocuments.value = [
                ...allRawDocuments.value.filter(d => d.type.toLowerCase() !== 'order'),
                ...normalizedOrders,
            ]
            return normalizedOrders
        } catch (e) {
            console.error('주문서 로드 실패:', e)
            return []
        }
    }

    async function fetchDocumentDetail(id) {
        loading.value = true
        try {
            const detail = await getDocumentDetail(id)
            return normalizeDocument(unwrapData(detail))
        } catch (e) {
            error.value = getErrorMessage(e, '문서 상세 정보를 불러오지 못했습니다.')
            return null
        } finally {
            loading.value = false
        }
    }

    async function fetchQuotationDetail(id) {
        loading.value = true
        try {
            const response = await getQuotationApi(id)
            const detail = unwrapData(response)
            if (!detail) return null
            return normalizeDocument({ ...detail, type: 'quotation' })
        } catch (e) {
            error.value = getErrorMessage(e, '견적서 상세 정보를 불러오지 못했습니다.')
            return null
        } finally {
            loading.value = false
        }
    }

    async function fetchApprovedQuotations() {
        try {
            const response = await getApprovedQuotationsApi()
            const data = normalizeList(response)
            const normalized = data.map(doc => normalizeDocument({
                ...doc,
                type: 'quotation'
            }))

            // 전용 상태에 저장 (권한 필터링 우회용)
            approvedQuotations.value = normalized

            // allRawDocuments에도 병합하여 다른 곳에서 참조 가능하게 함
            allRawDocuments.value = [
                ...allRawDocuments.value.filter(d => !normalized.some(n => n.id === d.id)),
                ...normalized
            ]
            return normalized
        } catch (e) {
            console.error('승인된 견적서 로드 실패:', e)
            return []
        }
    }

    async function fetchContractDetail(id) {
        loading.value = true
        try {
            const response = await getContractApi(id)
            const detail = unwrapData(response)
            if (!detail) return null
            return normalizeDocument({ ...detail, type: 'contract' })
        } catch (e) {
            error.value = getErrorMessage(e, '계약서 상세 정보를 불러오지 못했습니다.')
            return null
        } finally {
            loading.value = false
        }
    }

    async function fetchQuotationRequestDetail(id) {
        loading.value = true
        try {
            console.log(`[Store] fetchQuotationRequestDetail(${id}) 시작`)
            const response = await getQuotationRequestApi(id)
            const detail = unwrapData(response)

            if (!detail) {
                console.warn(`[Store] fetchQuotationRequestDetail(${id}): 데이터가 비어있음`)
                return null
            }

            const normalized = normalizeDocument({
                ...detail,
                type: 'quotation-request',
                authorName: detail.clientName || detail.managerName || detail.authorName
            })
            console.log('[Store] fetchQuotationRequestDetail 성공:', normalized)
            return normalized
        } catch (e) {
            console.error(`[Store] fetchQuotationRequestDetail(${id}) 실패:`, e)
            return null
        } finally {
            loading.value = false
        }
    }

    async function fetchPendingQuotationRequests() {
        try {
            const response = await getPendingQuotationRequestsApi()
            const data = normalizeList(response)
            const normalizedList = data.map(doc => normalizeDocument({
                ...doc,
                type: 'quotation-request'
            }))
            pendingQuotationRequests.value = normalizedList
            return normalizedList
        } catch (e) {
            console.error('대기 중인 견적 요청 로드 실패:', e)
            return []
        }
    }

    async function fetchRejectedQuotationRequests() {
        try {
            const response = await getRejectedQuotationRequestsApi()
            const data = normalizeList(response)
            const normalizedList = data.map(doc => normalizeDocument({
                ...doc,
                type: 'quotation-request'
            }))
            rejectedQuotationRequests.value = normalizedList
            return normalizedList
        } catch (e) {
            console.error('반려된 견적 요청 로드 실패:', e)
            return []
        }
    }

    async function fetchRejectedQuotations() {
        try {
            const response = await getRejectedQuotationsApi()
            const data = normalizeList(response)
            const normalizedList = data.map(doc => normalizeDocument({
                ...doc,
                type: 'quotation'
            }))
            rejectedQuotations.value = normalizedList
            return normalizedList
        } catch (e) {
            console.error('반려된 견적서 로드 실패:', e)
            return []
        }
    }

    async function fetchStatements() {
        try {
            const data = await getStatements()
            const rawList = normalizeList(data)
            const normalizedStatements = rawList.map(doc => normalizeDocument({
                ...doc,
                type: 'statement',
                id: doc.statementId,
            }))
            allRawDocuments.value = [
                ...allRawDocuments.value.filter(d => d.type?.toLowerCase() !== 'statement'),
                ...normalizedStatements,
            ]
            statements.value = normalizedStatements
            return normalizedStatements
        } catch (e) {
            console.error('명세서 로드 실패:', e)
            return []
        }
    }

    async function fetchInvoices() {
        try {
            const data = await getInvoices()
            const rawList = normalizeList(data)
            const normalizedInvoices = rawList.map(doc => ({
                ...normalizeDocument(doc),
                type: 'invoice',
                id: doc.invoiceId,
                invoiceId: doc.invoiceId,
                contractId: doc.contractId,   // invoices 목록 API에 있음 - 반드시 보존
                invoiceCode: doc.invoiceCode,
                invoiceDate: doc.invoiceDate,
            }))
            allRawDocuments.value = [
                ...allRawDocuments.value.filter(d => d.type?.toLowerCase() !== 'invoice'),
                ...normalizedInvoices,
            ]
            return normalizedInvoices
        } catch (e) {
            console.error('청구서 로드 실패:', e)
            return []
        }
    }

    async function fetchInvoiceDetail(invoiceId) {
        loading.value = true
        try {
            const data = await getInvoiceApi(invoiceId)
            return normalizeDocument(unwrapData(data))
        } catch (e) {
            console.error('청구서 상세 로드 실패:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    async function fetchOrderDetail(id) {
        loading.value = true
        try {
            const response = await getOrderApi(id)
            return normalizeDocument(unwrapData(response))
        } catch (e) {
            console.error('주문서 상세 로드 에러:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    const createQuotationRequest = async ({ client, items, requirements }) => {
        const id = makeId('RFQ')
        const lineItems = (items || []).map(withAmount)
        const next = normalizeDocument({
            id,
            type: 'RFQ',
            clientId: client.id,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.clientName || authStore.me?.name || '작성자',
            items: lineItems,
            requirements: requirements || '',
            status: 'PENDING',
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: null,
        })
        allRawDocuments.value.unshift(next)
        emitDocumentCreated('quotation-request', id)

        // 백엔드 DTO 규격에 맞춰 페이로드 생성
        const payload = {
            requirements: requirements || '',
            items: lineItems.map(item => ({
                productId: item.productId,
                productCategory: (item.productCategory || item.category || item.variety || '기타').trim(),
                productName: (item.productName || item.name || '상품명 없음').trim(),
                quantity: Math.max(1, Number(item.quantity || 1)),
                unit: item.unit || '립'
            }))
        }

        try {
            const response = await createQuotationRequestApi(payload)
            let raw = unwrapData(response)

            // 💡 백엔드 응답 데이터가 null인 경우 목록에서 최신 문서 조회 (안전한 우회 경로)
            if (!raw && response?.result === 'SUCCESS') {
                await delay(1200)
                const summaryResp = await getDocumentSummaries({
                    docType: 'RFQ',
                    size: 1,
                    sort: 'createdAt,desc'
                })
                const summaryData = normalizePageResponse(summaryResp)
                if (summaryData?.content?.length > 0) {
                    raw = summaryData.content[0]
                }
            }

            let created = null
            if (raw && typeof raw === 'object') {
                created = normalizeDocument(raw)
            } else if (raw) {
                created = await fetchQuotationRequestDetail(raw)
            }

            // 실제 번호 확인을 위한 리트라이
            if (!created || !created.docCode || String(created.docCode).includes('temp-')) {
                const targetId = created?.id || (typeof raw === 'number' || typeof raw === 'string' ? raw : raw?.id)
                if (targetId) {
                    for (let i = 0; i < 10; i++) {
                        await delay(1200)
                        const detailed = await fetchQuotationRequestDetail(targetId)
                        if (detailed && detailed.docCode && !String(detailed.docCode).includes('temp-')) {
                            created = detailed
                            break
                        }
                    }
                }
            }

            if (created) {
                const idx = allRawDocuments.value.findIndex((item) => item.id === id)
                if (idx >= 0) allRawDocuments.value[idx] = created
                historyStore.fetchPipelines()
            }
            return created || next
        } catch (e) {
            error.value = getErrorMessage(e, '견적 요청서 생성에 실패했습니다.')
            throw e
        }
    }

    const createQuotation = async ({ requestId, client, items, memo, historyId }) => {
        const id = makeId('QT')
        const lineItems = (items || []).map(withAmount)
        const next = normalizeDocument({
            id,
            type: 'quotation',
            requestId,
            clientId: client.id,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            memo: memo || '',
            status: 'WAITING_ADMIN',
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: historyId || null,
        })

        const payload = {
            requestId: requestId ? Number(requestId) : null,
            clientId: Number(client.id),
            memo: memo || '',
            items: lineItems.map(item => ({
                productId: item.productId,
                productName: (item.productName || item.name || '상품명 없음').trim(),
                productCategory: (item.productCategory || item.category || item.variety || '기타').trim(),
                quantity: Math.max(1, Number(item.quantity || 1)),
                unit: item.unit || '-',
                unitPrice: Number(item.unitPrice || 0)
            }))
        }

        try {
            const response = await createQuotationApi(payload)
            let raw = unwrapData(response)

            // 💡 백엔드 응답이 비어있을 경우 최신 목록에서 조회 (안전장치)
            if (!raw && response?.result === 'SUCCESS') {
                await delay(1200)
                const summaryResp = await getDocumentSummaries({
                    docType: 'QUO',
                    size: 1,
                    sort: 'createdAt,desc'
                })
                const summaryData = normalizePageResponse(summaryResp)
                if (summaryData?.content?.length > 0) {
                    raw = summaryData.content[0]
                }
            }

            let created = null
            if (raw && typeof raw === 'object') {
                created = normalizeDocument(raw)
            } else if (raw) {
                created = await fetchQuotationDetail(raw)
            }

            // 실제 번호 확인을 위한 리트라이
            if (!created || !created.docCode || String(created.docCode).includes('temp-')) {
                const targetId = created?.id || (typeof raw === 'number' || typeof raw === 'string' ? raw : raw?.id)
                if (targetId) {
                    for (let i = 0; i < 10; i++) {
                        await delay(1200)
                        const detailed = await fetchQuotationDetail(targetId)
                        if (detailed && detailed.docCode && !String(detailed.docCode).includes('temp-')) {
                            created = detailed
                            break
                        }
                    }
                }
            }

            if (created) {
                const idx = allRawDocuments.value.findIndex((item) => item.id === id)
                if (idx >= 0) allRawDocuments.value[idx] = created
                else allRawDocuments.value.unshift(created)

                emitDocumentCreated('quotation', id)
                historyStore.fetchPipelines()
                fetchPendingQuotationRequests()
                fetchRejectedQuotations()
            }
            return created || next
        } catch (e) {
            error.value = getErrorMessage(e, '견적서 생성에 실패했습니다.')
            throw e
        }
    }

    const createContract = async ({ quotationId, client, items, startDate, endDate, billingCycle, specialTerms, memo, historyId }) => {
        const id = makeId('CT')
        const lineItems = (items || []).map(withAmount)
        const next = normalizeDocument({
            id,
            type: 'contract',
            quotationId,
            clientId: client.id,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            startDate,
            endDate,
            billingCycle,
            specialTerms,
            memo: memo || '',
            status: 'ACTIVE',
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: historyId || null,
        })

        const payload = {
            quotationId: Number(quotationId),
            clientId: Number(client.id),
            startDate,
            endDate,
            billingCycle: billingCycle === '월' ? 'MONTHLY' : (billingCycle === '분기' ? 'QUARTERLY' : (billingCycle === '반기' ? 'HALF_YEARLY' : billingCycle)),
            specialTerms,
            memo: memo || '',
            items: lineItems.map(item => ({
                productId: item.productId,
                productName: (item.productName || item.name || '상품명 없음').trim(),
                productCategory: (item.productCategory || item.category || item.variety || '기타').trim(),
                totalQuantity: Math.max(1, Number(item.quantity || item.qty || 1)),
                unit: item.unit || '-',
                unitPrice: Number(item.unitPrice || item.price || 0)
            }))
        }

        try {
            const response = await createContractApi(payload)
            let raw = unwrapData(response)

            // 💡 백엔드 응답이 비어있을 경우 최신 목록에서 조회 (안전장치)
            if (!raw && response?.result === 'SUCCESS') {
                await delay(1200)
                const summaryResp = await getDocumentSummaries({
                    docType: 'CNT',
                    size: 1,
                    sort: 'createdAt,desc'
                })
                const summaryData = normalizePageResponse(summaryResp)
                if (summaryData?.content?.length > 0) {
                    raw = summaryData.content[0]
                }
            }

            let created = null
            if (raw && typeof raw === 'object') {
                created = normalizeDocument(raw)
            } else if (raw) {
                created = await fetchContractDetail(raw)
            }

            // 실제 번호 확인을 위한 리트라이
            if (!created || !created.docCode || String(created.docCode).includes('temp-')) {
                const targetId = created?.id || (typeof raw === 'number' || typeof raw === 'string' ? raw : raw?.id)
                if (targetId) {
                    for (let i = 0; i < 10; i++) {
                        await delay(1200)
                        const detailed = await fetchContractDetail(targetId)
                        if (detailed && detailed.docCode && !String(detailed.docCode).includes('temp-')) {
                            created = detailed
                            break
                        }
                    }
                }
            }

            if (created) {
                const idx = allRawDocuments.value.findIndex((item) => item.id === id)
                if (idx >= 0) allRawDocuments.value[idx] = created
                else allRawDocuments.value.unshift(created)

                emitDocumentCreated('contract', id)
                historyStore.fetchPipelines()
            }
            return created || next
        } catch (e) {
            error.value = getErrorMessage(e, '계약서 생성에 실패했습니다.')
            throw e
        }
    }

    const createOrder = ({ contractId, client, items, deliveryDate, memo, historyId }) => {
        const id = makeId('OD')
        const lineItems = (items || []).map(withAmount)
        const next = normalizeDocument({
            id,
            type: 'order',
            contractId,
            clientId: client.id,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            deliveryDate,
            memo: memo || '',
            status: 'REQUESTED',
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: historyId || null,
        })
        allRawDocuments.value.unshift(next)
        emitDocumentCreated('order', id)

        const payload = {
            headerId: contractId,
            shippingName: client.managerName || '-',
            shippingPhone: client.companyPhone || '-',
            shippingAddress: client.address || '-',
            shippingAddressDetail: '',
            deliveryRequest: memo || '',
            items: lineItems.map(item => ({
                contractDetailId: item.detailId || item.id,
                quantity: item.quantity
            }))
        }

        createOrderApi(payload).then((created) => {
            if (!created) return
            historyStore.fetchPipelines()
        }).catch((e) => { error.value = getErrorMessage(e, '주문서 생성에 실패했습니다.') })
        return next
    }

    const createInvoice = async ({ contractId, startDate, endDate, memo }) => {
        try {
            const created = await createInvoiceApi({
                contractId,
                startDate,
                endDate,
                memo: memo || null,
            })
            const normalized = normalizeDocument({
                ...created,
                type: 'invoice',
                id: created.invoiceId,
            })
            allRawDocuments.value.unshift(normalized)
            emitDocumentCreated('invoice', normalized.id)
            return normalized
        } catch (e) {
            error.value = getErrorMessage(e, '청구서 생성에 실패했습니다.')
            return null
        }
    }

    const publishInvoice = async (invoiceId) => {
        try {
            const result = await publishInvoiceApi(invoiceId)
            const index = allRawDocuments.value.findIndex(d => String(d.id) === String(invoiceId))
            if (index >= 0) {
                allRawDocuments.value[index] = normalizeDocument({
                    ...allRawDocuments.value[index],
                    status: result.status,
                })
            }
            return { success: true }
        } catch (e) {
            error.value = getErrorMessage(e, '청구서 확정에 실패했습니다.')
            return { success: false, message: error.value }
        }
    }

    const markInvoiceIssued = (invoiceId) => {
        const invoice = getInvoiceById(invoiceId)
        if (invoice) invoice.status = INVOICE_STATUS.ISSUED
    }

    const cancelOrder = async (orderId) => {
        const index = allRawDocuments.value.findIndex((item) => String(item.id) === String(orderId))
        if (index < 0) {
            return { success: false, reason: 'NOT_FOUND', message: '주문서를 찾을 수 없습니다.' }
        }

        const current = allRawDocuments.value[index]
        const currentStatus = normalizeOrderStatus(current.status)

        if (![ROLES.CLIENT, ROLES.SALES_REP].includes(authStore.currentRole)) {
            return { success: false, reason: 'FORBIDDEN', message: '취소 권한이 없습니다.' }
        }

        if (currentStatus === ORDER_STATUS.APPROVED) {
            return { success: false, reason: 'ADMIN_APPROVAL_REQUIRED', message: '관리자 승인 필요' }
        }

        if (currentStatus !== ORDER_STATUS.REQUESTED) {
            return { success: false, reason: 'INVALID_STATUS', message: 'REQUESTED 상태에서만 취소할 수 있습니다.' }
        }

        const prevDoc = { ...current }
        const nextHistory = [...(current.statusHistory || []), createStatusHistoryEntry(currentStatus)]
        allRawDocuments.value[index] = normalizeDocument({
            ...current,
            status: ORDER_STATUS.CANCELED,
            statusHistory: nextHistory,
        })
        syncPipelineDocumentStatus(orderId, ORDER_STATUS.CANCELED)

        try {
            await cancelOrderApi(orderId)  // PATCH /api/v1/orders/{orderId}/cancel
            return { success: true }
        } catch (e) {
            allRawDocuments.value[index] = prevDoc
            syncPipelineDocumentStatus(orderId, prevDoc.status)
            error.value = getErrorMessage(e, '주문서 취소에 실패했습니다.')
            return { success: false, reason: 'API_ERROR', message: error.value }
        }
    }

    const cancelInvoice = async (invoiceId) => {
        const index = allRawDocuments.value.findIndex((item) => String(item.id) === String(invoiceId))
        if (index < 0) {
            return { success: false, reason: 'NOT_FOUND', message: '청구서를 찾을 수 없습니다.' }
        }

        const current = allRawDocuments.value[index]
        const currentStatus = normalizeInvoiceStatus(current.status)

        if (authStore.currentRole !== ROLES.SALES_REP) {
            return { success: false, reason: 'FORBIDDEN', message: '영업사원만 취소할 수 있습니다.' }
        }

        if (currentStatus === INVOICE_STATUS.CANCELED) {
            return { success: false, reason: 'ALREADY_CANCELED', message: '이미 취소된 청구서입니다.' }
        }

        const prevDoc = { ...current }
        const nextHistory = [...(current.statusHistory || []), createStatusHistoryEntry(currentStatus)]
        allRawDocuments.value[index] = normalizeDocument({
            ...current,
            status: INVOICE_STATUS.CANCELED,
            statusHistory: nextHistory,
        })
        syncPipelineDocumentStatus(invoiceId, INVOICE_STATUS.CANCELED)

        try {
            await updateDocumentStatusApi(invoiceId, {
                status: INVOICE_STATUS.CANCELED,
                statusHistory: nextHistory,
            })
            return { success: true }
        } catch (e) {
            allRawDocuments.value[index] = prevDoc
            syncPipelineDocumentStatus(invoiceId, prevDoc.status)
            error.value = getErrorMessage(e, '청구서 취소에 실패했습니다.')
            return { success: false, reason: 'API_ERROR', message: error.value }
        }
    }

    const deleteDocument = async (id, docType = '') => {
        try {
            const idValue = String(id)
            const typeKey = String(docType || '').toLowerCase().replace(/[\s-]+/g, '')

            let apiCall = null

            if (typeKey.includes('request') || typeKey === 'rfq' || typeKey.includes('견적요청')) {
                apiCall = deleteQuotationRequestApi
            } else if (typeKey.includes('quotation') || typeKey.includes('견적')) {
                apiCall = deleteQuotationApi
            } else if (typeKey.includes('contract') || typeKey.includes('계약')) {
                apiCall = deleteContractApi
            }

            if (!apiCall) {
                console.error(`[DocumentStore] 유효하지 않은 문서 타입으로 삭제 시도됨. Type: ${docType}, ID: ${idValue}`)
                error.value = '삭제할 수 없는 문서 유형입니다.'
                return false
            }

            console.log(`[DocumentStore] Delete Action - Type: ${docType}, API: ${apiCall?.name || 'unknown'}, ID: ${idValue}`)
            await apiCall(idValue)

            allRawDocuments.value = allRawDocuments.value.filter((doc) => String(doc.id) !== idValue)
            pendingQuotationRequests.value = pendingQuotationRequests.value.filter((doc) => String(doc.id) !== idValue)
            await historyStore.fetchPipelines()
            return true
        } catch (e) {
            console.error('[DocumentStore] Delete Error:', e)
            error.value = getErrorMessage(e, '문서 삭제에 실패했습니다.')
            return false
        }
    }

    async function deleteContract(id) {
        return deleteDocument(id, 'contract')
    }

    const cancelQuotationRequest = (id) => deleteDocument(id, 'quotation-request')

    async function initialize() {
        loading.value = true
        error.value = null
        try {
            await fetchClientMaster()
            // orders가 먼저 로드되어야 getStatementsByContract에서 orderId→contractId 매핑이 가능
            await Promise.all([
                fetchProductMaster(),
                fetchDocumentsV2(),
                fetchOrders(),
            ])
            await fetchStatements()
        } finally {
            loading.value = false
        }
    }

    // me 정보가 로드될 때 다시 로드
    watch(() => authStore.me, (newMe) => {
        if (newMe && clientMaster.value.length === 0) {
            initialize()
        }
    }, { immediate: true })

    void initialize()

    const pendingInvoices = computed(() => invoices.value.filter((d) => normalizeInvoiceStatus(d.status) === INVOICE_STATUS.DRAFT))
    const issuedInvoices = computed(() => invoices.value.filter((d) => normalizeInvoiceStatus(d.status) === INVOICE_STATUS.ISSUED))
    const canceledInvoices = computed(() => invoices.value.filter((d) => normalizeInvoiceStatus(d.status) === INVOICE_STATUS.CANCELED))

    return {
        allRawDocuments,
        productMaster,
        clientMaster,
        quotationRequests,
        quotations,
        contracts,
        orders,
        invoices,
        pendingInvoices,
        issuedInvoices,
        canceledInvoices,
        loading,
        error,
        fetchProductMaster,
        fetchClientMaster,
        fetchDocumentsV2,
        fetchDocumentDetail,
        totalAmountOf,
        getRequestById,
        getQuotationById,
        getContractById,
        getOrderById,
        getInvoiceById,
        getStatementsByContract,
        activeInvoiceStatementIds,
        createQuotationRequest,
        createQuotation,
        createContract,
        createOrder,
        createInvoice,
        markInvoiceIssued,
        cancelOrder,
        cancelInvoice,
        cancelQuotationRequest,
        deleteDocument,
        deleteContract,
        statements,
        fetchStatements,
        initialize,
        fetchOrders,
        fetchInvoices,
        publishInvoice,
        fetchInvoiceDetail,
        fetchQuotationRequestDetail,
        pendingQuotationRequests,
        fetchPendingQuotationRequests,
        rejectedQuotationRequests,
        fetchRejectedQuotationRequests,
        approvedQuotations,
        fetchApprovedQuotations,
        rejectedQuotations,
        fetchRejectedQuotations,
        fetchQuotationDetail,
        fetchContractDetail,
        fetchOrderDetail,
    }
})
