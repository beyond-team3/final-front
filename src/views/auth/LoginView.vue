<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROLES } from '@/utils/constants'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const selectedRole = ref(ROLES.SALES_REP)
const loginId = ref('')
const loginPw = ref('')
const errorMessage = ref('')

const roleOptions = [
  { label: '영업사원', value: ROLES.SALES_REP },
  { label: '관리자', value: ROLES.ADMIN },
  { label: '거래처', value: ROLES.CLIENT },
]

const onSubmit = () => {
  if (!loginId.value.trim() || !loginPw.value.trim()) {
    errorMessage.value = 'ID와 PW를 확인해주세요.'
    return
  }

  errorMessage.value = ''
  authStore.setRole(selectedRole.value)
  router.push('/dashboard')
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
          class="h-11 w-full rounded bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700"
        >
          로그인
        </button>

        <p v-if="errorMessage" class="text-sm font-medium text-red-600">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>
