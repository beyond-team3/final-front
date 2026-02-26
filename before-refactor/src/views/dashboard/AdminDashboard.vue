<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import DashboardCalendar from '@/components/dashboard/DashboardCalendar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { getAdminDashboard } from '@/api/dashboard'

const dashboard = ref(null)
const loading = ref(false)
const error = ref('')

// ── KPI 카드 (프로토타입 더미) ──────────────────────────────────────────────
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

// ── 매출 추이 더미 데이터 (월별, 단위: 만원) ───────────────────────────────
const salesTrendData = {
  labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  datasets: [
    {
      label: '2025년',
      data: [8200, 7600, 9800, 11200, 13400, 12100, 10800, 11900, 14200, 15800, 13600, 16500],
      borderColor: '#94a3b8',
      backgroundColor: 'rgba(148,163,184,0.08)',
      borderDash: [5, 4],
    },
    {
      label: '2026년',
      data: [9700, 10200, 12400, 13800, 15200, 14600, null, null, null, null, null, null],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.08)',
      borderDash: [],
    },
  ],
}

// ── Canvas ref & Chart 인스턴스 ────────────────────────────────────────────
const chartCanvas = ref(null)
let chartInstance = null

/**
 * Chart.js를 동적 import 후 라인 차트를 그립니다.
 * Chart.js가 설치되어 있지 않을 경우 순수 Canvas로 fallback합니다.
 */
const renderChart = async () => {
  const canvas = chartCanvas.value
  if (!canvas) return

  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)

    if (chartInstance) chartInstance.destroy()

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: salesTrendData.labels,
        datasets: salesTrendData.datasets.map((ds) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.borderColor,
          backgroundColor: ds.backgroundColor,
          borderWidth: 2.5,
          borderDash: ds.borderDash,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
          spanGaps: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, boxHeight: 2, font: { size: 12 }, color: '#555' },
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
            ticks: { font: { size: 12 }, color: '#888' },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              font: { size: 12 },
              color: '#888',
              callback: (v) => `₩${(v / 10000).toFixed(0)}억`,
            },
            beginAtZero: false,
          },
        },
      },
    })
  } catch {
    // Chart.js 미설치 시 순수 Canvas로 fallback
    renderFallbackChart(canvas)
  }
}

/** Chart.js 없이 Canvas 2D API로 직접 그리는 fallback 차트 */
const renderFallbackChart = (canvas) => {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas.getBoundingClientRect()
  canvas.width = width * window.devicePixelRatio
  canvas.height = height * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  const W = width
  const H = height
  const PAD = { top: 30, right: 24, bottom: 40, left: 56 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const allValues = salesTrendData.datasets.flatMap((d) => d.data.filter((v) => v !== null))
  const minVal = Math.min(...allValues) * 0.92
  const maxVal = Math.max(...allValues) * 1.05
  const range = maxVal - minVal

  const toX = (i) => PAD.left + (i / (salesTrendData.labels.length - 1)) * innerW
  const toY = (v) => PAD.top + innerH - ((v - minVal) / range) * innerH

  // 격자선
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (innerH / 4) * i
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + innerW, y); ctx.stroke()
  }

  // X축 레이블
  ctx.fillStyle = '#888'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  salesTrendData.labels.forEach((label, i) => {
    ctx.fillText(label, toX(i), H - PAD.bottom + 16)
  })

  // Y축 레이블
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const v = minVal + (range / 4) * (4 - i)
    const y = PAD.top + (innerH / 4) * i
    ctx.fillText(`₩${Math.round(v / 1000)}천만`, PAD.left - 6, y + 4)
  }

  // 데이터 라인 그리기
  const colors = ['#94a3b8', '#2563eb']
  const dashes = [[5, 4], []]

  salesTrendData.datasets.forEach((ds, di) => {
    const points = ds.data
        .map((v, i) => (v !== null ? { x: toX(i), y: toY(v) } : null))
        .filter(Boolean)

    if (!points.length) return

    ctx.beginPath()
    ctx.setLineDash(dashes[di])
    ctx.strokeStyle = colors[di]
    ctx.lineWidth = 2.5
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
    ctx.setLineDash([])

    // 포인트 원
    points.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.strokeStyle = colors[di]
      ctx.lineWidth = 2
      ctx.stroke()
    })
  })

  // 범례
  const legendY = 14
  ;[{ label: '2025년', color: '#94a3b8', dash: true }, { label: '2026년', color: '#2563eb', dash: false }].forEach(
      (item, i) => {
        const x = W - PAD.right - (1 - i) * 100
        ctx.setLineDash(item.dash ? [5, 4] : [])
        ctx.strokeStyle = item.color
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(x, legendY); ctx.lineTo(x + 24, legendY); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#555'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(item.label, x + 28, legendY + 4)
      },
  )
}

// ── 영업사원별 매출 랭킹 더미 데이터 ──────────────────────────────────────
const rankings = [
  { rank: 1, name: '김민수', amount: '₩45,600,000', width: 100 },
  { rank: 2, name: '박지훈', amount: '₩38,900,000', width: 85 },
  { rank: 3, name: '최가은', amount: '₩31,200,000', width: 68 },
  { rank: 4, name: '이서연', amount: '₩28,700,000', width: 63 },
  { rank: 5, name: '정태호', amount: '₩24,500,000', width: 54 },
]

// ── Dashboard 데이터 fetch ─────────────────────────────────────────────────
const title = computed(() => dashboard.value?.title || '관리자 대시보드')
const approvals = computed(() => dashboard.value?.approvals ?? [])
const trendPeriod = computed(() => dashboard.value?.trendPeriod || '2025년 – 2026년 월별 매출 추이')
const approvalCount = computed(() => dashboard.value?.approvalCount ?? approvals.value.length)
const hasData = computed(() => prototypeKpis.length || rankings.length || approvals.value.length)

const fetchDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    dashboard.value = await getAdminDashboard()
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || '대시보드 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
    // DOM이 업데이트된 뒤(nextTick) canvas가 존재하므로 그때 차트를 렌더링
    await nextTick()
    await renderChart()
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <section class="dashboard-shell">
    <!-- 로딩 -->
    <template v-if="loading">
      <LoadingSpinner text="관리자 대시보드를 불러오는 중입니다." />
    </template>

    <!-- 에러: 차트는 더미 데이터로 항상 표시, 나머지 섹션에만 에러 메시지 -->
    <template v-else-if="error">
      <ErrorMessage :message="error" @retry="fetchDashboard" />
    </template>

    <template v-else-if="!hasData">
      <EmptyState title="표시할 관리자 데이터가 없습니다." description="데이터 등록 후 다시 확인해주세요." />
    </template>

    <!-- 정상 렌더링 (에러여도 차트 섹션은 아래에서 항상 표시) -->
    <template v-else>
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
    </template>

    <!-- 차트 섹션: 로딩 중이 아니면 항상 렌더링 (더미 데이터 사용) -->
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

    <!-- 하단 3열 그리드: 정상 데이터일 때만 -->
    <template v-if="!loading && !error && hasData">
      <div class="three-column-grid">
        <div class="operation-card">
          <div class="operation-header">
            <h3 class="operation-title">영업사원별 매출 랭킹</h3>
            <span class="chart-period">이번 달</span>
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
    </template>
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
.chart-canvas-wrap { height: 300px; border-radius: 8px; overflow: hidden; }
.chart-canvas { width: 100%; height: 100%; }

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