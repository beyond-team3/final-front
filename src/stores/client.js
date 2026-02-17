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

function makeTempClient(payload = {}) {
  return normalizeClient({
    id: `temp-${Date.now()}`,
    name: payload.clientName,
    type: payload.clientType,
    typeLabel: payload.clientType === 'DISTRIBUTOR' ? '대리점' : '기타',
    status: 'active',
    isActive: true,
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
      error.value = getErrorMessage(e, '거래처 목록을 불러오지 못했습니다.')
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
      error.value = getErrorMessage(e, '거래처 상세를 불러오지 못했습니다.')
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
        error.value = getErrorMessage(e, '거래처 등록에 실패했습니다.')
        clients.value = clients.value.filter((item) => item.id !== optimistic.id)
      })

    return optimistic.id
  }

  const updateClient = (id, patch) => {
    const previous = clients.value.find((client) => String(client.id) === String(id))
    const nextIsActive = typeof patch?.isActive === 'boolean' ? patch.isActive : null
    const normalizedPatch = nextIsActive === null
      ? patch
      : {
          ...patch,
          isActive: nextIsActive,
          status: nextIsActive ? 'active' : 'inactive',
        }

    clients.value = clients.value.map((client) => {
      if (String(client.id) !== String(id)) {
        return client
      }

      return normalizeClient({
        ...client,
        ...normalizedPatch,
      })
    })

    if (String(currentClient.value?.id) === String(id)) {
      currentClient.value = normalizeClient({
        ...currentClient.value,
        ...normalizedPatch,
      })
    }

    updateClientApi(id, normalizedPatch)
      .then((updated) => {
        if (!updated) {
          return
        }

        clients.value = clients.value.map((client) => {
          if (String(client.id) !== String(id)) {
            return client
          }

          return normalizeClient({
            ...client,
            ...updated,
          })
        })

        if (String(currentClient.value?.id) === String(id)) {
          currentClient.value = normalizeClient({
            ...currentClient.value,
            ...updated,
          })
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '거래처 수정에 실패했습니다.')
        if (previous) {
          clients.value = clients.value.map((client) => {
            if (String(client.id) !== String(id)) {
              return client
            }
            return normalizeClient(previous)
          })

          if (String(currentClient.value?.id) === String(id)) {
            currentClient.value = normalizeClient(previous)
          }
        }
      })
  }

  const addVariety = (id, crop) => {
    addClientVariety(id, { crop })
      .then((updated) => {
        if (!updated) {
          return
        }

        clients.value = clients.value.map((client) => {
          if (String(client.id) !== String(id)) {
            return client
          }
          return normalizeClient({
            ...client,
            ...updated,
          })
        })

        if (String(currentClient.value?.id) === String(id)) {
          currentClient.value = normalizeClient({
            ...currentClient.value,
            ...updated,
          })
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '품종 추가에 실패했습니다.')
      })
  }

  const toggleClientActive = (id, isActive) => {
    updateClient(id, {
      isActive: Boolean(isActive),
    })
  }

  void fetchClients()

  return {
    clients,
    currentClient,
    loading,
    error,
    activeClients,
    getClientById,
    fetchClients,
    fetchClientDetail,
    addClient,
    updateClient,
    toggleClientActive,
    addVariety,
    toCurrency,
  }
})
