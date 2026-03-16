<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import DashboardCalendar from '@/components/dashboard/DashboardCalendar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { getAdminDashboard, getWeeklySchedules } from '@/api/dashboard'

const dashboard = ref(null)
const loading   = ref(false)
const error     = ref('')

// 캘린더 전용 상태
const calendarData    = ref(null)
const calendarLoading = ref(false)

// ── KPI 카드 ──────────────────────────────────────────────────────────────
const kpiCards = computed(() => {
  const k = dashboard.value?.kpis || {}
  return [
    { label: '이번 달 전체 매출', iconClass: 'accent', icon: '₩', value: k.totalMonthlySales   || '-', change: `▲ 전년 대비 ${k.salesGrowthRate || '-'}`, changeClass: 'positive' },
    { label: '전년 대비 증감률',  iconClass: 'olive',  icon: '↑', value: k.salesGrowthRate     || '-', change: '▲ ',                                       changeClass: 'positive' },
    { label: '승인 대기 문서',    iconClass: 'warn',   icon: '!', value: k.pendingDocumentCount || '-', change: k.pendingDetail || '-',                      changeClass: 'neutral'  },
  ]
})

// ── 매출 추이 ────────────────────────────────────────────────────────────
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const salesTrendData = computed(() => ({
  labels:   MONTHS,
  lastYear: dashboard.value?.salesTrend?.lastYear ?? [],
  thisYear: dashboard.value?.salesTrend?.thisYear ?? [],
}))

// ── Canvas / Chart ───────────────────────────────────────────────────────
const chartCanvas = ref(null)
let chartInstance = null

const renderChart = async () => {
  const canvas = chartCanvas.value
  if (!canvas) return

  const { lastYear, thisYear, labels } = salesTrendData.value
  if (!lastYear.length && !thisYear.length) return

  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)

    if (chartInstance) chartInstance.destroy()

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '전년',
            data: lastYear,
            borderColor: '#A8A29E',
            backgroundColor: 'rgba(168,162,158,0.07)',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
            tension: 0.35,
            fill: true,
            spanGaps: false,
          },
          {
            label: '올해',
            data: thisYear,
            borderColor: '#D97757',
            backgroundColor: 'rgba(217,119,87,0.07)',
            borderWidth: 2.5,
            pointRadius: 4,
            tension: 0.35,
            fill: true,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, boxHeight: 2, font: { size: 12, family: "'KoPub Dotum', sans-serif" }, color: '#78716C' },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                  ctx.parsed.y !== null ? ` ${ctx.dataset.label}: ₩${ctx.parsed.y.toLocaleString()}만` : '',
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 12 }, color: '#A8A29E' },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              font: { size: 12, family: "'KoPub Dotum', sans-serif" },
              color: '#A8A29E',
              callback: (v) => `₩${(v / 100).toFixed(0)}억`,
            },
            beginAtZero: false,
          },
        },
      },
    })
  } catch {
    renderFallbackChart(canvas)
  }
}

const renderFallbackChart = (canvas) => {
  const { lastYear, thisYear, labels } = salesTrendData.value
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas.getBoundingClientRect()
  canvas.width  = width  * window.devicePixelRatio
  canvas.height = height * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  const W   = width
  const H   = height
  const PAD = { top: 30, right: 24, bottom: 40, left: 56 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top  - PAD.bottom

  const allValues = [...lastYear, ...thisYear].filter((v) => v !== null)
  if (!allValues.length) return
  const minVal = Math.min(...allValues) * 0.92
  const maxVal = Math.max(...allValues) * 1.05
  const range  = maxVal - minVal

  const toX = (i) => PAD.left + (i / (labels.length - 1)) * innerW
  const toY = (v) => PAD.top  + innerH - ((v - minVal) / range) * innerH

  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth   = 1
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (innerH / 4) * i
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + innerW, y); ctx.stroke()
  }

  ctx.fillStyle  = '#A8A29E'
  ctx.font       = '11px "KoPub Dotum", sans-serif'
  ctx.textAlign  = 'center'
  labels.forEach((label, i) => { ctx.fillText(label, toX(i), H - PAD.bottom + 16) })

  const series = [
    { data: lastYear, color: '#A8A29E', dash: [5, 4] },
    { data: thisYear, color: '#D97757', dash: [] },
  ]
  series.forEach(({ data, color, dash }) => {
    const points = data.map((v, i) => (v !== null ? { x: toX(i), y: toY(v) } : null)).filter(Boolean)
    if (!points.length) return
    ctx.beginPath()
    ctx.setLineDash(dash)
    ctx.strokeStyle = color
    ctx.lineWidth   = 2.5
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
    ctx.setLineDash([])
    points.forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle   = '#fff'; ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
    })
  })
}

