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
  { key: 'keyword', label: '거래처 검색', placeholder: '거래처명, 담당자 이름 등으로 검색' },
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
  { key: 'code', label: '거래처 코드' },
  { key: 'name', label: '거래처명' },
  { key: 'typeLabel', label: '거래처 타입' },
  { key: 'managerName', label: '담당자' },
  { key: 'region', label: '지역' },
  { key: 'status', label: '상태' },
  { key: 'actions', label: '액션' },
]

const getRegion = (address) => {
  const text = String(address || '')
  if (text.includes('서울')) return '서울'
  if (text.includes('경기')) return '경기'
  if (text.includes('충청') || text.includes('충북') || text.includes('충남')) return '충청'
  return '기타'
}

const rows = computed(() => {
  return clients.value.map(client => ({
    ...client,
    region: getRegion(client.address || client.region)
  })).filter((client) => {
    const keyword = filters.value.keyword.trim().toLowerCase()
    const matchKeyword =
        !keyword ||
        [client.name, client.managerName]
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
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <PageHeader title="거래처 관리" subtitle="전체 거래처를 효율적으로 관리하고 정책을 설정합니다." class="!bg-transparent !p-0">
        <template #actions>
          <button
              type="button"
              class="rounded-lg bg-[var(--color-olive)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
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
          title="조회 가능한 거래처가 없습니다."
          description="검색 조건에 맞는 거래처가 없거나 데이터가 비어있습니다."
      />

      <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          row-key="id"
          empty-text="등록된 거래처가 없습니다."
          class="shadow-sm"
          @row-click="openDetail"
      >
        <template #cell-id="{ value }">
          <span class="font-mono text-xs font-bold text-[var(--color-olive)]">{{ value }}</span>
        </template>

        <template #cell-name="{ value }">
          <span class="font-bold text-[var(--color-text-strong)]">{{ value }}</span>
        </template>

        <template #cell-monthlyAmount="{ value }">
          <span class="font-semibold text-[var(--color-text-body)]">{{ toCurrency(value) }}</span>
        </template>

        <template #cell-status="{ row }">
          <StatusBadge
              :status="row.status === 'active' ? 'APPROVED' : 'REJECTED'"
              :label="row.status === 'active' ? '사용중' : '비활성'"
          />
        </template>

        <template #cell-actions>
          <div class="flex justify-center">
            <button
                type="button"
                class="rounded-full bg-[var(--color-bg-base)] px-4 py-1.5 text-xs font-bold text-[var(--color-text-body)] transition-all hover:bg-[var(--color-olive)] hover:text-white"
            >
              조회
            </button>
          </div>
        </template>
      </DataTable>
    </div>
  </section>
</template>
