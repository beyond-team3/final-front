<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { getClientDashboard } from '@/api/dashboard'

const router = useRouter()

const goToOrders = () => router.push('/documents/all?type=ORD')
const goToOrderDetail = (orderNo) => router.push(`/documents/all?type=ORD&keyword=${orderNo}`)
const goToInvoices = () => router.push('/documents/all?type=INV')
const goToInvoiceDetail = (invoiceNo) => router.push(`/documents/all?keyword=${invoiceNo}`)
const goToNotifications = () => router.push('/notifications')

const dashboard = ref(null)
const loading = ref(false)
const error = ref('')

const allOrders = computed(() => dashboard.value?.orders ?? [])
// 최근 주문 내역 최대 3개만 노출
const orders = computed(() => allOrders.value.slice(0, 3))
const ordersTotalCount = computed(() => allOrders.value.length)

const allBillings = computed(() => dashboard.value?.billings ?? [])
// 결제 요청 최대 5개만 노출
const billings = computed(() => allBillings.value.slice(0, 5))
const billingsTotalCount = computed(() => allBillings.value.length)

const allNotifications = computed(() => dashboard.value?.notifications ?? [])
// 최근 알림 최대 4개만 노출
const notifications = computed(() => allNotifications.value.slice(0, 4))
const notificationsTotalCount = computed(() => allNotifications.value.length)

const title = computed(() => dashboard.value?.title || '내 거래 현황')
const subtitle = computed(() => dashboard.value?.subtitle || '')
const billingCycleValue = computed(() => dashboard.value?.billingCycle?.value || '-')
const billingCycleNext = computed(() => dashboard.value?.billingCycle?.next || '-')
const hasData = computed(() => orders.value.length || billings.value.length || notifications.value.length)

const fetchDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    dashboard.value = await getClientDashboard()
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || '대시보드 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <section v-if="loading" class="dashboard-shell">
    <LoadingSpinner text="거래처 대시보드를 불러오는 중입니다." />
  </section>

  <section v-else-if="error" class="dashboard-shell">
    <ErrorMessage :message="error" @retry="fetchDashboard" />
  </section>

  <section v-else-if="!hasData" class="dashboard-shell">
    <EmptyState title="표시할 거래 데이터가 없습니다." description="데이터 등록 후 다시 확인해주세요." />
  </section>

  <section v-else class="dashboard-shell">
    <div class="dashboard-header">
      <div>
        <div class="dashboard-title">{{ title }}</div>
        <div class="dashboard-subtitle">{{ subtitle }}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">최근 주문 내역</span>
          <a class="panel-link" @click="goToOrders">전체 보기</a>
        </div>
        <div class="order-list">
          <div v-for="order in orders" :key="order.no" class="order-card">
            <div class="order-card-header">
              <div>
                <div class="order-no">{{ order.no }}</div>
                <div class="order-date">{{ order.date }}</div>
              </div>
              <span class="order-status" :class="order.statusClass">{{ order.status }}</span>
            </div>
            <div class="order-items-summary">{{ order.summary }}</div>
            <div class="order-card-footer">
              <div class="order-amount">{{ order.amount }}</div>
              <span class="order-action" @click="goToOrderDetail(order.no)">{{ order.action }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">결제 요청 현황</span>
          <a class="panel-link" @click="goToInvoices">청구서 전체 보기</a>
        </div>

        <div class="billing-credit-wrap">
          <div class="billing-cycle-row">
            <div>
              <div class="billing-cycle-label">청구 사이클</div>
              <div class="billing-cycle-value">{{ billingCycleValue }}</div>
            </div>
            <div class="billing-cycle-next">{{ billingCycleNext }}</div>
          </div>

          <div class="billing-list">
            <div v-for="billing in billings" :key="billing.no" class="billing-item" :class="billing.type" @click="goToInvoiceDetail(billing.no)">
              <div class="billing-left">
                <div class="billing-doc-no">{{ billing.no }}</div>
                <div class="billing-due" :class="billing.type === 'due-soon' ? 'due-soon' : ''">{{ billing.due }}</div>
              </div>
              <div class="billing-right">
                <div class="billing-amount">{{ billing.amount }}</div>
                <div class="billing-status-tag">{{ billing.status }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">최근 알림</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <a class="panel-link" @click="goToNotifications">전체 보기</a>
            <span class="panel-badge">{{ notifications.length }}<template v-if="notificationsTotalCount > 5"><span class="text-xs text-muted"> / {{ notificationsTotalCount }}</span></template>건</span>
          </div>
        </div>
        <div class="notif-list">
          <div v-for="item in notifications" :key="item.time + item.title" class="notif-item" :class="item.isNew ? 'new' : ''">
            <div class="notif-time">{{ item.time }}</div>
            <div class="notif-content">
              <div class="notif-title">{{ item.title }}</div>
              <div class="notif-detail">{{ item.detail }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dashboard-shell {
  --bg:      #FAF9F6;
  --surface: #FFFFFF;
  --warm:    #F7F3EC;
  --warm-md: #EFEADF;
  --border:  rgba(41, 37, 36, 0.08);
  --text:    #292524;
  --muted:   #78716C;
  --faint:   #A8A29E;
  --accent:  #D97757;
  --olive:   #6B7C45;

  background: var(--bg);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(41, 37, 36, 0.08);
  display: flex; flex-direction: column; height: 100%; box-sizing: border-box;
}

.text-xs { font-size: 9px; }
.text-muted { color: var(--muted); }

.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.dashboard-title   { font-size: 22px; font-weight: 700; color: var(--text); }
.dashboard-subtitle{ font-size: 13px; color: var(--muted); margin-top: 4px; }
.dashboard-grid    { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; flex: 1; min-height: 0; }

.panel { border: 1px solid var(--border); border-radius: 10px; padding: 22px; background: var(--surface); display: flex; flex-direction: column; overflow: hidden; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.panel-title  { font-size: 15px; font-weight: 600; color: var(--text); }
.panel-link   { font-size: 12px; color: var(--muted); text-decoration: none; cursor: pointer; }
.panel-link:hover { color: var(--accent); }
.panel-badge  { font-size: 11px; color: var(--muted); background: var(--warm-md); padding: 3px 8px; border-radius: 4px; }

.order-list { display: flex; flex-direction: column; gap: 8px; max-height: none; overflow: visible; }
.order-card { padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--warm); flex-shrink: 0; }
.order-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.order-no   { font-size: 13px; font-weight: 600; color: var(--text); }
.order-date { font-size: 11px; color: var(--faint); margin-top: 2px; }
.order-status { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap; }
.order-status.processing { background: var(--warm-md); color: var(--muted); }
.order-status.pending    { background: #FEF3E8; color: #9A4500; border: 1px solid #F0D8BC; }
.order-status.completed  { background: #ECF3E5; color: var(--olive); }
.order-items-summary { font-size: 12px; color: var(--muted); margin-bottom: 8px; line-height: 1.5; }
.order-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border); }
.order-amount { font-size: 14px; font-weight: 700; color: var(--text); }
.order-action { font-size: 12px; color: var(--accent); cursor: pointer; }

.billing-credit-wrap { display: flex; flex-direction: column; gap: 14px; }
.billing-cycle-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--warm); border-radius: 8px; border-left: 3px solid var(--accent); flex-shrink: 0; }
.billing-cycle-label { font-size: 11px; color: var(--muted); }
.billing-cycle-value { font-size: 14px; font-weight: 600; color: var(--text); margin-top: 2px; }
.billing-cycle-next  { font-size: 12px; color: var(--muted); }
.billing-list { display: flex; flex-direction: column; gap: 8px; }
.billing-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--warm); border-radius: 6px; border-left: 3px solid var(--faint); flex-shrink: 0; cursor: pointer; }
.billing-item.due-soon { border-left-color: var(--accent); }
.billing-item.paid     { border-left-color: var(--olive); }
.billing-left    { display: flex; flex-direction: column; gap: 3px; }
.billing-doc-no  { font-size: 13px; font-weight: 600; color: var(--text); }
.billing-due     { font-size: 11px; color: var(--muted); }
.billing-due.due-soon { color: var(--accent); font-weight: 600; }
.billing-right   { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.billing-amount  { font-size: 14px; font-weight: 700; color: var(--text); }
.billing-status-tag { font-size: 11px; color: var(--muted); }

.list-more-indicator { padding: 10px; text-align: center; color: var(--muted); font-size: 11px; background: var(--warm); border-radius: 8px; margin-top: 8px; }

.notif-list { position: relative; padding-left: 26px; max-height: none; overflow: visible; }
.notif-list::before { content: ''; position: absolute; left: 6px; top: 0; bottom: 0; width: 1px; background: var(--border); }
.notif-item { position: relative; margin-bottom: 14px; flex-shrink: 0; }
.notif-item:last-child { margin-bottom: 0; }
.notif-item::before { content: ''; position: absolute; left: -20px; top: 7px; width: 10px; height: 10px; background: var(--faint); border-radius: 50%; border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--faint); }
.notif-item.new::before { background: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.notif-time    { font-size: 11px; color: var(--faint); margin-bottom: 3px; }
.notif-content { background: var(--warm); padding: 10px 13px; border-radius: 6px; }
.notif-title   { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.notif-detail  { font-size: 12px; color: var(--muted); }

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>