// ── 랭킹 / 승인 ──────────────────────────────────────────────────────────
const allRankings         = computed(() => dashboard.value?.rankings   ?? [])
const rankings            = computed(() => allRankings.value.slice(0, 5))
const rankingsTotalCount  = computed(() => allRankings.value.length)

const title               = computed(() => dashboard.value?.title       || '관리자 대시보드')
const allApprovals        = computed(() => dashboard.value?.approvals   ?? [])
const approvals           = computed(() => allApprovals.value.slice(0, 5))
const approvalsTotalCount = computed(() => allApprovals.value.length)
const trendPeriod         = computed(() => dashboard.value?.trendPeriod || '월별 매출 추이')
const hasData             = computed(() => kpiCards.value.length || rankings.value.length || approvals.value.length)

// ── fetch ─────────────────────────────────────────────────────────────────
const fetchDashboard = async () => {
  loading.value = true
  error.value   = ''

  try {
    dashboard.value = await getAdminDashboard()
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || '대시보드 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
    await nextTick()
    await renderChart()
  }
}

const fetchCalendar = async () => {
  calendarLoading.value = true
  try {
    calendarData.value = await getWeeklySchedules()
  } catch {
    // 캘린더 실패 시 컴포넌트 default 값으로 fallback (무시)
  } finally {
    calendarLoading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
  fetchCalendar()
})
</script>

