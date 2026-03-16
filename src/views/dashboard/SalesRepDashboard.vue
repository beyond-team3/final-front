<script setup>
import { computed, onMounted, ref } from 'vue'
import DashboardCalendar from '@/components/dashboard/DashboardCalendar.vue'
import DashboardReference from '@/components/dashboard/DashboardReference.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { getSalesRepDashboard, getWeeklySchedules, getPriorityContacts } from '@/api/dashboard'

const dashboard = ref(null)
const priorityContacts = ref([])
const loading = ref(false)
const error = ref('')

// 캘린더 전용 상태
const calendarData    = ref(null)
const calendarLoading = ref(false)

const selectedTimelineFilter = ref('전체')

const timelineFilters  = computed(() => dashboard.value?.timelineFilters ?? ['전체', '견적', '계약', '주문'])
const monthlyBars      = computed(() => dashboard.value?.monthlyBars ?? [])
const billings         = computed(() => (dashboard.value?.billings ?? []).slice(0, 3))
const timeline         = computed(() => dashboard.value?.timeline ?? [])
const headerTitle      = computed(() => dashboard.value?.header?.title || '내 영업 현황')
const headerSubtitle   = computed(() => dashboard.value?.header?.subtitle || '')
const periodLabel      = computed(() => dashboard.value?.monthlySales?.periodLabel || '')
const monthlyAmount    = computed(() => dashboard.value?.monthlySales?.amount || '-')
const monthlyChange    = computed(() => dashboard.value?.monthlySales?.change || '-')
const monthlyDiff      = computed(() => dashboard.value?.monthlySales?.diff || '-')
const monthlyCompleted = computed(() => dashboard.value?.monthlySales?.completedCount || '-')
const hasData = computed(() => monthlyBars.value.length || billings.value.length || timeline.value.length || priorityContacts.value.length)

// 캘린더 props (API 데이터 우선, 없으면 컴포넌트 default 사용)
const calendarBadge    = computed(() => calendarData.value?.badge    ?? undefined)
const calendarWeekDays = computed(() => calendarData.value?.weekDays ?? undefined)
const calendarDayEvents= computed(() => calendarData.value?.dayEvents ?? undefined)
const calendarListEvents=computed(() => calendarData.value?.listEvents ?? undefined)

