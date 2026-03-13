<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as userApi from '@/api/user'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()
const route = useRoute()

const activeDropdown = ref(null) // 'role', 'target', 'sales'
const dropdownContainer = ref(null)

const roleOptions = [
  { label: '거래처 (Client)', value: 'CLIENT' },
  { label: '영업사원 (Sales Rep)', value: 'SALES_REP' },
  { label: '관리자 (Admin)', value: 'ADMIN' },
]

const toggleDropdown = (name) => {
  if (isLocked.value && name === 'role') return
  activeDropdown.value = activeDropdown.value === name ? null : name
}

const selectRole = (value) => {
  form.accountType = value
  activeDropdown.value = null
  onTypeChange()
}

const selectTarget = (opt) => {
  form.targetId = opt.id
  form.targetPerson = opt.name
  form.loginId = opt.code || '' // 대상자의 코드를 로그인 ID로 세팅
  activeDropdown.value = null
}

const selectSales = (opt) => {
  form.salesPersonId = opt.id
  activeDropdown.value = null
}

const handleClickOutside = (event) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target)) {
    activeDropdown.value = null
  }
}

const unassignedData = ref({ CLIENT: [], SALES_REP: [], ADMIN: [] })
const allEmployees = ref([]) // { id, name } 객체 배열

const form = reactive({
  accountType: '',
  targetId: null,
  targetPerson: '',
  salesPersonId: null, // 담당 사원의 ID
  loginId: '',
  loginPw: '',
})

const targetOptions = ref([])
const showTargetArea = ref(false)
const showSalesArea = ref(false)
const isLocked = ref(false)

const fetchData = async () => {
  try {
    const [clientsRes, employeesRes, simpleEmpsRes] = await Promise.all([
      userApi.getUnregisteredClients(),
      userApi.getUnregisteredEmployees(),
      userApi.getAllEmployeesSimple()
    ])

    // 백엔드는 ApiResult 구조를 사용하므로 .data 또는 .data.data 확인 필요
    // ApiInterceptor가 이미 한 꺼풀 벗겨줬을 수도 있음
    const unregClients = clientsRes.data || clientsRes
    const unregEmps = employeesRes.data || employeesRes
    const simpleEmps = simpleEmpsRes.data || simpleEmpsRes

    unassignedData.value.CLIENT = unregClients.map(c => ({ id: c.clientId, name: c.clientName, code: c.clientCode }))
    unassignedData.value.SALES_REP = unregEmps.map(e => ({ id: e.employeeId, name: e.employeeName, code: e.employeeCode }))
    unassignedData.value.ADMIN = [...unassignedData.value.SALES_REP]

    // 담당 사원 매칭용
    allEmployees.value = simpleEmps.map(e => ({ id: e.employeeId, name: e.employeeName }))

  } catch (error) {
    console.error('Data load failed:', error)
  }
}

const onTypeChange = () => {
  if (!form.accountType) {
    showTargetArea.value = false
    showSalesArea.value = false
    return
  }
  targetOptions.value = unassignedData.value[form.accountType] || []
  form.targetId = null
  form.targetPerson = ''
  showTargetArea.value = true
  showSalesArea.value = (form.accountType === 'CLIENT')
}

