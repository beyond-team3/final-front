<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useClientStore } from '@/stores/client'

const router = useRouter()
const clientStore = useClientStore()

const form = reactive({
  name: '',
  bizNo: '',
  ceoName: '',
  companyPhone: '',
  address: '',
  type: '',
  managerName: '',
  managerEmail: '',
  managerPhone: '',
  creditLimit: 0,
})

const onSubmit = async () => {
  // [핵심] type에 따라 typeLabel을 자동으로 생성
  const typeLabelMap = {
    DISTRIBUTOR: '대리점',
    NURSERY: '육묘장'
  }

  // 최종 전송할 데이터 포맷팅
  const payload = {
    ...form,
    typeLabel: typeLabelMap[form.type] || '기타', // 타입에 맞는 라벨 매칭
    creditLimit: Number(form.creditLimit),       // 숫자로 변환
    isActive: false,                              // 기본 활성 상태로 등록
    createdAt: new Date().toISOString()
  }

  try {
    // 스토어의 addClient 호출
    await clientStore.addClient(payload)
    alert('새 거래처가 등록되었습니다.')
    router.push('/clients')
  } catch (error) {
    alert('등록에 실패했습니다. 데이터를 확인해 주세요')
  }
}
</script>

<template>
  <section>
    <PageHeader title="새 거래처 등록" subtitle="거래처 기본 정보와 담당자 정보를 입력합니다.">
      <template #actions>
        <button
            type="button"
            class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            @click="router.push('/clients')"
        >
          목록으로
        </button>
      </template>
    </PageHeader>

    <form class="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2" @submit.prevent="onSubmit">
      <label class="text-sm text-slate-700">거래처명<input v-model="form.name" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="text" placeholder="법인명 입력" required /></label>
      <label class="text-sm text-slate-700">사업자번호<input v-model="form.bizNo" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="text" placeholder="123-45-67890" required /></label>
      <label class="text-sm text-slate-700">대표이사 이름<input v-model="form.ceoName" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="text" required /></label>
      <label class="text-sm text-slate-700">회사 유선전화번호<input v-model="form.companyPhone" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="tel" placeholder="02-123-4567" /></label>
      <label class="text-sm text-slate-700 md:col-span-2">주소<input v-model="form.address" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="text" placeholder="전체 주소 입력" required /></label>

      <label class="text-sm text-slate-700">거래처 유형
        <select v-model="form.type" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" required>
          <option disabled value="">선택</option>
          <option value="DISTRIBUTOR">대리점</option>
          <option value="NURSERY">육묘장</option>
        </select>
      </label>

      <label class="text-sm text-slate-700">담당자 이름<input v-model="form.managerName" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="text" required /></label>
      <label class="text-sm text-slate-700">담당자 이메일<input v-model="form.managerEmail" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="email" required /></label>
      <label class="text-sm text-slate-700">담당자 번호<input v-model="form.managerPhone" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="tel" required /></label>
      <label class="text-sm text-slate-700">여신한도(원)<input v-model="form.creditLimit" class="mt-1 h-10 w-full rounded border border-slate-300 px-3" type="number" min="0" step="1000" /></label>

      <div class="md:col-span-2 flex justify-end gap-2 mt-4">
        <button type="button" class="rounded border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="router.push('/clients')">취소</button>
        <button type="submit" class="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">거래처 등록</button>
      </div>
    </form>
  </section>
</template>