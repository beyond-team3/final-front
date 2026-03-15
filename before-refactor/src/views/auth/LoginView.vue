<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ROLES } from '@/utils/constants'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { loading, error } = storeToRefs(authStore)

const loginId = ref('')
const loginPw = ref('')
const errorMessage = ref('')
const isSubmitting = computed(() => loading.value)

const onSubmit = async () => {
  if (!loginId.value.trim() || !loginPw.value.trim()) {
    errorMessage.value = 'ID와 PW를 확인해주세요'
    return
  }

  errorMessage.value = ''

  try {
    // 1. 아이디/비번만 던져서 로그인 시도.
    const user = await authStore.login({
      loginId: loginId.value.trim(),
      password: loginPw.value.trim(),
    })

    // 2. 로그인 성공 후 user.role에 따라 목적지 이동
    const role = user.role

    if (role === ROLES.ADMIN) {
      router.push('/admin/dashboard')
    } else if (role === ROLES.CLIENT) {
      router.push('/client/dashboard')
    } else {
      router.push('/dashboard')
    }
  } catch (e) {
    // 에러 발생 시 authStore.error가 업데이트.
    console.error('로그인 실패:', e)
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="mb-5 text-xl font-semibold text-slate-800">종자 ERP 로그인</h2>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700" for="loginId">아이디</label>
          <input
              id="loginId"
              v-model="loginId"
              type="text"
              class="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              placeholder="아이디를 입력하세요"
              required
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700" for="loginPw">비밀번호</label>
          <input
              id="loginPw"
              v-model="loginPw"
              type="password"
              class="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              placeholder="비밀번호를 입력하세요"
              required
          />
        </div>

        <button
            type="submit"
            :disabled="isSubmitting"
            class="h-11 w-full rounded bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {{ isSubmitting ? '로그인 중...' : '로그인' }}
        </button>

        <div v-if="errorMessage || error" class="mt-4 rounded-lg bg-red-50 p-3 border border-red-100">
          <p class="text-sm font-bold text-red-600 flex items-center justify-center">
            <span class="mr-1"></span> {{ errorMessage || error }}
          </p>
        </div>
      </form>
    </div>
  </div>
</template>