<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()
const route = useRoute()

const activeDropdown = ref(null) // 'role', 'target', 'sales'
const dropdownContainer = ref(null)

const roleOptions = [
  { label: '거래처 (Client)', value: 'CLIENT' },
  { label: '영업사원 (Sales)', value: 'SALES' },
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

const unassignedData = ref({ CLIENT: [], SALES: [], ADMIN: [] })
const allEmployees = ref([]) // { id, name } 객체 배열로 변경

const form = reactive({
  accountType: '',
  targetId: null,
  targetPerson: '',
  salesPersonId: null, // 담당 사원의 ID를 저장
  loginId: '',
  loginPw: '',
})

const targetOptions = ref([])
const showTargetArea = ref(false)
const showSalesArea = ref(false)
const isLocked = ref(false)

const fetchData = async () => {
  try {
    const [usersRes, clientsRes, employeesRes] = await Promise.all([
      axios.get('http://localhost:3001/users'),
      axios.get('http://localhost:3001/clients'),
      axios.get('http://localhost:3001/employees')
    ])

    const users = usersRes.data
    const clients = clientsRes.data
    const employees = employeesRes.data

    const registeredClientRefIds = new Set(users.filter(u => u.role === 'CLIENT').map(u => u.refId))
    const registeredEmployeeRefIds = new Set(users.filter(u => u.role === 'SALES_REP' || u.role === 'ADMIN').map(u => u.refId))

    unassignedData.value.CLIENT = clients
        .filter(c => !registeredClientRefIds.has(c.id))
        .map(c => ({ id: c.id, name: c.name }))

    const unassignedEmps = employees
        .filter(e => !registeredEmployeeRefIds.has(e.id))
        .map(e => ({ id: e.id, name: e.name }))

    unassignedData.value.SALES = [...unassignedEmps]
    unassignedData.value.ADMIN = [...unassignedEmps]

    // 담당 사원 매칭용: 모든 직원 데이터 (ID 포함)
    allEmployees.value = employees.map(e => ({ id: e.id, name: e.name }))

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

const onTargetSelect = () => {
  const selected = targetOptions.value.find(opt => opt.id === form.targetId)
  if (selected) form.targetPerson = selected.name
}

onMounted(async () => {
  await fetchData()
  const queryRole = route.query.role
  if (queryRole) {
    form.accountType = queryRole
    isLocked.value = true
    onTypeChange()
  }
})

const onSubmit = async () => {
  if (!form.targetId || !form.loginId || !form.loginPw) {
    alert('모든 필드를 입력해 주십쇼!')
    return
  }

  try {
    // 1. users 테이블에 등록할 계정 정보 생성
    const newUser = {
      id: String(Date.now()),
      loginId: form.loginId,
      password: form.loginPw,
      role: form.accountType === 'SALES' ? 'SALES_REP' : form.accountType,
      lastLoginAt: null,
      refId: form.targetId,
      targetPerson: form.targetPerson
    }

    // 2. 만약 거래처(CLIENT)라면 clients 테이블 정보 업데이트 (PATCH)
    if (form.accountType === 'CLIENT') {
      await axios.patch(`http://localhost:3001/clients/${form.targetId}`, {
        isActive: true,
        managerId: form.salesPersonId // 담당 사원의 ID 저장
      })
    }

    // 3. 계정 생성 전송
    await axios.post('http://localhost:3001/users', newUser)

    alert('계정 등록 및 정보 업데이트가 완료되었슴돠!')
    await fetchData()
    router.push(form.accountType === 'CLIENT' ? '/clients' : '/employees')

  } catch (error) {
    console.error('Registration failed:', error)
    alert('DB 저장 중 오류가 발생했슴돠.')
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
              계정 생성 및 활성화
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
