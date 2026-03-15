<script setup>
import { reactive, ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useClientStore } from '@/stores/client'
import { useHistoryStore } from '@/stores/history'
import ModalBase from '@/components/common/ModalBase.vue'
import DealHistoryListPanel from '@/components/history/DealHistoryListPanel.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TabNav from '@/components/common/TabNav.vue'

import * as authApi from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const clientStore = useClientStore()
const historyStore = useHistoryStore()

const activeTab = ref('info')
const isPwModalOpen = ref(false)
const pwForm = ref({ current: '', next: '', nextConfirm: '' })
const pwHint = ref('')

const profile = reactive({
  id: null,
  name: '',
  code: '',
  bizNo: '',
  ceoName: '',
  companyPhone: '',
  address: '',
  zonecode: '',
  typeLabel: '',
  managerName: '',
  managerPhone: '',
  managerEmail: '',
  crops: [],
  isActive: true,
  monthlyAmount: 0,
  monthlyInProgress: 0,
  monthlyDone: 0,
})

const isClientActive = computed(() => Boolean(profile.isActive))
const clientStatusText = computed(() => (isClientActive.value ? '활성' : '비활성'))

const toCurrency = (value) => {
  if (value === undefined || value === null) return '0원'
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
}

const mapProfileData = async (data) => {
  if (!data) return

  // ApiResult 구조인 경우와 데이터 직접인 경우 모두 대응
  const target = data.data || data

  profile.id = target.id || target.clientId || target.client_id || target.userId
  profile.name = target.clientName || target.name || ''
  profile.code = target.clientCode || target.code || ''
  profile.bizNo = target.clientBrn || target.bizNo || ''
  profile.ceoName = target.ceoName || ''
  profile.companyPhone = target.companyPhone || ''

  // 주소 정보 매핑
  if (target.addressSido || target.addressDetail) {
    profile.address = `${target.addressSido || ''} ${target.addressDetail || ''}`.trim()
    profile.zonecode = target.addressZip || ''
  } else {
    const rawAddr = target.address || ''
    if (rawAddr.includes('/')) {
      const parts = rawAddr.split('/')
      profile.address = parts[1] || parts[0]
      profile.zonecode = parts[2] || ''
    } else {
      profile.address = rawAddr
      profile.zonecode = ''
    }
  }

  profile.typeLabel = target.clientType === 'CORPORATION' ? '법인' : (target.typeLabel || '거래처')
  profile.managerName = target.managerName || ''
  profile.managerPhone = target.managerPhone || ''
  profile.managerEmail = target.managerEmail || ''
  profile.isActive = target.isActive ?? true

  // 통합된 거래 요약 데이터 매핑 (AccountService.getMyClientProfile에서 제공)
  profile.monthlyAmount = target.thisMonthAmount || 0
  profile.monthlyInProgress = target.inProgressCount || 0
  profile.monthlyDone = target.completedCount || 0

  // 품종 정보 조회
  await nextTick()
  if (profile.id) {
    fetchCrops()
  }
}

onMounted(() => {
  if (authStore.me) {
    mapProfileData(authStore.me)
  } else if (!authStore.token) {
    router.push('/login')
  }
})

// authStore.me가 늦게 로드되는 경우 대응
watch(() => authStore.me, (newMe) => {
  if (newMe) {
    mapProfileData(newMe)
  }
}, { immediate: true })

const fetchCrops = async () => {
  if (!profile.id) return
  try {
    const crops = await clientStore.fetchClientCrops(profile.id)
    if (Array.isArray(crops)) {
      profile.crops = crops.map(c => c.cropName)
    } else {
      profile.crops = []
    }
  } catch (err) {
    profile.crops = []
  }
}

const tabOptions = computed(() => [
  { key: 'info', label: '마이 페이지 정보' },
  { key: 'history', label: '거래 히스토리', badge: clientDeals.value.length },
])

const clientHistoryId = computed(() => String(profile.id || authStore.me?.refId || authStore.me?.clientId || authStore.me?.id || ''))
const clientDeals = computed(() => {
  const clientId = clientHistoryId.value
  if (!clientId) return []
  return historyStore.pipelinesForView.filter((deal) => String(deal.clientId) === clientId)
})

const openPwModal = () => {
  pwForm.value = { current: '', next: '', nextConfirm: '' }
  pwHint.value = ''
  isPwModalOpen.value = true
}

const closePwModal = () => {
  isPwModalOpen.value = false
  pwHint.value = ''
}

