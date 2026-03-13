<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
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
const nextActivationStatus = ref('ACTIVATE')
const displayAddress = ref('')
const isCropDropdownOpen = ref(false)
const cropDropdownContainer = ref(null)

const toggleCropDropdown = (e) => {
  e.stopPropagation()
  isCropDropdownOpen.value = !isCropDropdownOpen.value
}

const selectCrop = (crop) => {
  selectedCrop.value = crop
  addCrop()
  isCropDropdownOpen.value = false
}

const isCropEditing = ref(false)
const tempCrops = ref([])

const isCropsDirty = computed(() => {
  return JSON.stringify(tempCrops.value) !== JSON.stringify(clientCrops.value)
})

const handleEditCrops = () => {
  // 객체 리스트에서 이름(문자열) 리스트로 변환하여 할당
  tempCrops.value = clientCrops.value.map(c => c.cropName)
  isCropEditing.value = true
}

const handleSaveCrops = async () => {
  if (!currentClient.value) return

  const clientId = currentClient.value.id
  const originalCrops = clientCrops.value
  const nextCropNames = tempCrops.value

  try {
    // 1. 추가된 품종 (nextCropNames에만 있는 이름)
    const originalNames = originalCrops.map(c => c.cropName)
    const addedNames = nextCropNames.filter(name => !originalNames.includes(name))

    // 2. 삭제된 품종 (originalCrops에만 있는 매핑)
    const removedCrops = originalCrops.filter(c => !nextCropNames.includes(c.cropName))

    // 3. API 순차적 호출 (혹은 Promise.all)
    for (const name of addedNames) {
      await clientStore.addCrop(clientId, name)
    }
    for (const crop of removedCrops) {
      await clientStore.removeCrop(clientId, crop.id)
    }

    isCropEditing.value = false
  } catch (e) {
    alert('품종 변경 저장 중 오류가 발생했습니다.')
  }
}

const handleCancelEditCrops = () => {
  isCropEditing.value = false
}

