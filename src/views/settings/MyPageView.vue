<script setup>
import { computed, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const authStore = useAuthStore()

const usersByRole = {
  [ROLES.ADMIN]: {
    accountType: '관리자',
    name: '박관리',
    loginId: 'admin_1001',
    email: 'admin@seedflow.com',
    phone: '02-300-4400',
    address: '서울특별시 강남구 테헤란로 128',
    department: '영업관리팀',
    updatedAt: '2026-02-16 09:40',
  },
  [ROLES.SALES_REP]: {
    accountType: '영업사원',
    name: '김영업',
    loginId: 'emp_2001',
    email: 'hong@company.com',
    phone: '010-1234-5678',
    address: '서울특별시 ○○구 ○○로 00',
    department: '수도권영업팀',
    updatedAt: '2026-02-11 10:00',
  },
}

const user = computed(() => usersByRole[authStore.currentRole] || usersByRole[ROLES.SALES_REP])

const passwordForm = ref({ current: '', next: '', nextConfirm: '' })
const passwordHint = ref('')
const isModalOpen = ref(false)

const resetForm = () => {
  passwordForm.value = { current: '', next: '', nextConfirm: '' }
  passwordHint.value = ''
}

const openModal = () => {
  resetForm()
  isModalOpen.value = true
}

const submitPassword = () => {
  const { current, next, nextConfirm } = passwordForm.value

  if (!current || !next || !nextConfirm) {
    passwordHint.value = '모든 항목을 입력해주세요.'
    return
  }

  if (next !== nextConfirm) {
    passwordHint.value = '새 비밀번호와 확인 값이 일치하지 않습니다.'
    return
  }

  if (next.length < 8) {
    passwordHint.value = '새 비밀번호는 8자 이상을 권장합니다.'
    return
  }

  // TODO: API 연결
  passwordHint.value = '비밀번호가 수정되었습니다.'
  setTimeout(() => {
    isModalOpen.value = false
  }, 700)
}
</script>

<template>
  <section class="screen-content">
    <PageHeader title="계정 상세 조회" subtitle="내 계정 정보를 조회하고 비밀번호를 변경합니다." />

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <article class="info-card">
        <p class="label">계정 유형</p>
        <p class="value">{{ user.accountType }}</p>
      </article>
      <article class="info-card">
        <p class="label">이름</p>
        <p class="value">{{ user.name }}</p>
      </article>
      <article class="info-card">
        <p class="label">로그인 ID</p>
        <p class="value">{{ user.loginId }}</p>
      </article>
      <article class="info-card">
        <p class="label">이메일</p>
        <p class="value">{{ user.email }}</p>
      </article>
      <article class="info-card">
        <p class="label">전화번호</p>
        <p class="value">{{ user.phone }}</p>
      </article>
      <article class="info-card">
        <p class="label">주소</p>
        <p class="value">{{ user.address }}</p>
      </article>
      <article class="info-card">
        <p class="label">부서</p>
        <p class="value">{{ user.department }}</p>
      </article>
      <article class="info-card sm:col-span-2 xl:col-span-3">
        <p class="label">최근 업데이트</p>
        <p class="value">{{ user.updatedAt }}</p>
      </article>
    </div>

    <div class="mt-5 flex justify-end">
      <button type="button" class="btn-primary" @click="openModal">비밀번호 변경</button>
    </div>

    <ModalBase v-model="isModalOpen" title="비밀번호 수정" width-class="max-w-xl">
      <div class="grid gap-3">
        <label class="form-field">
          기존 비밀번호
          <input v-model="passwordForm.current" type="password" class="input" autocomplete="current-password">
        </label>

        <label class="form-field">
          새 비밀번호
          <input v-model="passwordForm.next" type="password" class="input" autocomplete="new-password">
        </label>

        <label class="form-field">
          새 비밀번호 확인
          <input v-model="passwordForm.nextConfirm" type="password" class="input" autocomplete="new-password">
        </label>

        <p class="text-sm text-slate-500">{{ passwordHint }}</p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-sub" @click="isModalOpen = false">취소</button>
          <button type="button" class="btn-primary" @click="submitPassword">수정</button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
.screen-content { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, .1); min-height: 500px; }
.info-card { border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; padding: 14px; }
.label { font-size: 12px; font-weight: 700; color: #64748b; }
.value { margin-top: 6px; font-size: 15px; font-weight: 700; color: #1f2937; }
.form-field { display: grid; gap: 6px; font-size: 13px; font-weight: 700; color: #334155; }
.input { height: 40px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 14px; }
.btn-primary { border: 1px solid var(--color-primary); border-radius: 10px; background: var(--color-primary); color: #fff; padding: 10px 16px; font-size: 14px; font-weight: 700; }
.btn-primary:hover { background: var(--color-primary-dark); border-color: var(--color-primary-dark); }
.btn-sub { border: 1px solid #cbd5e1; border-radius: 10px; background: var(--color-primary-light); color: var(--color-primary); padding: 10px 16px; font-size: 14px; font-weight: 700; }
.btn-sub:hover { background: #cbd5e1; }
</style>
