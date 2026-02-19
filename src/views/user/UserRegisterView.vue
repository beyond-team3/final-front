<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()
const route = useRoute()

// 1. 초기 데이터 (미등록 리스트)
const unassignedData = ref({
  CLIENT: ['(주)가나종묘', '대한농산', '우리종자'],
  SALES: ['채치수 (신규사원)', '권준호 (신규사원)'],
  ADMIN: ['이운영 (본사관리)'],
})

// ★ 영업사원 목록을 담을 ref (초기값 빈 배열)
const salesPeople = ref([])

const form = reactive({
  accountType: '',
  targetPerson: '',
  salesPerson: '',
  loginId: '',
  loginPw: '',
})

const targetOptions = ref([])
const showTargetArea = ref(false)
const showSalesArea = ref(false)
const isLocked = ref(false)

// ★ DB의 employees에서 영업사원 성함을 가져오는 함수
const fetchSalesPeople = async () => {
  try {
    const response = await axios.get('http://localhost:3001/employees')
    // 직원 목록에서 이름(name)만 추출하여 배열로 저장
    salesPeople.value = response.data.map(emp => emp.name)
  } catch (error) {
    console.error('직원 목록 로드 실패:', error)
  }
}

const updateTargetList = (type) => {
  targetOptions.value = unassignedData.value[type] || []
  form.targetPerson = ''
}

const onTypeChange = () => {
  if (!form.accountType) {
    showTargetArea.value = false
    showSalesArea.value = false
    return
  }

  updateTargetList(form.accountType)
  showTargetArea.value = true

  if (form.accountType === 'CLIENT') {
    showSalesArea.value = true
  } else {
    showSalesArea.value = false
    form.salesPerson = ''
  }
}

onMounted(async () => {
  // 페이지 진입 시 영업사원 목록부터 가져옵니다.
  await fetchSalesPeople()

  const queryRole = route.query.role
  if (queryRole) {
    form.accountType = queryRole
    isLocked.value = true
    onTypeChange()
  }
})

const onSubmit = async () => {
  const { accountType, targetPerson, loginId, loginPw } = form
  if (!accountType || !targetPerson || !loginId || !loginPw) {
    alert('모든 필드를 입력해주세요.')
    return
  }

  try {
    const newUser = {
      ...form,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }

    await axios.post('http://localhost:3001/users', newUser)

    unassignedData.value[accountType] = (unassignedData.value[accountType] || []).filter((name) => name !== targetPerson)

    alert('계정 등록이 완료되었슴돠!')

    // ★ 계정 역할에 따른 페이지 이동 분기 처리
    if (accountType === 'CLIENT') {
      router.push('/clients') // 거래처 관리로 이동
    } else {
      router.push('/employees') // 그 외(SALES, ADMIN)는 사원 관리로 이동
    }
  } catch (error) {
    console.error('등록 실패:', error)
    alert('DB 저장에 실패했슴돠.')
  }
}
</script>

<template>
  <section>
    <PageHeader title="계정 등록" subtitle="미등록 대상자를 선택해 계정을 생성합니다." />

    <div class="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <label class="block text-sm font-medium text-slate-700">
          계정 역할
          <select
              v-model="form.accountType"
              :disabled="isLocked"
              class="mt-1 h-11 w-full rounded border border-slate-300 px-3 disabled:bg-slate-100"
              required
              @change="onTypeChange"
          >
            <option disabled value="">역할을 선택하세요</option>
            <option value="CLIENT">거래처 (Client)</option>
            <option value="SALES">영업사원 (Sales)</option>
            <option value="ADMIN">관리자 (Admin)</option>
          </select>
        </label>

        <label v-if="showTargetArea" class="block text-sm font-medium text-slate-700">
          미등록 대상자 선택
          <select v-model="form.targetPerson" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" required>
            <option disabled value="">
              {{ targetOptions.length ? '대상자를 선택하세요' : '모든 대상의 계정이 등록되었습니다.' }}
            </option>
            <option v-for="item in targetOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label v-if="showSalesArea" class="block text-sm font-medium text-slate-700">
          담당 영업사원 매칭
          <select v-model="form.salesPerson" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" :required="showSalesArea">
            <option disabled value="">영업사원 선택</option>
            <option v-for="salesName in salesPeople" :key="salesName" :value="salesName">{{ salesName }}</option>
          </select>
        </label>

        <label class="block text-sm font-medium text-slate-700">
          로그인 ID
          <input v-model="form.loginId" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="text" placeholder="아이디를 입력하세요" required />
        </label>

        <label class="block text-sm font-medium text-slate-700">
          로그인 PW
          <input v-model="form.loginPw" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="password" placeholder="비밀번호를 입력하세요" required />
        </label>

        <button type="submit" class="h-11 w-full rounded bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700">
          등록 완료
        </button>
      </form>
    </div>
  </section>
</template>