onMounted(async () => {
  await fetchData()
  const queryRole = route.query.role
  if (queryRole) {
    // 쿼리 파라미터가 'CLIENT'이면 그대로 사용, 'SALES'이면 'SALES_REP'으로 보정
    form.accountType = queryRole === 'SALES' ? 'SALES_REP' : queryRole
    isLocked.value = true
    onTypeChange()
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

const onSubmit = async () => {
  if (!form.targetId || !form.loginId || !form.loginPw) {
    alert('모든 필드를 입력해 주세요.')
    return
  }

  try {
    // 백엔드 UserCreateRequest JSON 구조에 맞춤
    const payload = {
      loginId: form.loginId,
      loginPw: form.loginPw,
      role: form.accountType,
      targetId: form.targetId,
      employeeId: form.salesPersonId
    }

    await userApi.createUser(payload)

    alert('계정 등록이 완료되었습니다!')
    
    // 연동된 대상의 상세 페이지로 즉시 이동
    if (form.accountType === 'CLIENT') {
      router.push(`/clients/${form.targetId}`)
    } else {
      router.push(`/employees/${form.targetId}`)
    }

  } catch (error) {
    console.error('Registration failed:', error)
    const errorMsg = error.response?.data?.error?.message || '계정 생성 중 오류가 발생했습니다.'
    alert(errorMsg)
  }
}
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <div class="mx-auto max-w-xl space-y-6">
      <header class="text-center">
        <h1 class="text-3xl font-black text-[var(--color-text-strong)]">계정 등록</h1>
        <p class="mt-2 text-sm text-[var(--color-text-sub)]">
          새로운 서비스 사용자를 위한 계정을 생성합니다.<br/>
          계정 생성 시 관련 정보가 자동으로 활성화됩니다.
        </p>
      </header>

      <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-8 shadow-sm">
        <form class="space-y-6" @submit.prevent="onSubmit">
          <div class="space-y-4" ref="dropdownContainer">
            <!-- 계정 역할 -->
            <div class="block relative">
              <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">계정 역할</span>
              <div
                  class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between transition-all shadow-sm"
                  :class="[
                  activeDropdown === 'role' ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-card)]',
                  isLocked ? 'opacity-60 cursor-not-allowed text-[var(--color-text-placeholder)]' : 'cursor-pointer'
                ]"
                  @click="toggleDropdown('role')"
              >
                <span
                    class="font-bold"
                    :class="form.accountType ? 'text-[var(--color-text-strong)]' : 'text-[var(--color-text-placeholder)]'"
                >
                  {{ roleOptions.find(o => o.value === form.accountType)?.label || '역할을 선택하세요' }}
                </span>
                <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'role' }">▼</span>
              </div>
              <ul
                  v-if="activeDropdown === 'role'"
                  class="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0"
              >
                <li
                    v-for="opt in roleOptions"
                    :key="opt.value"
                    class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                    :class="form.accountType === opt.value ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'"
                    @click="selectRole(opt.value)"
                >
                  {{ opt.label }}
                </li>
              </ul>
            </div>

            <!-- 미등록 대상자 선택 -->
            <div v-if="showTargetArea" class="block relative animate-in fade-in slide-in-from-top-2 duration-300">
              <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">미등록 대상자 선택</span>
              <div
                  class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
                  :class="activeDropdown === 'target' ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-card)]'"
                  @click="toggleDropdown('target')"
              >
                <span
                    class="font-bold"
                    :class="form.targetId ? 'text-[var(--color-text-strong)]' : 'text-[var(--color-text-placeholder)]'"
                >
                  {{ targetOptions.find(o => o.id === form.targetId)?.name || (targetOptions.length ? '대상자를 선택하세요' : '미등록자가 없습니다.') }}
                </span>
                <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'target' }">▼</span>
              </div>
              <ul
                  v-if="activeDropdown === 'target'"
                  class="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0"
              >
                <li
                    v-for="opt in targetOptions"
                    :key="opt.id"
                    class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                    :class="form.targetId === opt.id ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'"
                    @click="selectTarget(opt)"
                >
                  {{ opt.name }}
                </li>
              </ul>
            </div>

            <!-- 담당 영업사원 매칭 -->
            <div v-if="showSalesArea" class="block relative animate-in fade-in slide-in-from-top-2 duration-300">
              <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">담당 영업사원 매칭</span>
              <div
                  class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
                  :class="activeDropdown === 'sales' ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-card)]'"
                  @click="toggleDropdown('sales')"
              >
                <span
                    class="font-bold"
                    :class="form.salesPersonId ? 'text-[var(--color-text-strong)]' : 'text-[var(--color-text-placeholder)]'"
                >
                  {{ allEmployees.find(o => o.id === form.salesPersonId)?.name || '담당 사원을 선택하세요' }}
                </span>
                <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'sales' }">▼</span>
              </div>
              <ul
                  v-if="activeDropdown === 'sales'"
                  class="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0"
              >
                <li
                    v-for="emp in allEmployees"
                    :key="emp.id"
                    class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                    :class="form.salesPersonId === emp.id ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'"
                    @click="selectSales(emp)"
                >
                  {{ emp.name }}
                </li>
              </ul>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">로그인 ID</span>
                <input
                    v-model="form.loginId"
                    class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm placeholder:[var(--color-text-placeholder)]"
                    type="text"
                    placeholder="아이디 입력"
                    required
                />
              </label>

              <label class="block">
                <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">로그인 PW</span>
                <input
                    v-model="form.loginPw"
                    class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm placeholder:[var(--color-text-placeholder)]"
                    type="password"
                    placeholder="비밀번호 입력"
                    required
                />
              </label>
            </div>
          </div>

          <div class="pt-4">
            <button
                type="submit"
                class="h-12 w-full rounded-lg bg-[var(--color-olive)] text-base font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-[0.98]"
            >
              계정 생성
            </button>
            <button
                type="button"
                class="mt-3 h-12 w-full rounded-lg border border-[var(--color-border-card)] bg-transparent text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
                @click="router.back()"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-family: var(--font-body);
}
</style>
