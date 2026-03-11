<script setup>
import { computed, ref, onMounted } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ModalBase from '@/components/common/ModalBase.vue'
import { usePaymentStore } from '@/stores/paymentStore'

const paymentStore = usePaymentStore()

// Local state
const selectedInvId = ref(null)
const selectedMethod = ref('')
const successOpen = ref(false)
const successMessage = ref('')
const errorOpen = ref(false)
const errorMessage = ref('')
const isProcessing = ref(false)
const isLoading = ref(true)

const methodLabels = {
  TRANSFER: '계좌이체',
  VBANK: '가상계좌',
  CARD: '신용카드',
}

const methodMap = {
  'vbank': 'VBANK',
  'card': 'CARD',
  'transfer': 'TRANSFER',
}

// Store에서 invoices 데이터 가져오기
// API 응답: { paymentId, paymentCode, invoiceId, invoiceCode, paymentAmount, paymentMethod, status, createdAt }
const invoices = computed(() => {
  return paymentStore.pendingPayments.map(payment => ({
    id: payment.invoiceCode,
    invoiceId: payment.invoiceId,
    paymentId: payment.paymentId,
    paymentCode: payment.paymentCode,
    // 거래처명과 주문번호는 백엔드에서 안 주므로 임시로 처리
    company: `거래처-${payment.paymentId}`,
    supply: payment.paymentAmount ? Math.round(payment.paymentAmount / 1.1) : 0,
    orderNo: `ORD-${payment.invoiceCode.substring(5)}`,
    issueDate: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '') : '-',
    status: 'unpaid'
  }))
})

const selectedInvoice = computed(() => invoices.value.find((inv) => inv.id === selectedInvId.value) || null)
const unpaidInvoices = computed(() => invoices.value.filter((inv) => inv.status === 'unpaid'))

const totals = computed(() => {
  if (!selectedInvoice.value) {
    return { supply: 0, tax: 0, total: 0 }
  }
  const supply = selectedInvoice.value.supply
  const tax = Math.round(supply * 0.1)
  return { supply, tax, total: supply + tax }
})

const canPay = computed(() => Boolean(selectedInvoice.value && selectedMethod.value && !isProcessing.value))

const selectInvoice = (id) => {
  const invoice = invoices.value.find((item) => item.id === id)
  if (!invoice || invoice.status === 'paid') {
    return
  }
  selectedInvId.value = id
  selectedMethod.value = ''
}

const resetSelection = () => {
  selectedInvId.value = null
  selectedMethod.value = ''
}

const handlePay = async () => {
  if (!canPay.value || !selectedInvoice.value) {
    return
  }

  isProcessing.value = true

  try {
    const result = await paymentStore.executePayment({
      invoiceId: selectedInvoice.value.invoiceId,
      paymentMethod: methodMap[selectedMethod.value],
    })

    if (result) {
      const now = new Date().toLocaleString('ko-KR')
      successMessage.value = `${selectedInvoice.value.id} / ${methodLabels[methodMap[selectedMethod.value]]} / ₩${totals.value.total.toLocaleString()} (${now})`
      successOpen.value = true
      await loadInvoices()
    } else {
      errorMessage.value = paymentStore.error || '결제 처리 중 오류가 발생했습니다.'
      errorOpen.value = true
    }
  } catch (err) {
    errorMessage.value = err.message || '결제 처리 중 오류가 발생했습니다.'
    errorOpen.value = true
    console.error('Payment error:', err)
  } finally {
    isProcessing.value = false
  }
}

const closeSuccess = () => {
  successOpen.value = false
  resetSelection()
}

const closeError = () => {
  errorOpen.value = false
  paymentStore.clearError()
}

const loadInvoices = async () => {
  isLoading.value = true
  try {
    await paymentStore.fetchMyPayments()
  } catch (err) {
    console.error('Failed to load invoices:', err)
    errorMessage.value = '청구서 목록을 불러올 수 없습니다.'
    errorOpen.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadInvoices()
})
</script>

