<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useClientStore } from '@/stores/client'

const router = useRouter()
const clientStore = useClientStore()
const displayAddress = ref('')

const form = reactive({
  name: '',
  bizNo: '',
  ceoName: '',
  companyPhone: '',
  address: '',
  sido: '',
  sigungu: '',
  query: '',
  zonecode: '',
  type: '',
  managerName: '',
  managerEmail: '',
  managerPhone: '',
  creditLimit: 0,
})

const execDaumPostcode = () => {
  new window.daum.Postcode({
    oncomplete: (data) => {
      const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress

      // [사용자 요청] sido/address/zonecode 형식으로 저장
      form.address = `${data.sido}/${addr}/${data.zonecode}`

      // UI 표시용 (가독성 위해 주소만 표시)
      displayAddress.value = addr

      form.sido = data.sido
      form.sigungu = data.sigungu
      form.query = data.query
      form.zonecode = data.zonecode

      // 상세주소 입력으로 포커스 이동 (필요 시)
      const detailInput = document.getElementById('addressDetail')
      if (detailInput) detailInput.focus()
    },
  }).open()
}

const isTypeDropdownOpen = ref(false)
const typeOptions = [
  { label: '대리점', value: 'DISTRIBUTOR' },
  { label: '육묘장', value: 'NURSERY' }
]

const selectType = (value) => {
  form.type = value
  isTypeDropdownOpen.value = false
}

const dropdownRef = ref(null)
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isTypeDropdownOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
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
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <div class="mx-auto max-w-[900px] space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-[var(--color-text-strong)]">새 거래처 등록</h1>
          <p class="mt-1 text-sm text-[var(--color-text-sub)]">거래처 기본 정보와 담당자 정보를 입력하여 신규 파트너사를 등록합니다.</p>
        </div>
        <button
            type="button"
            class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
            @click="router.push('/clients')"
        >
          목록으로 돌아가기
        </button>
      </header>

      <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-8 shadow-sm">
        <form class="grid gap-x-8 gap-y-6 md:grid-cols-2" @submit.prevent="onSubmit">
          <!-- 기본 정보 섹션 -->
          <div class="md:col-span-2 flex items-center gap-2 mb-2">
            <span class="h-4 w-1 rounded-full bg-[var(--color-olive)]"></span>
            <h3 class="text-lg font-bold text-[var(--color-text-strong)]">거래처 기본 정보</h3>
          </div>

          <label class="block">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">거래처명</span>
            <input v-model="form.name" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="text" placeholder="법인명 입력" required />
          </label>
          <label class="block">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">사업자번호</span>
            <input v-model="form.bizNo" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="text" placeholder="123-45-67890" required />
          </label>
          <label class="block">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">대표이사 이름</span>
            <input v-model="form.ceoName" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="text" placeholder="성함 입력" required />
          </label>
          <label class="block">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">회사 유선전화</span>
            <input v-model="form.companyPhone" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="tel" placeholder="02-123-4567" />
          </label>
          <div class="md:col-span-2">
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

          <!-- 세부 설정 섹션 -->
          <div class="md:col-span-2 flex items-center gap-2 mt-4 mb-2">
            <span class="h-4 w-1 rounded-full bg-[var(--color-olive)]"></span>
            <h3 class="text-lg font-bold text-[var(--color-text-strong)]">세부 설정 및 담당자</h3>
          </div>

          <div class="block relative" ref="dropdownRef">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">거래처 유형</span>
            <div
                class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
                :class="isTypeDropdownOpen ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-card)]'"
                @click="isTypeDropdownOpen = !isTypeDropdownOpen"
            >
              <span
                  class="font-bold"
                  :class="form.type ? 'text-[var(--color-text-strong)]' : 'text-[var(--color-text-placeholder)]'"
              >
                {{ typeOptions.find(o => o.value === form.type)?.label || '선택하세요' }}
              </span>
              <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': isTypeDropdownOpen }">▼</span>
            </div>

            <!-- 커스텀 드롭다운 목록 -->
            <ul
                v-if="isTypeDropdownOpen"
                class="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0"
            >
              <li
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                  :class="form.type === opt.value ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'"
                  @click="selectType(opt.value)"
              >
                {{ opt.label }}
              </li>
            </ul>
            <input type="hidden" :value="form.type" required />
          </div>
          <label class="block">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">여신한도 (원)</span>
            <input v-model="form.creditLimit" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="number" min="0" step="1000" />
          </label>
          <label class="block">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">담당자 이름</span>
            <input v-model="form.managerName" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="text" placeholder="성함 입력" required />
          </label>
          <label class="block">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">담당자 번호</span>
            <input v-model="form.managerPhone" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="tel" placeholder="010-0000-0000" required />
          </label>
          <label class="block md:col-span-2">
            <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase tracking-wider mb-1.5">담당자 이메일</span>
            <input v-model="form.managerEmail" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all shadow-sm" type="email" placeholder="example@seedflow.com" required />
          </label>

          <div class="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-[var(--color-border-divider)] mt-4">
            <button type="button" class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-6 py-2.5 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]" @click="router.push('/clients')">취소</button>
            <button type="submit" class="rounded-lg bg-[var(--color-olive)] px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95">거래처 등록 완료</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-family: var(--font-body);
}
</style>
