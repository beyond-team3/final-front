<script setup>
import { computed, ref } from 'vue'  // ref 추가
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useDocumentStore } from '@/stores/document'  // 추가
import { ROLES } from '@/utils/constants'

const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()  // 추가

const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)

//모달 관련 상태
const showContractModal = ref(false)
const contractSearch = ref('')

const filteredContracts = computed(() => {
  const q = contractSearch.value.toLowerCase()
  if (!q) return documentStore.contracts ?? []
  return (documentStore.contracts ?? []).filter(
      (c) =>
          c.id?.toLowerCase().includes(q) ||
          c.client?.name?.toLowerCase().includes(q) ||
          c.client?.contact?.toLowerCase().includes(q),
  )
})

const openOrderModal = () => {
  contractSearch.value = ''
  showContractModal.value = true
}

const selectContract = (contract) => {
  showContractModal.value = false
  router.push({ path: '/documents/order', query: { contractId: contract.id } })
}

const cards = computed(() => {
  if (isClient.value) {
    return [
      {
        key: 'request',
        icon: '📄',
        title: '견적 요청서 작성',
        description: '신규 견적 요청서를 작성합니다.',
        route: '/documents/request',
      },
      {
        key: 'order',
        icon: '🛒',
        title: '주문서 작성',
        description: '계약서를 선택하여 주문서를 작성합니다.',
        route: null
      },
    ]
  }

  return [
    {
      key: 'quotation',
      icon: '🧾',
      title: '견적서 작성',
      description: '거래처 선택 후 견적서 작성',
      route: '/documents/quotation',
    },
    {
      key: 'contract',
      icon: '🤝',
      title: '계약서 작성',
      description: '견적서 기반 계약서 작성',
      route: '/documents/contract',
    },
    {
      key: 'invoice',
      icon: '💵',
      title: '청구서 작성',
      description: '주문/계약 기반 청구서 작성',
      route: '/documents/invoices',
    },
  ]
})

const pageTitle = computed(() => (isClient.value ? '문서 작성' : '영업 문서 작성'))
const subtitle = computed(() => (isClient.value ? '견적 요청서 또는 주문서를 선택하세요.' : '작성할 문서 유형을 선택하세요.'))
</script>

<template>
  <section>
    <PageHeader :title="pageTitle" :subtitle="subtitle" />

    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <button
          v-for="card in cards"
          :key="card.key"
          type="button"
          class="rounded-xl border border-slate-300 bg-white p-10 text-center transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg"
          @click="card.route ? router.push(card.route) : openOrderModal()"
      >
        <p class="mb-3 text-5xl">{{ card.icon }}</p>
        <h3 class="text-xl font-bold text-slate-800">{{ card.title }}</h3>
        <p class="mt-2 text-sm text-slate-500">{{ card.description }}</p>
      </button>
    </div>
  </section>

  <!-- 추가: 계약서 선택 모달 (수정본과 동일) -->
  <Teleport to="body">
    <div v-if="showContractModal" class="ct-backdrop" @click.self="showContractModal = false">
      <div class="ct-box">
        <div class="ct-header">
          <h3>계약서 선택</h3>
          <button @click="showContractModal = false">✕</button>
        </div>
        <div class="ct-body">
          <p class="ct-hint">* 주문서는 체결된 계약서를 기반으로 작성됩니다.</p>
          <input v-model="contractSearch" type="text" class="ct-search" placeholder="계약번호, 거래처명, 담당자 검색…" />
          <div class="ct-table-wrap">
            <table class="ct-table">
              <thead>
              <tr>
                <th>계약번호</th>
                <th>계약기간</th>
                <th>거래처</th>
                <th>담당자</th>
                <th>선택</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="contract in filteredContracts" :key="contract.id" class="ct-row" @click="selectContract(contract)">
                <td class="ct-id">{{ contract.id }}</td>
                <td>{{ contract.startDate || '-' }} ~ {{ contract.endDate || '-' }}</td>
                <td class="ct-bold">{{ contract.client?.name || '-' }}</td>
                <td class="ct-muted">{{ contract.client?.contact || '-' }}</td>
                <td><button class="ct-btn" @click.stop="selectContract(contract)">선택</button></td>
              </tr>
              <tr v-if="filteredContracts.length === 0">
                <td colspan="5" class="ct-empty">검색 결과가 없습니다.</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>


<style>
.ct-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ct-box {
  background: white;
  width: 750px;
  max-width: calc(100vw - 40px);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.ct-header {
  padding: 15px 20px;
  background: #2c3e50;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.ct-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
.ct-header button { background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.8; line-height: 1; }
.ct-header button:hover { opacity: 1; }
.ct-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; flex: 1; }
.ct-hint { font-size: 13px; color: #666; flex-shrink: 0; }
.ct-search {
  height: 40px; padding: 0 12px; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 14px; outline: none; width: 100%; flex-shrink: 0; font-family: inherit;
}
.ct-search:focus { border-color: #3498db; box-shadow: 0 0 0 3px rgba(52,152,219,0.15); }
.ct-table-wrap { overflow-y: auto; flex: 1; border: 1px solid #dee2e6; border-radius: 6px; }
.ct-table { width: 100%; border-collapse: collapse; }
.ct-table thead { position: sticky; top: 0; z-index: 5; }
.ct-table th { background: #f8f9fa; height: 45px; padding: 0 12px; border-bottom: 2px solid #dee2e6; text-align: left; font-size: 13px; font-weight: 600; color: #495057; }
.ct-table td { height: 50px; padding: 0 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333; vertical-align: middle; }
.ct-row { cursor: pointer; }
.ct-row:hover td { background: #f0f7ff; }
.ct-id { color: #2563eb; font-weight: 700; font-family: monospace; }
.ct-bold { font-weight: 600; }
.ct-muted { color: #888; }
.ct-empty { text-align: center; padding: 40px; color: #aaa; }
.ct-btn { padding: 6px 16px; border-radius: 4px; border: none; cursor: pointer; font-weight: 500; font-size: 13px; background: #3498db; color: white; }
.ct-btn:hover { background: #2980b9; }
</style>