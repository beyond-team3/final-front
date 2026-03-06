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
import { useEmployeeStore } from '@/stores/employee'

const router = useRouter()
const employeeStore = useEmployeeStore()
const { employees, loading, error } = storeToRefs(employeeStore)

const filters = ref({
  keyword: '',
  status: '',
})

const filterFields = [
  { key: 'keyword', label: '사원 검색', placeholder: '사원 코드, 이름, 이메일로 검색', colSpan: 9 },
  {
    key: 'status',
    label: '상태',
    type: 'select',
    colSpan: 3,
    options: [
      { label: '활성', value: 'ACTIVE' },
      { label: '비활성', value: 'INACTIVE' },
    ],
  },
]

const columns = [
  { key: 'employeeCode', label: '영업사원 코드', width: '120px' },
  { key: 'name', label: '영업사원 이름' },
  { key: 'email', label: '영업사원 이메일' },
  { key: 'isActive', label: '계정 상태', width: '110px' },
  { key: 'actions', label: '조회', width: '100px' },
]

const rows = computed(() => {
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
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8 text-[var(--font-body)]">
    <div class="mx-auto max-w-[1200px] space-y-6">
      <PageHeader title="사원 관리" subtitle="사원 정보를 조회하고 신규 계정을 활성화하거나 관리합니다.">
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
                class="rounded-lg bg-[var(--color-olive)] px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
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
          search-label="사원 조회"
          :show-search="false"
          :show-reset="false"
          @search="fetchEmployees"
      />

      <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-sm overflow-hidden">
        <LoadingSpinner v-if="loading" text="사원 목록을 불러오는 중입니다." />

        <ErrorMessage v-else-if="error" :message="error" @retry="fetchEmployees" />

        <EmptyState
            v-else-if="rows.length === 0"
            title="검색 결과가 없습니다."
            description="검색 조건을 확인하거나 새로운 사원을 등록해 주세요."
        />

        <DataTable
            v-else
            :columns="columns"
            :rows="rows"
            row-key="id"
            empty-text="대상 사원이 없습니다."
            @row-click="openDetail"
        >
          <template #cell-isActive="{ value }">
            <div class="flex justify-center whitespace-nowrap">
              <StatusBadge :status="value ? 'success' : 'danger'" :label="value ? '활성' : '비활성'" />
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center whitespace-nowrap">
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
      </div>
    </div>
  </section>
</template>
