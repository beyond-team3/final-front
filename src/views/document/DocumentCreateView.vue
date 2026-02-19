<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import OrderModal from '@/components/document/OrderModal.vue'  // 추가
import { useAuthStore } from '@/stores/auth'
import { useDocumentStore } from '@/stores/document'
import { ROLES } from '@/utils/constants'

const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)

const showContractModal = ref(false)  // 모달 상태만 남김

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

  <!-- OrderModal 컴포넌트 사용 -->
  <OrderModal
      v-model="showContractModal"
      :contracts="documentStore.contracts"
      @select="handleContractSelect"
  />
</template>