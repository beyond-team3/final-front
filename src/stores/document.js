import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import eventBus from '@/utils/eventBus'
import {
    createContract as createContractApi,
    createInvoice as createInvoiceApi,
    createOrder as createOrderApi,
    cancelOrder as cancelOrderApi,
    publishInvoice as publishInvoiceApi,
    getOrders,
    getStatements,
    getInvoices,
    getInvoice,
    createQuotation as createQuotationApi,
    createQuotationRequest as createQuotationRequestApi,
    getDocumentDetail,
    getDocuments,
    updateDocumentStatus as updateDocumentStatusApi,
    deleteDocument as deleteDocumentApi
} from '@/api/document'
import { getClients } from '@/api/client'
import { getProducts } from '@/api/product'
import { useAuthStore } from '@/stores/auth'
import { useHistoryStore } from '@/stores/history'
import { ROLES } from '@/utils/constants'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
    return error?.response?.data?.message || error?.message || fallback
}

function normalizeList(data) {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (data.result === 'SUCCESS' && Array.isArray(data.data)) return data.data  // 추가
    const actualData = data.data !== undefined ? data.data : data
    if (Array.isArray(actualData)) return actualData
    if (Array.isArray(actualData?.documents)) return actualData.documents
    if (Array.isArray(actualData?.items)) return actualData.items
    return []
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
            name: doc.client.name ?? doc.clientName ?? '-',
            contact: doc.client.contact ?? doc.client.managerName ?? '-',
        }
    }
    return {
        id: doc.clientId ?? doc.client ?? null,
        name: doc.clientName || (typeof doc.client === 'string' ? doc.client : '-'),
        contact: doc.clientContact || '-',
    }
}

const normalizeDocument = (doc = {}) => ({
    ...doc,
    client: normalizeClient(doc),
    items: Array.isArray(doc.items) ? doc.items : [],
    totalAmount: Number(doc.totalAmount ?? doc.amount ?? 0),
    createdAt: doc.createdAt || doc.date || new Date().toISOString().slice(0, 10),
    historyId: doc.historyId || doc.pipelineId || null,
    statusHistory: Array.isArray(doc.statusHistory) ? doc.statusHistory : [],
})

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

