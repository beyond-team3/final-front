<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useEmployeeStore } from '@/stores/employee'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const { currentEmployee: employee, loading, error } = storeToRefs(employeeStore)

const userLoginId = ref('')
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)

// --- 수정 모달 및 상태 관리 변수 추가 ---
const isEditModalOpen = ref(false)
const isStatusModalOpen = ref(false)
const nextStatus = ref('ACTIVE')

// 수정 폼 데이터 (거래처 방식과 동일함돠)
const editForm = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
})

const employeeId = computed(() => route.params.id)
const isEmployeeActive = computed(() => Boolean(employee.value?.isActive))
const employeeStatusText = computed(() => (isEmployeeActive.value ? '활성' : '비활성'))

/**
 * 사원 및 계정 정보 호출
 */
const fetchEmployeeDetail = async () => {
  if (!employeeId.value) return
  try {
    await employeeStore.fetchEmployeeDetail(employeeId.value)
    try {
      const res = await axios.get(`http://localhost:3001/users`, {
        params: { refId: Number(employeeId.value) }
      })
      const matchedUser = res.data.find(u => u.role === 'SALES_REP' || u.role === 'ADMIN')
      if (matchedUser) {
        userLoginId.value = matchedUser.loginId
      } else {
        userLoginId.value = '계정 미등록'
      }
    } catch (err) {
      userLoginId.value = '정보 확인 불가'
    }
  } catch (e) {
    console.error('상세 조회 실패:', e)
  }
}

// --- 사원 정보 수정 로직 ---
const openEditModal = () => {
  if (!employee.value || !isAdmin.value) return
  // 현재 사원 데이터를 폼에 세팅함돠
  editForm.value = {
    name: employee.value.name,
    email: employee.value.email,
    phone: employee.value.phone,
    address: employee.value.address,
  }
  isEditModalOpen.value = true
}

const submitEdit = async () => {
  if (!employee.value) return
  try {
    // 스토어의 updateEmployee를 호출해 서버(db.json)를 업데이트함돠
    await employeeStore.updateEmployee(employeeId.value, { ...editForm.value })
    isEditModalOpen.value = false
    alert('사원 정보가 수정되었습니다.')
  } catch (e) {
    alert('수정 중 오류가 발생했슴돠.')
  }
}

// --- 활성화 관리 로직 ---
const openStatusModal = () => {
  if (!employee.value || !isAdmin.value) return
  nextStatus.value = isEmployeeActive.value ? 'INACTIVE' : 'ACTIVE'
  isStatusModalOpen.value = true
}

const applyStatus = async () => {
  if (!employee.value || !isAdmin.value) return
  try {
    const targetActive = nextStatus.value === 'ACTIVE'
    await employeeStore.toggleEmployeeActive(employeeId.value, targetActive)
    isStatusModalOpen.value = false
    await fetchEmployeeDetail()
  } catch (e) {
    console.error('상태 변경 실패:', e)
  }
}

onMounted(fetchEmployeeDetail)
</script>

<template>
  <section>
    <PageHeader :title="`사원 상세 (${employeeId})`" subtitle="등록된 사원 정보를 조회합니다.">
      <template #actions>
        <button
            type="button"
            class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            @click="router.push('/employees')"
        >
          목록으로
        </button>
        <button
            v-if="isAdmin"
            type="button"
            class="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            @click="openEditModal"
        >
          사원 수정
        </button>
        <button
            v-if="isAdmin"
            type="button"
            class="rounded bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            @click="openStatusModal"
        >
          활성화 관리
        </button>
      </template>
    </PageHeader>

    <LoadingSpinner v-if="loading" text="사원 상세를 불러오는 중입니다." />
    <ErrorMessage v-else-if="error" :message="error" @retry="fetchEmployeeDetail" />

    <article v-else-if="employee" class="rounded-lg border border-slate-200 bg-white p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-800">기본 정보</h3>
        <div
            class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
            :class="isEmployeeActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
        >
          <span class="h-2 w-2 rounded-full" :class="isEmployeeActive ? 'bg-emerald-500' : 'bg-rose-500'" />
          <span>{{ employeeStatusText }}</span>
        </div>
      </div>

      <dl class="grid gap-3 text-sm md:grid-cols-2">
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">사원 코드</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.id }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">사원명</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.name }}</dd></div>
        <div class="rounded bg-slate-50 p-3">
          <dt class="text-slate-500">로그인Id</dt>
          <dd class="mt-1 font-semibold text-slate-900" :class="{ 'text-slate-400 font-normal': userLoginId === '계정 미등록' }">{{ userLoginId }}</dd>
        </div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">이메일</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.email }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">전화번호</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.phone }}</dd></div>
        <div class="rounded bg-slate-50 p-3 md:col-span-2"><dt class="text-slate-500">주소</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.address }}</dd></div>
        <div class="rounded bg-slate-50 p-3 md:col-span-2"><dt class="text-slate-500">등록일시</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.createdAt }}</dd></div>
      </dl>
    </article>

    <EmptyState v-else title="해당 사원을 찾을 수 없습니다." />

    <ModalBase v-model="isEditModalOpen" title="사원 정보 수정" width-class="max-w-2xl">
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="submitEdit">
        <label class="text-sm text-slate-700">사원명<input v-model="editForm.name" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
        <label class="text-sm text-slate-700">이메일<input v-model="editForm.email" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="email" required /></label>
        <label class="text-sm text-slate-700">전화번호<input v-model="editForm.phone" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
        <label class="text-sm text-slate-700 md:col-span-2">주소<input v-model="editForm.address" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="isEditModalOpen = false">취소</button>
          <button type="button" class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="submitEdit">저장</button>
        </div>
      </template>
    </ModalBase>

    <ModalBase v-model="isStatusModalOpen" title="활성화 상태 변경" width-class="max-w-lg">
      <div class="space-y-3">
        <p class="text-sm text-slate-600">변경할 상태를 선택하세요.</p>
        <label class="flex cursor-pointer items-start gap-2 rounded border border-slate-200 p-3" :class="{ 'bg-emerald-50 border-emerald-200': nextStatus === 'ACTIVE' }">
          <input v-model="nextStatus" type="radio" value="ACTIVE" class="mt-1" />
          <span> <strong class="block text-sm text-slate-800">활성</strong> </span>
        </label>
        <label class="flex cursor-pointer items-start gap-2 rounded border border-slate-200 p-3" :class="{ 'bg-rose-50 border-rose-200': nextStatus === 'INACTIVE' }">
          <input v-model="nextStatus" type="radio" value="INACTIVE" class="mt-1" />
          <span> <strong class="block text-sm text-slate-800">비활성</strong> </span>
        </label>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="isStatusModalOpen = false">취소</button>
          <button type="button" class="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900" @click="applyStatus">적용</button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>