<template>
  <section class="dashboard-shell">
    <!-- 로딩 -->
    <template v-if="loading">
      <LoadingSpinner text="관리자 대시보드를 불러오는 중입니다." />
    </template>

    <!-- 에러 -->
    <template v-else-if="error">
      <ErrorMessage :message="error" @retry="fetchDashboard" />
    </template>

    <template v-else-if="!hasData">
      <EmptyState title="표시할 관리자 데이터가 없습니다." description="데이터 등록 후 다시 확인해주세요." />
    </template>

    <template v-else>
      <h2 class="screen-title">{{ title }}</h2>

      <div class="kpi-grid">
        <div v-for="kpi in kpiCards" :key="kpi.label" class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">{{ kpi.label }}</span>
            <div class="kpi-icon" :class="kpi.iconClass">{{ kpi.icon }}</div>
          </div>
          <div class="kpi-value">{{ kpi.value }}</div>
          <div class="kpi-change" :class="kpi.changeClass">{{ kpi.change }}</div>
        </div>
      </div>
    </template>

    <!-- 차트 섹션 -->
    <div v-if="!loading" class="chart-section">
      <div class="chart-card">
        <div class="chart-header">
          <h2 class="chart-title">매출 추이</h2>
          <span class="chart-period">{{ trendPeriod }}</span>
        </div>
        <div class="chart-canvas-wrap">
          <canvas ref="chartCanvas" class="chart-canvas" />
        </div>
      </div>
    </div>

    <!-- 하단 3열 그리드 -->
    <template v-if="!loading && !error && hasData">
      <div class="three-column-grid">
        <div class="operation-card">
          <div class="operation-header">
            <h3 class="operation-title">영업사원별 매출 랭킹</h3>
            <span class="operation-badge">
              {{ rankings.length }}<template v-if="rankingsTotalCount > 5"><span class="text-xs"> / {{ rankingsTotalCount }}</span></template>
            </span>
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
          <div v-if="rankingsTotalCount > 5" class="list-more-indicator">{{ rankingsTotalCount - 5 }}개 더보기</div>
        </div>

        <div class="operation-card">
          <div class="operation-header">
            <h3 class="operation-title">최근 승인 요청</h3>
            <span class="operation-badge">
              {{ approvals.length }}<template v-if="approvalsTotalCount > 5"><span class="text-xs"> / {{ approvalsTotalCount }}</span></template>
            </span>
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

        <!-- 캘린더: 데이터 있으면 props로 전달, 없으면 컴포넌트 default 사용 -->
        <DashboardCalendar
            v-bind="calendarData ? {
              badge:      calendarData.badge,
              weekDays:   calendarData.weekDays,
              dayEvents:  calendarData.dayEvents,
              listEvents: calendarData.listEvents,
            } : {}"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard-shell {
  --c-bg:      #FAF9F6;
  --c-surface: #FFFFFF;
  --c-border:  rgba(41, 37, 36, 0.10);
  --c-text:    #292524;
  --c-muted:   #78716C;
  --c-faint:   #A8A29E;
  --c-accent:  #D97757;
  --c-olive:   #6B7C45;
  --c-warm:    #F7F3EC;
  --c-warm-md: #EFEADF;

  background: var(--c-bg);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(41, 37, 36, 0.08);
  min-height: 500px;
}
.screen-title {
  font-size: 22px; font-weight: 700; color: var(--c-text);
  margin-bottom: 20px; padding-bottom: 16px;
  border-bottom: 1px solid var(--c-border);
}

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-bottom: 28px; }
.kpi-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 24px; }
.kpi-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.kpi-label  { font-size: 14px; color: var(--c-muted); font-weight: 500; }
.kpi-icon   { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; }
.kpi-icon.accent { background: #FEF3E8; color: var(--c-accent); }
.kpi-icon.olive  { background: #ECF3E5; color: var(--c-olive);  }
.kpi-icon.warn   { background: #FFF7ED; color: #C25E00; }
.kpi-value  { font-size: 30px; font-weight: 700; color: var(--c-text); margin-bottom: 8px; }
.kpi-change { font-size: 13px; }
.kpi-change.positive { color: var(--c-olive); }
.kpi-change.neutral  { color: var(--c-muted); }

.chart-section { margin-bottom: 28px; }
.chart-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 24px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.chart-title  { font-size: 18px; font-weight: 600; color: var(--c-text); }
.chart-period { font-size: 13px; color: var(--c-muted); }
.chart-canvas-wrap { height: 300px; border-radius: 8px; overflow: hidden; }
.chart-canvas { width: 100%; height: 100%; }

.three-column-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.operation-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; }
.operation-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.operation-title  { font-size: 15px; font-weight: 600; color: var(--c-text); }
.operation-badge  { background: var(--c-accent); color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }

.text-xs { font-size: 9px; }

.operation-list { display: flex; flex-direction: column; gap: 10px; max-height: none; overflow: visible; }
.operation-item { padding: 12px; background: var(--c-warm); border-radius: 8px; border-left: 3px solid var(--c-accent); flex-shrink: 0; }
.operation-item-title { font-size: 13px; font-weight: 600; color: var(--c-text); margin-bottom: 4px; }
.operation-item-meta  { display: flex; justify-content: space-between; font-size: 12px; color: var(--c-muted); }
.operation-item-time  { color: var(--c-faint); }

.list-more-indicator { padding: 10px; text-align: center; color: var(--c-muted); font-size: 11px; background: var(--c-warm); border-radius: 8px; margin-top: 8px; }

.ranking-list { display: flex; flex-direction: column; gap: 10px; max-height: none; overflow: visible; }
.ranking-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--c-warm); border-radius: 8px; flex-shrink: 0; }
.rank-number { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: var(--c-warm-md); color: var(--c-muted); flex-shrink: 0; }
.rank-number.top { background: #FEF3E8; color: var(--c-accent); }
.rank-info   { flex: 1; }
.rank-name   { font-size: 14px; font-weight: 600; color: var(--c-text); margin-bottom: 2px; }
.rank-amount { font-size: 13px; color: var(--c-muted); }
.rank-bar    { width: 100px; height: 6px; background: var(--c-warm-md); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
.rank-bar-fill { height: 100%; background: var(--c-accent); border-radius: 3px; }

@media (max-width: 1200px) {
  .three-column-grid { grid-template-columns: 1fr; }
}
</style>