const fetchDashboard = async () => {
  loading.value = true
  error.value   = ''

  try {
    const [dashData, priorityData] = await Promise.all([
      getSalesRepDashboard(),
      getPriorityContacts()
    ])
    dashboard.value = dashData
    priorityContacts.value = priorityData.slice(0, 5) // Top 5
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || '대시보드 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
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
  <section v-if="loading" class="dashboard-shell">
    <LoadingSpinner text="영업 대시보드를 불러오는 중입니다." />
  </section>

  <section v-else-if="error" class="dashboard-shell">
    <ErrorMessage :message="error" @retry="fetchDashboard" />
  </section>

  <section v-else-if="!hasData" class="dashboard-shell">
    <EmptyState title="표시할 영업 데이터가 없습니다." description="데이터 등록 후 다시 확인해주세요." />
  </section>

  <section v-else class="dashboard-shell">
    <div class="dashboard-header">
      <div>
        <div class="dashboard-title">{{ headerTitle }}</div>
        <div class="dashboard-subtitle">{{ headerSubtitle }}</div>
      </div>
    </div>

    <div class="dashboard-grid-top">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">개인 월별 매출</span>
          <span class="panel-badge">{{ periodLabel }}</span>
        </div>
        <div class="monthly-sales-summary">
          <div class="monthly-main-row">
            <div class="monthly-amount">{{ monthlyAmount }}</div>
            <div class="monthly-change">{{ monthlyChange }}</div>
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
              <div class="monthly-meta-value">{{ monthlyDiff }}</div>
            </div>
            <div class="monthly-meta-item">
              <div class="monthly-meta-label">완료 계약 건수</div>
              <div class="monthly-meta-value">{{ monthlyCompleted }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">이번달 청구 대상 계약</span>
          <span class="panel-badge">{{ billings.length }}건</span>
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
      <DashboardReference :items="priorityContacts" />

      <div class="panel">
        <div class="timeline-header-row">
          <span class="panel-title">최근 영업 히스토리</span>
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

      <!-- 캘린더: 데이터 있으면 props로 전달, 없으면 컴포넌트 default 사용 -->
      <DashboardCalendar
          v-bind="calendarData ? {
            badge:      calendarBadge,
            weekDays:   calendarWeekDays,
            dayEvents:  calendarDayEvents,
            listEvents: calendarListEvents,
          } : {}"
      />
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
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.dashboard-title   { font-size: 22px; font-weight: 700; color: var(--text); }
.dashboard-subtitle{ font-size: 13px; color: var(--muted); margin-top: 4px; }

.dashboard-grid-top    {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  flex-shrink: 0;
}
.dashboard-grid-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 22px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-shrink: 0; }
.panel-title  { font-size: 15px; font-weight: 600; color: var(--text); }
.panel-badge  { font-size: 11px; color: var(--muted); background: var(--warm-md); padding: 3px 8px; border-radius: 4px; }

.monthly-sales-summary { display: flex; flex-direction: column; gap: 16px; }
.monthly-main-row { display: flex; align-items: flex-end; gap: 10px; }
.monthly-amount   { font-size: 30px; font-weight: 700; color: var(--text); }
.monthly-change   { font-size: 12px; color: var(--olive); margin-bottom: 5px; }
.monthly-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
.bar-col  { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
.bar-fill { width: 100%; background: var(--warm-md); border-radius: 3px 3px 0 0; }
.bar-col.current .bar-fill  { background: var(--accent); }
.bar-label { font-size: 10px; color: var(--faint); white-space: nowrap; }
.bar-col.current .bar-label { color: var(--text); font-weight: 600; }
.monthly-meta       { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.monthly-meta-item  { background: var(--warm); border-radius: 6px; padding: 11px 13px; }
.monthly-meta-label { font-size: 11px; color: var(--muted); margin-bottom: 3px; }
.monthly-meta-value { font-size: 14px; font-weight: 600; color: var(--text); }

.billing-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: none;
  overflow: visible;
}
.billing-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--warm);
  border-radius: 6px;
  border-left: 3px solid var(--faint);
  flex-shrink: 0;
}
.billing-item.status-due-soon { border-left-color: var(--accent); }
.billing-item.status-paid     { border-left-color: var(--olive); }
.billing-left  { display: flex; flex-direction: column; gap: 3px; }
.billing-client{ font-size: 14px; font-weight: 600; color: var(--text); }
.billing-doc-no{ font-size: 12px; color: var(--muted); }
.billing-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.billing-amount{ font-size: 14px; font-weight: 600; color: var(--text); }
.billing-status{ font-size: 11px; color: var(--muted); }

.timeline-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-shrink: 0;
}
.timeline-filter     { display: flex; gap: 6px; }
.timeline-filter-btn { padding: 4px 10px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 12px; border-radius: 4px; cursor: pointer; transition: background 0.15s; }
.timeline-filter-btn.active { background: var(--text); color: #fff; border-color: var(--text); }

.timeline-list {
  position: relative;
  padding-left: 28px;
  max-height: none;
  overflow: visible;
}
.timeline-list::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 1px; background: var(--border); }
.timeline-item { position: relative; margin-bottom: 16px; padding-left: 16px; flex-shrink: 0; }
.timeline-item:last-child { margin-bottom: 0; }
.timeline-item::before { content: ''; position: absolute; left: -21px; top: 7px; width: 10px; height: 10px; background: var(--faint); border-radius: 50%; border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--faint); }
.timeline-item.계약::before { background: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.timeline-item.견적::before { background: var(--olive);  box-shadow: 0 0 0 1px var(--olive);  }
.timeline-item.주문::before { background: var(--text);   box-shadow: 0 0 0 1px var(--text);   }
.timeline-date           { font-size: 11px; color: var(--faint); margin-bottom: 3px; }
.timeline-content        { background: var(--warm); padding: 11px 14px; border-radius: 6px; }
.timeline-content-title  { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.timeline-content-detail { font-size: 12px; color: var(--muted); }

@media (max-width: 1100px) {
  .dashboard-grid-top,
  .dashboard-grid-bottom { grid-template-columns: 1fr; }
}
</style>