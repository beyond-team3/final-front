<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()

const unassignedData = ref({
  CLIENT: ['(주)가나종묘', '대한농산', '우리종자'],
  SALES: ['채치수 (신규사원)', '권준호 (신규사원)'],
  ADMIN: ['이운영 (본사관리)'],
})

const salesPeople = [
  '영업1팀 강백호',
  '영업2팀 서태웅',
  '지원팀 송태섭',
]

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

const onSubmit = () => {
  const { accountType, targetPerson } = form
  if (!accountType || !targetPerson || !form.loginId || !form.loginPw) {
    return
  }

  unassignedData.value[accountType] = (unassignedData.value[accountType] || []).filter((name) => name !== targetPerson)

  form.accountType = ''
  form.targetPerson = ''
  form.salesPerson = ''
  form.loginId = ''
  form.loginPw = ''
  showTargetArea.value = false
  showSalesArea.value = false
  targetOptions.value = []

  // TODO: API 연결
  router.push('/users')
}
</script>

<template>
  <section>
    <PageHeader title="계정 등록" subtitle="미등록 대상자를 선택해 계정을 생성합니다.">
      <template #actions>
        <button
          type="button"
          class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="router.push('/users')"
        >
          목록으로
        </button>
      </template>
    </PageHeader>

    <div class="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <label class="block text-sm font-medium text-slate-700">
          계정 역할
          <select v-model="form.accountType" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" required @change="onTypeChange">
            <option disabled value="">역할을 선택하세요</option>
            <option value="CLIENT">거래처 (Client)</option>
            <option value="SALES">영업사원 (Sales)</option>
            <option value="ADMIN">관리자 (Admin)</option>
          </select>
        </label>

        <label v-if="showTargetArea" class="block text-sm font-medium text-slate-700">
          미등록 대상자 선택
          <select v-model="form.targetPerson" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" required>
            <option disabled value="">{{ targetOptions.length ? `${form.accountType} 목록에서 선택하세요` : '모든 대상의 계정이 등록되었습니다.' }}</option>
            <option v-for="item in targetOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label v-if="showSalesArea" class="block text-sm font-medium text-slate-700">
          담당 영업사원 매칭
          <select v-model="form.salesPerson" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" :required="showSalesArea">
            <option disabled value="">영업사원 선택</option>
            <option v-for="sales in salesPeople" :key="sales" :value="sales">{{ sales }}</option>
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
