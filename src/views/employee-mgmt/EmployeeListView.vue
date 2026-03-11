<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchFilter from '@/components/common/SearchFilter.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { useEmployeeStore } from '@/stores/employee'

const router = useRouter()
const employeeStore = useEmployeeStore()
const { employees, loading, error } = storeToRefs(employeeStore)

const filters = ref({
  keyword: '',
  status: '',
})

const currentPage = ref(1)
const itemsPerPage = 10

const filterFields = [
  { key: 'keyword', label: '', placeholder: '사원 코드, 이름, 이메일로 검색', colSpan: 9 },
  {
    key: 'status',
    label: '',
    type: 'select',
    placeholder: '계정 상태',
    colSpan: 3,
    options: [
      { label: '활성', value: 'ACTIVE' },
      { label: '비활성', value: 'INACTIVE' },
    ],
  },
]

const columns = [
  { key: 'employeeCode', label: '영업사원 코드' },
  { key: 'name', label: '영업사원 이름' },
  { key: 'email', label: '영업사원 이메일' },
  { key: 'isActive', label: '계정 상태' },
  { key: 'actions', label: '액션' },
]

const filteredRows = computed(() => {
  const keyword = filters.value.keyword.trim().toLowerCase()
  const statusFilter = filters.value.status

  return (employees?.value || []).filter((employee) => {
    const matchKeyword =
        !keyword ||
        [employee.employeeCode, employee.name, employee.email]
            .join(' ')
            .toLowerCase()
            .includes(keyword)

    const isActive = Boolean(employee.isActive)
    const matchStatus =
        !statusFilter ||
        (statusFilter === 'ACTIVE' ? isActive : !isActive)
    return matchKeyword && matchStatus
  })
})

const totalPages = computed(() => Math.ceil(filteredRows.value.length / itemsPerPage))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredRows.value.slice(start, end)
})

watch(filters, () => {
  currentPage.value = 1
}, { deep: true })

const openDetail = (employee) => {
  router.push(`/employees/${employee.id}`)
}

const fetchEmployees = async () => {
  try {
    await employeeStore.fetchEmployees()
  } catch (e) {
    // error state is managed by store
  }
}

onMounted(fetchEmployees)
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <PageHeader title="사원 관리" subtitle="사원 정보를 효율적으로 관리하고 정책을 설정합니다." class="!bg-transparent !p-0">
        <template #actions>
          <div class="flex gap-3">
            <button
                type="button"
                class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
                @click="router.push({ path: '/users/register', query: { role: 'SALES' } })"
            >
              + 계정 등록
            </button>
            <button
                type="button"
                class="rounded-lg bg-[var(--color-olive)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
                @click="router.push('/employees/register')"
            >
              + 사원 등록
            </button>
          </div>
        </template>
      </PageHeader>

      <SearchFilter
          v-model="filters"
          :fields="filterFields"
          :show-search="false"
          :show-reset="false"
      />

      <LoadingSpinner v-if="loading" text="사원 목록을 불러오는 중입니다." />
      <ErrorMessage v-else-if="error" :message="error" @retry="fetchEmployees" />

      <EmptyState
          v-else-if="filteredRows.length === 0"
          title="조회 가능한 사원이 없습니다."
          description="검색 조건에 맞는 사원이 없거나 데이터가 비어있습니다."
      />

      <div v-else class="space-y-4">
        <DataTable
            :columns="columns"
            :rows="paginatedRows"
            row-key="id"
            empty-text="등록된 사원이 없습니다."
            class="shadow-sm"
            @row-click="openDetail"
        >
          <template #cell-employeeCode="{ value }">
            <span class="font-mono text-xs font-bold text-[var(--color-olive)]">{{ value }}</span>
          </template>

          <template #cell-name="{ value }">
            <span class="font-bold text-[var(--color-text-strong)]">{{ value }}</span>
          </template>

          <template #cell-isActive="{ value }">
            <StatusBadge
                :status="value ? 'APPROVED' : 'REJECTED'"
                :label="value ? '활성' : '비활성'"
            />
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center">
              <button
                  type="button"
                  class="rounded-full bg-[var(--color-bg-base)] px-4 py-1.5 text-xs font-bold text-[var(--color-text-body)] transition-all hover:bg-[var(--color-olive)] hover:text-white"
                  @click.stop="openDetail(row)"
              >
                조회
              </button>
            </div>
          </template>
        </DataTable>

        <div class="flex justify-center py-4">
          <PaginationControls
              v-model="currentPage"
              :total-pages="totalPages"
          />
        </div>
      </div>
    </div>
  </section>
</template>
