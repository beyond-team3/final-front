<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModalBase from '@/components/common/ModalBase.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const route = useRoute()
const router = useRouter()

const account = ref({
  id: 'emp_2001',
  type: 'EMPLOYEE',
  name: '김영업',
  email: 'hong@company.com',
  phone: '010-1234-5678',
  address: '서울특별시 OO구 OO로 00',
  status: 'ACTIVE',
  updatedAt: '2026-02-11 10:00',
})

const isStatusModalOpen = ref(false)
const nextStatus = ref('ACTIVE')

const title = computed(() => `계정 상세 조회 (${route.params.id})`)

const openModal = () => {
  nextStatus.value = account.value.status
  isStatusModalOpen.value = true
}

const applyStatus = () => {
  account.value.status = nextStatus.value
  isStatusModalOpen.value = false
}
</script>

<template>
  <section>
    <PageHeader :title="title" subtitle="계정 정보를 확인하고 활성 상태를 변경합니다.">
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

    <article class="rounded-lg border border-slate-200 bg-white p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-800">계정 정보</h3>
        <StatusBadge :status="account.status === 'ACTIVE' ? 'success' : 'danger'" :label="account.status === 'ACTIVE' ? '활성' : '비활성'" />
      </div>

      <dl class="grid gap-3 text-sm md:grid-cols-2">
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">계정 유형</dt><dd class="mt-1 font-semibold">{{ account.type === 'EMPLOYEE' ? '영업사원' : '거래처' }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">이름</dt><dd class="mt-1 font-semibold">{{ account.name }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">로그인 ID</dt><dd class="mt-1 font-semibold">{{ account.id }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">이메일</dt><dd class="mt-1 font-semibold">{{ account.email }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">전화번호</dt><dd class="mt-1 font-semibold">{{ account.phone }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">주소</dt><dd class="mt-1 font-semibold">{{ account.address }}</dd></div>
        <div class="rounded bg-slate-50 p-3"><dt class="text-slate-500">최근 업데이트</dt><dd class="mt-1 font-semibold">{{ account.updatedAt }}</dd></div>
      </dl>

      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="rounded bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
          @click="openModal"
        >
          활성화 관리
        </button>
      </div>
    </article>

    <ModalBase v-model="isStatusModalOpen" title="활성화 상태 변경" width-class="max-w-lg">
      <div class="space-y-3">
        <p class="text-sm text-slate-600">변경할 상태를 선택하세요.</p>

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
