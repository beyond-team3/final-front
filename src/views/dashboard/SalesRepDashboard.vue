<script setup>
import { ref } from 'vue'
import DashboardCalendar from '@/components/dashboard/DashboardCalendar.vue'
import DashboardReference from '@/components/dashboard/DashboardReference.vue'

const monthlyBars = [
  { month: '9월', height: 38 },
  { month: '10월', height: 52 },
  { month: '11월', height: 45 },
  { month: '12월', height: 60 },
  { month: '1월', height: 48 },
  { month: '2월', height: 56, current: true },
]

const billings = [
  { client: '대농농협', docNo: 'CT-2026-0210-001', amount: '₩12,500,000', status: '청구 가능', type: 'ready' },
  { client: '해뜰농장', docNo: 'OD-2026-0210-003', amount: '₩8,300,000', status: '승인 대기', type: 'pending' },
  { client: '초록농원', docNo: 'OD-2026-0209-002', amount: '₩5,600,000', status: '청구 가능', type: 'ready' },
  { client: '풍년농장', docNo: 'CT-2026-0210-002', amount: '₩6,700,000', status: '계약 작성 중', type: 'pending' },
  { client: '황금들판', docNo: 'IN-2026-0207-001', amount: '₩15,200,000', status: '청구 완료', type: 'done' },
]

const timelineFilters = ['전체', '견적', '계약', '주문']
const selectedTimelineFilter = ref('전체')

const timeline = [
  { date: '2시간 전', title: '계약서 승인 완료 - 대농농협', detail: 'CT-2026-0210-001 · ₩12,500,000', state: 'completed' },
  { date: '5시간 전', title: '견적서 승인 대기 중 - 해뜰농장', detail: 'QT-2026-0210-003 · ₩8,300,000', state: 'pending' },
  { date: '어제', title: '주문서 발행 완료 - 초록농원', detail: 'OD-2026-0209-002 · ₩5,600,000', state: 'completed' },
  { date: '2일 전', title: '견적요청서 접수 - 풍년농장', detail: 'RQ-2026-0208-001 · 고추 종자 외 3건', state: 'completed' },
  { date: '3일 전', title: '청구서 발급 완료 - 황금들판', detail: 'IN-2026-0207-001 · ₩15,200,000', state: 'completed' },
]
</script>