onBeforeRouteLeave((to, from, next) => {
  if (isCropEditing.value && isCropsDirty.value) {
    const answer = window.confirm('저장되지 않은 변경사항이 있습니다. 페이지를 벗어나시겠습니까?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})

const handleClickOutsideDropdown = (event) => {
  if (cropDropdownContainer.value && !cropDropdownContainer.value.contains(event.target)) {
    isCropDropdownOpen.value = false
  }
}

const currentClientId = computed(() => route.params.id)
const { currentClient, loading, error } = storeToRefs(clientStore)

const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const employees = ref([])
const selectedCrop = ref('')

// ⭐ 품종 데이터를 안전하게 가져오기 위한 Computed
const clientCrops = computed(() => {
  return Array.isArray(currentClient.value?.crops) ? currentClient.value.crops : []
})

// 영업 브리핑 이동 함수
const handleBriefing = () => {
  if (currentClient.value?.id) {
    router.push({ name: 'note-briefing', query: { clientId: currentClient.value.id } })
  }
}

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
  managerId: null,
  totalCredit: 0, // 여신 한도 추가
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
  { key: 'info', label: '거래처 정보' },
  { key: 'history', label: '영업 히스토리', badge: currentClient.value?.pipelines?.length || 0 },
])

const cropOptions = ['가지', '갓', '고추', '무', '배추', '상추', '수박', '시금치', '양파', '오이', '옥수수', '참외', '토마토', '파', '파프리카', '호박', '양배추']

const toCurrency = (value) => clientStore.toCurrency(value)
const isClientActive = computed(() => Boolean(currentClient.value?.isActive))
const clientStatusText = computed(() => (isClientActive.value ? '활성' : '비활성'))
const clientStatusSubtitle = computed(() => (isClientActive.value ? '사용중' : '비활성'))

const fetchEmployees = async () => {
  try {
    const response = await clientStore.getAllEmployeesSimple()
    employees.value = response.data || response
  } catch (e) {
    console.error('영업사원 목록 로드 실패:', e)
  }
}

const openEditModal = async () => {
  if (!currentClient.value || !isAdmin.value) return

  // 영업사원 목록 로드
  if (employees.value.length === 0) {
    await fetchEmployees()
  }

  // 기존 주소 데이터 파싱하여 표시용으로 변환 (sido/address/zonecode)
  const rawAddr = currentClient.value.address || ''
  if (rawAddr.includes('/')) {
    const parts = rawAddr.split('/')
    // [보완] parts[1]이 실제 도로명/지번 주소임
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
    employeeId: currentClient.value.managerId || null, // managerId를 employeeId로 매핑
    totalCredit: currentClient.value.creditLimit || 0, // 여신 한도 세팅
  }
  isEditModalOpen.value = true
}

const submitEdit = () => {
  if (!currentClient.value) return

  clientStore.updateClient(currentClient.value.id, {
    clientName: editForm.value.name,
    clientBrn: editForm.value.bizNo,
    ceoName: editForm.value.ceoName,
    companyPhone: editForm.value.companyPhone,
    address: editForm.value.address,
    managerName: editForm.value.managerName,
    managerPhone: editForm.value.managerPhone,
    managerEmail: editForm.value.managerEmail,
    employeeId: editForm.value.employeeId,
    totalCredit: Number(editForm.value.totalCredit || 0)
  })
  isEditModalOpen.value = false
}

const openActivationModal = () => {
  if (!currentClient.value || !isAdmin.value) return
  // 현재 활성상태면 다음은 비활성화(DEACTIVATE), 아니면 활성화(ACTIVATE)
  nextActivationStatus.value = isClientActive.value ? 'DEACTIVATE' : 'ACTIVATE'
  isActivationModalOpen.value = true
}

const applyActivation = async () => {
  if (!currentClient.value || !isAdmin.value) return
  if (!currentClient.value.accountId) {
    alert('연결된 계정이 없습니다.')
    return
  }
  if (!window.confirm('선택한 상태로 변경할까요?')) return
  try {
    await clientStore.updateAccountStatus(currentClient.value.accountId, nextActivationStatus.value)
    isActivationModalOpen.value = false
  } catch (e) {
    // 에러는 스토어에서 처리되거나 여기서 alert 가능
  }
}

const addCrop = () => {
  if (isAdmin.value || !isCropEditing.value) return
  const crop = selectedCrop.value
  if (!crop) return
  if (tempCrops.value.includes(crop)) {
    selectedCrop.value = ''
    return
  }
  tempCrops.value.push(crop)
  selectedCrop.value = ''
}

const removeTempCrop = (cropName) => {
  tempCrops.value = tempCrops.value.filter((c) => c !== cropName)
}

const openPipelineDetail = (pipelineId) => {
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}

const fetchClientDetail = async () => {
  const idValue = currentClientId.value
  if (!idValue || String(idValue) === 'undefined' || String(idValue) === 'null') {
    return
  }

  try {
    await clientStore.fetchClientDetail(idValue)
    await clientStore.fetchTradeSummary(idValue)
    const crops = await clientStore.fetchClientCrops(idValue)
    console.log('[DEBUG] fetchClientCrops result:', crops)
  } catch (e) { /* error managed by store */ }
}

onMounted(() => {
  fetchClientDetail()
  window.addEventListener('click', handleClickOutsideDropdown)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutsideDropdown)
})
</script>

<template>
  <section v-if="loading" class="flex min-h-[400px] items-center justify-center rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
    <LoadingSpinner text="거래처 상세를 불러오는 중입니다." />
  </section>

  <section v-else-if="error" class="p-6">
    <ErrorMessage :message="error" @retry="fetchClientDetail" />
  </section>

  <section v-else-if="!currentClient" class="p-6">
    <EmptyState title="거래처 정보를 찾을 수 없습니다." description="목록에서 다시 선택해 주세요." />
  </section>

  <section v-else class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-5">
    <div v-if="currentClient" class="mx-auto max-w-6xl space-y-4">
      <PageHeader :title="currentClient.name" class="!bg-transparent !p-0 !mb-4">
        <template #title>
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold text-[var(--color-text-strong)]">{{ currentClient.name }}</h2>
            <StatusBadge status="info" :label="currentClient.typeLabel" />
          </div>
        </template>
        <template #subtitle>
          <span class="text-sm font-medium text-[var(--color-text-sub)]">거래처 코드: {{ currentClient.code }}</span>
        </template>
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <template v-if="isAdmin">
              <button type="button" class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]" @click="router.push('/clients')"> 목록으로 </button>
              <button type="button" class="rounded-lg bg-[var(--color-olive)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-olive-dark)] active:scale-95" @click="openEditModal"> 거래처 수정 </button>
              <button type="button" class="rounded-lg bg-[var(--color-text-strong)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95" @click="openActivationModal"> 활성화 관리 </button>
            </template>
            <template v-else>
              <button type="button" class="rounded-lg bg-[var(--color-orange)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-orange-dark)] active:scale-95" @click="handleBriefing"> 영업 브리핑 </button>
            </template>
          </div>
        </template>
      </PageHeader>

      <div class="flex items-center justify-between border-b border-[var(--color-border-divider)] mb-6">
        <TabNav v-model="activeTab" :tabs="tabOptions" class="!border-0 !pb-0" />
      </div>

      <div v-if="activeTab === 'info'" class="grid gap-6 lg:grid-cols-2">
        <article class="flex flex-col rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <div class="mb-6 flex items-center justify-between gap-2 border-b border-[var(--color-border-divider)] pb-4">
            <h3 class="text-xl font-bold text-[var(--color-text-strong)]">거래처 정보</h3>
            <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold" :class="isClientActive ? 'bg-[var(--color-olive-light)] text-[var(--color-olive-dark)]' : 'bg-[#F0D4D4] text-[var(--color-status-error)]'">
              <span class="h-2 w-2 rounded-full" :class="isClientActive ? 'bg-[var(--color-olive)]' : 'bg-[var(--color-status-error)]'" />
              <span>{{ clientStatusText }}</span>
            </div>
          </div>
          <dl class="space-y-4">
            <div class="flex justify-between gap-2"><dt class="font-bold text-[#3d3529]">법인명</dt><dd class="font-semibold text-[var(--color-text-body)]">{{ currentClient.name }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="font-bold text-[#3d3529]">사업자번호</dt><dd class="font-medium text-[var(--color-text-body)]">{{ currentClient.bizNo }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="font-bold text-[#3d3529]">대표이름</dt><dd class="font-medium text-[var(--color-text-body)]">{{ currentClient.ceoName }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="font-bold text-[#3d3529]">회사 유선번호</dt><dd class="font-medium text-[var(--color-text-body)]">{{ currentClient.companyPhone }}</dd></div>
            <div class="flex flex-col gap-1">
              <dt class="font-bold text-[#3d3529]">주소</dt>
              <dd class="flex items-center justify-between gap-2 w-full text-sm font-medium leading-relaxed text-[var(--color-text-body)]">
                <span class="truncate">{{ currentClient.displayAddressOnly }}</span>
                <span class="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white border border-[var(--color-border-card)] px-2 py-1 text-xs font-bold text-[var(--color-text-strong)] shadow-sm">
                  <span class="text-[10px] text-[var(--color-text-sub)] font-medium">우편번호</span>
                  {{ currentClient.displayZonecode }}
                </span>
              </dd>
            </div>
          </dl>
        </article>

        <article class="flex flex-col rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <h3 class="mb-6 border-b border-[var(--color-border-divider)] pb-4 text-xl font-bold text-[var(--color-text-strong)]">거래처 담당자 정보</h3>
          <dl class="space-y-4">
            <div class="flex justify-between gap-2"><dt class="font-bold text-[#3d3529]">이름</dt><dd class="font-semibold text-[var(--color-text-body)]">{{ currentClient.managerName }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="font-bold text-[#3d3529]">연락처</dt><dd class="font-medium text-[var(--color-text-body)]">{{ currentClient.managerPhone }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="font-bold text-[#3d3529]">이메일</dt><dd class="font-medium text-[var(--color-text-body)] underline underline-offset-4">{{ currentClient.managerEmail }}</dd></div>
            <div class="flex items-center justify-between border-t border-[var(--color-border-divider)] pt-4">
              <dt class="font-bold text-[#3d3529]">담당 영업사원</dt>
              <dd class="flex items-center gap-2 font-bold text-[var(--color-olive)]">
                <span class="h-1.5 w-1.5 rounded-full bg-[var(--color-olive)]"></span>
                {{ currentClient.managerEmployeeName || '지정됨' }}
              </dd>
            </div>
          </dl>
        </article>

        <article class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm lg:col-span-1">
          <h3 class="mb-6 border-b border-[var(--color-border-divider)] pb-4 text-xl font-bold text-[var(--color-text-strong)]">거래 정보</h3>

          <div class="mb-6 rounded-lg bg-[var(--color-bg-section)] p-4">
            <h4 class="mb-2 text-sm font-bold text-[var(--color-text-sub)] uppercase tracing-wider">이번달 거래 요약</h4>
            <p class="text-3xl font-black text-[var(--color-olive)]">{{ toCurrency(currentClient.monthlyAmount) }}</p>
            <div class="mt-3 flex gap-4 text-xs font-semibold text-[var(--color-text-body)]">
              <span>진행: <span class="text-[var(--color-orange)]">{{ currentClient.monthlyInProgress }}건</span></span>
              <span>완료: <span class="text-[var(--color-olive)]">{{ currentClient.monthlyDone }}건</span></span>
            </div>
          </div>

          <h3 class="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">여신 및 미수 정보</h3>
          <dl class="space-y-4">
            <div class="flex justify-between gap-2">
              <dt class="font-bold text-[#3d3529]">여신 한도</dt>
              <dd class="font-bold text-[var(--color-text-body)]">{{ toCurrency(currentClient.creditLimit) }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="font-bold text-[#3d3529]">현재 미수금</dt>
              <dd class="font-bold text-[var(--color-status-error)]">{{ toCurrency(currentClient.receivable) }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="font-bold text-[#3d3529]">잔여 여신</dt>
              <dd class="text-lg font-black text-[var(--color-status-success)]">{{ toCurrency(currentClient.creditLimit - currentClient.receivable) }}</dd>
            </div>
          </dl>
        </article>

        <article class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm lg:col-span-1">
          <div class="mb-6 flex items-center justify-between border-b border-[var(--color-border-divider)] pb-4">
            <h3 class="text-xl font-bold text-[var(--color-text-strong)]">취급 품종</h3>
            <template v-if="!isAdmin">
              <button
                  v-if="!isCropEditing"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-card)] bg-transparent px-3 py-1.5 text-xs font-bold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
                  @click="handleEditCrops"
              >
                수정
              </button>
              <div v-else class="flex gap-2">
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-card)] bg-transparent px-3 py-1.5 text-xs font-bold text-[var(--color-text-sub)] transition-colors hover:bg-[var(--color-bg-section)]"
                    @click="handleCancelEditCrops"
                >
                  취소
                </button>
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-olive)] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[var(--color-olive-dark)]"
                    @click="handleSaveCrops"
                >
                  저장 완료
                </button>
              </div>
            </template>
          </div>
          <div class="flex flex-wrap gap-2">
            <template v-if="!isAdmin">
              <!-- 편집 중일 때 표시 -->
              <template v-if="isCropEditing">
                <button
                    v-for="crop in tempCrops"
                    :key="crop"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-olive-light)] px-4 py-1.5 text-sm font-semibold text-[var(--color-olive-dark)] transition-colors hover:bg-[var(--color-olive)] hover:text-white"
                    title="클릭하여 삭제"
                    @click="removeTempCrop(crop)"
                >
                  {{ crop }} <span class="text-[10px] opacity-70">✕</span>
                </button>

                <!-- 커스텀 품종 드롭다운 -->
                <div class="relative" ref="cropDropdownContainer">
                  <button
                      type="button"
                      class="inline-flex items-center rounded-full border-2 border-dashed border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-4 py-1.5 text-sm font-bold text-[var(--color-text-sub)] transition-all hover:border-[var(--color-olive)] hover:text-[var(--color-olive)] active:scale-95"
                      @click="toggleCropDropdown"
                  >
                    + 품종 추가
                  </button>

                  <transition
                      enter-active-class="transition duration-200 ease-out"
                      enter-from-class="translate-y-1 opacity-0"
                      enter-to-class="translate-y-0 opacity-100"
                      leave-active-class="transition duration-150 ease-in"
                      leave-from-class="translate-y-0 opacity-100"
                      leave-to-class="translate-y-1 opacity-0"
                  >
                    <div
                        v-if="isCropDropdownOpen"
                        class="absolute left-0 z-50 mt-2 min-w-[140px] max-h-[240px] overflow-y-auto rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] py-2 shadow-xl"
                    >
                      <button
                          v-for="crop in cropOptions"
                          :key="crop"
                          type="button"
                          class="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition-colors"
                          :class="tempCrops.includes(crop) ? 'bg-[var(--color-olive-light)] text-[var(--color-olive-dark)] cursor-default' : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]'"
                          @click="!tempCrops.includes(crop) && selectCrop(crop)"
                      >
                        <span class="flex-1">{{ crop }}</span>
                        <span v-if="tempCrops.includes(crop)" class="text-[10px] font-bold">✓</span>
                      </button>
                    </div>
                  </transition>
                </div>
              </template>

              <!-- 보기 모드일 때 표시 -->
              <template v-else>
                <div v-for="crop in clientCrops" :key="crop.id" class="rounded-full bg-[var(--color-olive-light)] px-4 py-1.5 text-sm font-semibold text-[var(--color-olive-dark)]">
                  {{ crop.cropName }}
                </div>
              </template>
            </template>
            <template v-else>
              <div v-for="crop in clientCrops" :key="crop.id" class="rounded-full bg-[var(--color-olive-light)] px-4 py-1.5 text-sm font-semibold text-[var(--color-olive-dark)]">
                {{ crop.cropName }}
              </div>
            </template>
            <div v-if="(isCropEditing ? tempCrops.length : clientCrops.length) === 0" class="flex w-full flex-col items-center justify-center py-4 text-sm text-[var(--color-text-placeholder)]">
              <span class="mb-1 text-2xl">🌿</span>
              등록된 품종이 없습니다.
            </div>
          </div>
        </article>
      </div>

      <div v-else class="space-y-4">
        <PipelineTimelineCard v-for="pipeline in (currentClient?.pipelines || [])" :key="pipeline.id" :pipeline="pipeline" :amount-formatter="toCurrency" @detail="openPipelineDetail" class="!bg-[var(--color-bg-card)] !border-[var(--color-border-card)]" />
        <article v-if="currentClient?.pipelines?.length === 0" class="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-sm text-[var(--color-text-placeholder)]">
          <span class="mb-2 text-3xl">📋</span>
          영업 히스토리가 없습니다.
        </article>
      </div>

      <!-- 모달 디자인 업데이트 -->
      <ModalBase v-model="isEditModalOpen" title="거래처 정보 수정" width-class="max-w-2xl">
        <div class="p-2">
          <form class="grid gap-5 md:grid-cols-2" @submit.prevent="submitEdit">
            <label class="block text-sm font-bold text-[var(--color-text-sub)]">법인명
              <input v-model="editForm.name" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="text" required />
            </label>
            <label class="block text-sm font-bold text-[var(--color-text-sub)]">사업자번호
              <input v-model="editForm.bizNo" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="text" required />
            </label>
            <label class="block text-sm font-bold text-[var(--color-text-sub)]">대표이름
              <input v-model="editForm.ceoName" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="text" required />
            </label>
            <label class="block text-sm font-bold text-[var(--color-text-sub)]">회사 유선번호
              <input v-model="editForm.companyPhone" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="text" />
            </label>
            <div class="block text-sm font-bold text-[var(--color-text-sub)] md:col-span-2">
              주소
              <div class="mt-1.5 flex gap-2">
                <input
                    v-model="displayAddress"
                    class="h-11 flex-1 rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-base)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm cursor-not-allowed"
                    type="text"
                    placeholder="주소 검색을 이용하세요"
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
            <label class="block text-sm font-bold text-[var(--color-text-sub)]">담당자명
              <input v-model="editForm.managerName" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="text" required />
            </label>
            <label class="block text-sm font-bold text-[var(--color-text-sub)]">담당자 연락처
              <input v-model="editForm.managerPhone" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="text" required />
            </label>
            <label class="block text-sm font-bold text-[var(--color-text-sub)] md:col-span-2">담당자 이메일
              <input v-model="editForm.managerEmail" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="email" required />
            </label>

            <!-- 담당 영업사원 선택 창 추가 (관리자 전용) -->
            <label v-if="isAdmin" class="block text-sm font-bold text-[var(--color-text-sub)] md:col-span-2">담당 영업사원 지정
              <select v-model="editForm.employeeId" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1rem] cursor-pointer" style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B5F50%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E');">
                <option :value="null">담당자 미지정</option>
                <option v-for="emp in employees" :key="emp.employeeId" :value="emp.employeeId">
                  {{ emp.employeeName }} ({{ emp.employeeCode }})
                </option>
              </select>
            </label>

            <!-- 여신 한도 수정 칸 추가 (관리자 전용) -->
            <label v-if="isAdmin" class="block text-sm font-bold text-[var(--color-text-sub)] md:col-span-2">여신 한도 (원)
              <input v-model.number="editForm.totalCredit" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="number" step="10000" min="0" required />
            </label>
          </form>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3 p-2">
            <button type="button" class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]" @click="isEditModalOpen = false">취소</button>
            <button type="button" class="rounded-lg bg-[var(--color-olive)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)]" @click="submitEdit"> 변경사항 저장 </button>
          </div>
        </template>
      </ModalBase>

      <ModalBase v-model="isActivationModalOpen" title="활성화 상태 변경" width-class="max-w-lg">
        <div class="space-y-4 p-2">
          <p class="text-sm font-medium text-[var(--color-text-body)]">거래처의 서비스 이용 상태를 설정합니다.</p>
          <div class="grid gap-3">
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-4 transition-all hover:border-[var(--color-olive)]">
              <input v-model="nextActivationStatus" type="radio" value="ACTIVATE" class="h-5 w-5 accent-[var(--color-olive)]" />
              <div>
                <strong class="block text-base text-[var(--color-text-strong)]">활성 상태로 변경</strong>
                <span class="text-xs text-[var(--color-text-sub)]">시스템의 모든 기능을 정상적으로 이용할 수 있습니다.</span>
              </div>
            </label>
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-4 transition-all hover:border-[var(--color-status-error)]">
              <input v-model="nextActivationStatus" type="radio" value="DEACTIVATE" class="h-5 w-5 accent-[var(--color-status-error)]" />
              <div>
                <strong class="block text-base text-[var(--color-text-strong)]">비활성 상태로 변경</strong>
                <span class="text-xs text-[var(--color-text-sub)]">일부 비즈니스 기능 접근이 제한될 수 있습니다.</span>
              </div>
            </label>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3 p-2">
            <button type="button" class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]" @click="isActivationModalOpen = false">취소</button>
            <button type="button" class="rounded-lg bg-[var(--color-text-strong)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-90" @click="applyActivation">상태 적용하기</button>
          </div>
        </template>
      </ModalBase>
    </div>
    <LoadingSpinner v-else text="거래처 상세를 불러오는 중입니다." />
  </section>
</template>
