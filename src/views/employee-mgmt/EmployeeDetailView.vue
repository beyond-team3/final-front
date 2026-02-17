<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useEmployeeStore } from '@/stores/employee'

const route = useRoute()
const router = useRouter()
const employeeStore = useEmployeeStore()
const { currentEmployee: employee, loading, error } = storeToRefs(employeeStore)

const employeeId = computed(() => route.params.id)

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
      </template>
    </PageHeader>

    <LoadingSpinner v-if="loading" text="사원 상세를 불러오는 중입니다." />

    <ErrorMessage v-else-if="error" :message="error" @retry="fetchEmployeeDetail" />

    <article v-else-if="employee" class="rounded-lg border border-slate-200 bg-white p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-800">기본 정보</h3>
        <StatusBadge
          :status="employee.status === 'ACTIVE' ? 'success' : 'danger'"
          :label="employee.status === 'ACTIVE' ? '활성' : '비활성'"
        />
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
  </section>
</template>
