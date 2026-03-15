<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchFilter from '@/components/common/SearchFilter.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const router = useRouter()

const accounts = ref([
  { type: 'EMPLOYEE', id: 'emp-2001', name: '오재이', email: 'ojaei02@naver.com', status: 'ACTIVE', lastLogin: '2026-02-11 10:12' },
  { type: 'EMPLOYEE', id: 'emp-2002', name: '김영업', email: 'sales01@seed.co.kr', status: 'ACTIVE', lastLogin: '2026-02-10 18:05' },
  { type: 'EMPLOYEE', id: 'emp-2003', name: '박관리', email: 'admin@seed.co.kr', status: 'INACTIVE', lastLogin: '2026-02-02 09:40' },
  { type: 'CLIENT', id: 'cli-5001', name: '대동농장', email: 'contact@daedongfarm.com', status: 'ACTIVE', lastLogin: '2026-02-09 14:22' },
  { type: 'CLIENT', id: 'cli-5003', name: '푸른들영농조합', email: 'hello@greenfield.kr', status: 'INACTIVE', lastLogin: '-' },
])

const filters = ref({
  accountType: '',
  accountStatus: '',
  keyword: '',
})

const filterFields = [
  {
    key: 'accountType',
    label: '계정 유형',
    type: 'select',
    options: [
      { label: '사원', value: 'EMPLOYEE' },
      { label: '거래처', value: 'CLIENT' },
    ],
  },
  {
    key: 'accountStatus',
    label: '활성 상태',
    type: 'select',
    options: [
      { label: '활성화', value: 'ACTIVE' },
      { label: '비활성화', value: 'INACTIVE' },
    ],
  },
  {
    key: 'keyword',
    label: '이름',
    placeholder: '이름 검색',
  },
]

const columns = [
  { key: 'type', label: '유형' },
  { key: 'id', label: '계정 ID' },
  { key: 'name', label: '이름' },
  { key: 'email', label: '이메일' },
  { key: 'status', label: '상태' },
  { key: 'lastLogin', label: '최근 로그인' },
  { key: 'actions', label: '상세' },
]

const rows = computed(() => {
  return accounts.value.filter((row) => {
    const matchType = !filters.value.accountType || row.type === filters.value.accountType
    const matchStatus = !filters.value.accountStatus || row.status === filters.value.accountStatus
    const keyword = filters.value.keyword.trim().toLowerCase()
    const matchKeyword = !keyword || row.name.toLowerCase().includes(keyword)

    return matchType && matchStatus && matchKeyword
  })
})

const typeLabel = (type) => (type === 'EMPLOYEE' ? '사원' : '거래처')
const statusLabel = (status) => (status === 'ACTIVE' ? '활성화' : '비활성화')

const openDetail = (row) => {
  router.push(`/users/${row.id}`)
}
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8 text-[var(--font-body)]">
    <div class="mx-auto max-w-[1200px] space-y-6">
      <PageHeader title="계정 목록" subtitle="서비스에 등록된 사원 및 거래처 계정을 관리합니다.">
        <template #actions>
          <button
              type="button"
              class="rounded-lg bg-[var(--color-olive)] px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
              @click="router.push('/users/register')"
          >
            + 신규 계정 등록
          </button>
        </template>
      </PageHeader>

      <SearchFilter
          v-model="filters"
          :fields="filterFields"
          search-label="계정 조회"
          :show-search="false"
          :show-reset="false"
          @search="() => {}"
          @reset="() => {}"
      />

      <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-sm overflow-hidden">
        <DataTable
            :columns="columns"
            :rows="rows"
            row-key="id"
            empty-text="조회된 계정이 없습니다."
            @row-click="openDetail"
        >
          <template #cell-type="{ value }">
            <StatusBadge :status="value === 'EMPLOYEE' ? 'info' : 'success'" :label="typeLabel(value)" />
          </template>

          <template #cell-status="{ value }">
            <StatusBadge :status="value === 'ACTIVE' ? 'success' : 'danger'" :label="statusLabel(value)" />
          </template>

          <template #cell-actions="{ row }">
            <button
                type="button"
                class="rounded-full bg-[var(--color-bg-base)] px-4 py-1.5 text-xs font-bold text-[var(--color-text-body)] transition-all hover:bg-[var(--color-olive)] hover:text-white"
                @click.stop="openDetail(row)"
            >
              조회
            </button>
          </template>
        </DataTable>
      </div>
    </div>
  </section>
</template>
