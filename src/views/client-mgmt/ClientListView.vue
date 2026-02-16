<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useClientStore } from '@/stores/client'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const router = useRouter()
const clientStore = useClientStore()
const authStore = useAuthStore()

const keyword = ref('')
const region = ref('')
const type = ref('')
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)

const getRegion = (address) => {
  if (address.includes('서울')) {
    return '서울'
  }
  if (address.includes('경기')) {
    return '경기'
  }
  if (address.includes('충청') || address.includes('충북') || address.includes('충남')) {
    return '충청'
  }
  return '기타'
}

const filteredClients = computed(() => {
  const lowerKeyword = keyword.value.trim().toLowerCase()

  return clientStore.clients.filter((client) => {
    const clientRegion = getRegion(client.address)
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

    <section class="overflow-hidden rounded-lg bg-white shadow-sm">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="px-6 py-4 text-left font-medium">거래처명</th>
            <th class="px-6 py-4 text-left font-medium">사업자번호</th>
            <th class="px-6 py-4 text-left font-medium">유형</th>
            <th class="px-6 py-4 text-left font-medium">담당자</th>
            <th class="px-6 py-4 text-left font-medium">주소</th>
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
            <td class="px-6 py-4 text-slate-900">{{ getRegion(client.address) }}</td>
            <td class="px-6 py-4">
              <span class="inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-900">
                {{ client.status === 'active' ? '사용중' : '대기' }}
              </span>
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
          <tr v-if="filteredClients.length === 0">
            <td colspan="7" class="px-6 py-8 text-center text-sm text-slate-400">조회 가능한 거래처가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>
