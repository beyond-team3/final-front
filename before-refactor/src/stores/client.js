import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
    addClientVariety,
    createClient,
    getClientDetail,
    getClients,
    updateClient as updateClientApi,
} from '@/api/client'

const toCurrency = (value) => `₩${Number(value || 0).toLocaleString('ko-KR')}`

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
    return error?.response?.data?.message || error?.message || fallback
}

function getClientActiveValue(client = {}) {
    if (typeof client.isActive === 'boolean') {
        return client.isActive
    }
    const status = String(client.status || '').toUpperCase()
    if (['INACTIVE', '휴면', '비활성'].includes(client.status) || status === 'INACTIVE') {
        return false
    }
    return true
}

function normalizeClient(client = {}) {
    const isActive = getClientActiveValue(client)
    return {
        ...client,
        isActive,
        status: isActive ? 'active' : 'inactive',
    }
}

/**
 * 새 거래처 임시 객체 생성
 */
function makeTempClient(payload = {}) {
    return normalizeClient({
        id: `temp-${Date.now()}`,
        name: payload.name, // payload.clientName에서 수정
        type: payload.type, // payload.clientType에서 수정
        typeLabel: payload.typeLabel || '기타',
        status: 'inactive', // 초기값 비활성
        isActive: false,    // 초기값 false
        bizNo: payload.bizNo,
        ceoName: payload.ceoName,
        companyPhone: payload.companyPhone || '-',
        address: payload.address,
        managerName: payload.managerName,
        managerPhone: payload.managerPhone,
        managerEmail: payload.managerEmail,
        monthlyAmount: 0,
        monthlyInProgress: 0,
        monthlyDone: 0,
        creditLimit: Number(payload.creditLimit || 0),
        receivable: 0,
        crops: [],
        pipelines: [],
    })
}

export const useClientStore = defineStore('client', () => {
    const clients = ref([])
    const currentClient = ref(null)
    const loading = ref(false)
    const error = ref(null)

    const activeClients = computed(() => clients.value.filter((client) => client.status === 'active'))
    const getClientById = (id) => clients.value.find((client) => String(client.id) === String(id))

    async function fetchClients(params) {
        loading.value = true
        error.value = null
        try {
            const result = await getClients(params)
            clients.value = Array.isArray(result) ? result.map((client) => normalizeClient(client)) : []
            return clients.value
        } catch (e) {
            error.value = getErrorMessage(e, '목록 로딩 실패')
            throw e
        } finally {
            loading.value = false
        }
    }

    async function fetchClientDetail(id) {
        loading.value = true
        error.value = null
        try {
            const result = await getClientDetail(id)
            currentClient.value = normalizeClient(result)
            return currentClient.value
        } catch (e) {
            error.value = getErrorMessage(e, '상세 로딩 실패')
            throw e
        } finally {
            loading.value = false
        }
    }

    const addClient = (payload) => {
        const optimistic = makeTempClient(payload)
        clients.value.unshift(optimistic)

        createClient(payload)
            .then((created) => {
                const idx = clients.value.findIndex((item) => item.id === optimistic.id)
                if (idx >= 0 && created) {
                    clients.value[idx] = normalizeClient(created)
                }
            })
            .catch((e) => {
                error.value = getErrorMessage(e, '등록 실패')
                clients.value = clients.value.filter((item) => item.id !== optimistic.id)
            })
        return optimistic.id
    }

    /**
     * [핵심 수정] 거래처 정보 업데이트
     * 덮어쓰기를 방지하기 위해 기존 데이터와 병합하여 전송
     */
    const updateClient = async (id, patch) => {
        // 1. 기존 데이터 확보 (현재 상세 페이지 데이터 또는 목록에서 찾기)
        const previous = (currentClient.value && String(currentClient.value.id) === String(id))
            ? currentClient.value
            : clients.value.find((client) => String(client.id) === String(id))

        if (!previous) return

        // 2. 상태값 정규화 (isActive 변경 시 status도 함께)
        const nextIsActive = typeof patch?.isActive === 'boolean' ? patch.isActive : previous.isActive
        const normalizedPatch = {
            ...patch,
            isActive: nextIsActive,
            status: nextIsActive ? 'active' : 'inactive',
        }

        // 3. [가장 중요] 기존 데이터와 바꿀 내용을 합친 '전체 데이터'를 만듬
        const fullDataToUpdate = normalizeClient({
            ...JSON.parse(JSON.stringify(previous)), // 깊은 복사로 기존 정보 유지
            ...normalizedPatch,
        })

        // 4. 화면 즉시 반영 (낙관적 업데이트)
        if (String(currentClient.value?.id) === String(id)) {
            currentClient.value = fullDataToUpdate
        }
        clients.value = clients.value.map(c => String(c.id) === String(id) ? fullDataToUpdate : c)

        try {
            // 5. 서버에 합쳐진 전체 데이터를 보냄 (덮어쓰기 방지)
            const updated = await updateClientApi(id, fullDataToUpdate)
            if (updated) {
                const final = normalizeClient(updated)
                if (String(currentClient.value?.id) === String(id)) currentClient.value = final
                clients.value = clients.value.map(c => String(c.id) === String(id) ? final : c)
            }
        } catch (e) {
            error.value = getErrorMessage(e, '수정 실패')
            // 에러 시 롤백
            if (previous) {
                currentClient.value = normalizeClient(previous)
                clients.value = clients.value.map(c => String(c.id) === String(id) ? normalizeClient(previous) : c)
            }
        }
    }

    const toggleClientActive = async (id, isActive) => {
        await updateClient(id, { isActive: Boolean(isActive) })
    }

    const addVariety = (id, crop) => {
        addClientVariety(id, { crop })
            .then((updated) => {
                if (updated) {
                    const final = normalizeClient(updated)
                    if (String(currentClient.value?.id) === String(id)) currentClient.value = final
                    clients.value = clients.value.map(c => String(c.id) === String(id) ? final : c)
                }
            })
    }

    return {
        clients, currentClient, loading, error, activeClients,
        getClientById, fetchClients, fetchClientDetail,
        addClient, updateClient, toggleClientActive, addVariety, toCurrency,
    }
})