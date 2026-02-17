<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import { ROLES } from '@/utils/constants'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { loading, error } = storeToRefs(authStore)

const selectedRole = ref(ROLES.SALES_REP)
const loginId = ref('')
const loginPw = ref('')
const errorMessage = ref('')
const isSubmitting = computed(() => loading.value)

const roleOptions = [
  { label: '영업사원', value: ROLES.SALES_REP },
  { label: '관리자', value: ROLES.ADMIN },
  { label: '거래처', value: ROLES.CLIENT },
]

const onSubmit = async () => {
  if (!loginId.value.trim() || !loginPw.value.trim()) {
    errorMessage.value = 'ID와 PW를 확인해주세요.'
    return
  }

  errorMessage.value = ''

  try {
    const result = await authStore.login({
      loginId: loginId.value.trim(),
      password: loginPw.value.trim(),
      role: selectedRole.value,
    })

    if (!result?.role) {
      authStore.setRole(selectedRole.value)
    }

    router.push('/dashboard')
  } catch (e) {
    // error state is managed by store
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="mb-5 text-xl font-semibold text-slate-800">ID/PW 로그인</h2>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700" for="loginId">ID</label>
          <input
            id="loginId"
            v-model="loginId"
            type="text"
            class="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            placeholder="ID를 입력하세요"
            autocomplete="username"
            required
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700" for="loginPw">PW</label>
          <input
            id="loginPw"
            v-model="loginPw"
            type="password"
            class="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            placeholder="PW를 입력하세요"
            autocomplete="current-password"
            required
          />
        </div>

        <fieldset>
          <legend class="mb-2 block text-sm font-medium text-slate-700">역할 선택</legend>
          <div class="grid grid-cols-3 gap-2">
            <label
              v-for="role in roleOptions"
              :key="role.value"
              class="cursor-pointer rounded border px-2 py-2 text-center text-xs font-semibold"
              :class="selectedRole === role.value ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-600'"
            >
              <input v-model="selectedRole" type="radio" class="sr-only" :value="role.value" />
              {{ role.label }}
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="h-11 w-full rounded bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {{ isSubmitting ? '로그인 중...' : '로그인' }}
        </button>

        <p v-if="errorMessage" class="text-sm font-medium text-red-600">{{ errorMessage }}</p>
        <ErrorMessage v-else-if="error" :message="error" retry-label="다시 로그인" @retry="onSubmit" />
      </form>
    </div>
  </div>
</template>
