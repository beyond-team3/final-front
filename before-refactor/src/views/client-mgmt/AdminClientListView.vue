<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchFilter from '@/components/common/SearchFilter.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useClientStore } from '@/stores/client'

const router = useRouter()
const clientStore = useClientStore()
const { clients, loading, error } = storeToRefs(clientStore)

const filters = ref({
  keyword: '',
  type: '',
})

const filterFields = [
  { key: 'keyword', label: '거래처 검색', placeholder: '거래처명/사업자번호/담당자명' },
  {
    key: 'type',
    label: '거래처 유형',
    type: 'select',
    options: [
      { label: '대리점', value: 'DISTRIBUTOR' },
      { label: '육묘장', value: 'NURSERY' },
    ],
  },
]

const columns = [
  { key: 'id', label: '거래처 코드' },
  { key: 'name', label: '거래처명' },
  { key: 'typeLabel', label: '유형' },
  { key: 'managerName', label: '담당자' },
  { key: 'monthlyAmount', label: '월 거래금액' },
  { key: 'status', label: '상태' },
]

const rows = computed(() => {
  return clients.value.filter((client) => {
    const keyword = filters.value.keyword.trim().toLowerCase()
    const matchKeyword =
      !keyword ||
      [client.name, client.bizNo, client.managerName]
        .join(' ')
        .toLowerCase()
        .includes(keyword)

    const matchType = !filters.value.type || client.type === filters.value.type

    return matchKeyword && matchType
  })
})

const toCurrency = (value) => clientStore.toCurrency(value)

const openDetail = (client) => {
  router.push(`/clients/${client.id}`)
}

const openRegister = () => {
  router.push('/clients/register')
}

const fetchClients = async () => {
  try {
    await clientStore.fetchClients()
  } catch (e) {
    // error state is managed by store
  }
}

onMounted(fetchClients)
</script>

<template>
  <section>
    <PageHeader title="거래처 관리" subtitle="전체 거래처를 관리하고 신규 거래처를 등록합니다.">
      <template #actions>
        <button
          type="button"
          class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="openRegister"
        >
          + 거래처 등록
        </button>
      </template>
    </PageHeader>

    <SearchFilter
      v-model="filters"
      :fields="filterFields"
      search-label="조회"
      reset-label="초기화"
    />

    <LoadingSpinner v-if="loading" text="거래처 목록을 불러오는 중입니다." />

    <ErrorMessage v-else-if="error" :message="error" @retry="fetchClients" />

    <EmptyState
      v-else-if="rows.length === 0"
      title="등록된 거래처가 없습니다."
      description="신규 거래처를 등록한 뒤 다시 확인해주세요."
    />

    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="id"
      empty-text="등록된 거래처가 없습니다."
      @row-click="openDetail"
    >
      <template #cell-monthlyAmount="{ value }">
        {{ toCurrency(value) }}
      </template>

      <template #cell-status="{ row }">
        <StatusBadge :status="row.status === 'active' ? 'success' : 'warning'" :label="row.status === 'active' ? '사용중' : '대기'" />
      </template>
    </DataTable>
  </section>
</template>
