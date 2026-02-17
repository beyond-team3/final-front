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

function makeTempClient(payload = {}) {
  return {
    id: `temp-${Date.now()}`,
    name: payload.clientName,
    type: payload.clientType,
    typeLabel: payload.clientType === 'DISTRIBUTOR' ? '대리점' : '기타',
    status: 'active',
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
  }
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
      clients.value = Array.isArray(result) ? result : []
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
      currentClient.value = await getClientDetail(id)
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
          clients.value[idx] = created
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

    clients.value = clients.value.map((client) => {
      if (String(client.id) !== String(id)) {
        return client
      }

      return {
        ...client,
        ...patch,
      }
    })

    updateClientApi(id, patch)
      .then((updated) => {
        if (!updated) {
          return
        }

        clients.value = clients.value.map((client) => {
          if (String(client.id) !== String(id)) {
            return client
          }

          return {
            ...client,
            ...updated,
          }
        })
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '거래처 수정에 실패했습니다.')
        if (previous) {
          clients.value = clients.value.map((client) => {
            if (String(client.id) !== String(id)) {
              return client
            }
            return previous
          })
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
          return {
            ...client,
            ...updated,
          }
        })
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '품종 추가에 실패했습니다.')
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
    addVariety,
    toCurrency,
  }
})
