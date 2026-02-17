<script setup>
import { computed, onMounted, ref } from 'vue'
import DashboardCalendar from '@/components/dashboard/DashboardCalendar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { getAdminDashboard } from '@/api/dashboard'

const dashboard = ref(null)
const loading = ref(false)
const error = ref('')

const prototypeKpis = [
  {
    label: '이번 달 전체 매출',
    iconClass: 'blue',
    icon: '₩',
    value: '₩2.4억',
    change: '▲ 전월 대비 +12.3%',
    changeClass: 'positive',
  },
  {
    label: '전년 대비 증감률',
    iconClass: 'green',
    icon: '',
    value: '+18.7%',
    change: '▲ 목표 +15% 달성',
    changeClass: 'positive',
  },
  {
    label: '승인 대기 문서',
    iconClass: 'orange',
    icon: '',
    value: '23건',
    change: '견적 12 / 계약 8 / 주문 3',
    changeClass: 'neutral',
  },
]

const title = computed(() => dashboard.value?.title || '관리자 대시보드')
const rankings = computed(() => dashboard.value?.rankings ?? [])
const approvals = computed(() => dashboard.value?.approvals ?? [])
const rankingPeriod = computed(() => dashboard.value?.rankingPeriod || '')
const trendPeriod = computed(() => dashboard.value?.trendPeriod || '')
const approvalCount = computed(() => dashboard.value?.approvalCount ?? approvals.value.length)
const hasData = computed(() => prototypeKpis.length || rankings.value.length || approvals.value.length)

const fetchDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    dashboard.value = await getAdminDashboard()
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
    <LoadingSpinner text="관리자 대시보드를 불러오는 중입니다." />
  </section>

  <section v-else-if="error" class="dashboard-shell">
    <ErrorMessage :message="error" @retry="fetchDashboard" />
  </section>

  <section v-else-if="!hasData" class="dashboard-shell">
    <EmptyState title="표시할 관리자 데이터가 없습니다." description="데이터 등록 후 다시 확인해주세요." />
  </section>

  <section v-else class="dashboard-shell">
    <h2 class="screen-title">{{ title }}</h2>

    <div class="kpi-grid">
      <div v-for="kpi in prototypeKpis" :key="kpi.label" class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">{{ kpi.label }}</span>
          <div class="kpi-icon" :class="kpi.iconClass">{{ kpi.icon }}</div>
        </div>
        <div class="kpi-value">{{ kpi.value }}</div>
        <div class="kpi-change" :class="kpi.changeClass">{{ kpi.change }}</div>
      </div>
    </div>

    <div class="chart-section">
      <div class="chart-card">
        <div class="chart-header">
          <h2 class="chart-title">매출 추이</h2>
          <span class="chart-period">{{ trendPeriod }}</span>
        </div>
        <div class="chart-placeholder">라인 차트 영역 (Chart.js 또는 D3.js 연동)</div>
      </div>
    </div>

    <div class="three-column-grid">
      <div class="operation-card">
        <div class="operation-header">
          <h3 class="operation-title">영업사원별 매출 랭킹</h3>
          <span class="chart-period">{{ rankingPeriod }}</span>
        </div>
        <div class="ranking-list">
          <div v-for="item in rankings" :key="item.rank" class="ranking-item">
            <div class="rank-number" :class="item.rank <= 3 ? 'top' : ''">{{ item.rank }}</div>
            <div class="rank-info">
              <div class="rank-name">{{ item.name }}</div>
              <div class="rank-amount">{{ item.amount }}</div>
            </div>
            <div class="rank-bar">
              <div class="rank-bar-fill" :style="{ width: `${item.width}%` }" />
            </div>
          </div>
        </div>
      </div>

      <div class="operation-card">
        <div class="operation-header">
          <h3 class="operation-title">최근 승인 요청</h3>
          <span class="operation-badge">{{ approvalCount }}</span>
        </div>
        <div class="operation-list">
          <div v-for="item in approvals" :key="item.title + item.time" class="operation-item">
            <div class="operation-item-title">{{ item.title }}</div>
            <div class="operation-item-meta">
              <span>{{ item.meta }}</span>
              <span class="operation-item-time">{{ item.time }}</span>
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
.screen-title { font-size: 24px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ecf0f1; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
.kpi-card { background: #fff; border: 1px solid #e5e8eb; border-radius: 12px; padding: 24px; }
.kpi-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.kpi-label { font-size: 14px; color: #666; font-weight: 500; }
.kpi-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.kpi-icon.blue { background: #eff6ff; color: #2563eb; }
.kpi-icon.green { background: #f0fdf4; color: #16a34a; }
.kpi-icon.orange { background: #fff7ed; color: #ea580c; }
.kpi-value { font-size: 32px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.kpi-change { font-size: 13px; }
.kpi-change.positive { color: #16a34a; }
.kpi-change.neutral { color: #666; }

.chart-section { margin-bottom: 30px; }
.chart-card { background: #fff; border: 1px solid #e5e8eb; border-radius: 12px; padding: 24px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.chart-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.chart-period { font-size: 13px; color: #666; }
.chart-placeholder { height: 300px; background: #f9fafb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 14px; }

.three-column-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.operation-card { background: #fff; border: 1px solid #e5e8eb; border-radius: 12px; padding: 24px; }
.operation-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.operation-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.operation-badge { background: #2563eb; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.operation-list { display: flex; flex-direction: column; gap: 10px; }
.operation-item { padding: 12px; background: #f9fafb; border-radius: 8px; border-left: 3px solid #2563eb; }
.operation-item-title { font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px; }
.operation-item-meta { display: flex; justify-content: space-between; font-size: 12px; color: #666; }
.operation-item-time { color: #999; }

.ranking-list { display: flex; flex-direction: column; gap: 12px; }
.ranking-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; }
.rank-number { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: #e5e8eb; color: #666; }
.rank-number.top { background: #fef3c7; color: #d97706; }
.rank-info { flex: 1; }
.rank-name { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 2px; }
.rank-amount { font-size: 13px; color: #666; }
.rank-bar { width: 120px; height: 6px; background: #e5e8eb; border-radius: 3px; overflow: hidden; }
.rank-bar-fill { height: 100%; background: #2563eb; border-radius: 3px; }

@media (max-width: 1200px) {
  .three-column-grid { grid-template-columns: 1fr; }
}
</style>
