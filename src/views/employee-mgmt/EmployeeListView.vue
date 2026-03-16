<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { useEmployeeStore } from '@/stores/employee'

const router = useRouter()
const employeeStore = useEmployeeStore()
const { employees, loading, error } = storeToRefs(employeeStore)

const keyword = ref('')
const statusFilter = ref('')

const currentPage = ref(1)
const itemsPerPage = 10

const filteredRows = computed(() => {
  const lowerKeyword = keyword.value.trim().toLowerCase()

  return (employees?.value || []).filter((employee) => {
    const matchKeyword =
        !lowerKeyword ||
        [employee.employeeCode, employee.name, employee.email]
            .join(' ')
            .toLowerCase()
            .includes(lowerKeyword)

    const isActive = Boolean(employee.isActive)
    const matchStatus =
        !statusFilter.value ||
        (statusFilter.value === 'ACTIVE' ? isActive : !isActive)
    return matchKeyword && matchStatus
  })
})

const totalPages = computed(() => Math.ceil(filteredRows.value.length / itemsPerPage))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredRows.value.slice(start, end)
})

watch([keyword, statusFilter], () => {
  currentPage.value = 1
})

const openDetail = (employee) => {
  if (!employee?.id) return
  router.push(`/employees/${employee.id}`)
}

const fetchEmployees = async () => {
  try {
    await employeeStore.fetchEmployees()
  } catch (e) {
    // error state is managed by store
  }
}

// 커스텀 드롭다운 상태 관리
const activeDropdown = ref(null)
const dropdownContainer = ref(null)

const toggleDropdown = (key) => {
  activeDropdown.value = activeDropdown.value === key ? null : key
}

const selectStatus = (val) => {
  statusFilter.value = val
  activeDropdown.value = null
}

const handleClickOutside = (event) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target)) {
    activeDropdown.value = null
  }
}

onMounted(() => {
  fetchEmployees()
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <div class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-[var(--color-text-strong)]">사원 관리</h1>
          <p class="mt-1 text-sm text-[var(--color-text-sub)]">
            사원 정보를 효율적으로 관리하고 정책을 설정합니다.
          </p>
        </div>
        <div class="flex gap-2">
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
      </header>

      <section class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 sm:p-6 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center gap-4" ref="dropdownContainer">
          <div class="flex-1">
            <div class="relative">
              <input
                  v-model="keyword"
                  type="text"
                  class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] placeholder:[var(--color-text-placeholder)] shadow-sm transition-all"
                  placeholder="사원 코드, 사원명, 이메일로 검색"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- 상태 필터 커스텀 드롭다운 -->
            <div class="relative min-w-[140px] flex-1 sm:flex-none">
              <div
                  class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
                  :class="activeDropdown === 'status' ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-divider)]'"
                  @click="toggleDropdown('status')"
              >
                <div class="flex flex-col">
                  <span class="text-[10px] text-[var(--color-text-sub)] font-bold leading-tight">계정 상태</span>
                  <span class="font-bold text-sm text-[var(--color-text-strong)]">{{ statusFilter === 'ACTIVE' ? '활성' : statusFilter === 'INACTIVE' ? '비활성' : '전체 상태' }}</span>
                </div>
                <span class="text-[var(--color-text-sub)] text-[10px] transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'status' }">▼</span>
              </div>
              <ul v-if="activeDropdown === 'status'" class="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0 overflow-hidden">
                <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="!statusFilter ? 'bg-[var(--color-olive-light)] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]'" @click="selectStatus('')">전체 상태</li>
                <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="statusFilter === 'ACTIVE' ? 'bg-[var(--color-olive-light)] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]'" @click="selectStatus('ACTIVE')">활성</li>
                <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="statusFilter === 'INACTIVE' ? 'bg-[var(--color-olive-light)] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]'" @click="selectStatus('INACTIVE')">비활성</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <LoadingSpinner v-if="loading" text="사원 목록을 불러오는 중입니다." />
      <ErrorMessage v-else-if="error" :message="error" @retry="fetchEmployees" />

      <EmptyState
          v-else-if="filteredRows.length === 0"
          title="조회 가능한 사원이 없습니다."
          description="검색 조건에 맞는 사원이 없거나 데이터가 비어있습니다."
      />

      <section v-else class="space-y-4">
        <div class="overflow-hidden rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-[var(--color-bg-section)] text-[var(--color-text-sub)]">
              <tr>
                <th class="w-[150px] px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">영업사원 코드</th>
                <th class="px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">영업사원 이름</th>
                <th class="px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">이메일</th>
                <th class="w-[110px] px-6 py-4 text-center font-bold uppercase tracking-wider whitespace-nowrap">계정 상태</th>
                <th class="w-[100px] px-6 py-4 text-center font-bold uppercase tracking-wider whitespace-nowrap">상세</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border-divider)]">
              <tr
                  v-for="employee in paginatedRows"
                  :key="employee.id"
                  class="transition-colors hover:bg-[var(--color-bg-section)]/50 cursor-pointer"
                  @click="openDetail(employee)"
              >
                <td class="px-6 py-4 font-mono text-xs font-bold text-[var(--color-olive)] whitespace-nowrap">{{ employee.employeeCode }}</td>
                <td class="px-6 py-4 font-bold text-[var(--color-text-strong)] whitespace-nowrap">{{ employee.name }}</td>
                <td class="px-6 py-4 font-medium text-[var(--color-text-body)] whitespace-nowrap">
                  {{ employee.email }}
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                  <StatusBadge
                      :status="employee.isActive ? 'APPROVED' : 'REJECTED'"
                      :label="employee.isActive ? '활성' : '비활성'"
                  />
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                  <button
                      type="button"
                      class="rounded-full bg-[var(--color-bg-base)] px-4 py-1.5 text-xs font-bold text-[var(--color-text-body)] transition-all hover:bg-[var(--color-olive)] hover:text-white"
                  >
                    상세
                  </button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-center py-4">
          <PaginationControls
              v-model="currentPage"
              :total-pages="totalPages"
          />
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-family: var(--font-body);
}
</style>