<template>
  <section class="dashboard-shell">
    <div class="dashboard-header">
      <div>
        <div class="dashboard-title">내 영업 현황</div>
        <div class="dashboard-subtitle">김영업 · 2026년 2월 기준</div>
      </div>
    </div>

    <div class="dashboard-grid-top">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">개인 월별 매출</span>
          <span class="panel-badge">2026년 2월</span>
        </div>
        <div class="monthly-sales-summary">
          <div class="monthly-main-row">
            <div class="monthly-amount">₩456,000,000</div>
            <div class="monthly-change">▲ 15.2% 전월 대비</div>
          </div>

          <div class="monthly-bar-chart">
            <div v-for="bar in monthlyBars" :key="bar.month" class="bar-col" :class="bar.current ? 'current' : ''">
              <div class="bar-fill" :style="{ height: `${bar.height}px` }" />
              <div class="bar-label">{{ bar.month }}</div>
            </div>
          </div>

          <div class="monthly-meta">
            <div class="monthly-meta-item">
              <div class="monthly-meta-label">전월 대비 증감</div>
              <div class="monthly-meta-value">+₩62,000,000</div>
            </div>
            <div class="monthly-meta-item">
              <div class="monthly-meta-label">완료 계약 건수</div>
              <div class="monthly-meta-value">18건</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">이번달 청구 대상 계약</span>
          <span class="panel-badge">5건</span>
        </div>
        <div class="billing-list">
          <div
            v-for="item in billings"
            :key="item.docNo"
            class="billing-item"
            :class="`status-${item.type}`"
          >
            <div class="billing-left">
              <div class="billing-client">{{ item.client }}</div>
              <div class="billing-doc-no">{{ item.docNo }}</div>
            </div>
            <div class="billing-right">
              <div class="billing-amount">{{ item.amount }}</div>
              <div class="billing-status">{{ item.status }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid-bottom">
      <DashboardReference />

      <div class="panel">
        <div class="timeline-header-row">
          <span class="panel-title">최근 영업 히스토리</span>
          <div class="timeline-filter">
            <button
              v-for="filter in timelineFilters"
              :key="filter"
              class="timeline-filter-btn"
              :class="selectedTimelineFilter === filter ? 'active' : ''"
              type="button"
              @click="selectedTimelineFilter = filter"
            >
              {{ filter }}
            </button>
          </div>
        </div>

        <div class="timeline-list">
          <div v-for="item in timeline" :key="item.title" class="timeline-item" :class="item.state">
            <div class="timeline-date">{{ item.date }}</div>
            <div class="timeline-content">
              <div class="timeline-content-title">{{ item.title }}</div>
              <div class="timeline-content-detail">{{ item.detail }}</div>
            </div>
          </div>
        </div>
      </div>

      <DashboardCalendar />
    </div>
  </section>
</template>

<style scoped>
.dashboard-shell { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, .1); min-height: 500px; }
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e8ecef; }
.dashboard-title { font-size: 22px; font-weight: 700; color: #2c3e50; }
.dashboard-subtitle { font-size: 13px; color: #95a5a6; margin-top: 4px; }

.dashboard-grid-top { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.dashboard-grid-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

.panel { border: 1px solid #e8ecef; border-radius: 8px; padding: 22px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.panel-title { font-size: 15px; font-weight: 600; color: #2c3e50; }
.panel-badge { font-size: 11px; color: #7f8c8d; background: #f0f3f4; padding: 3px 8px; border-radius: 4px; }

.monthly-sales-summary { display: flex; flex-direction: column; gap: 16px; }
.monthly-main-row { display: flex; align-items: flex-end; gap: 10px; }
.monthly-amount { font-size: 30px; font-weight: 700; color: #2c3e50; }
.monthly-change { font-size: 12px; color: #27ae60; margin-bottom: 5px; }
.monthly-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
.bar-col { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
.bar-fill { width: 100%; background: #ccd6dd; border-radius: 3px 3px 0 0; }
.bar-col.current .bar-fill { background: #2c3e50; }
.bar-label { font-size: 10px; color: #95a5a6; white-space: nowrap; }
.bar-col.current .bar-label { color: #2c3e50; font-weight: 600; }
.monthly-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.monthly-meta-item { background: #f8f9fa; border-radius: 6px; padding: 11px 13px; }
.monthly-meta-label { font-size: 11px; color: #95a5a6; margin-bottom: 3px; }
.monthly-meta-value { font-size: 14px; font-weight: 600; color: #2c3e50; }

.billing-list { display: flex; flex-direction: column; gap: 8px; }
.billing-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #bdc3c7; }
.billing-item.status-pending { border-left-color: #e67e22; }
.billing-item.status-ready { border-left-color: #27ae60; }
.billing-left { display: flex; flex-direction: column; gap: 3px; }
.billing-client { font-size: 14px; font-weight: 600; color: #2c3e50; }
.billing-doc-no { font-size: 12px; color: #95a5a6; }
.billing-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.billing-amount { font-size: 14px; font-weight: 600; color: #2c3e50; }
.billing-status { font-size: 11px; color: #7f8c8d; }

.timeline-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.timeline-filter { display: flex; gap: 6px; }
.timeline-filter-btn { padding: 4px 10px; border: 1px solid #dce1e3; background: #fff; color: #7f8c8d; font-size: 12px; border-radius: 4px; cursor: pointer; }
.timeline-filter-btn.active { background: #2c3e50; color: #fff; border-color: #2c3e50; }
.timeline-list { position: relative; padding-left: 28px; }
.timeline-list::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 1px; background: #e0e0e0; }
.timeline-item { position: relative; margin-bottom: 16px; padding-left: 16px; }
.timeline-item:last-child { margin-bottom: 0; }
.timeline-item::before { content: ''; position: absolute; left: -21px; top: 7px; width: 10px; height: 10px; background: #bdc3c7; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #bdc3c7; }
.timeline-item.completed::before { background: #2c3e50; box-shadow: 0 0 0 1px #2c3e50; }
.timeline-item.pending::before { background: #95a5a6; box-shadow: 0 0 0 1px #95a5a6; }
.timeline-date { font-size: 11px; color: #bdc3c7; margin-bottom: 3px; }
.timeline-content { background: #f8f9fa; padding: 11px 14px; border-radius: 6px; }
.timeline-content-title { font-size: 13px; font-weight: 600; color: #2c3e50; margin-bottom: 3px; }
.timeline-content-detail { font-size: 12px; color: #95a5a6; }

@media (max-width: 1100px) {
  .dashboard-grid-top, .dashboard-grid-bottom { grid-template-columns: 1fr; }
}
</style>