<template>
  <section class="screen-content">
    <PageHeader title="결제 관리" subtitle="청구서를 선택하고 결제 처리하세요." />

    <div class="layout">
      <section class="card">
        <h3>미결제 청구서</h3>

        <div v-if="isLoading" class="empty">청구서를 불러오는 중입니다...</div>
        <div v-else-if="unpaidInvoices.length === 0" class="empty">미결제 청구서가 없습니다.</div>

        <table v-else class="table">
          <thead>
          <tr>
            <th>번호</th>
            <th>거래처</th>
            <th class="right">금액(부가세 포함)</th>
            <th>발행일</th>
            <th>상태</th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="invoice in invoices"
              :key="invoice.id"
              :class="{ selected: invoice.id === selectedInvId, paid: invoice.status === 'paid' }"
              @click="selectInvoice(invoice.id)"
          >
            <td>{{ invoice.id }}<br><small>{{ invoice.orderNo }}</small></td>
            <td>{{ invoice.company }}</td>
            <td class="right">₩{{ (invoice.supply + Math.round(invoice.supply * 0.1)).toLocaleString() }}</td>
            <td>{{ invoice.issueDate }}</td>
            <td>
                <span class="status" :class="invoice.status === 'paid' ? 'paid' : 'unpaid'">
                  {{ invoice.status === 'paid' ? '결제완료' : '미결제' }}
                </span>
            </td>
          </tr>
          </tbody>
        </table>
      </section>

      <section class="card">
        <h3>결제 상세</h3>

        <div class="rows">
          <p><span>청구서</span>{{ selectedInvoice?.id || '-' }}</p>
          <p><span>공급가액</span>{{ totals.supply ? `₩${totals.supply.toLocaleString()}` : '-' }}</p>
          <p><span>부가세</span>{{ totals.tax ? `₩${totals.tax.toLocaleString()}` : '-' }}</p>
          <p class="total"><span>총 결제금액</span>{{ totals.total ? `₩${totals.total.toLocaleString()}` : '-' }}</p>
        </div>

        <div class="method-grid">
          <button
              type="button"
              class="method"
              :class="{ active: selectedMethod === 'vbank' }"
              @click="selectedMethod = 'vbank'"
              :disabled="!selectedInvoice"
          >
            가상계좌
          </button>
          <button
              type="button"
              class="method"
              :class="{ active: selectedMethod === 'card' }"
              @click="selectedMethod = 'card'"
              :disabled="!selectedInvoice"
          >
            신용카드
          </button>
          <button
              type="button"
              class="method"
              :class="{ active: selectedMethod === 'transfer' }"
              @click="selectedMethod = 'transfer'"
              :disabled="!selectedInvoice"
          >
            계좌이체
          </button>
        </div>

        <div class="actions">
          <button type="button" class="btn-sub" @click="resetSelection">취소</button>
          <button
              type="button"
              class="btn-primary"
              :disabled="!canPay"
              @click="handlePay"
          >
            {{ isProcessing ? '처리 중...' : '결제 실행' }}
          </button>
        </div>
      </section>
    </div>

    <ModalBase v-model="successOpen" title="결제 완료" width-class="max-w-lg" :close-on-backdrop="false">
      <p class="success-text">결제가 정상 처리되었습니다.</p>
      <p class="success-message">{{ successMessage }}</p>

      <template #footer>
        <div class="flex justify-end">
          <button type="button" class="btn-primary" @click="closeSuccess">확인</button>
        </div>
      </template>
    </ModalBase>

    <ModalBase v-model="errorOpen" title="결제 실패" width-class="max-w-lg" :close-on-backdrop="false">
      <p class="error-text">결제 처리 중 오류가 발생했습니다.</p>
      <p class="error-message">{{ errorMessage }}</p>

      <template #footer>
        <div class="flex justify-end">
          <button type="button" class="btn-primary" @click="closeError">확인</button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 1.35fr 1fr; gap: 16px; }
.card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 14px; }
.card h3 { font-size: 15px; color: var(--color-text); font-weight: 700; margin-bottom: 10px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; color: var(--color-muted); font-weight: 700; border-bottom: 1px solid var(--color-border); padding: 8px; }
.table td { padding: 10px 8px; border-bottom: 1px solid #eef2f7; color: #334155; }
.table .right { text-align: right; }
.table tr { cursor: pointer; }
.table tr.selected { background: #f0f9ff; }
.table tr.paid { background: #f8fafc; color: #94a3b8; cursor: default; }
.status { border-radius: 999px; padding: 3px 8px; font-size: 11px; font-weight: 700; }
.status.unpaid { background: #fef3c7; color: #92400e; }
.status.paid { background: #dcfce7; color: #166534; }
.empty { color: #94a3b8; padding: 30px 8px; text-align: center; }
.rows { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px; }
.rows p { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; color: #334155; }
.rows p span { color: #64748b; font-weight: 700; }
.rows p.total { border-top: 1px solid var(--color-border); margin-top: 4px; padding-top: 10px; font-size: 14px; font-weight: 800; }
.method-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.method { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 10px 8px; background: #fff; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; transition: all 0.2s; }
.method:disabled { opacity: 0.5; cursor: not-allowed; }
.method.active { border-color: var(--color-accent); background: #fdf0ea; color: var(--color-accent); }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.success-text { font-size: 15px; color: var(--color-text); font-weight: 700; }
.success-message { margin-top: 8px; font-size: 13px; color: #475569; }
.error-text { font-size: 15px; color: #991b1b; font-weight: 700; }
.error-message { margin-top: 8px; font-size: 13px; color: #7c2d12; }
@media (max-width: 1040px) { .layout { grid-template-columns: 1fr; } }
</style>