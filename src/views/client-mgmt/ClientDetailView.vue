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
import { useAuthStore } from '@/stores/auth'
import { useClientStore } from '@/stores/client'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const clientStore = useClientStore()

const activeTab = ref('info')
const isEditModalOpen = ref(false)
const isActivationModalOpen = ref(false)
const nextActivationStatus = ref('ACTIVE')

const currentClientId = computed(() => route.params.id)
const { currentClient, loading, error } = storeToRefs(clientStore)

const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const selectedCrop = ref('')

// ⭐ 품종 데이터를 안전하게 가져오기 위한 Computed
const clientCrops = computed(() => {
  return Array.isArray(currentClient.value?.crops) ? currentClient.value.crops : []
})

// 영업 브리핑 이동 함수
const handleBriefing = () => {
  window.location.href = 'http://localhost:5173/notes/briefing'
}

const editForm = ref({
  name: '', bizNo: '', ceoName: '', companyPhone: '', address: '', managerName: '', managerPhone: '', managerEmail: '',
})

const tabOptions = computed(() => [
  { key: 'info', label: '기본 정보' },
  { key: 'history', label: '영업 히스토리', badge: currentClient.value?.pipelines?.length || 0 },
])

const cropOptions = ['가지', '갓', '고추', '무', '배추', '상추', '수박', '시금치', '양파', '오이', '옥수수', '참외', '토마토', '파', '파프리카', '호박', '양배추']

const toCurrency = (value) => clientStore.toCurrency(value)
const isClientActive = computed(() => Boolean(currentClient.value?.isActive))
const clientStatusText = computed(() => (isClientActive.value ? '활성' : '비활성'))
const clientStatusSubtitle = computed(() => (isClientActive.value ? '사용중' : '비활성'))

const openEditModal = () => {
  if (!currentClient.value || !isAdmin.value) return
  editForm.value = {
    name: currentClient.value.name,
    bizNo: currentClient.value.bizNo,
    ceoName: currentClient.value.ceoName,
    companyPhone: currentClient.value.companyPhone,
    address: currentClient.value.address,
    managerName: currentClient.value.managerName,
    managerPhone: currentClient.value.managerPhone,
    managerEmail: currentClient.value.managerEmail,
  }
  isEditModalOpen.value = true
}

const submitEdit = () => {
  if (!currentClient.value) return

  // ⭐ 핵심 수정 포인트: 정보를 수정할 때 기존 crops 데이터를 함께 실어 보냅니다!
  clientStore.updateClient(currentClient.value.id, {
    ...editForm.value,
    crops: currentClient.value.crops // 기존 품종 데이터를 그대로 유지함돠!
  })
  isEditModalOpen.value = false
}

const openActivationModal = () => {
  if (!currentClient.value || !isAdmin.value) return
  nextActivationStatus.value = isClientActive.value ? 'ACTIVE' : 'INACTIVE'
  isActivationModalOpen.value = true
}

const applyActivation = () => {
  if (!currentClient.value || !isAdmin.value) return
  if (!window.confirm('선택한 상태로 변경할까요?')) return
  clientStore.toggleClientActive(currentClient.value.id, nextActivationStatus.value === 'ACTIVE')
  isActivationModalOpen.value = false
}

const addCrop = () => {
  if (isAdmin.value) return
  const crop = selectedCrop.value
  if (!crop || !currentClient.value) return
  const crops = clientCrops.value
  if (crops.includes(crop)) {
    selectedCrop.value = ''
    return
  }
  clientStore.updateClient(currentClient.value.id, {
    crops: [...crops, crop],
  })
  selectedCrop.value = ''
}

const removeCrop = (crop) => {
  if (isAdmin.value || !currentClient.value) return
  clientStore.updateClient(currentClient.value.id, {
    crops: clientCrops.value.filter((item) => item !== crop),
  })
}

const openPipelineDetail = (pipelineId) => {
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}