export const useDocumentStore = defineStore('document', () => {
    const authStore = useAuthStore()
    const historyStore = useHistoryStore()
    const productMaster = ref([])
    const clientMaster = ref([])

    const allRawDocuments = ref([])
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
        const byRefId = me.refId ?? me.clientId ?? null
        const byName = String(me.targetPerson || me.clientName || me.name || '').trim()

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
                const clientNameMatch = identity.clientName && normalizeText(item?.name) === normalizeText(identity.clientName)
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

            if (managedClientIds.length === 0) {
                return []
            }

            return list.filter((item) => {
                const docClientId = String(item.clientId || item.client?.id || '')
                return managedClientIds.includes(docClientId)
            })
        }

        return []
    }

    const formatDate = (date = new Date()) => date.toISOString().slice(0, 10)
    const makeId = (prefix) => `${prefix}-${Date.now()}`
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

    const getRequestById = (id) => quotationRequests.value.find((item) => item.id === id)
    const getQuotationById = (id) => quotations.value.find((item) => item.id === id)
    const getContractById = (id) => contracts.value.find((item) => item.id === id)
    const getOrderById = (id) => orders.value.find((item) => item.id === id)
    const getInvoiceById = (id) => invoices.value.find((item) => item.id === id)

    async function fetchProductMaster(params) {
        try {
            const products = await getProducts(params)
            productMaster.value = normalizeList(products).map((item) => ({
                id: item.id,
                variety: item.variety || item.category || '-',
                name: item.name,
                unit: item.unit || item.priceData?.unit || 'ea',
                unitPrice: Number(item.unitPrice ?? item.priceData?.price ?? 0),
            }))
            return productMaster.value
        } catch (e) {
            error.value = getErrorMessage(e, '상품 마스터를 불러오지 못했습니다.')
            return productMaster.value
        }
    }

    async function fetchClientMaster(params) {
        try {
            const clients = await getClients({})
            clientMaster.value = filterClientsForViewer(normalizeList(clients)).map((item) => ({
                id: item.id,
                code: item.clientCode || item.code || String(item.id),
                name: item.clientName || item.name || '-',   // ← clientName 추가
                contact: item.managerName || item.contact || '-',
                managerId: item.managerId,
            }))
            return clientMaster.value
        } catch (e) {
            error.value = getErrorMessage(e, '거래처 마스터를 불러오지 못했습니다.')
            return clientMaster.value
        }
    }

    async function fetchDocuments(params) {
        loading.value = true
        try {
            const rawList = normalizeList(await getDocuments({}))
            allRawDocuments.value = rawList.map(normalizeDocument)
            return allRawDocuments.value
        } catch (e) {
            console.error('문서 로드 실패:', e)
            return []
        } finally {
            loading.value = false
        }
    }

    async function fetchOrders() {
        try {
            const rawOrders = normalizeList(await getOrders())
            const normalizedOrders = rawOrders.map(doc => normalizeDocument({
                ...doc,
                type: 'order',
                id: doc.orderId,
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
            return normalizeDocument(detail)
        } catch (e) {
            error.value = getErrorMessage(e, '문서 상세 정보를 불러오지 못했습니다.')
            return null
        } finally {
            loading.value = false
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
            console.log('fetchInvoices raw data:', data)          // 추가
            const rawList = normalizeList(data)
            console.log('fetchInvoices rawList:', rawList)        // 추가
            const normalizedInvoices = rawList.map(doc => ({
                ...normalizeDocument(doc),  // 먼저 normalize하고
                type: 'invoice',            // 그 다음 type 덮어쓰기
                id: doc.invoiceId,
            }))
            console.log('type 확인:', normalizedInvoices[0]?.type)  // 추가
            console.log('id 확인:', normalizedInvoices[0]?.id)      // 추가
            console.log('normalizedInvoices:', normalizedInvoices) // 추가
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
        try {
            const data = await getInvoice(invoiceId)
            return data
        } catch (e) {
            console.error('청구서 상세 로드 실패:', e)
            return null
        }
    }

    const createQuotationRequest = ({ client, items, requirements }) => {
        const id = makeId('RQ')
        const lineItems = (items || []).map(withAmount)
        const next = normalizeDocument({
            id,
            type: 'quotation-request',
            clientId: client.id,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            memo: requirements || '',
            status: 'REQUESTED',
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: null,
        })
        allRawDocuments.value.unshift(next)
        const createdPipeline = historyStore.createPipeline(client, next)
        if (createdPipeline) next.historyId = createdPipeline.id
        emitDocumentCreated('quotation-request', id)
        createQuotationRequestApi(next).then((created) => {
            if (!created) return
            const idx = allRawDocuments.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                allRawDocuments.value[idx] = normalizeDocument({
                    ...created,
                    historyId: created?.historyId || next.historyId,
                })
            }
        }).catch((e) => { error.value = getErrorMessage(e, '견적 요청서 생성에 실패했습니다.') })
        return next
    }

    const createQuotation = ({ requestId, client, items, memo, historyId }) => {
        const id = makeId('QT')
        const lineItems = (items || []).map(withAmount)
        const request = requestId ? getRequestById(requestId) : null
        const linkedHistoryId = historyId || request?.historyId || null
        const next = normalizeDocument({
            id,
            type: 'quotation',
            requestId: requestId || null,
            clientId: client.id,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            memo: memo || '',
            status: 'ISSUED',
            date: formatDate(),
            createdAt: formatDate(),
            validUntil: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)),
            totalAmount: totalAmountOf(lineItems),
            historyId: linkedHistoryId,
        })
        allRawDocuments.value.unshift(next)
        const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
        if (targetPipeline) next.historyId = targetPipeline.id
        emitDocumentCreated('quotation', id)
        if (request) {
            request.status = 'QUOTED'
            request.historyId = next.historyId || request.historyId || null
        }
        createQuotationApi(next).then((created) => {
            if (!created) return
            const idx = allRawDocuments.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                allRawDocuments.value[idx] = normalizeDocument({
                    ...created,
                    historyId: created?.historyId || next.historyId,
                })
            }
        }).catch((e) => { error.value = getErrorMessage(e, '견적서 생성에 실패했습니다.') })
        return next
    }

    const createContract = ({ quotationId, client, items, startDate, endDate, billingCycle, specialTerms, historyId }) => {
        const id = makeId('CT')
        const lineItems = (items || []).map(withAmount)
        const quotation = quotationId ? getQuotationById(quotationId) : null
        const linkedHistoryId = historyId || quotation?.historyId || null
        const next = normalizeDocument({
            id,
            type: 'contract',
            quotationId: quotationId || null,
            clientId: client.id,
            clientName: client.name,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            startDate,
            endDate,
            billingCycle,
            specialTerms: specialTerms || '',
            status: 'ACTIVE',
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: linkedHistoryId,
        })
        allRawDocuments.value.unshift(next)
        const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
        if (targetPipeline) next.historyId = targetPipeline.id
        emitDocumentCreated('contract', id)
        if (quotation) {
            quotation.status = 'CONTRACTED'
            quotation.historyId = next.historyId || quotation.historyId || null
        }
        createContractApi(next).then((created) => {
            if (!created) return
            const idx = allRawDocuments.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                allRawDocuments.value[idx] = normalizeDocument({
                    ...created,
                    historyId: created?.historyId || next.historyId,
                })
            }
        }).catch((e) => { error.value = getErrorMessage(e, '계약서 생성에 실패했습니다.') })
        return next
    }

    const createOrder = ({ contractId, client, items, deliveryDate, memo, historyId }) => {
        const id = makeId('OD')
        const lineItems = (items || []).map(withAmount)
        const contract = contractId ? getContractById(contractId) : null
        const linkedHistoryId = historyId || contract?.historyId || null
        const next = normalizeDocument({
            id,
            type: 'order',
            contractId,
            clientId: client.id,
            clientName: client.name,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            deliveryDate,
            memo: memo || '',
            status: ORDER_STATUS.REQUESTED,
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: linkedHistoryId,
        })
        allRawDocuments.value.unshift(next)
        const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
        if (targetPipeline) next.historyId = targetPipeline.id
        if (contract) contract.historyId = next.historyId || contract.historyId || null
        emitDocumentCreated('order', id)
        createOrderApi(next).then((created) => {
            if (!created) return
            const idx = allRawDocuments.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                allRawDocuments.value[idx] = normalizeDocument({
                    ...created,
                    historyId: created?.historyId || next.historyId,
                })
            }
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

    const deleteDocument = async (id) => {
        try {
            const doc = allRawDocuments.value.find(d => String(d.id) === String(id))
            const historyId = doc?.historyId

            // 1. 서버에서 문서 삭제
            await deleteDocumentApi(id)

            // 2. 로컬 상태에서 제거
            allRawDocuments.value = allRawDocuments.value.filter(d => String(d.id) !== String(id))

            // 3. 연관된 히스토리(파이프라인) 삭제 (최초 문서인 경우 등)
            if (historyId) {
                // 파이프라인에 다른 문서가 상주해 있는지 여부에 따라 전체 삭제 혹은 부분 관리 가능
                // 여기서는 기존 cancelQuotationRequest 로직을 따라 파이프라인 전체 삭제를 기본으로 함
                await historyStore.deletePipeline(historyId)
            }

            return true
        } catch (e) {
            error.value = getErrorMessage(e, '문서 삭제에 실패했습니다.')
            return false
        }
    }

    const cancelQuotationRequest = (id) => deleteDocument(id)

    async function initialize() {
        loading.value = true
        error.value = null
        try {
            // 1. 먼저 clientMaster 로드 (필터링에 필요)
            await fetchClientMaster()

            // 2. 그 다음 나머지 병렬 로드 (fetchDocuments 제외 - 백엔드 미구현)
            await Promise.all([
                fetchProductMaster(),
                fetchOrders(),
                fetchStatements(),
                fetchInvoices(),
            ])
        } finally {
            loading.value = false
        }
    }

    const pendingInvoices = computed(() => invoices.value.filter((d) => normalizeInvoiceStatus(d.status) === INVOICE_STATUS.DRAFT))
    const issuedInvoices = computed(() => invoices.value.filter((d) => normalizeInvoiceStatus(d.status) === INVOICE_STATUS.ISSUED))
    const canceledInvoices = computed(() => invoices.value.filter((d) => normalizeInvoiceStatus(d.status) === INVOICE_STATUS.CANCELED))

    void initialize()

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
        fetchDocuments,
        fetchDocumentDetail,
        totalAmountOf,
        getRequestById,
        getQuotationById,
        getContractById,
        getOrderById,
        getInvoiceById,
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
        statements,
        fetchStatements,
        initialize,
        fetchOrders,
        fetchInvoices,
        publishInvoice,
        fetchInvoiceDetail,
    }
})