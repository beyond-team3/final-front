import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
    addClientCrop,
    createClient,
    getClientCrops,
    getClientDetail,
    getClients,
    updateClient as updateClientApi,
    deleteClientCrop,
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

function parseAddress(addressInput) {
    if (!addressInput) return { sido: '', address: '', zonecode: '' }

    // sido/address/zonecode 형식 파싱
    if (addressInput.includes('/')) {
        const parts = addressInput.split('/')
        return {
            sido: parts[0] || '',
            address: parts[1] || '',
            zonecode: parts[2] || ''
        }
    }

    // 기존 데이터나 다른 형식일 경우 기본값 반환
    return {
        sido: '',
        address: addressInput,
        zonecode: ''
    }
}

function normalizeClient(client = {}) {
    const isActive = getClientActiveValue(client)
    const parsedAddr = parseAddress(client.address)

    // 유형 레이블 매핑
    const typeMap = {
        'NURSERY': '육묘장',
        'DISTRIBUTOR': '대리점'
    }
    const rawType = client.clientType || client.type
    const typeLabel = typeMap[rawType] || '기타'

    return {
        ...client,
        // 백엔드 필드명을 프론트엔드 스타일로 매핑 (방어적 ID 매핑 추가)
        id: client.id || client.clientId || client.client_id,
        code: client.clientCode || client.code,
        name: client.clientName || client.name,
        type: rawType,
        typeLabel: typeLabel,

        // 상세 필드 매핑 보완
        bizNo: client.clientBrn || client.bizNo,
        creditLimit: client.totalCredit || client.creditLimit || 0,
        receivable: client.usedCredit || client.receivable || 0,

        monthlyInProgress: client.monthlyInProgress || 0,
        monthlyDone: client.monthlyDone || 0,

        managerId: client.managerId,
        managerName: client.managerName,

        isActive,
        status: isActive ? 'active' : 'inactive',
        displaySido: parsedAddr.sido || client.addressSido,
        displayAddressOnly: parsedAddr.address || client.addressDetail,
        displayZonecode: parsedAddr.zonecode || client.addressZip,
        // 기존 호환성 유지용 (시도 주소 합침)
        displayAddress: `${parsedAddr.sido || client.addressSido || ''} ${parsedAddr.address || client.addressDetail || ''}`.trim(),

        // [추가] 초기 품종 데이터 보장
        crops: client.crops || [],
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
        sido: payload.sido,
        sigungu: payload.sigungu,
        query: payload.query,
        zonecode: payload.zonecode,
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
            // ApiResult 구조인 경우 result.data를 사용, 아니면 result 자체를 사용
            const data = result?.data || result
            clients.value = Array.isArray(data) ? data.map((client) => normalizeClient(client)) : []
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
            const response = await getClientDetail(id)
            // ApiResult 구조인 경우 response.data를 사용, 아니면 response 자체를 사용
            const data = response?.data || response
            currentClient.value = normalizeClient(data)
            return currentClient.value
        } catch (e) {
            error.value = getErrorMessage(e, '상세 로딩 실패')
            throw e
        } finally {
            loading.value = false
        }
    }

    async function fetchClientCrops(id) {
        try {
            const response = await getClientCrops(id)
            const rawCrops = response?.data || response || []

            // [방어 코드] snake_case 필드를 camelCase로 매핑
            const normalizedCrops = Array.isArray(rawCrops) ? rawCrops.map(item => ({
                id: item.id || item.client_crop_id || item.clientCropId,
                cropName: item.cropName || item.crop_name
            })) : []

            if (currentClient.value && String(currentClient.value.id) === String(id)) {
                // 반응성을 위해 객체 전체를 교체하거나 속성을 재할당
                currentClient.value = {
                    ...currentClient.value,
                    crops: normalizedCrops
                }
            }
            return normalizedCrops
        } catch (e) {
            console.error('[Store] fetchClientCrops failed:', e)
            return []
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

    const addCrop = async (clientId, cropName) => {
        try {
            await addClientCrop(clientId, { cropName })
            await fetchClientCrops(clientId)
        } catch (e) {
            error.value = getErrorMessage(e, '품종 추가 실패')
            throw e
        }
    }

    const removeCrop = async (clientId, cropId) => {
        try {
            await deleteClientCrop(cropId)
            await fetchClientCrops(clientId)
        } catch (e) {
            error.value = getErrorMessage(e, '품종 삭제 실패')
            throw e
        }
    }

    return {
        clients,
        currentClient,
        loading,
        error,
        activeClients,
        getClientById,
        fetchClients,
        fetchClientDetail,
        fetchClientCrops,
        registerClient: addClient, // Assuming addClient is the registerClient function
        updateClient,
        toggleClientActive,
        addCrop,
        removeCrop,
        toCurrency: (v) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v),
    }
})