const fetchClientDetail = async () => {
  if (!currentClientId.value) return
  try {
    await clientStore.fetchClientDetail(currentClientId.value)
  } catch (e) { /* error managed by store */ }
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
      <PageHeader :title="`${currentClient.name} (${currentClient.id})`" :subtitle="`${currentClient.typeLabel} | ${clientStatusSubtitle}`">
        <template #actions>
          <template v-if="isAdmin">
            <button type="button" class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="router.push('/clients')"> 목록으로 </button>
            <button type="button" class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="openEditModal"> 거래처 수정 </button>
            <button type="button" class="rounded bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700" @click="openActivationModal"> 활성화 관리 </button>
          </template>
          <template v-else>
            <button type="button" class="rounded bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 shadow-md transition-all active:scale-95" @click="handleBriefing"> 📊 영업 브리핑 </button>
          </template>
        </template>
      </PageHeader>

      <TabNav v-model="activeTab" :tabs="tabOptions" />

      <div v-if="activeTab === 'info'" class="grid gap-4 lg:grid-cols-2">
        <article class="rounded-lg border border-slate-200 bg-white p-5">
          <div class="mb-4 flex items-center justify-between gap-2">
            <h3 class="text-lg font-semibold text-slate-800">기본 정보</h3>
            <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold" :class="isClientActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
              <span class="h-2 w-2 rounded-full" :class="isClientActive ? 'bg-emerald-500' : 'bg-rose-500'" />
              <span>{{ clientStatusText }}</span>
            </div>
          </div>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-2"><dt class="text-slate-500">법인명</dt><dd class="font-medium">{{ currentClient.name }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">사업자번호</dt><dd class="font-medium">{{ currentClient.bizNo }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">대표이름</dt><dd class="font-medium">{{ currentClient.ceoName }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">회사유선번호</dt><dd class="font-medium">{{ currentClient.companyPhone }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-500">주소</dt><dd class="text-right font-medium">{{ currentClient.address }}</dd></div>
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
            <template v-if="!isAdmin">
              <button
                  v-for="crop in clientCrops"
                  :key="crop"
                  type="button"
                  class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-200"
                  title="클릭하여 삭제"
                  @click="removeCrop(crop)"
              >
                {{ crop }} ✕
              </button>
              <label class="relative inline-flex items-center rounded-full border border-dashed border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                + 추가
                <select v-model="selectedCrop" class="absolute inset-0 cursor-pointer opacity-0" @change="addCrop">
                  <option value="">선택하세요</option>
                  <option v-for="crop in cropOptions" :key="crop" :value="crop">{{ crop }}</option>
                </select>
              </label>
            </template>
            <template v-else>
              <StatusBadge v-for="crop in clientCrops" :key="crop" status="success" :label="crop" />
            </template>
            <span v-if="clientCrops.length === 0" class="text-sm text-slate-400">등록된 품종이 없습니다.</span>
          </div>
        </article>
      </div>

      <div v-else class="space-y-4">
        <PipelineTimelineCard v-for="pipeline in (currentClient?.pipelines || [])" :key="pipeline.id" :pipeline="pipeline" :amount-formatter="toCurrency" @detail="openPipelineDetail" />
        <article v-if="currentClient?.pipelines?.length === 0" class="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400"> 영업 히스토리가 없습니다. </article>
      </div>

      <ModalBase v-model="isEditModalOpen" title="거래처 정보 수정" width-class="max-w-2xl">
        <form class="grid gap-3 md:grid-cols-2" @submit.prevent="submitEdit">
          <label class="text-sm text-slate-700">법인명<input v-model="editForm.name" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">사업자번호<input v-model="editForm.bizNo" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">대표이름<input v-model="editForm.ceoName" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">회사유선번호<input v-model="editForm.companyPhone" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" /></label>
          <label class="text-sm text-slate-700 md:col-span-2">주소<input v-model="editForm.address" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">담당자명<input v-model="editForm.managerName" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700">담당자 연락처<input v-model="editForm.managerPhone" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="text" required /></label>
          <label class="text-sm text-slate-700 md:col-span-2">담당자 이메일<input v-model="editForm.managerEmail" class="mt-1 h-10 w-full rounded border border-slate-300 px-2" type="email" required /></label>
        </form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="isEditModalOpen = false">취소</button>
            <button type="button" class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="submitEdit">저장</button>
          </div>
        </template>
      </ModalBase>

      <ModalBase v-model="isActivationModalOpen" title="활성화 상태 변경" width-class="max-w-lg">
        <div class="space-y-3">
          <p class="text-sm text-slate-600">변경할 상태를 선택하세요.</p>
          <label class="flex cursor-pointer items-start gap-2 rounded border border-slate-200 p-3">
            <input v-model="nextActivationStatus" type="radio" value="ACTIVE" class="mt-1" />
            <span> <strong class="block text-sm text-slate-800">활성</strong> </span>
          </label>
          <label class="flex cursor-pointer items-start gap-2 rounded border border-slate-200 p-3">
            <input v-model="nextActivationStatus" type="radio" value="INACTIVE" class="mt-1" />
            <span> <strong class="block text-sm text-slate-800">비활성</strong> </span>
          </label>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="isActivationModalOpen = false">취소</button>
            <button type="button" class="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="applyActivation">적용</button>
          </div>
        </template>
      </ModalBase>
    </div>
    <LoadingSpinner v-else text="거래처 상세를 불러오는 중입니다." />
  </section>
</template>