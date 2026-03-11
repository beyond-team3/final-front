<script setup>
/**
 * PaymentHistoryList.vue
 * Store를 활용한 결제 내역 조회 컴포넌트
 * PaymentView.vue와 동일한 store 데이터 접근 가능
 */
import { onMounted, computed } from 'vue'
import { usePaymentStore } from '@/stores/paymentStore'

const paymentStore = usePaymentStore()

const statusLabels = {
  'PENDING': '대기중',
  'COMPLETED': '완료',
  'FAILED': '실패',
  'CANCELLED': '취소',
}

const statusColors = {
  'PENDING': 'warning',
  'COMPLETED': 'success',
  'FAILED': 'error',
  'CANCELLED': 'muted',
}

// Computed
const paymentsList = computed(() => paymentStore.allPayments)
const isLoading = computed(() => paymentStore.loading)
const totalAmount = computed(() =>
    paymentStore.allPayments.reduce((sum, p) => sum + p.paymentAmount, 0)
)

// Methods
const loadPayments = async () => {
  await paymentStore.fetchMyPayments()
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatAmount = (amount) => {
  return amount.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })
}

// Lifecycle
onMounted(() => {
  loadPayments()
})
</script>

<template>
  <div class="payment-history">
    <div class="header">
      <h3>결제 내역</h3>
      <button type="button" class="btn-refresh" @click="loadPayments" :disabled="isLoading">
        {{ isLoading ? '조회 중...' : '새로고침' }}
      </button>
    </div>

    <!-- 요약 정보 -->
    <div class="summary">
      <div class="summary-item">
        <span class="label">총 결제건수</span>
        <span class="value">{{ paymentsList.length }}건</span>
      </div>
      <div class="summary-item">
        <span class="label">총 결제액</span>
        <span class="value">{{ formatAmount(totalAmount) }}</span>
      </div>
      <div class="summary-item">
        <span class="label">대기중</span>
        <span class="value">{{ paymentStore.pendingPayments.length }}건</span>
      </div>
    </div>

    <!-- 결제 목록 -->
    <div v-if="isLoading" class="loading">
      결제 내역을 조회 중입니다...
    </div>

    <div v-else-if="paymentsList.length === 0" class="empty">
      결제 내역이 없습니다.
    </div>

    <table v-else class="table">
      <thead>
      <tr>
        <th>결제코드</th>
        <th>청구서</th>
        <th class="right">결제금액</th>
        <th>결제방법</th>
        <th>상태</th>
        <th>결제일</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="payment in paymentsList" :key="payment.paymentId">
        <td class="code">{{ payment.paymentCode }}</td>
        <td>{{ payment.invoiceCode }}</td>
        <td class="right">{{ formatAmount(payment.paymentAmount) }}</td>
        <td>{{ payment.paymentMethod }}</td>
        <td>
            <span class="status" :class="statusColors[payment.status]">
              {{ statusLabels[payment.status] || payment.status }}
            </span>
        </td>
        <td>{{ formatDate(payment.createdAt) }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.payment-history {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.btn-refresh {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: var(--color-text);
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f8fafc;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.summary-item .label {
  font-size: 12px;
  color: var(--color-muted);
  font-weight: 600;
}

.summary-item .value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.loading {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
}

.empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th {
  text-align: left;
  color: var(--color-muted);
  font-weight: 700;
  border-bottom: 1px solid var(--color-border);
  padding: 8px;
  background: #f8fafc;
}

.table td {
  padding: 10px 8px;
  border-bottom: 1px solid #eef2f7;
  color: #334155;
}

.table th.right,
.table td.right {
  text-align: right;
}

.code {
  font-family: monospace;
  font-size: 12px;
  color: var(--color-accent);
  font-weight: 600;
}

.status {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.status.success {
  background: #dcfce7;
  color: #166534;
}

.status.warning {
  background: #fef3c7;
  color: #92400e;
}

.status.error {
  background: #fee2e2;
  color: #991b1b;
}

.status.muted {
  background: #f1f5f9;
  color: #64748b;
}

@media (max-width: 768px) {
  .summary {
    grid-template-columns: 1fr;
  }

  .table {
    font-size: 12px;
  }

  .table th,
  .table td {
    padding: 6px 4px;
  }
}
</style>