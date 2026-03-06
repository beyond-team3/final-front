<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TabNav from '@/components/common/TabNav.vue'
import PipelineTimelineCard from '@/components/history/PipelineTimelineCard.vue'
import { useClientStore } from '@/stores/client'

const route = useRoute()
const router = useRouter()
const clientStore = useClientStore()

const activeTab = ref('info')
const isEditModalOpen = ref(false)
const displayAddress = ref('')

const currentClientId = computed(() => route.params.id)
const { currentClient, loading, error } = storeToRefs(clientStore)

const editForm = ref({
  name: '',
  bizNo: '',
  ceoName: '',
  companyPhone: '',
  address: '',
  sido: '',
  sigungu: '',
  query: '',
  zonecode: '',
  managerName: '',
  managerPhone: '',
  managerEmail: '',
  creditLimit: 0,
})

const execDaumPostcode = () => {
  new window.daum.Postcode({
    oncomplete: (data) => {
      const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
      // [사용자 요청] sido/address/zonecode 형식으로 저장
      editForm.value.address = `${data.sido}/${addr}/${data.zonecode}`

      // UI 표시용 (주소 부분만)
      displayAddress.value = addr

      // 개별 필드 업데이트
      editForm.value.sido = data.sido
      editForm.value.sigungu = data.sigungu
      editForm.value.query = data.query
      editForm.value.zonecode = data.zonecode
    },
  }).open()
}

const tabOptions = computed(() => [
  { key: 'info', label: '기본 정보' },
  { key: 'history', label: '영업 히스토리', badge: currentClient.value?.pipelines?.length || 0 },
])

const toCurrency = (value) => clientStore.toCurrency(value)

const openEditModal = () => {
  if (!currentClient.value) {
    return
  }

  // 기존 주소 데이터 파싱하여 표시용으로 변환 (sido/address/zonecode)
  const rawAddr = currentClient.value.address || ''
  if (rawAddr.includes('/')) {
    const parts = rawAddr.split('/')
    // 상세 수정 모달에서는 '주소' 부분만 노출
    displayAddress.value = parts[1] || parts[0]
  } else {
    displayAddress.value = rawAddr
  }

  editForm.value = {
    name: currentClient.value.name,
    bizNo: currentClient.value.bizNo,
    ceoName: currentClient.value.ceoName,
    companyPhone: currentClient.value.companyPhone,
    address: currentClient.value.address,
    sido: currentClient.value.sido || '',
    sigungu: currentClient.value.sigungu || '',
    query: currentClient.value.query || '',
    zonecode: currentClient.value.zonecode || '',
    managerName: currentClient.value.managerName,
    managerPhone: currentClient.value.managerPhone,
    managerEmail: currentClient.value.managerEmail,
    creditLimit: currentClient.value.creditLimit,
  }

  isEditModalOpen.value = true
}

const submitEdit = () => {
  clientStore.updateClient(currentClient.value.id, {
    name: editForm.value.name,
    bizNo: editForm.value.bizNo,
    ceoName: editForm.value.ceoName,
    companyPhone: editForm.value.companyPhone,
    address: editForm.value.address,
    sido: editForm.value.sido,
    sigungu: editForm.value.sigungu,
    query: editForm.value.query,
    zonecode: editForm.value.zonecode,
    managerName: editForm.value.managerName,
    managerPhone: editForm.value.managerPhone,
    managerEmail: editForm.value.managerEmail,
    creditLimit: Number(editForm.value.creditLimit || 0),
  })

  isEditModalOpen.value = false
}

const fetchClientDetail = async () => {
  if (!currentClientId.value) {
    return
  }

  try {
    await clientStore.fetchClientDetail(currentClientId.value)
  } catch (e) {
    // error state is managed by store
  }
}

onMounted(fetchClientDetail)

</script>

