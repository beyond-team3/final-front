<script setup>
import { computed, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'
import * as authApi from '@/api/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()

const user = computed(() => {
  const me = authStore.me || {}

  // 1. 주소 및 우편번호 처리 (새 규격 우선, 기존 슬래시 규격 후순위)
  let displayAddr = me.addressDetail || ''
  let zonecode = me.addressZip || ''

  if (!displayAddr && me.address && me.address.includes('/')) {
    const parts = me.address.split('/')
    displayAddr = parts[1] || parts[0]
    zonecode = parts[2] || ''
  } else if (!displayAddr) {
    displayAddr = me.address || '-'
  }

  const roleLabels = {
    [ROLES.ADMIN]: '관리자',
    [ROLES.SALES_REP]: '영업사원',
    [ROLES.CLIENT]: '거래처',
  }

  return {
    accountType: roleLabels[authStore.currentRole] || '미지정',
    name: me.employeeName || me.name || '-',
    employeeCode: me.employeeCode || me.id || '-',
    email: me.employeeEmail || me.email || '-',
    phone: me.employeePhone || me.phone || '-',
    address: displayAddr,
    zonecode: zonecode,
    createdAt: me.createdAt ? new Date(me.createdAt).toLocaleString() : '-',
    updatedAt: me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : '기록 없음',
  }
})

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

const router = useRouter()

const submitPassword = async () => {
  const { current, next, nextConfirm } = passwordForm.value

  // 1. 유효성 검사
  if (!current || !next || !nextConfirm) {
    passwordHint.value = '모든 항목을 입력해주세요.'
    return
  }

  if (next !== nextConfirm) {
    passwordHint.value = '새 비밀번호 확인이 일치하지 않습니다.'
    return
  }

  if (next.length < 8) {
    passwordHint.value = '새 비밀번호는 8자 이상으로 설정해주세요.'
    return
  }

  try {
    // 2. 실제 API 호출
    await authApi.changePassword({
      oldPassword: current,
      newPassword: next
    })

    passwordHint.value = '비밀번호가 성공적으로 변경되었습니다.'

    setTimeout(() => {
      isModalOpen.value = false
      // 비밀번호가 변경되었으므로 재로그인 유도
      authStore.logout()
      router.push('/login')
    }, 1500)

  } catch (error) {
    console.error('Password change error:', error)
    // 백엔드 ApiResult 구조(data.error.message)에 따라 메시지 추출
    passwordHint.value = error.response?.data?.error?.message || '비밀번호 수정에 실패했습니다.'
  }
}
</script>

<template>
  <section class="min-h-[calc(100vh-80px)] bg-[var(--color-bg-base)] px-4 py-6 lg:px-8 lg:py-10 text-[var(--font-body)]">
    <div class="mx-auto max-w-[1000px] space-y-6">
      <PageHeader title="계정 상세 조회" subtitle="내 계정 정보를 확인하고 보안 설정을 관리합니다.">
        <template #actions>
          <button
              type="button"
              class="h-10 rounded-lg bg-[var(--color-olive)] px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
              @click="openModal"
          >
            비밀번호 변경
          </button>
        </template>
      </PageHeader>

      <article class="grid gap-6">
        <!-- 프로필 카드 (사원 상세 스타일 적용) -->
        <section class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <div class="mb-6 flex items-center gap-3">
            <span class="h-5 w-1.5 rounded-full bg-[var(--color-olive)]"></span>
            <h3 class="text-xl font-bold text-[var(--color-text-strong)]">내 프로필</h3>
          </div>

          <dl class="grid gap-3 text-sm md:grid-cols-2">
            <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
              <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">사원 코드</dt>
              <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ user.employeeCode }}</dd>
            </div>
            <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
              <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">사원명</dt>
              <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ user.name }}</dd>
            </div>
            <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
              <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">역할</dt>
              <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ user.accountType }}</dd>
            </div>
            <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
              <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">이메일</dt>
              <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ user.email }}</dd>
            </div>
            <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
              <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">전화번호</dt>
              <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ user.phone }}</dd>
            </div>
            <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
              <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">등록일시</dt>
              <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ user.createdAt }}</dd>
            </div>
            <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)] md:col-span-2">
              <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">주소</dt>
              <dd class="flex items-center justify-between gap-2 w-full text-base font-bold text-[var(--color-text-strong)]">
                <span class="truncate">{{ user.address }}</span>
                <span v-if="user.zonecode" class="shrink-0 inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-xs font-bold text-[var(--color-olive)] border border-[var(--color-olive-light)] shadow-sm">
                  <span class="text-[10px] text-[var(--color-olive-dark)] opacity-70 font-medium">우편번호</span>
                  {{ user.zonecode }}
                </span>
              </dd>
            </div>
          </dl>
        </section>
      </article>
    </div>

    <!-- 비밀번호 수정 모달 -->
    <ModalBase v-model="isModalOpen" title="비밀번호 수정" width-class="max-w-md">
      <div class="space-y-4 pt-2">
        <label class="block">
          <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">기존 비밀번호</span>
          <input
              v-model="passwordForm.current"
              type="password"
              class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all"
              autocomplete="current-password"
              placeholder="현재 비밀번호 입력"
          >
        </label>
        <label class="block">
          <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">새 비밀번호</span>
          <input
              v-model="passwordForm.next"
              type="password"
              class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all"
              autocomplete="new-password"
              placeholder="8자 이상 입력"
          >
        </label>
        <label class="block">
          <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">새 비밀번호 확인</span>
          <input
              v-model="passwordForm.nextConfirm"
              type="password"
              class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all"
              autocomplete="new-password"
              placeholder="한 번 더 입력"
          >
        </label>
        <p v-if="passwordHint" class="text-sm font-medium text-[var(--color-orange)] animate-in fade-in duration-300">{{ passwordHint }}</p>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <button
              type="button"
              class="h-11 px-6 rounded-lg border border-[var(--color-border-card)] bg-transparent text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)] whitespace-nowrap"
              @click="isModalOpen = false"
          >
            취소
          </button>
          <button
              type="button"
              class="h-11 px-10 rounded-lg bg-[var(--color-olive)] text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95 whitespace-nowrap"
              @click="submitPassword"
          >
            변경 완료
          </button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
h1 {
  font-family: var(--font-body);
}
</style>
