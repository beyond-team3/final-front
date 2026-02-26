<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()
const route = useRoute()

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
  <section>
    <PageHeader title="계정 등록" subtitle="계정 생성 시 관련 정보가 자동 활성화됨돠." />

    <div class="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <label class="block text-sm font-medium text-slate-700">
          계정 역할
          <select v-model="form.accountType" :disabled="isLocked" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" required @change="onTypeChange">
            <option disabled value="">역할을 선택하세요</option>
            <option value="CLIENT">거래처 (Client)</option>
            <option value="SALES">영업사원 (Sales)</option>
            <option value="ADMIN">관리자 (Admin)</option>
          </select>
        </label>

        <label v-if="showTargetArea" class="block text-sm font-medium text-slate-700">
          미등록 대상자 선택
          <select v-model="form.targetId" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" required @change="onTargetSelect">
            <option :value="null" disabled>{{ targetOptions.length ? '대상자를 선택하세요' : '미등록자가 없슴돠.' }}</option>
            <option v-for="opt in targetOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
        </label>

        <label v-if="showSalesArea" class="block text-sm font-medium text-slate-700">
          담당 영업사원 매칭
          <select v-model="form.salesPersonId" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" :required="showSalesArea">
            <option :value="null" disabled>담당 사원을 선택하세요</option>
            <option v-for="emp in allEmployees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </label>

        <label class="block text-sm font-medium text-slate-700">
          로그인 ID
          <input v-model="form.loginId" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="text" required />
        </label>

        <label class="block text-sm font-medium text-slate-700">
          로그인 PW
          <input v-model="form.loginPw" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="password" required />
        </label>

        <button type="submit" class="h-11 w-full rounded bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700">
          등록 및 활성화 완료
        </button>
      </form>
    </div>
  </section>
</template>