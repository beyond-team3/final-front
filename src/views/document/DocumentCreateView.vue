<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import OrderModal from '@/components/document/OrderModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useDocumentStore } from '@/stores/document'
import { ROLES } from '@/utils/constants'

const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)
const showContractModal = ref(false)

// ================================================================
// [DUMMY] 계약서 더미 데이터
// TODO: API 연결 후 이 블록 전체 삭제할 것
// ================================================================
const DUMMY_CONTRACTS = [
  {
    id: 7,
    startDate: '2026-02-10',
    endDate: '2026-12-31',
    salesRep: { name: '김민수' },
    client: { id: 1, name: '그린팜유통', contact: '정호성' },
    items: [
      { id: 'P003', productId: 'P003', name: '고추 PR-21', variety: '고추', unit: '500립', unitPrice: 38000, minQty: 10, quantity: 0, amount: 0 },
      { id: 'P004', productId: 'P004', name: '토마토 TY-9', variety: '토마토', unit: '1,000립', unitPrice: 42000, minQty: 10, quantity: 0, amount: 0 },
    ],
  },
  {
    id: 3,
    startDate: '2026-02-08',
    endDate: '2026-12-31',
    salesRep: { name: '박지훈' },
    client: { id: 2, name: '청솔영농조합', contact: '오지은' },
    items: [
      { id: 'P001', productId: 'P001', name: '배추 BS-10', variety: '배추', unit: '5,000립', unitPrice: 27000, minQty: 5, quantity: 0, amount: 0 },
      { id: 'P002', productId: 'P002', name: '무 MR-5', variety: '무', unit: '3,000립', unitPrice: 22000, minQty: 5, quantity: 0, amount: 0 },
    ],
  },
]

// TODO: API 연결 후 아래 한 줄로 교체
//   const contractList = computed(() => documentStore.contracts)
const contractList = computed(() => DUMMY_CONTRACTS)
// ================================================================

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
        route: null,
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

const handleCardClick = (card) => {
  if (card.route) {
    router.push(card.route)
  } else {
    showContractModal.value = true
  }
}

const handleContractSelect = (contract) => {
  router.push({ path: '/documents/order', query: { contractId: contract.id } })
}
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
          @click="handleCardClick(card)"
      >
        <p class="mb-3 text-5xl">{{ card.icon }}</p>
        <h3 class="text-xl font-bold text-slate-800">{{ card.title }}</h3>
        <p class="mt-2 text-sm text-slate-500">{{ card.description }}</p>
      </button>
    </div>
  </section>

  <!-- OrderModal: contracts prop에 더미 데이터 주입 -->
  <!-- TODO: API 연결 후 :contracts="contractList" → :contracts="documentStore.contracts" 로 교체 -->
  <OrderModal
      v-model="showContractModal"
      :contracts="contractList"
      @select="handleContractSelect"
  />
</template>