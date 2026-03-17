<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  title: { type: String, default: '이번주 일정' },
  badge: { type: String, default: '3월 2일 - 8일' },
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

const selectedDate = ref(null)

const selectDay = (day) => {
  selectedDate.value = selectedDate.value === day.date ? null : day.date
}

const filteredEvents = computed(() => {
  if (!selectedDate.value) return []
  return props.listEvents
      .filter(e => e.date === selectedDate.value)
      .slice(0, 5)
})
</script>

<template>
  <div class="panel">
    <div class="panel-header" style="cursor: pointer;" @click="router.push('/schedule')">
      <span class="panel-title">{{ title }}</span>
      <span class="panel-badge">{{ badge }}</span>
    </div>

    <div class="week-grid">
      <div
          v-for="(day, idx) in weekDays"
          :key="`${day.day}-${idx}`"
          class="week-col"
          :class="{ today: day.today, selected: selectedDate === day.date }"
          @click="selectDay(day)"
      >
        <div class="week-day-label">{{ day.day }}</div>
        <div class="week-day-num" :class="{ today: day.today, selected: selectedDate === day.date, 'other-month': day.otherMonth }">
          {{ day.date }}
        </div>
        <!-- 일정 개수 뱃지 -->
        <div v-if="dayEvents[idx]?.length" class="event-count-badge" :class="getCountBadgeClass(dayEvents[idx])">
          {{ dayEvents[idx].length }}
        </div>
        <div v-else class="event-count-empty" />
      </div>
    </div>

    <!-- 선택된 날짜의 일정 목록 -->
    <transition name="slide">
      <div v-if="selectedDate" class="week-event-list-wrap">
        <div v-if="filteredEvents.length === 0" class="no-events">
          이 날은 일정이 없습니다.
        </div>
        <div v-else class="week-event-list">
          <div
              v-for="event in filteredEvents"
              :key="`${event.date}-${event.title}`"
              class="week-event-item"
              :class="event.type"
          >
            <div class="week-event-info">
              <div class="week-event-title">{{ event.title }}</div>
              <div class="week-event-detail">{{ event.detail }}</div>
            </div>
            <span class="week-event-tag" :class="event.type">{{ event.tag }}</span>
          </div>
        </div>
      </div>
      <div v-else class="no-selection">
        날짜를 선택하면 일정을 확인할 수 있습니다.
      </div>
    </transition>
  </div>
</template>

<script>
function getCountBadgeClass(events) {
  if (events.some(e => e.type === 'billing')) return 'billing'
  if (events.some(e => e.type === 'contract')) return 'contract'
  return ''
}
</script>

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
  display: flex; flex-direction: column;
}

.panel-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  border-radius: 6px; transition: background 0.15s;
}
.panel-header:hover { background: var(--warm); }
.panel-title  { font-size: 15px; font-weight: 600; color: var(--text); }
.panel-badge  { font-size: 11px; color: var(--muted); background: var(--warm-md); padding: 3px 8px; border-radius: 4px; }

/* 요일 그리드 */
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 16px;
}
.week-col {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px 4px; border-radius: 8px; cursor: pointer;
  transition: background 0.15s;
}
.week-col:hover { background: var(--warm); }
.week-col.selected { background: var(--warm-md); }

.week-day-label { font-size: 11px; color: var(--faint); font-weight: 600; }
.week-col.today .week-day-label { color: var(--text); }
.week-col.selected .week-day-label { color: var(--olive); }

.week-day-num {
  font-size: 14px; font-weight: 700; color: var(--text);
  width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.week-day-num.today { background: var(--accent); color: #fff; }
.week-day-num.selected:not(.today) { background: var(--olive); color: #fff; }
.week-day-num.other-month { color: var(--faint); opacity: 0.5; }

/* 일정 개수 뱃지 */
.event-count-badge {
  font-size: 10px; font-weight: 700;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--warm-md); color: var(--muted);
}
.event-count-badge.billing  { background: #FEF3E8; color: #7A3800; }
.event-count-badge.contract { background: var(--warm); color: var(--text); }
.event-count-empty { height: 18px; }

/* 일정 목록 */
.week-event-list-wrap { flex: 1; }
.week-event-list { display: flex; flex-direction: column; gap: 7px; }
.week-event-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; background: var(--warm); border-radius: 6px;
  border-left: 3px solid var(--faint);
}
.week-event-item.billing  { border-left-color: var(--accent); }
.week-event-item.contract { border-left-color: var(--text); }
.week-event-info  { flex: 1; }
.week-event-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.week-event-detail{ font-size: 11px; color: var(--muted); }
.week-event-tag   { font-size: 10px; padding: 2px 7px; border-radius: 3px; background: var(--warm-md); color: var(--muted); white-space: nowrap; align-self: center; }
.week-event-tag.billing  { background: #FEF3E8; color: #7A3800; }
.week-event-tag.contract { background: var(--warm); color: var(--text); }

.no-events, .no-selection {
  font-size: 12px; color: var(--faint); text-align: center; padding: 20px 0;
}

/* 슬라이드 애니메이션 */
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>