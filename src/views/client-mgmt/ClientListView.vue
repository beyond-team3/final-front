<script setup>
import { computed, onMounted, ref } from 'vue'
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

  if (text.includes('서울')) {
    return '서울'
  }
  if (text.includes('경기')) {
    return '경기'
  }
  if (text.includes('충청') || text.includes('충북') || text.includes('충남')) {
    return '충청'
  }
  return '기타'
}

const filteredClients = computed(() => {
  const lowerKeyword = keyword.value.trim().toLowerCase()

  return clients.value.filter((client) => {
    const clientRegion = getRegion(client.address || client.region)
    const matchKeyword =
      !lowerKeyword ||
      [client.name, client.bizNo, client.managerName]
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
    // error state is managed by store
  }
}

onMounted(fetchClients)
</script>

<template>
  <section class="mx-auto max-w-[1200px]">
    <header class="mb-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">거래처 관리</h1>
          <p class="mt-1 text-sm text-slate-500">거래처 정보를 관리하세요</p>
        </div>
        <button
          v-if="isAdmin"
          type="button"
          class="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          @click="router.push('/clients/register')"
        >
          + 거래처 등록
        </button>
      </div>
    </header>

    <section class="mb-6 rounded-lg bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-4">
        <input
          v-model="keyword"
          type="text"
          class="h-10 min-w-72 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
          placeholder="거래처명, 사업자번호 등으로 검색"
        />
        <select v-model="region" class="h-10 rounded-lg border border-slate-300 px-3 text-sm">
          <option value="">전체 지역</option>
          <option value="서울">서울</option>
          <option value="경기">경기</option>
          <option value="충청">충청</option>
        </select>
        <select v-model="type" class="h-10 rounded-lg border border-slate-300 px-3 text-sm">
          <option value="">전체 유형</option>
          <option value="NURSERY">육묘장</option>
          <option value="DISTRIBUTOR">대리점</option>
        </select>
        <button type="button" class="h-10 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700">
          검색
        </button>
      </div>
    </section>

    <LoadingSpinner v-if="loading" text="거래처 목록을 불러오는 중입니다." />

    <ErrorMessage v-else-if="error" :message="error" @retry="fetchClients" />

    <EmptyState
      v-else-if="filteredClients.length === 0"
      title="조회 가능한 거래처가 없습니다."
      description="검색 조건을 변경하거나 잠시 후 다시 시도해주세요."
    />

    <section v-else class="overflow-hidden rounded-lg bg-white shadow-sm">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="px-6 py-4 text-left font-medium">거래처명</th>
            <th class="px-6 py-4 text-left font-medium">사업자번호</th>
            <th class="px-6 py-4 text-left font-medium">유형</th>
            <th class="px-6 py-4 text-left font-medium">담당자</th>
            <th class="px-6 py-4 text-left font-medium">지역</th>
            <th class="px-6 py-4 text-left font-medium">상태</th>
            <th class="px-6 py-4 text-left font-medium">액션</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="client in filteredClients"
            :key="client.id"
            class="border-t border-slate-200 hover:bg-slate-50"
          >
            <td class="px-6 py-4 font-semibold text-slate-900">{{ client.name }}</td>
            <td class="px-6 py-4 text-slate-900">{{ client.bizNo }}</td>
            <td class="px-6 py-4">
              <span class="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-900">{{ client.typeLabel }}</span>
            </td>
            <td class="px-6 py-4 text-slate-900">{{ client.managerName }}</td>
            <td class="px-6 py-4 text-slate-900">{{ getRegion(client.address || client.region) }}</td>
            <td class="px-6 py-4">
              <StatusBadge
                :status="client.isActive ? 'success' : 'danger'"
                :label="client.isActive ? '활성' : '비활성'"
              />
            </td>
            <td class="px-6 py-4">
              <button
                type="button"
                class="rounded px-1 py-1 text-sm text-blue-600 hover:bg-blue-50"
                @click="openDetail(client.id)"
              >
                보기
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>
