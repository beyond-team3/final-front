<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useEmployeeStore } from '@/stores/employee'
import { ROLES } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const { currentEmployee: employee, loading, error } = storeToRefs(employeeStore)

const userLoginId = ref('')
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)

// --- 수정 모달 및 상태 관리 변수 추가 ---
const isEditModalOpen = ref(false)
const isStatusModalOpen = ref(false)
const nextStatus = ref('ACTIVE')

// 수정 폼 데이터 (거래처 방식과 동일함돠)
const editForm = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
})

const employeeId = computed(() => route.params.id)
const isEmployeeActive = computed(() => Boolean(employee.value?.isActive))
const employeeStatusText = computed(() => (isEmployeeActive.value ? '활성' : '비활성'))
const assignedClients = computed(() => Array.isArray(employee.value?.assignedClients) ? employee.value.assignedClients : [])
const assignedClientCount = computed(() => assignedClients.value.length)
const roleLabel = computed(() => {
  const role = String(employee.value?.role || '').toUpperCase()
  if (role === ROLES.ADMIN) return '관리자'
  if (role === ROLES.SALES_REP) return '영업사원'
  return employee.value?.role || '영업사원'
})

/**
 * 사원 및 계정 정보 호출
 */
const fetchEmployeeDetail = async () => {
  if (!employeeId.value) return
  try {
    await employeeStore.fetchEmployeeDetail(employeeId.value)
    try {
      const res = await axios.get(`http://localhost:3001/users`, {
        params: { refId: Number(employeeId.value) }
      })
      const matchedUser = res.data.find(u => u.role === 'SALES_REP' || u.role === 'ADMIN')
      if (matchedUser) {
        userLoginId.value = matchedUser.loginId
      } else {
        userLoginId.value = '계정 미등록'
      }
    } catch (err) {
      userLoginId.value = '정보 확인 불가'
    }
  } catch (e) {
    console.error('상세 조회 실패:', e)
  }
}

const displayAddress = ref('')

// --- 사원 정보 수정 로직 ---
const execDaumPostcode = () => {
  new window.daum.Postcode({
    oncomplete: (data) => {
      const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
      editForm.value.address = `${data.sido}/${addr}/${data.zonecode}`
      displayAddress.value = addr
    },
  }).open()
}

const openEditModal = () => {
  if (!employee.value || !isAdmin.value) return

  // 기존 주소 데이터 파싱 (sido/address/zonecode)
  const rawAddr = employee.value.address || ''
  if (rawAddr.includes('/')) {
    const parts = rawAddr.split('/')
    displayAddress.value = parts[1] || parts[0]
  } else {
    displayAddress.value = rawAddr
  }

  editForm.value = {
    name: employee.value.name,
    email: employee.value.email,
    phone: employee.value.phone,
    address: employee.value.address,
  }
  isEditModalOpen.value = true
}

const submitEdit = async () => {
  if (!employee.value) return
  try {
    // 스토어의 updateEmployee를 호출해 서버(db.json)를 업데이트함돠
    await employeeStore.updateEmployee(employeeId.value, { ...editForm.value })
    isEditModalOpen.value = false
    alert('사원 정보가 수정되었습니다.')
  } catch (e) {
    alert('수정 중 오류가 발생했슴돠.')
  }
}

// --- 활성화 관리 로직 ---
const openStatusModal = () => {
  if (!employee.value || !isAdmin.value) return
  nextStatus.value = isEmployeeActive.value ? 'INACTIVE' : 'ACTIVE'
  isStatusModalOpen.value = true
}

const applyStatus = async () => {
  if (!employee.value || !isAdmin.value) return
  try {
    const targetActive = nextStatus.value === 'ACTIVE'
    await employeeStore.toggleEmployeeActive(employeeId.value, targetActive)
    isStatusModalOpen.value = false
    await fetchEmployeeDetail()
  } catch (e) {
    console.error('상태 변경 실패:', e)
  }
}

const openClientDetail = (clientId) => {
  if (clientId == null) return
  router.push(`/clients/${clientId}`)
}

