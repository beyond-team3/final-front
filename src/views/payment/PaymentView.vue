<script setup>
import { computed, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ModalBase from '@/components/common/ModalBase.vue'

const selectedInvId = ref(null)
const selectedMethod = ref('')
const successOpen = ref(false)
const successMessage = ref('')

const methodLabels = {
  vbank: '가상계좌',
  card: '신용카드',
  transfer: '계좌이체',
}

const invoices = ref([
  { id: 'CINV-20250410-0381', company: '한국농업(서울)', supply: 15500000, orderNo: 'ORD-20250410-2847', issueDate: '2025.04.10', status: 'unpaid' },
  { id: 'CINV-20250408-0374', company: '한국농업(서울)', supply: 9000000, orderNo: 'ORD-20250408-2801', issueDate: '2025.04.08', status: 'unpaid' },
  { id: 'CINV-20250405-0362', company: '농업법인 동산', supply: 22000000, orderNo: 'ORD-20250405-2766', issueDate: '2025.04.05', status: 'unpaid' },
  { id: 'CINV-20250401-0350', company: '그린팜 경기', supply: 7800000, orderNo: 'ORD-20250401-2700', issueDate: '2025.04.01', status: 'unpaid' },
])

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

const canPay = computed(() => Boolean(selectedInvoice.value && selectedMethod.value))

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

const handlePay = () => {
  if (!canPay.value || !selectedInvoice.value) {
    return
  }

  // TODO: API 연결
  selectedInvoice.value.status = 'paid'

  const now = new Date().toLocaleString('ko-KR')
  successMessage.value = `${selectedInvoice.value.id} / ${methodLabels[selectedMethod.value]} / ₩${totals.value.total.toLocaleString()} (${now})`
  successOpen.value = true
}

const closeSuccess = () => {
  successOpen.value = false
  resetSelection()
}
</script>

<template>
  <section class="screen-content">
    <PageHeader title="결제 관리" subtitle="청구서를 선택하고 결제 처리하세요." />

    <div class="layout">
      <section class="card">
        <h3>미결제 청구서</h3>

        <div v-if="unpaidInvoices.length === 0" class="empty">미결제 청구서가 없습니다.</div>

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
          <button type="button" class="method" :class="{ active: selectedMethod === 'vbank' }" @click="selectedMethod = 'vbank'">가상계좌</button>
          <button type="button" class="method" :class="{ active: selectedMethod === 'card' }" @click="selectedMethod = 'card'">신용카드</button>
          <button type="button" class="method" :class="{ active: selectedMethod === 'transfer' }" @click="selectedMethod = 'transfer'">계좌이체</button>
        </div>

        <div class="actions">
          <button type="button" class="btn-sub" @click="resetSelection">취소</button>
          <button type="button" class="btn-primary" :disabled="!canPay" @click="handlePay">결제 실행</button>
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
.method { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 10px 8px; background: #fff; font-size: 12px; font-weight: 700; color: #334155; }
.method.active { border-color: var(--color-accent); background: #fdf0ea; color: var(--color-accent); }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.success-text { font-size: 15px; color: var(--color-text); font-weight: 700; }
.success-message { margin-top: 8px; font-size: 13px; color: #475569; }
@media (max-width: 1040px) { .layout { grid-template-columns: 1fr; } }
</style>
