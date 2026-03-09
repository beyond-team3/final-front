<script setup>
defineProps({
  title: {
    type: String,
    default: '이번주 일정',
  },
  badge: {
    type: String,
    default: '3월 2일 - 8일',
  },
  weekDays: {
    type: Array,
    default: () => [
      { day: '일', date: '1', otherMonth: false },
      { day: '월', date: '2' },
      { day: '화', date: '3' },
      { day: '수', date: '4' },
      { day: '목', date: '5' },
      { day: '금', date: '6', today: true },
      { day: '토', date: '7' },
    ],
  },
  dayEvents: {
    type: Array,
    default: () => [
      [],
      [{ label: '계약 검토', type: 'contract' }],
      [],
      [],
      [{ label: '청구 사이클', type: 'billing' }],
      [{ label: '거래처 미팅', type: 'default' }],
      [],
    ],
  },
  listEvents: {
    type: Array,
    default: () => [
      { date: '2', day: '월', title: 'CNT-20260303-3 계약 검토', detail: 'OO육묘장 · 오전 10:00', type: 'contract', tag: '계약' },
      { date: '5', day: '목', title: 'MONTHLY 청구 사이클 도래', detail: '이번 달 청구 대상 계약 포함 예정', type: 'billing', tag: '청구' },
      { date: '6', day: '금', title: '그린팜유통 방문 미팅', detail: '고추·토마토 재주문 협의', type: 'default', tag: '영업' },
    ],
  },
})
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">{{ title }}</span>
      <span class="panel-badge">{{ badge }}</span>
    </div>

    <div class="week-header">
      <div />
      <div v-for="(day, idx) in weekDays" :key="`${day.day}-${idx}`" class="week-header-cell" :class="day.today ? 'today' : ''">
        {{ day.day }}<br>
        <span class="week-day-num" :class="{ today: day.today, 'other-month': day.otherMonth }">{{ day.date }}</span>
      </div>
    </div>

    <div class="event-row">
      <div class="event-label">일정</div>
      <div v-for="(events, idx) in dayEvents" :key="`events-${idx}`" class="event-day-col">
        <div
            v-for="event in events"
            :key="event.label"
            class="cal-event"
            :class="event.type === 'billing' ? 'billing' : event.type === 'contract' ? 'contract' : ''"
        >
          {{ event.label }}
        </div>
      </div>
    </div>

    <div class="week-event-list-wrap">
      <div class="week-event-list">
        <div
            v-for="event in listEvents"
            :key="`${event.date}-${event.title}`"
            class="week-event-item"
            :class="event.type === 'billing' ? 'billing' : event.type === 'contract' ? 'contract' : ''"
        >
          <div class="week-event-date">
            {{ event.date }}
            <span class="day-label">{{ event.day }}</span>
          </div>
          <div class="week-event-info">
            <div class="week-event-title">{{ event.title }}</div>
            <div class="week-event-detail">{{ event.detail }}</div>
          </div>
          <span
              class="week-event-tag"
              :class="event.type === 'billing' ? 'billing' : event.type === 'contract' ? 'contract' : ''"
          >
            {{ event.tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
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

  border: 1px solid var(--border); border-radius: 10px; padding: 22px; background: var(--surface);
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-title  { font-size: 15px; font-weight: 600; color: var(--text); }
.panel-badge  { font-size: 11px; color: var(--muted); background: var(--warm-md); padding: 3px 8px; border-radius: 4px; }

.week-header { display: grid; grid-template-columns: 44px repeat(7, 1fr); border-bottom: 1px solid var(--border); margin-bottom: 2px; }
.week-header-cell { font-size: 11px; color: var(--faint); text-align: center; padding: 0 0 8px; font-weight: 600; }
.week-header-cell.today { color: var(--text); }
.week-day-num { font-size: 13px; font-weight: 700; text-align: center; padding: 6px 0 4px; display: inline-block; }
.week-day-num.today { background-color: var(--accent); color: #fff; border-radius: 50%; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; }
.week-day-num.other-month { color: var(--faint); opacity: 0.5; }

.event-row { display: grid; grid-template-columns: 44px repeat(7, 1fr); margin-top: 6px; gap: 2px; }
.event-label  { font-size: 10px; color: var(--faint); padding-top: 3px; }
.event-day-col { min-height: 24px; }
.cal-event { margin: 2px; padding: 3px 6px; border-radius: 3px; font-size: 11px; background: var(--warm-md); color: var(--text); border-left: 2px solid var(--faint); }
.cal-event.billing  { background: #FEF3E8; border-left-color: var(--accent); color: #7A3800; }
.cal-event.contract { background: var(--warm); border-left-color: var(--text); color: var(--text); }

.week-event-list-wrap { margin-top: 16px; }
.week-event-list { display: flex; flex-direction: column; gap: 7px; }
.week-event-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; background: var(--warm); border-radius: 6px; border-left: 3px solid var(--faint); }
.week-event-item.billing  { border-left-color: var(--accent); }
.week-event-item.contract { border-left-color: var(--text); }
.week-event-date { font-size: 13px; font-weight: 700; color: var(--text); min-width: 28px; text-align: center; padding-top: 1px; }
.week-event-date .day-label { display: block; font-size: 10px; font-weight: 400; color: var(--faint); }
.week-event-info  { flex: 1; }
.week-event-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.week-event-detail{ font-size: 11px; color: var(--muted); }
.week-event-tag   { font-size: 10px; padding: 2px 7px; border-radius: 3px; background: var(--warm-md); color: var(--muted); white-space: nowrap; align-self: center; }
.week-event-tag.billing  { background: #FEF3E8; color: #7A3800; }
.week-event-tag.contract { background: var(--warm); color: var(--text); }
</style>