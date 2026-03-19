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
  CASH: '현금',
  CREDIT_CARD: '신용카드',
}

const methodMap = {
  'cash': 'CASH',
  'card': 'CREDIT_CARD',
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
    supply: payment.paymentAmount ? Math.round(payment.paymentAmount / 1.1) : 0,
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
  if (!canPay.value || !selectedInvoice.value) return

  isProcessing.value = true

  // 결제 전에 미리 저장
  const invoiceSnapshot = { ...selectedInvoice.value }
  const methodSnapshot = selectedMethod.value

  try {
    const result = await paymentStore.executePayment({
      invoiceId: selectedInvoice.value.invoiceId,
      paymentMethod: methodMap[selectedMethod.value],
    })

    if (result) {
      const now = new Date().toLocaleString('ko-KR')
      successMessage.value = `${invoiceSnapshot.id} / ${methodLabels[methodMap[methodSnapshot]]} / ₩${totals.value.total.toLocaleString()} (${now})`
      successOpen.value = true
      await loadInvoices()
    } else {
      errorMessage.value = paymentStore.error || '결제 처리 중 오류가 발생했습니다.'
      errorOpen.value = true
    }
  } catch (err) {
    errorMessage.value = err.message || '결제 처리 중 오류가 발생했습니다.'
    errorOpen.value = true
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
            <th>청구서코드</th>
            <th>결제코드</th>
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
            <td>{{ invoice.id }}</td>
            <td>{{ invoice.paymentCode }}</td>
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
              :class="{ active: selectedMethod === 'cash' }"
              @click="selectedMethod = 'cash'"
              :disabled="!selectedInvoice"
          >
            현금
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
          <button
              type="button"
              class="rounded border px-4 py-2 text-sm font-semibold hover:opacity-90"
              style="border-color:#DDD7CE;background-color:transparent;color:#6B5F50;"
              @click="resetSelection"
          >취소</button>
          <button
              type="button"
              class="rounded px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style="background-color:#4f6109;"
              :disabled="!canPay"
              @click="handlePay"
          >{{ isProcessing ? '처리 중...' : '결제 실행' }}</button>
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
.layout { display: grid; grid-template-columns: 1.35fr 1fr; gap: 20px; }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border-card); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm); }
.card h3 { font-size: 18px; color: var(--color-text-strong); font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid var(--color-border-divider); padding-bottom: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th { text-align: left; color: var(--color-text-sub); font-weight: 700; border-bottom: 1px solid var(--color-border-divider); padding: 12px 8px; text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px; }
.table td { padding: 16px 8px; border-bottom: 1px solid var(--color-border-divider); color: var(--color-text-body); }
.table .right { text-align: right; }
.table tr { cursor: pointer; transition: background var(--transition-fast); }
.table tr:hover { background: var(--color-bg-section); }
.table tr.selected { background: var(--color-bg-section); border-left: 4px solid var(--color-olive); }
.table tr.paid { background: transparent; opacity: 0.5; cursor: default; }
.status { border-radius: var(--radius-full); padding: 4px 12px; font-size: 12px; font-weight: 700; }
.status.unpaid { background: var(--color-orange-light); color: var(--color-orange-dark); }
.status.paid { background: var(--color-olive-light); color: var(--color-olive-dark); }
.empty { color: var(--color-text-placeholder); padding: 40px 8px; text-align: center; }
.rows { background: var(--color-bg-section); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; }
.rows p { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: var(--color-text-body); }
.rows p span { color: var(--color-text-sub); font-weight: 700; }
.rows p.total { border-top: 1px solid var(--color-border-card); margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 800; color: var(--color-text-strong); }
.method-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.method { border: 1px solid var(--color-border-card); border-radius: var(--radius-md); padding: 12px 8px; background: var(--color-bg-input); font-size: 13px; font-weight: 700; color: var(--color-text-body); cursor: pointer; transition: all 0.2s; }
.method:hover:not(:disabled) { border-color: var(--color-olive); background: var(--color-surface); }
.method:disabled { opacity: 0.4; cursor: not-allowed; }
.method.active { border-color: var(--color-olive); background: var(--color-olive-light); color: var(--color-olive-dark); box-shadow: 0 0 0 2px var(--color-olive-light); }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.btn-primary { background: var(--color-olive); color: #fff; border: none; border-radius: var(--radius-md); padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm); }
.btn-primary:hover:not(:disabled) { background: var(--color-olive-dark); transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn-primary:active:not(:disabled) { transform: translateY(0); box-shadow: var(--shadow-sm); }
.btn-primary:disabled { background: var(--color-text-placeholder); opacity: 0.6; cursor: not-allowed; }

.btn-sub { background: transparent; border: 1px solid var(--color-border-card); color: var(--color-text-body); border-radius: var(--radius-md); padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-sub:hover { background: var(--color-bg-section); border-color: var(--color-text-sub); }

.success-text { font-size: 18px; color: var(--color-olive-dark); font-weight: 700; }
.success-message { margin-top: 12px; font-size: 14px; color: var(--color-text-body); background: var(--color-bg-section); padding: 12px; border-radius: var(--radius-md); }
.error-text { font-size: 18px; color: var(--color-status-error); font-weight: 700; }
.error-message { margin-top: 12px; font-size: 14px; color: var(--color-text-body); background: #FDECEC; padding: 12px; border-radius: var(--radius-md); }
@media (max-width: 1040px) { .layout { grid-template-columns: 1fr; } }
</style>