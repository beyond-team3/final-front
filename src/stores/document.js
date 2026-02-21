import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import eventBus from '@/utils/eventBus'
import {
    createContract as createContractApi,
    createInvoice as createInvoiceApi,
    createOrder as createOrderApi,
    createQuotation as createQuotationApi,
    createQuotationRequest as createQuotationRequestApi,
    getDocuments,
    getStatements
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
})

export const useDocumentStore = defineStore('document', () => {
    const authStore = useAuthStore()
    const historyStore = useHistoryStore()
    const productMaster = ref([])
    const clientMaster = ref([])

    const quotationRequests = ref([])
    const quotations = ref([])
    const contracts = ref([])
    const orders = ref([])
    const invoices = ref([])
    const statements = ref([])

    const loading = ref(false)
    const error = ref(null)
    const isClientRole = computed(() => authStore.currentRole === ROLES.CLIENT)

    const getViewerClientIdentity = () => {
        const me = authStore.me || {}
        // me.id 대신 me.refId(6)를 타겟으로 잡슴돠!
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
            // 영업사원은 managerId 필드를 기준으로 매칭함돠.
            const myRefId = String(authStore.me?.refId || '')
            return list.filter((item) => String(item?.managerId ?? '') === myRefId)
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
            // 1단계: 내 refId(영업사원 고유 번호) 확인
            const myRefId = String(authStore.me?.refId || '')

            // 2단계: 담당 거래처 목록(clientMaster)에서 managerId가 내 refId와 일치하는 것들의 ID만 추출
            const managedClientIds = clientMaster.value
                .filter(c => String(c.managerId) === myRefId)
                .map(c => String(c.id))

            // 3단계: 문서의 clientId가 담당 거래처 목록에 포함되는지 확인
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
                code: item.code || item.bizNo || String(item.id),
                name: item.name,
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
            // 💡 [수정] 서버에 clientId 던지지 말고 다 가져오십쇼!
            const rawList = normalizeList(await getDocuments({}))

            // 💡 [핵심] 스토어 내부의 filterDocsForViewer가 행님의 refId(6)를 찾아낼 것임돠.
            const docs = filterDocsForViewer(rawList).map(normalizeDocument)

            quotationRequests.value = docs.filter(d => ['quotation-request', 'rfq'].includes(d.type.toLowerCase()))
            quotations.value = docs.filter(d => d.type.toLowerCase() === 'quotation')
            contracts.value = docs.filter(d => d.type.toLowerCase() === 'contract')
            orders.value = docs.filter(d => d.type.toLowerCase() === 'order')
            invoices.value = docs.filter(d => d.type.toLowerCase() === 'invoice')

            return docs
        } catch (e) {
            console.error('문서 로드 실패:', e)
            return []
        } finally {
            loading.value = false
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

    async function fetchStatements(params) {
        try {
            const data = await getStatements(params)
            statements.value = normalizeList(data)
            return statements.value
        } catch (e) {
            error.value = getErrorMessage(e, '명세서 목록을 불러오지 못했습니다.')
            return []
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
        quotationRequests.value.unshift(next)
        const createdPipeline = historyStore.createPipeline(client, next)
        if (createdPipeline) next.historyId = createdPipeline.id
        emitDocumentCreated('quotation-request', id)
        createQuotationRequestApi(next).then((created) => {
            if (!created) return
            const idx = quotationRequests.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                quotationRequests.value[idx] = normalizeDocument({
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
        quotations.value.unshift(next)
        const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
        if (targetPipeline) next.historyId = targetPipeline.id
        emitDocumentCreated('quotation', id)
        if (request) {
            request.status = 'QUOTED'
            request.historyId = next.historyId || request.historyId || null
        }
        createQuotationApi(next).then((created) => {
            if (!created) return
            const idx = quotations.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                quotations.value[idx] = normalizeDocument({
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
        contracts.value.unshift(next)
        const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
        if (targetPipeline) next.historyId = targetPipeline.id
        emitDocumentCreated('contract', id)
        if (quotation) {
            quotation.status = 'CONTRACTED'
            quotation.historyId = next.historyId || quotation.historyId || null
        }
        createContractApi(next).then((created) => {
            if (!created) return
            const idx = contracts.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                contracts.value[idx] = normalizeDocument({
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
            status: 'ORDERED',
            date: formatDate(),
            createdAt: formatDate(),
            totalAmount: totalAmountOf(lineItems),
            historyId: linkedHistoryId,
        })
        orders.value.unshift(next)
        const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
        if (targetPipeline) next.historyId = targetPipeline.id
        if (contract) contract.historyId = next.historyId || contract.historyId || null
        emitDocumentCreated('order', id)
        createOrderApi(next).then((created) => {
            if (!created) return
            const idx = orders.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                orders.value[idx] = normalizeDocument({
                    ...created,
                    historyId: created?.historyId || next.historyId,
                })
            }
        }).catch((e) => { error.value = getErrorMessage(e, '주문서 생성에 실패했습니다.') })
        return next
    }

    const createInvoice = ({ orderId, client, items, remarks, mode = 'pending', historyId }) => {
        const id = makeId('IV')
        const lineItems = (items || []).map(withAmount)
        const supplyAmount = totalAmountOf(lineItems)
        const taxAmount = Math.round(supplyAmount * 0.1)
        const order = orderId ? getOrderById(orderId) : null
        const linkedHistoryId = historyId || order?.historyId || null
        const next = normalizeDocument({
            id,
            type: 'invoice',
            orderId,
            clientId: client.id,
            clientName: client.name,
            client,
            authorId: authStore.me?.id || authStore.me?.refId,
            authorName: authStore.me?.targetPerson || authStore.me?.loginId || '작성자',
            items: lineItems,
            remarks: remarks || '',
            status: mode === 'issued' ? 'issued' : 'pending',
            date: formatDate(),
            createdAt: formatDate(),
            dueDate: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)),
            supplyAmount,
            taxAmount,
            totalAmount: supplyAmount + taxAmount,
            historyId: linkedHistoryId,
        })
        invoices.value.unshift(next)
        const targetPipeline = historyStore.addDocumentToPipeline(linkedHistoryId, next)
        if (targetPipeline) next.historyId = targetPipeline.id
        if (order) order.historyId = next.historyId || order.historyId || null
        emitDocumentCreated('invoice', id)
        createInvoiceApi(next).then((created) => {
            if (!created) return
            const idx = invoices.value.findIndex((item) => item.id === id)
            if (idx >= 0) {
                invoices.value[idx] = normalizeDocument({
                    ...created,
                    historyId: created?.historyId || next.historyId,
                })
            }
        }).catch((e) => { error.value = getErrorMessage(e, '청구서 생성에 실패했습니다.') })
        return next
    }

    const markInvoiceIssued = (invoiceId) => {
        const invoice = getInvoiceById(invoiceId)
        if (invoice) invoice.status = 'issued'
    }

    async function initialize() {
        loading.value = true
        error.value = null
        try {
            await Promise.all([
                fetchProductMaster(),
                fetchClientMaster(),
                fetchDocuments(),
                fetchStatements(),
            ])
        } finally {
            loading.value = false
        }
    }

    const pendingInvoices = computed(() => invoices.value.filter((d) => d.status === 'pending' || d.status === '발행대기'))
    const issuedInvoices = computed(() => invoices.value.filter((d) => d.status === 'issued' || d.status === '발행'))

    void initialize()

    return {
        productMaster,
        clientMaster,
        quotationRequests,
        quotations,
        contracts,
        orders,
        invoices,
        pendingInvoices,
        issuedInvoices,
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
        statements,
        fetchStatements,
        initialize,
    }
})