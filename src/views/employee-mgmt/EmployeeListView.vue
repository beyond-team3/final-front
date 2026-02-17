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
  { key: 'keyword', label: '사원 검색', placeholder: '사원명/이메일/전화번호' },
  {
    key: 'status',
    label: '상태',
    type: 'select',
    options: [
      { label: '활성', value: 'ACTIVE' },
      { label: '비활성', value: 'INACTIVE' },
    ],
  },
]

const columns = [
  { key: 'id', label: '사원 코드' },
  { key: 'name', label: '사원명' },
  { key: 'email', label: '이메일' },
  { key: 'phone', label: '전화번호' },
  { key: 'address', label: '주소' },
  { key: 'isActive', label: '상태' },
  { key: 'createdAt', label: '등록일시' },
  { key: 'action', label: '액션' },
]

const rows = computed(() => {
  return employees.value.filter((employee) => {
    const keyword = filters.value.keyword.trim().toLowerCase()
    const matchKeyword =
      !keyword ||
      [employee.name, employee.email, employee.phone]
        .join(' ')
        .toLowerCase()
        .includes(keyword)

    const isActive = Boolean(employee.isActive)
    const matchStatus =
      !filters.value.status ||
      (filters.value.status === 'ACTIVE' ? isActive : !isActive)
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
  <section>
    <PageHeader title="사원 관리" subtitle="사원 정보를 조회하고 신규 등록합니다.">
      <template #actions>
        <button
          type="button"
          class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="router.push('/employees/register')"
        >
          + 사원 등록
        </button>
      </template>
    </PageHeader>

    <SearchFilter v-model="filters" :fields="filterFields" search-label="조회" reset-label="초기화" />

    <LoadingSpinner v-if="loading" text="사원 목록을 불러오는 중입니다." />

    <ErrorMessage v-else-if="error" :message="error" @retry="fetchEmployees" />

    <EmptyState
      v-else-if="rows.length === 0"
      title="등록된 사원이 없습니다."
      description="신규 사원을 등록한 뒤 다시 확인해주세요."
    />

    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="id"
      empty-text="등록된 사원이 없습니다."
      @row-click="openDetail"
    >
      <template #cell-isActive="{ value }">
        <StatusBadge :status="value ? 'success' : 'danger'" :label="value ? '활성' : '비활성'" />
      </template>

      <template #cell-action="{ row }">
        <button
          type="button"
          class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          @click.stop="openDetail(row)"
        >
          상세보기
        </button>
      </template>
    </DataTable>
  </section>
</template>