onMounted(fetchEmployeeDetail)
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8 text-[var(--font-body)]">
    <PageHeader title="사원 상세" :subtitle="employee?.employeeCode">
      <template #actions>
        <button
            type="button"
            class="h-10 rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
            @click="router.push('/employees')"
        >
          목록으로
        </button>
        <button
            v-if="isAdmin"
            type="button"
            class="h-10 rounded-lg bg-[var(--color-olive)] px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
            @click="openEditModal"
        >
          사원 수정
        </button>
        <button
            v-if="isAdmin"
            type="button"
            class="h-10 rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 text-sm font-bold text-[var(--color-text-strong)] transition-all hover:bg-[var(--color-bg-section)] active:scale-95"
            @click="openStatusModal"
        >
          활성화 관리
        </button>
      </template>
    </PageHeader>

    <LoadingSpinner v-if="loading" text="사원 상세를 불러오는 중입니다." />
    <ErrorMessage v-else-if="error" :message="error" @retry="fetchEmployeeDetail" />

    <article v-else-if="employee" class="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
      <!-- 사원 프로필 카드 -->
      <section class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="h-5 w-1.5 rounded-full bg-[var(--color-olive)]"></span>
            <h3 class="text-xl font-bold text-[var(--color-text-strong)]">사원 프로필</h3>
          </div>
          <div
              class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
              :class="isEmployeeActive ? 'bg-[var(--color-olive-light)] text-[var(--color-olive-dark)]' : 'bg-rose-50 text-[var(--color-status-error)]'"
          >
            <span class="h-2 w-2 rounded-full" :class="isEmployeeActive ? 'bg-[var(--color-olive)]' : 'bg-[var(--color-status-error)]'" />
            <span>{{ employeeStatusText }}</span>
          </div>
        </div>

        <dl class="grid gap-3 text-sm md:grid-cols-2">
          <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
            <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">사원 코드</dt>
            <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ employee.employeeCode }}</dd>
          </div>
          <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
            <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">사원명</dt>
            <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ employee.name }}</dd>
          </div>
          <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
            <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">역할</dt>
            <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ roleLabel }}</dd>
          </div>
          <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
            <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">이메일</dt>
            <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ employee.email }}</dd>
          </div>
          <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
            <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">전화번호</dt>
            <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ employee.phone }}</dd>
          </div>
          <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)]">
            <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">등록일시</dt>
            <dd class="text-base font-bold text-[var(--color-text-strong)]">{{ employee.createdAt }}</dd>
          </div>
          <div class="rounded-lg bg-[var(--color-bg-section)] p-3.5 border border-[var(--color-border-divider)] md:col-span-2">
            <dt class="text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1">주소</dt>
            <dd class="flex items-center justify-between gap-2 w-full text-base font-bold text-[var(--color-text-strong)]">
              <span class="truncate">{{ employee.displayAddressOnly }}</span>
              <span class="shrink-0 inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-xs font-bold text-[var(--color-olive)] border border-[var(--color-olive-light)] shadow-sm">
                <span class="text-[10px] text-[var(--color-olive-dark)] opacity-70 font-medium">우편번호</span>
                {{ employee.displayZonecode }}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- 담당 거래처 카드 -->
      <section class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="h-5 w-1.5 rounded-full bg-[var(--color-orange)]"></span>
            <h3 class="text-xl font-bold text-[var(--color-text-strong)]">담당 거래처</h3>
          </div>
          <span class="inline-flex items-center rounded-full bg-[var(--color-orange-light)] px-3 py-1 text-xs font-bold text-[var(--color-orange-dark)]">
            {{ assignedClientCount }}개
          </span>
        </div>

        <div v-if="assignedClientCount === 0" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-divider)] bg-[var(--color-bg-section)] px-4 py-12 text-center">
          <p class="text-sm font-medium text-[var(--color-text-sub)]">배정된 거래처가 없습니다.</p>
        </div>

        <div v-else class="overflow-hidden rounded-xl border border-[var(--color-border-divider)] bg-[var(--color-bg-card)]">
          <table class="w-full text-left text-sm">
            <thead class="bg-[var(--color-bg-section)] text-[var(--color-text-sub)]">
            <tr>
              <th class="px-5 py-3 font-bold uppercase tracking-wider">거래처 코드</th>
              <th class="px-5 py-3 font-bold uppercase tracking-wider">거래처명</th>
              <th class="px-5 py-3 font-bold uppercase tracking-wider">계정 활성화 상태</th>
              <th class="px-5 py-3 font-bold uppercase tracking-wider">마지막 로그인</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-divider)]">
            <tr
                v-for="client in assignedClients"
                :key="client.clientId"
                class="group cursor-pointer transition-colors hover:bg-[var(--color-bg-input)]"
                @click="openClientDetail(client.clientId)"
            >
              <td class="px-5 py-4 font-mono text-xs font-bold text-[var(--color-olive)]">
                {{ client.clientCode }}
              </td>
              <td class="px-5 py-4 font-bold text-[var(--color-text-strong)] group-hover:text-[var(--color-olive)] transition-colors">
                {{ client.clientName }}
              </td>
              <td class="px-5 py-4">
                <StatusBadge
                    :status="client.accountStatus === 'ACTIVE' ? 'success' : 'danger'"
                    :label="client.accountStatus === 'ACTIVE' ? '활성' : '비활성'"
                />
              </td>
              <td class="px-5 py-4 font-medium text-[var(--color-text-sub)]">
                {{ client.lastLoginAt || '-' }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>
    </article>

    <EmptyState v-else title="해당 사원을 찾을 수 없습니다." />

    <!-- 사원 정보 수정 모달 -->
    <ModalBase v-model="isEditModalOpen" title="사원 정보 수정" width-class="max-w-xl">
      <form class="space-y-4 pt-2" @submit.prevent="submitEdit">
        <label class="block">
          <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1.5">사원명</span>
          <input v-model="editForm.name" class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all" type="text" required />
        </label>
        <label class="block">
          <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1.5">이메일</span>
          <input v-model="editForm.email" class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all" type="email" required />
        </label>
        <label class="block">
          <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1.5">전화번호</span>
          <input v-model="editForm.phone" class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all" type="text" required />
        </label>
        <div class="block">
          <span class="block text-xs font-bold text-[var(--color-text-sub)] uppercase mb-1.5">주소</span>
          <div class="flex gap-2">
            <input
                v-model="displayAddress"
                class="h-11 flex-1 rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-base)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] transition-all cursor-not-allowed"
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
      </form>
      <template #footer>
        <div class="flex justify-end gap-3 p-2">
          <button type="button" class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]" @click="isEditModalOpen = false">취소</button>
          <button type="button" class="rounded-lg bg-[var(--color-olive)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-olive-dark)] active:scale-95" @click="submitEdit">사원 정보 저장</button>
        </div>
      </template>
    </ModalBase>

    <!-- 활성화 상태 변경 모달 -->
    <ModalBase v-model="isStatusModalOpen" title="활성화 상태 변경" width-class="max-w-lg">
      <div class="space-y-4 p-2">
        <p class="text-sm font-medium text-[var(--color-text-body)]">사원의 서비스 이용 상태를 설정합니다.</p>
        <div class="grid gap-3">
          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-4 transition-all hover:border-[var(--color-olive)]">
            <input v-model="nextStatus" type="radio" value="ACTIVE" class="h-5 w-5 accent-[var(--color-olive)]" />
            <div>
              <strong class="block text-base text-[var(--color-text-strong)]">활성 상태로 변경</strong>
              <span class="text-xs text-[var(--color-text-sub)]">시스템의 모든 기능을 정상적으로 이용할 수 있습니다.</span>
            </div>
          </label>
          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] p-4 transition-all hover:border-[var(--color-status-error)]">
            <input v-model="nextStatus" type="radio" value="INACTIVE" class="h-5 w-5 accent-[var(--color-status-error)]" />
            <div>
              <strong class="block text-base text-[var(--color-text-strong)]">비활성 상태로 변경</strong>
              <span class="text-xs text-[var(--color-text-sub)]">시스템 이용이 제한되며 일부 정보 접근이 불가능할 수 있습니다.</span>
            </div>
          </label>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 p-2">
          <button type="button" class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]" @click="isStatusModalOpen = false">취소</button>
          <button type="button" class="rounded-lg bg-[var(--color-text-strong)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95" @click="applyStatus">상태 적용하기</button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
h3 {
  font-family: var(--font-body);
}
</style>
