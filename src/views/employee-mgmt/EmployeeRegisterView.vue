<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useEmployeeStore } from '@/stores/employee'

const router = useRouter()
const employeeStore = useEmployeeStore()
const displayAddress = ref('')

const form = reactive({
  empName: '',
  empEmail: '',
  empPhone: '',
  empAddress: '',
})

const execDaumPostcode = () => {
  new window.daum.Postcode({
    oncomplete: (data) => {
      const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress

      // [디자인 동기화] sido/address/zonecode 형식으로 저장 (거래처와 통일)
      form.empAddress = `${data.sido}/${addr}/${data.zonecode}`

      // UI 표시용 (가독성 위해 주소만 표시)
      displayAddress.value = addr
    },
  }).open()
}

const toast = ref({
  show: false,
  type: 'success',
  message: '',
})

const showToast = (message, type = 'success') => {
  toast.value = {
    show: true,
    message,
    type,
  }

  window.setTimeout(() => {
    toast.value.show = false
  }, 2500)
}

const resetForm = (showMessage = true) => {
  form.empName = ''
  form.empEmail = ''
  form.empPhone = ''
  form.empAddress = ''
  displayAddress.value = ''
  if (showMessage) {
    showToast('입력값을 초기화했습니다.', 'success')
  }
}

const onSubmit = async () => {
  if (!form.empName || !form.empEmail) {
    showToast('사원명/이메일은 필수입니다.', 'error')
    return
  }

  try {
    const newEmployeeId = await employeeStore.addEmployee(form)

    alert('새 사원이 등록되었습니다.')
    resetForm(false)

    if (newEmployeeId) {
      router.push({ name: 'employee-detail', params: { id: newEmployeeId } })
    } else {
      router.push('/employees')
    }
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message || '등록 중 오류가 발생했습니다.'
    showToast(errorMsg, 'error')
    console.error('Registration failed:', err)
  }
}
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <div class="mx-auto max-w-[800px] space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-[var(--color-text-strong)]">새 사원 등록</h1>
          <p class="mt-1 text-sm text-[var(--color-text-sub)]">새로운 사원의 정보를 입력하고 등록합니다. 등록 후 사원 상세 페이지로 이동합니다.</p>
        </div>
        <button
            type="button"
            class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
            @click="router.push('/employees')"
        >
          목록으로 돌아가기
        </button>
      </header>

      <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-8 shadow-sm">
        <form class="space-y-6" autocomplete="off" @submit.prevent="onSubmit">
          <!-- 기본 정보 섹션 -->
          <div class="flex items-center gap-2 mb-2">
            <span class="h-4 w-1 rounded-full bg-[var(--color-olive)]"></span>
            <h3 class="text-lg font-bold text-[var(--color-text-strong)]">사원 기본 정보</h3>
          </div>

          <div class="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <label class="block">
              <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">사원명</span>
              <input
                  v-model="form.empName"
                  class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm"
                  type="text"
                  placeholder="이름 입력"
                  required
              />
            </label>
            <label class="block">
              <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">이메일</span>
              <input
                  v-model="form.empEmail"
                  class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm"
                  type="email"
                  placeholder="example@seed.co.kr"
                  required
              />
            </label>
            <label class="block sm:col-span-2">
              <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">전화번호</span>
              <input
                  v-model="form.empPhone"
                  class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm"
                  type="tel"
                  placeholder="010-1234-5678"
              />
            </label>
            <div class="sm:col-span-2">
              <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">주소</span>
              <div class="flex gap-2">
                <input
                    v-model="displayAddress"
                    class="h-11 flex-1 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-base)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm cursor-not-allowed"
                    type="text"
                    placeholder="검색 버튼을 눌러 주소를 입력하세요"
                    readonly
                    required
                />
                <button
                    type="button"
                    class="rounded-lg bg-[var(--color-text-strong)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                    @click="execDaumPostcode"
                >
                  주소 검색
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-6 border-t border-[var(--color-border-divider)] mt-4">
            <button
                type="button"
                class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-6 py-2.5 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
                @click="resetForm"
            >
              초기화
            </button>
            <button
                type="submit"
                class="rounded-lg bg-[var(--color-olive)] px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
            >
              사원 등록 완료
            </button>
          </div>
        </form>

        <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform translate-y-4 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
          <div
              v-if="toast.show"
              class="mt-6 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm sticky bottom-4"
              :class="toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[var(--color-olive)] bg-[var(--color-bg-base)] text-[var(--color-olive)]'"
          >
            {{ toast.message }}
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-family: var(--font-body);
}
</style>
