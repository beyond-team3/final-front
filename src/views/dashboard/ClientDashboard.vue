<script setup>
const orders = [
  { no: 'OD-2026-0210-001', date: '2026년 2월 10일', status: '처리 중', statusClass: 'processing', summary: '고추 품종 A-123 × 500kg · 토마토 품종 B-456 × 300kg 외 1건', amount: '₩12,500,000', action: '상세 보기' },
  { no: 'OD-2026-0209-002', date: '2026년 2월 9일', status: '승인 대기', statusClass: 'pending', summary: '배추 품종 C-789 × 400kg · 상추 품종 D-012 × 200kg', amount: '₩8,300,000', action: '주문 취소' },
  { no: 'OD-2026-0207-003', date: '2026년 2월 7일', status: '완료', statusClass: 'completed', summary: '오이 품종 E-345 × 150kg · 가지 품종 F-678 × 100kg', amount: '₩5,600,000', action: '재주문' },
]

const billings = [
  { no: 'IN-2026-0210-001', due: '기한 2026.02.17 (D-6)', amount: '₩12,500,000', status: '결제 대기', type: 'due-soon' },
  { no: 'IN-2026-0208-002', due: '기한 2026.02.22 (D-11)', amount: '₩8,300,000', status: '결제 대기', type: 'due-soon' },
  { no: 'IN-2026-0205-003', due: '2026.02.05 완료', amount: '₩11,200,000', status: '결제 완료', type: 'paid' },
]

const notifications = [
  { time: '5분 전', title: '견적서 승인 완료', detail: 'QT-2026-0210-002가 승인되었습니다.', isNew: true },
  { time: '1시간 전', title: '청구서 발급', detail: 'IN-2026-0210-001이 발급되었습니다. · ₩12,500,000', isNew: true },
  { time: '3시간 전', title: '주문서 처리 시작', detail: 'OD-2026-0210-001 처리가 시작되었습니다.', isNew: true },
  { time: '어제', title: '명세서 발급', detail: 'ST-2026-0209-001이 발급되었습니다.', isNew: false },
  { time: '2일 전', title: '계약서 승인 완료', detail: 'CT-2026-0208-001이 승인되었습니다.', isNew: false },
]
</script>

<template>
  <section class="dashboard-shell">
    <div class="dashboard-header">
      <div>
        <div class="dashboard-title">내 거래 현황</div>
        <div class="dashboard-subtitle">대농농협 · 2026년 2월 11일</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">최근 주문 내역</span>
          <a class="panel-link">전체 보기</a>
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
              <span class="order-action">{{ order.action }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">결제 요청 현황</span>
          <a class="panel-link">청구서 전체 보기</a>
        </div>

        <div class="billing-credit-wrap">
          <div class="billing-cycle-row">
            <div>
              <div class="billing-cycle-label">청구 사이클</div>
              <div class="billing-cycle-value">월별 (매월 15일)</div>
            </div>
            <div class="billing-cycle-next">다음 청구일 2월 15일</div>
          </div>

          <div class="billing-list">
            <div v-for="billing in billings" :key="billing.no" class="billing-item" :class="billing.type">
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
          <span class="panel-badge">5건</span>
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
.dashboard-shell { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, .1); min-height: 500px; }
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e8ecef; }
.dashboard-title { font-size: 22px; font-weight: 700; color: #2c3e50; }
.dashboard-subtitle { font-size: 13px; color: #95a5a6; margin-top: 4px; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }

.panel { border: 1px solid #e8ecef; border-radius: 8px; padding: 22px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-title { font-size: 15px; font-weight: 600; color: #2c3e50; }
.panel-link { font-size: 12px; color: #7f8c8d; text-decoration: none; }
.panel-badge { font-size: 11px; color: #7f8c8d; background: #f0f3f4; padding: 3px 8px; border-radius: 4px; }

.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-card { padding: 14px 16px; border: 1px solid #e8ecef; border-radius: 6px; }
.order-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.order-no { font-size: 13px; font-weight: 600; color: #2c3e50; }
.order-date { font-size: 11px; color: #95a5a6; margin-top: 2px; }
.order-status { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap; }
.order-status.processing { background: #f0f3f4; color: #556270; }
.order-status.pending { background: #fef9ec; color: #8a6c00; border: 1px solid #ebe0b0; }
.order-status.completed { background: #f0f3f4; color: #7f8c8d; }
.order-items-summary { font-size: 12px; color: #7f8c8d; margin-bottom: 8px; line-height: 1.5; }
.order-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f0f3f4; }
.order-amount { font-size: 14px; font-weight: 700; color: #2c3e50; }
.order-action { font-size: 12px; color: #7f8c8d; }

.billing-credit-wrap { display: flex; flex-direction: column; gap: 14px; }
.billing-cycle-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #f8f9fa; border-radius: 6px; }
.billing-cycle-label { font-size: 11px; color: #95a5a6; }
.billing-cycle-value { font-size: 14px; font-weight: 600; color: #2c3e50; margin-top: 2px; }
.billing-cycle-next { font-size: 12px; color: #7f8c8d; }
.billing-list { display: flex; flex-direction: column; gap: 8px; }
.billing-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #bdc3c7; }
.billing-item.due-soon { border-left-color: #e67e22; }
.billing-item.paid { border-left-color: #95a5a6; }
.billing-left { display: flex; flex-direction: column; gap: 3px; }
.billing-doc-no { font-size: 13px; font-weight: 600; color: #2c3e50; }
.billing-due { font-size: 11px; color: #7f8c8d; }
.billing-due.due-soon { color: #d35400; }
.billing-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.billing-amount { font-size: 14px; font-weight: 700; color: #2c3e50; }
.billing-status-tag { font-size: 11px; color: #7f8c8d; }

.notif-list { position: relative; padding-left: 26px; }
.notif-list::before { content: ''; position: absolute; left: 6px; top: 0; bottom: 0; width: 1px; background: #e0e0e0; }
.notif-item { position: relative; margin-bottom: 14px; }
.notif-item:last-child { margin-bottom: 0; }
.notif-item::before { content: ''; position: absolute; left: -20px; top: 7px; width: 10px; height: 10px; background: #bdc3c7; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #bdc3c7; }
.notif-item.new::before { background: #2c3e50; box-shadow: 0 0 0 1px #2c3e50; }
.notif-time { font-size: 11px; color: #bdc3c7; margin-bottom: 3px; }
.notif-content { background: #f8f9fa; padding: 10px 13px; border-radius: 6px; }
.notif-title { font-size: 13px; font-weight: 600; color: #2c3e50; margin-bottom: 2px; }
.notif-detail { font-size: 12px; color: #95a5a6; }

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>
