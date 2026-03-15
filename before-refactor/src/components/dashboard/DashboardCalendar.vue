<script setup>
defineProps({
  title: {
    type: String,
    default: '이번주 일정',
  },
  badge: {
    type: String,
    default: '2월 9일 - 15일',
  },
  weekDays: {
    type: Array,
    default: () => [
      { day: '일', date: '9', otherMonth: true },
      { day: '월', date: '10', otherMonth: true },
      { day: '화', date: '11', today: true },
      { day: '수', date: '12' },
      { day: '목', date: '13' },
      { day: '금', date: '14' },
      { day: '토', date: '15' },
    ],
  },
  dayEvents: {
    type: Array,
    default: () => [
      [],
      [],
      [{ label: '계약 검토', type: 'contract' }],
      [],
      [{ label: '견적 미팅', type: 'default' }],
      [],
      [{ label: '청구일', type: 'billing' }],
    ],
  },
  listEvents: {
    type: Array,
    default: () => [
      { date: '11', day: '화', title: '계약서 검토', detail: 'CT-2026-0210-002 · 오전 10:00', type: 'contract', tag: '계약' },
      { date: '13', day: '목', title: '견적 미팅 - 고추 종자', detail: 'QT-2026-0213-001 · 오후 2:00', type: 'default', tag: '견적' },
      { date: '15', day: '토', title: '청구 사이클 도래', detail: '월 2회 정기 청구일 · 미결 주문 포함 예정', type: 'billing', tag: '청구' },
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
.panel { border: 1px solid #e8ecef; border-radius: 8px; padding: 22px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-title { font-size: 15px; font-weight: 600; color: #2c3e50; }
.panel-badge { font-size: 11px; color: #7f8c8d; background: #f0f3f4; padding: 3px 8px; border-radius: 4px; }

.week-header { display: grid; grid-template-columns: 44px repeat(7, 1fr); border-bottom: 1px solid #e8ecef; margin-bottom: 2px; }
.week-header-cell { font-size: 11px; color: #95a5a6; text-align: center; padding: 0 0 8px; font-weight: 600; }
.week-header-cell.today { color: #2c3e50; }
.week-day-num { font-size: 13px; font-weight: 700; text-align: center; padding: 6px 0 4px; display: inline-block; }
.week-day-num.today { background-color: #2c3e50; color: #fff; border-radius: 50%; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; }
.week-day-num.other-month { color: #bdc3c7; }

.event-row { display: grid; grid-template-columns: 44px repeat(7, 1fr); margin-top: 6px; gap: 2px; }
.event-label { font-size: 10px; color: #bdc3c7; padding-top: 3px; }
.event-day-col { min-height: 24px; }
.cal-event { margin: 2px; padding: 3px 6px; border-radius: 3px; font-size: 11px; background: #e8ecef; color: #2c3e50; border-left: 2px solid #7f8c8d; }
.cal-event.billing { background: #fef3e8; border-left-color: #e67e22; color: #784b0a; }
.cal-event.contract { background: #f0f3f4; border-left-color: #2c3e50; color: #2c3e50; }

.week-event-list-wrap { margin-top: 16px; }
.week-event-list { display: flex; flex-direction: column; gap: 7px; }
.week-event-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #bdc3c7; }
.week-event-item.billing { border-left-color: #e67e22; }
.week-event-item.contract { border-left-color: #2c3e50; }
.week-event-date { font-size: 13px; font-weight: 700; color: #2c3e50; min-width: 28px; text-align: center; padding-top: 1px; }
.week-event-date .day-label { display: block; font-size: 10px; font-weight: 400; color: #95a5a6; }
.week-event-info { flex: 1; }
.week-event-title { font-size: 13px; font-weight: 600; color: #2c3e50; margin-bottom: 2px; }
.week-event-detail { font-size: 11px; color: #95a5a6; }
.week-event-tag { font-size: 10px; padding: 2px 7px; border-radius: 3px; background: #e8ecef; color: #556270; white-space: nowrap; align-self: center; }
.week-event-tag.billing { background: #fef3e8; color: #784b0a; }
.week-event-tag.contract { background: #f0f3f4; color: #2c3e50; }
</style>
