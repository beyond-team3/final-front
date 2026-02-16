import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  addClientVariety,
  createClient,
  getClients,
  updateClient as updateClientApi,
} from '@/api/client'

const toCurrency = (value) => `₩${Number(value || 0).toLocaleString('ko-KR')}`

function toClientEntity(payload, nextNumber) {
  return {
    id: `C-${String(nextNumber).padStart(3, '0')}`,
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
  const loading = ref(false)
  const error = ref(null)

  const activeClients = computed(() => clients.value.filter((client) => client.status === 'active'))

  const getClientById = (id) => clients.value.find((client) => client.id === id)

  async function fetchClients(params) {
    loading.value = true
    error.value = null

    try {
      const { data } = await getClients(params)
      clients.value = data
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  const addClient = (payload) => {
    const optimistic = toClientEntity(payload, clients.value.length + 1)
    clients.value.unshift(optimistic)

    createClient(payload)
      .then(({ data }) => {
        if (!data) {
          return
        }

        const index = clients.value.findIndex((client) => client.id === optimistic.id)
        if (index >= 0) {
          clients.value[index] = data
        }
      })
      .catch((e) => {
        error.value = e
      })
  }

  const updateClient = (id, patch) => {
    clients.value = clients.value.map((client) => {
      if (client.id !== id) {
        return client
      }

      return {
        ...client,
        ...patch,
      }
    })

    updateClientApi(id, patch).catch((e) => {
      error.value = e
    })
  }

  const addVariety = (id, crop) => {
    addClientVariety(id, { crop }).catch((e) => {
      error.value = e
    })
  }

  void fetchClients()

  return {
    clients,
    loading,
    error,
    activeClients,
    getClientById,
    fetchClients,
    addClient,
    updateClient,
    addVariety,
    toCurrency,
  }
})
