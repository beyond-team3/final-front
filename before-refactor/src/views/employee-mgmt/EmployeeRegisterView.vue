<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useEmployeeStore } from '@/stores/employee'

const router = useRouter()
const employeeStore = useEmployeeStore()

const form = reactive({
  empName: '',
  empEmail: '',
  empPhone: '',
  empAddress: '',
})

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
  if (showMessage) {
    showToast('입력값을 초기화했습니다.', 'success')
  }
}

const onSubmit = async () => {
  console.log('현재 스토어 객체:', employeeStore);

  if (!form.empName || !form.empEmail) {
    showToast('사원명/이메일은 필수입니다.', 'error')
    return
  }

  try {
    const newEmployeeId = await employeeStore.addEmployee(form)

    showToast('등록이 완료되었습니다.', 'success')
    resetForm(false)

    window.setTimeout(() => {
      router.push(`/employees/${newEmployeeId}`)
    }, 300)
  } catch (error) {
    showToast('등록 중 오류가 발생했습니다.', 'error')
    console.error('등록 에러 상세:', error)
  }
}
</script>

<template>
  <section>
    <PageHeader title="새 사원 등록" subtitle="사원 정보를 입력한 뒤 등록합니다.">
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

    <div class="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-5">
      <p class="mb-4 text-xs text-slate-500">사원 정보를 입력한 뒤 등록 버튼을 누르면 저장됩니다.</p>
      <form class="grid gap-4 md:grid-cols-2" autocomplete="off" @submit.prevent="onSubmit">
        <label class="text-sm text-slate-700">
          사원명
          <input v-model="form.empName" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="text" required />
        </label>
        <label class="text-sm text-slate-700">
          이메일
          <input v-model="form.empEmail" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="email" required />
        </label>
        <label class="text-sm text-slate-700">
          전화번호
          <input v-model="form.empPhone" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="tel" placeholder="010-1234-5678" />
        </label>
        <label class="text-sm text-slate-700">
          주소
          <input v-model="form.empAddress" class="mt-1 h-11 w-full rounded border border-slate-300 px-3" type="text" placeholder="서울특별시 ..." />
        </label>

        <div class="md:col-span-2 flex justify-end gap-2">
          <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="resetForm">
            초기화
          </button>
          <button type="submit" class="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            등록
          </button>
        </div>
      </form>

      <p
          v-if="toast.show"
          class="mt-4 rounded border px-3 py-2 text-sm"
          :class="toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'"
      >
        {{ toast.message }}
      </p>
    </div>
  </section>
</template>