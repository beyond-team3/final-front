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

const isFormVisible = ref(false)

const showForm = () => {
  isFormVisible.value = true
}

const setAccount = (id, pw) => {
  loginId.value = id
  loginPw.value = pw
  errorMessage.value = ''
}

const onSubmit = async () => {
  if (!loginId.value.trim() || !loginPw.value.trim()) {
    errorMessage.value = 'ID와 PW를 확인해주세요'
    return
  }

  errorMessage.value = ''

  try {
    const user = await authStore.login({
      loginId: loginId.value.trim(),
      password: loginPw.value.trim(),
    })

    const role = user.role

    if (role === ROLES.ADMIN) {
      router.push('/admin/dashboard')
    } else if (role === ROLES.CLIENT) {
      router.push('/client/dashboard')
    } else {
      router.push('/dashboard')
    }
  } catch (e) {
    console.error('로그인 실패:', e)
    errorMessage.value = e.message || '로그인에 실패했습니다.'
  }
}
</script>

<template>
  <div class="login-theme min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--color-bg)] font-sans">

    <transition name="fade-scale">
      <div v-if="!isFormVisible" class="absolute flex flex-col items-center justify-center cursor-pointer group z-10" @click="showForm">
        <!-- 아이콘 배경 -->
        <div class="w-[80px] h-[80px] rounded-full bg-[var(--color-olive-light)] flex items-center justify-center mb-4 shadow-sm group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
          <!-- 씨앗 이미지 -->
          <img src="@/assets/images/Seed_logo.png" alt="Seed Logo" class="h-[50px] w-[50px] object-contain group-hover:-rotate-12 transition-transform duration-300" />
        </div>
        <span class="text-sm font-bold tracking-[0.3em] text-[var(--color-text)] transition-colors opacity-80 group-hover:opacity-100 uppercase">Login</span>
      </div>
    </transition>

    <transition name="form-reveal">
      <div v-if="isFormVisible" class="relative w-full max-w-md px-6 z-20" style="margin-top: 50px;">

        <div class="absolute -top-16 left-0 right-0 flex justify-center z-30 pointer-events-none sprout-anim">
          <img src="@/assets/images/monsoon_logo-sprout.png" alt="Sprout Logo" class="h-56 w-auto object-contain drop-shadow-md" />
        </div>

        <div class="bg-[var(--color-surface)] rounded-3xl p-8 pt-10 card-shadow border border-[var(--color-border)] relative z-20 form-anim">
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-[var(--color-text)] tracking-tight">반갑습니다!</h2>
            <p class="text-sm text-[var(--color-muted)] mt-2">SeedFlow+ 시스템에 오신 것을 환영합니다.</p>
          </div>

          <form class="space-y-5" @submit.prevent="onSubmit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-[var(--color-text)]" for="loginId">아이디</label>
              <input
                  id="loginId"
                  v-model="loginId"
                  type="text"
                  autocomplete="username"
                  class="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[#FAF9F6] px-4 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-border-focus)] focus:bg-white focus:ring-2 focus:ring-[var(--color-olive-light)] transition-all placeholder-[var(--color-faint)]"
                  placeholder="아이디를 입력하세요"
                  required
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-[var(--color-text)]" for="loginPw">비밀번호</label>
              <input
                  id="loginPw"
                  v-model="loginPw"
                  type="password"
                  autocomplete="current-password"
                  class="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[#FAF9F6] px-4 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-border-focus)] focus:bg-white focus:ring-2 focus:ring-[var(--color-olive-light)] transition-all placeholder-[var(--color-faint)]"
                  placeholder="비밀번호를 입력하세요"
                  required
              />
            </div>

            <div class="pt-3">
              <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="h-12 w-full rounded-xl bg-[var(--color-accent)] text-sm font-bold text-white shadow-md hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
              >
                {{ isSubmitting ? '로그인 중...' : '로그인' }}
              </button>
            </div>

            <transition name="fade">
              <div v-if="errorMessage || error" class="mt-4 rounded-xl bg-red-50 p-3 border border-red-100 flex items-center justify-center">
                <span class="mr-2 text-red-500">
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                </span>
                <p class="text-sm font-medium text-red-600">{{ errorMessage || error }}</p>
              </div>
            </transition>

            <div class="mt-8 pt-6 border-t border-[var(--color-border)] opacity-60">
              <p class="text-[11px] font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wider">Test Accounts (Click to autofill)</p>
              <div class="space-y-2 text-[12px] text-[var(--color-muted)] font-medium">
                <div class="flex justify-between items-center cursor-pointer hover:text-[var(--color-accent)] transition-colors group/item" @click="setAccount('EMP-0001', 'qwer1234')">
                  <span>관리자</span>
                  <code class="bg-[#FAF9F6] px-1.5 py-0.5 rounded border border-[var(--color-border)] group-hover/item:border-[var(--color-accent)] group-hover/item:bg-[var(--color-olive-light)] transition-all">EMP-0001 / qwer1234</code>
                </div>
                <div class="flex justify-between items-center cursor-pointer hover:text-[var(--color-accent)] transition-colors group/item" @click="setAccount('EMP-0002', 'qwer1234')">
                  <span>영업사원</span>
                  <code class="bg-[#FAF9F6] px-1.5 py-0.5 rounded border border-[var(--color-border)] group-hover/item:border-[var(--color-accent)] group-hover/item:bg-[var(--color-olive-light)] transition-all">EMP-0002 / qwer1234</code>
                </div>
                <div class="flex justify-between items-center cursor-pointer hover:text-[var(--color-accent)] transition-colors group/item" @click="setAccount('CLNT-0001', 'qwer1234')">
                  <span>거래처</span>
                  <code class="bg-[#FAF9F6] px-1.5 py-0.5 rounded border border-[var(--color-border)] group-hover/item:border-[var(--color-accent)] group-hover/item:bg-[var(--color-olive-light)] transition-all">CLNT-0001 / qwer1234</code>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.login-theme {
  --color-bg: #FAF9F6;
  --color-surface: #FFFFFF;
  --color-sidebar: #FAF9F6;
  --color-sidebar-hover: #EDEAE5;
  --color-accent: #D97757;
  --color-accent-hover: #C4633F;
  --color-olive: #6B7C45;
  --color-olive-light: #ECF3E5;
  --color-text: #292524;
  --color-muted: #78716C;
  --color-faint: #A8A29E;
  --color-border: rgba(41, 37, 36, 0.08);
  --color-border-focus: #6B7C45;
  --color-overlay: rgba(41, 37, 36, 0.40);
}

/* 정보 입력카드 입체감  */
.card-shadow {
  box-shadow:
      0 24px 50px -12px rgba(41, 37, 36, 0.1),
      0 12px 24px -10px rgba(41, 37, 36, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.8); /* Top highlight for 3D effect */
}

/* 씨앗 페이드 아웃 */
.fade-scale-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.6) translateY(20px);
}

/* 씨앗 바운스 */
.sprout-anim {
  animation: sproutGrowBounce 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  animation-delay: 0.1s;
  opacity: 0;
  transform-origin: bottom center;
}
@keyframes sproutGrowBounce {
  0% {
    transform: scale(0) translateY(50px);
    opacity: 0;
  }
  60% {
    transform: scale(1.1) translateY(-10px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* 로그인 폼 슬라이드 */
.form-anim {
  animation: formSlideUp 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-delay: 0.3s;
  opacity: 0;
  transform: translateY(40px);
}
@keyframes formSlideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 효과 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