const submitPassword = async () => {
  const { current, next, nextConfirm } = pwForm.value
  if (!current || !next || !nextConfirm) {
    pwHint.value = '모든 항목을 입력해주세요.'
    return
  }
  if (next !== nextConfirm) {
    pwHint.value = '새 비밀번호와 확인 값이 일치하지 않습니다.'
    return
  }
  if (next.length < 8) {
    pwHint.value = '새 비밀번호는 8자 이상을 권장합니다.'
    return
  }

  try {
    await authApi.changePassword({
      oldPassword: current,
      newPassword: next
    })

    pwHint.value = '비밀번호가 성공적으로 수정되었습니다.'
    setTimeout(() => {
      closePwModal()
      // 비밀번호가 변경되었으므로 재로그인 유도
      authStore.logout()
      router.push('/login')
    }, 1500)
  } catch (error) {
    console.error('Password change error:', error)
    // 백엔드 ApiResult 구조(data.error.message)에 따라 메시지 추출
    pwHint.value = error.response?.data?.error?.message || '비밀번호 수정에 실패했습니다.'
  }
}

const openPipelineDetail = (pipelineId) => {
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}

const fetchClientHistory = async () => {
  if (!clientHistoryId.value) return
  await historyStore.fetchPipelines()
}

watch(
  () => [activeTab.value, clientHistoryId.value],
  ([tab, clientId]) => {
    if (tab === 'history' && clientId) {
      void fetchClientHistory()
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-5">
    <div class="mx-auto max-w-6xl space-y-4">
      <PageHeader class="!bg-transparent !p-0 !mb-4" :title="profile.name">
        <template #title>
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold text-[var(--color-text-strong)]">{{ profile.name }}</h2>
            <StatusBadge status="info" :label="profile.typeLabel" />
          </div>
        </template>
        <template #subtitle>
          <span class="text-sm font-medium text-[var(--color-text-sub)]">거래처 코드: {{ profile.code }}</span>
        </template>
        <template #actions>
          <button type="button" class="rounded-lg bg-[var(--color-olive)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95" @click="openPwModal"> 비밀번호 변경 </button>
        </template>
      </PageHeader>

      <div class="flex items-center justify-between border-b border-[var(--color-border-divider)] mb-6">
        <TabNav v-model="activeTab" :tabs="tabOptions" class="!border-0 !pb-0" />
      </div>

      <div v-if="activeTab === 'info'" class="grid gap-6 lg:grid-cols-2">
        <!-- 거래처 정보 -->
        <article class="flex flex-col rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <div class="mb-6 flex items-center justify-between gap-2 border-b border-[var(--color-border-divider)] pb-4">
            <h3 class="text-xl font-bold text-[var(--color-text-strong)]">기본 정보</h3>
            <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold" :class="isClientActive ? 'bg-[var(--color-olive-light)] text-[var(--color-olive-dark)]' : 'bg-[#F0D4D4] text-[var(--color-status-error)]'">
              <span class="h-2 w-2 rounded-full" :class="isClientActive ? 'bg-[var(--color-olive)]' : 'bg-[var(--color-status-error)]'" />
              <span>{{ clientStatusText }}</span>
            </div>
          </div>
          <dl class="space-y-4">
            <div class="flex items-center justify-between"><dt class="font-bold text-[#3d3529]">법인명</dt><dd class="font-semibold text-[var(--color-text-body)]">{{ profile.name }}</dd></div>
            <div class="flex items-center justify-between"><dt class="font-bold text-[#3d3529]">사업자번호</dt><dd class="font-medium text-[var(--color-text-body)]">{{ profile.bizNo }}</dd></div>
            <div class="flex items-center justify-between"><dt class="font-bold text-[#3d3529]">대표이름</dt><dd class="font-medium text-[var(--color-text-body)]">{{ profile.ceoName }}</dd></div>
            <div class="flex items-center justify-between"><dt class="font-bold text-[#3d3529]">회사 유선번호</dt><dd class="font-medium text-[var(--color-text-body)]">{{ profile.companyPhone }}</dd></div>
            <div class="flex flex-col gap-1">
              <dt class="font-bold text-[#3d3529]">주소</dt>
              <dd class="flex items-center justify-between gap-2 w-full text-sm font-medium leading-relaxed text-[var(--color-text-body)]">
                <span class="truncate">{{ profile.address }}</span>
                <span v-if="profile.zonecode" class="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white border border-[var(--color-border-card)] px-2 py-1 text-xs font-bold text-[var(--color-text-strong)] shadow-sm">
                  <span class="text-[10px] text-[var(--color-text-sub)] font-medium">우편번호</span>
                  {{ profile.zonecode }}
                </span>
              </dd>
            </div>
          </dl>
        </article>

        <!-- 담당자 정보 -->
        <article class="flex flex-col rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <h3 class="mb-6 border-b border-[var(--color-border-divider)] pb-4 text-xl font-bold text-[var(--color-text-strong)]">담당자 정보</h3>
          <dl class="space-y-4">
            <div class="flex items-center justify-between"><dt class="font-bold text-[#3d3529]">이름</dt><dd class="font-semibold text-[var(--color-text-body)]">{{ profile.managerName }}</dd></div>
            <div class="flex items-center justify-between"><dt class="font-bold text-[#3d3529]">연락처</dt><dd class="font-medium text-[var(--color-text-body)]">{{ profile.managerPhone }}</dd></div>
            <div class="flex items-center justify-between"><dt class="font-bold text-[#3d3529]">이메일</dt><dd class="font-medium text-[var(--color-text-body)] underline underline-offset-4">{{ profile.managerEmail }}</dd></div>
          </dl>
        </article>

        <!-- 거래 정보 (여신 정보 제외) -->
        <article class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm lg:col-span-1">
          <h3 class="mb-6 border-b border-[var(--color-border-divider)] pb-4 text-xl font-bold text-[var(--color-text-strong)]">거래 현황</h3>
          <div class="rounded-lg bg-[var(--color-bg-section)] p-4">
            <h4 class="mb-2 text-sm font-bold text-[var(--color-text-sub)] uppercase tracing-wider">이번달 거래 요약</h4>
            <p class="text-3xl font-black text-[var(--color-olive)]">{{ toCurrency(profile.monthlyAmount) }}</p>
            <div class="mt-3 flex gap-4 text-xs font-semibold text-[var(--color-text-body)]">
              <span>진행: <span class="text-[var(--color-orange)]">{{ profile.monthlyInProgress }}건</span></span>
              <span>완료: <span class="text-[var(--color-olive)]">{{ profile.monthlyDone }}건</span></span>
            </div>
          </div>
          <p class="mt-4 text-xs text-[var(--color-text-placeholder)]">* 상세 거래 내역은 거래 히스토리 탭에서 확인 가능합니다.</p>
        </article>

        <!-- 취급 품종 -->
        <article class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm lg:col-span-1">
          <h3 class="mb-6 border-b border-[var(--color-border-divider)] pb-4 text-xl font-bold text-[var(--color-text-strong)]">취급 품종</h3>
          <div class="flex flex-wrap gap-2">
            <div v-for="crop in profile.crops" :key="crop" class="rounded-full bg-[var(--color-olive-light)] px-4 py-1.5 text-sm font-semibold text-[var(--color-olive-dark)]">
              {{ crop }}
            </div>
            <div v-if="profile.crops.length === 0" class="flex w-full flex-col items-center justify-center py-4 text-sm text-[var(--color-text-placeholder)]">
              <span class="mb-1 text-2xl">🌿</span>
              등록된 품종이 없습니다.
            </div>
          </div>
        </article>
      </div>

      <div v-else class="space-y-4">
        <DealHistoryListPanel
          :title="`${profile.name}의 거래 히스토리`"
          :deals="clientDeals"
          :loading="historyStore.loading"
          :error="historyStore.error"
          :show-client-filter="false"
          search-placeholder="담당자명, deal 번호, 문서코드 검색"
          empty-title="거래 히스토리가 없습니다."
          empty-description="아직 진행된 거래가 없거나 조회 권한이 있는 히스토리가 없습니다."
          @retry="fetchClientHistory"
          @deal-focus="historyStore.ensureDealLogs"
          @open-detail="openPipelineDetail"
        />
      </div>
    </div>

    <!-- 비밀번호 수정 모달 -->
    <ModalBase v-model="isPwModalOpen" title="비밀번호 수정" width-class="max-w-xl">
      <div class="grid gap-4 p-2">
        <label class="block text-sm font-bold text-[var(--color-text-sub)]">기존 비밀번호
          <input v-model="pwForm.current" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="password" autocomplete="current-password" />
        </label>
        <label class="block text-sm font-bold text-[var(--color-text-sub)]">새 비밀번호
          <input v-model="pwForm.next" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="password" autocomplete="new-password" placeholder="8자 이상 입력" />
        </label>
        <label class="block text-sm font-bold text-[var(--color-text-sub)]">새 비밀번호 확인
          <input v-model="pwForm.nextConfirm" class="mt-1.5 h-11 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 text-[var(--color-text-body)] outline-none focus:border-[var(--color-olive)] shadow-sm" type="password" autocomplete="new-password" placeholder="한 번 더 입력" />
        </label>
        <p v-if="pwHint" class="text-sm font-medium text-[var(--color-orange)] animate-in fade-in duration-300">{{ pwHint }}</p>
      </div>

      <template #footer>
        <div class="flex w-full justify-end gap-3 p-2">
          <button
              type="button"
              class="h-11 px-6 rounded-lg border border-[var(--color-border-card)] bg-transparent text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)] whitespace-nowrap"
              @click="closePwModal"
          >
            취소
          </button>
          <button
              type="button"
              class="h-11 px-10 rounded-lg bg-[var(--color-olive)] text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95 whitespace-nowrap"
              @click="submitPassword"
          >
            변경 완료
          </button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
/* 유틸리티 클래스로 대체하여 스타일 태그 최소화 */
</style>
