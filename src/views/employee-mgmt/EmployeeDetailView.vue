<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
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
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const isStatusModalOpen = ref(false)
const nextStatus = ref('ACTIVE')

const employeeId = computed(() => route.params.id)
const isEmployeeActive = computed(() => Boolean(employee.value?.isActive))
const employeeStatusText = computed(() => (isEmployeeActive.value ? '활성' : '비활성'))

const fetchEmployeeDetail = async () => {
  if (!employeeId.value) {
    return
  }

  try {
    await employeeStore.fetchEmployeeDetail(employeeId.value)
  } catch (e) {
    // error state is managed by store
  }
}

const openStatusModal = () => {
  if (!employee.value || !isAdmin.value) {
    return
  }

  nextStatus.value = isEmployeeActive.value ? 'ACTIVE' : 'INACTIVE'
  isStatusModalOpen.value = true
}

const applyStatus = () => {
  if (!employee.value || !isAdmin.value) {
    return
  }

  const ok = window.confirm('선택한 상태로 변경할까요?')
  if (!ok) {
    return
  }

  employeeStore.toggleEmployeeActive(employee.value.id, nextStatus.value === 'ACTIVE')
  isStatusModalOpen.value = false
}

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
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">이메일</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.email }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">전화번호</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.phone }}</dd></div>
        <div class="rounded bg-slate-50 p-3 md:col-span-2"><dt class="text-slate-500">주소</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.address }}</dd></div>
        <div class="rounded bg-slate-50 p-3 md:col-span-2"><dt class="text-slate-500">등록일시</dt><dd class="mt-1 font-semibold text-slate-900">{{ employee.createdAt }}</dd></div>
      </dl>
    </article>

    <EmptyState v-else title="해당 사원을 찾을 수 없습니다." description="목록으로 돌아가 다른 사원을 선택해 주세요." />

    <ModalBase v-model="isStatusModalOpen" title="활성화 상태 변경" width-class="max-w-lg">
      <div class="space-y-3">
        <p class="text-sm text-slate-600">변경할 상태를 선택하세요. 선택 후 적용 시 상태가 변경됩니다.</p>

        <label class="flex cursor-pointer items-start gap-2 rounded border border-slate-200 p-3">
          <input v-model="nextStatus" type="radio" value="ACTIVE" class="mt-1" />
          <span>
            <strong class="block text-sm text-slate-800">활성</strong>
            <small class="text-xs text-slate-500">로그인 및 기능 사용 가능</small>
          </span>
        </label>

        <label class="flex cursor-pointer items-start gap-2 rounded border border-slate-200 p-3">
          <input v-model="nextStatus" type="radio" value="INACTIVE" class="mt-1" />
          <span>
            <strong class="block text-sm text-slate-800">비활성</strong>
            <small class="text-xs text-slate-500">로그인 제한(관리 목적)</small>
          </span>
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            @click="isStatusModalOpen = false"
          >
            취소
          </button>
          <button
            type="button"
            class="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            @click="applyStatus"
          >
            적용
          </button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>
