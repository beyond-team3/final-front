<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useClientStore } from '@/stores/client'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const router = useRouter()
const clientStore = useClientStore()
const authStore = useAuthStore()
const { clients, loading, error } = storeToRefs(clientStore)

const keyword = ref('')
const region = ref('')
const type = ref('')
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)

const getRegion = (address) => {
  const text = String(address || '')
  if (text.includes('서울')) return '서울'
  if (text.includes('경기')) return '경기'
  if (text.includes('충청') || text.includes('충북') || text.includes('충남')) return '충청'
  return '기타'
}

/**
 * [핵심 수정] 권한 및 검색 필터 로직
 */
const filteredClients = computed(() => {
  let baseClients = clients?.value || []

  if (!isAdmin.value) {
    const myId = authStore.me?.refId

    // 디버깅 로그
    console.log('현재 로그인 유저(me)의 refId:', myId);

    if (myId !== undefined && myId !== null) {
      baseClients = (clients?.value || []).filter((client) => Number(client.managerId) === Number(myId))
    } else {
      console.warn('유저 정보를 찾을 수 없습니다.');
      return []
    }
  }

  const lowerKeyword = keyword.value.trim().toLowerCase()

  return baseClients.filter((client) => {
    const clientRegion = getRegion(client.address || client.region)
    const matchKeyword =
        !lowerKeyword ||
        [client.code, client.name, client.managerName]
            .join(' ')
            .toLowerCase()
            .includes(lowerKeyword)
    const matchRegion = !region.value || clientRegion === region.value
    const matchType = !type.value || client.type === type.value

    return matchKeyword && matchRegion && matchType
  })
})

const openDetail = (id) => {
  router.push(`/clients/${id}`)
}

const fetchClients = async () => {
  try {
    await clientStore.fetchClients()
  } catch (e) {
    // error managed by store
  }
}

// 커스텀 드롭다운 상태 관리
const activeDropdown = ref(null)
const dropdownContainer = ref(null)

const toggleDropdown = (key) => {
  activeDropdown.value = activeDropdown.value === key ? null : key
}

const selectRegion = (val) => {
  region.value = val
  activeDropdown.value = null
}

const selectType = (val) => {
  type.value = val
  activeDropdown.value = null
}

const handleClickOutside = (event) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target)) {
    activeDropdown.value = null
  }
}