<template>
  <section v-if="loading">
    <LoadingSpinner text="거래처 상세를 불러오는 중입니다." />
  </section>

  <section v-else-if="error">
    <ErrorMessage :message="error" @retry="fetchClientDetail" />
  </section>

  <section v-else-if="!currentClient">
    <EmptyState title="거래처 정보를 찾을 수 없습니다." description="목록에서 다시 선택해 주세요." />
  </section>

  <section v-else>
    <div v-if="currentClient">
      <PageHeader :title="`${currentClient.name} (${currentClient.id})`" :subtitle="`${currentClient.typeLabel} | 사용중`">
        <template #actions>
          <button
              type="button"
              class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              @click="router.push('/clients')"
          >
            목록으로
          </button>
          <button
              type="button"
              class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              @click="openEditModal"
          >
            거래처 수정
          </button>
        </template>
      </PageHeader>

      <TabNav v-model="activeTab" :tabs="tabOptions" />

      <div v-if="activeTab === 'info'" class="grid gap-4 lg:grid-cols-2">
        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="mb-4 text-lg font-semibold text-slate-800">기본 정보</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-2"><dt class="text-slate-500">법인명</dt><dd class="font-medium">{{ currentClient.name }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">사업자번호</dt><dd class="font-medium">{{ currentClient.bizNo }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">대표이름</dt><dd class="font-medium">{{ currentClient.ceoName }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">회사유선번호</dt><dd class="font-medium">{{ currentClient.companyPhone }}</dd></div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-slate-500 shrink-0">주소</dt>
              <dd class="flex-1 flex items-center justify-between gap-2 overflow-hidden">
                <span class="font-medium text-slate-800 truncate">{{ currentClient.displayAddressOnly }}</span>
                <span class="shrink-0 inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">
                <span class="text-[10px] text-slate-400 font-medium">우편번호</span>
                {{ currentClient.displayZonecode }}
              </span>
              </dd>
            </div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">거래처 유형</dt><dd><StatusBadge status="info" :label="currentClient.typeLabel" /></dd></div>
          </dl>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="mb-4 text-lg font-semibold text-slate-800">담당자 정보</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-2"><dt class="text-slate-500">이름</dt><dd class="font-medium">{{ currentClient.managerName }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">연락처</dt><dd class="font-medium">{{ currentClient.managerPhone }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">이메일</dt><dd class="font-medium">{{ currentClient.managerEmail }}</dd></div>
          </dl>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="mb-4 text-lg font-semibold text-slate-800">이번달 거래 현황</h3>
          <p class="text-2xl font-bold text-blue-600">{{ toCurrency(currentClient.monthlyAmount) }}</p>
          <p class="mt-1 text-xs text-slate-500">이번달 누적 거래 금액</p>
          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between gap-2"><dt class="text-slate-500">이번 달 진행</dt><dd class="font-medium">{{ currentClient.monthlyInProgress }}건</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">이번 달 완료</dt><dd class="font-medium">{{ currentClient.monthlyDone }}건</dd></div>
          </dl>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <h3 class="mb-4 text-lg font-semibold text-slate-800">거래 정보</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-2"><dt class="text-slate-500">여신 한도</dt><dd class="font-medium">{{ toCurrency(currentClient.creditLimit) }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">현재 미수금</dt><dd class="font-medium text-orange-600">{{ toCurrency(currentClient.receivable) }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">잔여 여신</dt><dd class="font-medium text-emerald-600">{{ toCurrency(currentClient.creditLimit - currentClient.receivable) }}</dd></div>
          </dl>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
          <h3 class="mb-3 text-lg font-semibold text-slate-800">취급 품종</h3>
          <div class="flex flex-wrap gap-2">
            <StatusBadge
                v-for="crop in (currentClient?.crops || [])"
                :key="crop"
                status="success"
                :label="crop"
            />
            <span v-if="currentClient?.crops?.length === 0" class="text-sm text-slate-400">등록된 품종이 없습니다.</span>
          </div>
        </article>
      </div>

      <div v-else class="space-y-4">
        <PipelineTimelineCard
            v-for="pipeline in (currentClient?.pipelines || [])"
            :key="pipeline.id"
            :pipeline="pipeline"
            :amount-formatter="toCurrency"
            :show-detail-button="false"
        />

        <article v-if="currentClient?.pipelines?.length === 0" class="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          영업 히스토리가 없습니다.
        </article>
      </div>

      <ModalBase v-model="isEditModalOpen" title="거래처 정보 수정" width-class="max-w-2xl">
        <form class="grid gap-3 md:grid-cols-2" @submit.prevent="submitEdit">
          <label class="text-sm text-slate-700">법인명<input v-model="editForm.name" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">사업자번호<input v-model="editForm.bizNo" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">대표이름<input v-model="editForm.ceoName" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">회사유선번호<input v-model="editForm.companyPhone" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" /></label>
          <label class="text-sm text-slate-700 md:col-span-2">
            주소
            <div class="mt-1 flex gap-2">
              <input
                  v-model="displayAddress"
                  class="h-10 flex-1 rounded border border-slate-300 px-2 bg-slate-50 cursor-not-allowed"
                  type="text"
                  placeholder="주소 검색을 이용하세요"
                  readonly
                  required
              />
              <button
                  type="button"
                  class="rounded bg-slate-800 px-3 py-1 text-xs font-bold text-white hover:opacity-90"
                  @click="execDaumPostcode"
              >
                주소 검색
              </button>
            </div>
          </label>
          <label class="text-sm text-slate-700">담당자명<input v-model="editForm.managerName" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">담당자 연락처<input v-model="editForm.managerPhone" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700 md:col-span-2">담당자 이메일<input v-model="editForm.managerEmail" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="email" required /></label>
          <label class="text-sm text-slate-700 md:col-span-2">여신 한도(숫자만)<input v-model="editForm.creditLimit" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="number" min="0" step="1000" /></label>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <button
                type="button"
                class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                @click="isEditModalOpen = false"
            >
              취소
            </button>
            <button
                type="button"
                class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                @click="submitEdit"
            >
              저장
            </button>
          </div>
        </template>
      </ModalBase>
    </div>
    <LoadingSpinner v-else text="거래처 상세를 불러오는 중입니다." />
  </section>
</template>
