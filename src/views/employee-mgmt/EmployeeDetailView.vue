<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios' // 1. axios 추가
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

// 2. 로그인 정보를 담을 변수 추가
const userLoginId = ref('불러오는 중...')

const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const isStatusModalOpen = ref(false)
const nextStatus = ref('ACTIVE')

const employeeId = computed(() => route.params.id)
const isEmployeeActive = computed(() => Boolean(employee.value?.isActive))
const employeeStatusText = computed(() => (isEmployeeActive.value ? '활성' : '비활성'))

const fetchEmployeeDetail = async () => {
  if (!employeeId.value) return

  try {
    // 기존 사원 상세 정보 호출
    await employeeStore.fetchEmployeeDetail(employeeId.value)

    // 3. [핵심] users에서 ID가 같은 유저 정보를 가져와서 loginId만 쏙 빼옴
    try {
      const res = await axios.get(`http://localhost:3001/users/${employeeId.value}`)
      userLoginId.value = res.data?.loginId || '계정 정보 없음'
    } catch (err) {
      console.error('계정 조회 실패:', err)
      userLoginId.value = '미등록 계정' // 계정이 없는 경우 처리
    }
  } catch (e) {
    // error state is managed by store
  }
}

// ... (openStatusModal, applyStatus 등 기존 로직은 동일)

onMounted(fetchEmployeeDetail)
</script>

<template>
  <section>
    <PageHeader :title="`사원 상세 (${employeeId})`" subtitle="등록된 사원 정보를 조회합니다.">
      <template #actions>
        <button
            v-if="isAdmin"
            type="button"
            class="rounded bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            @click="openStatusModal"
        >
          활성화 관리
        </button>
        <button
            type="button"
            class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            @click="router.push('/employees')"
        >
          목록으로
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
          <dd class="mt-1 font-semibold text-slate-900">{{ userLoginId }}</dd>
        </div>

        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">이메일</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.email }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">전화번호</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.phone }}</dd></div>
        <div class="rounded bg-slate-50 p-3 md:col-span-2"><dt class="text-slate-500">주소</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.address }}</dd></div>
        <div class="rounded bg-slate-50 p-3 md:col-span-2"><dt class="text-slate-500">등록일시</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.createdAt }}</dd></div>
      </dl>
    </article>

    <EmptyState v-else title="해당 사원을 찾을 수 없습니다." description="목록으로 돌아가 다른 사원을 선택해 주세요." />

  </section>
</template>