onMounted(() => {
  fetchClients()
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <section class="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-8">
    <div class="mx-auto max-w-[1200px] space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-[var(--color-text-strong)]">거래처 관리</h1>
          <p class="mt-1 text-sm text-[var(--color-text-sub)]">
            {{ isAdmin ? '전체 거래처를 효율적으로 관리합니다.' : '내 담당 거래처 정보를 한눈에 관리합니다.' }}
          </p>
        </div>
        <div v-if="isAdmin" class="flex gap-2">
          <button
              type="button"
              class="rounded-lg border border-[var(--color-border-card)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text-body)] transition-colors hover:bg-[var(--color-bg-section)]"
              @click="router.push({ path: '/users/register', query: { role: 'CLIENT' } })"
          >
            + 계정 등록
          </button>
          <button
              type="button"
              class="rounded-lg bg-[var(--color-olive)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--color-olive-dark)] active:scale-95"
              @click="router.push('/clients/register')"
          >
            + 거래처 등록
          </button>
        </div>
      </header>

      <section class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-5 shadow-sm">
        <div class="flex flex-wrap items-center gap-4" ref="dropdownContainer">
          <div class="flex-1 min-w-[300px]">
            <input
                v-model="keyword"
                type="text"
                class="h-11 w-full rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-input)] px-4 text-sm text-[var(--color-text-body)] outline-none focus:ring-1 focus:ring-[var(--color-olive)] focus:border-[var(--color-olive)] placeholder:[var(--color-text-placeholder)] shadow-sm transition-all"
                placeholder="거래처 코드, 거래처명, 담당자 이름으로 검색"
            />
          </div>

          <!-- 지역 필터 커스텀 드롭다운 -->
          <div class="relative min-w-[120px]">
            <div
                class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
                :class="activeDropdown === 'region' ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-divider)]'"
                @click="toggleDropdown('region')"
            >
              <span class="font-bold text-sm text-[var(--color-text-strong)]">{{ region || '전체 지역' }}</span>
              <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'region' }">▼</span>
            </div>
            <ul v-if="activeDropdown === 'region'" class="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0">
              <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="!region ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'" @click="selectRegion('')">전체 지역</li>
              <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="region === '서울' ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'" @click="selectRegion('서울')">서울</li>
              <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="region === '경기' ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'" @click="selectRegion('경기')">경기</li>
              <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="region === '충청' ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'" @click="selectRegion('충청')">충청</li>
            </ul>
          </div>

          <!-- 유형 필터 커스텀 드롭다운 -->
          <div class="relative min-w-[120px]">
            <div
                class="h-11 w-full rounded-lg border bg-[var(--color-bg-input)] px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm"
                :class="activeDropdown === 'type' ? 'border-[var(--color-olive)] ring-1 ring-[var(--color-olive)]' : 'border-[var(--color-border-divider)]'"
                @click="toggleDropdown('type')"
            >
              <span class="font-bold text-sm text-[var(--color-text-strong)]">{{ type === 'NURSERY' ? '육묘장' : type === 'DISTRIBUTOR' ? '대리점' : '전체 유형' }}</span>
              <span class="text-[var(--color-text-sub)] text-xs transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'type' }">▼</span>
            </div>
            <ul v-if="activeDropdown === 'type'" class="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-input)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-200 list-none m-0 p-0">
              <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="!type ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'" @click="selectType('')">전체 유형</li>
              <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="type === 'NURSERY' ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'" @click="selectType('NURSERY')">육묘장</li>
              <li class="px-4 py-2.5 text-sm cursor-pointer transition-colors" :class="type === 'DISTRIBUTOR' ? 'bg-[#C8D4A0] font-bold text-[var(--color-text-strong)]' : 'text-[var(--color-text-body)] hover:bg-[#EFEADF]'" @click="selectType('DISTRIBUTOR')">대리점</li>
            </ul>
          </div>

        </div>
      </section>

      <LoadingSpinner v-if="loading" text="거래처 목록을 불러오는 중입니다." />
      <ErrorMessage v-else-if="error" :message="error" @retry="fetchClients" />

      <EmptyState
          v-else-if="filteredClients.length === 0"
          title="조회 가능한 거래처가 없습니다."
          description="담당 거래처가 없거나 검색 조건에 맞는 결과가 없습니다."
      />

      <section v-else class="overflow-hidden rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead class="bg-[var(--color-bg-section)] text-[var(--color-text-sub)]">
            <tr>
              <th class="w-[120px] px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">거래처 코드</th>
              <th class="px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">거래처명</th>
              <th class="px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">거래처 타입</th>
              <th class="px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">담당자</th>
              <th class="px-6 py-4 text-left font-bold uppercase tracking-wider whitespace-nowrap">지역</th>
              <th class="w-[110px] px-6 py-4 text-center font-bold uppercase tracking-wider whitespace-nowrap">상태</th>
              <th class="w-[100px] px-6 py-4 text-center font-bold uppercase tracking-wider whitespace-nowrap">액션</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-divider)]">
            <tr
                v-for="client in filteredClients"
                :key="client.id"
                class="transition-colors hover:bg-[var(--color-bg-section)]/50 cursor-pointer"
                @click="openDetail(client.id)"
            >
              <td class="px-6 py-4 font-mono text-xs font-bold text-[var(--color-olive)] whitespace-nowrap">{{ client.code }}</td>
              <td class="px-6 py-4 font-bold text-[var(--color-text-strong)] whitespace-nowrap">{{ client.name }}</td>
              <td class="px-6 py-4 font-medium text-[var(--color-text-body)] whitespace-nowrap">
                {{ client.typeLabel }}
              </td>
              <td class="px-6 py-4 text-[var(--color-text-body)] whitespace-nowrap">{{ client.managerName }}</td>
              <td class="px-6 py-4 text-[var(--color-text-body)] whitespace-nowrap">{{ client.displaySido }}</td>
              <td class="px-6 py-4 text-center whitespace-nowrap">
                <StatusBadge
                    :status="client.isActive ? 'APPROVED' : 'REJECTED'"
                    :label="client.isActive ? '활성' : '비활성'"
                />
              </td>
              <td class="px-6 py-4 text-center whitespace-nowrap">
                <button
                    type="button"
                    class="rounded-full bg-[var(--color-bg-base)] px-4 py-1.5 text-xs font-bold text-[var(--color-text-body)] transition-all hover:bg-[var(--color-olive)] hover:text-white"
                >
                  조회
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>
<style scoped>
h1 {
  font-family: var(--font-body);
}
</style>
