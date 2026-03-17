<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  title: {
    type: String,
    default: '이번주 일정',
  },
  badge: {
    type: String,
    default: '',
  },
  weekDays: {
    type: Array,
    default: () => [],
  },
  dayEvents: {
    type: Array,
    default: () => [],
  },
  listEvents: {
    type: Array,
    default: () => [],
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

const getCountBadgeClass = (events) => {
  if (events.some(e => e.type === 'billing')) return 'billing'
  if (events.some(e => e.type === 'contract')) return 'contract'
  return ''
}
</script>

<template>
  <div class="panel">
    <div class="panel-header" style="cursor: pointer;" @click="router.push('/schedule')">
      <span class="panel-title">{{ title }}</span>
      <span v-if="badge" class="panel-badge">{{ badge }}</span>
    </div>

    <div class="week-header">
      <div />
      <div
          v-for="(day, idx) in weekDays"
          :key="`${day.day}-${idx}`"
          class="week-header-cell"
          :class="{ today: day.today, selected: selectedDate === day.date }"
          @click="selectDay(day)"
      >
        {{ day.day }}<br>
        <span class="week-day-num" :class="{ today: day.today, selected: selectedDate === day.date, 'other-month': day.otherMonth }">
          {{ day.date }}
        </span>
        <span v-if="dayEvents[idx]?.length" class="event-count-badge" :class="getCountBadgeClass(dayEvents[idx])">
          {{ dayEvents[idx].length }}
        </span>
      </div>
    </div>

    <div class="week-event-list-wrap">
      <template v-if="selectedDate">
        <div v-if="filteredEvents.length === 0" class="no-events">
          이 날은 일정이 없습니다.
        </div>
        <div v-else class="week-event-list">
          <div
              v-for="event in filteredEvents"
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
      </template>
      <div v-else class="no-selection">
        날짜를 선택하면 일정을 확인할 수 있습니다.
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
  display: flex; flex-direction: column;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 6px; margin: -4px -6px 16px; border-radius: 6px; transition: background 0.15s;
}
.panel-header:hover { background: var(--warm); }
.panel-title  { font-size: 15px; font-weight: 600; color: var(--text); }
.panel-badge  { font-size: 11px; color: var(--muted); background: var(--warm-md); padding: 3px 8px; border-radius: 4px; }

.week-header {
  display: grid; grid-template-columns: 44px repeat(7, 1fr);
  border-bottom: 1px solid var(--border); margin-bottom: 2px;
}
.week-header-cell {
  font-size: 11px; color: var(--faint); text-align: center;
  padding: 0 0 8px; font-weight: 600; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  border-radius: 6px; transition: background 0.15s;
}
.week-header-cell:hover { background: var(--warm); }
.week-header-cell.today { color: var(--text); }
.week-header-cell.selected { color: var(--olive); }

.week-day-num {
  font-size: 13px; font-weight: 700; text-align: center;
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
}
.week-day-num.today { background-color: var(--accent); color: #fff; border-radius: 50%; }
.week-day-num.selected:not(.today) { background-color: var(--olive); color: #fff; border-radius: 50%; }
.week-day-num.other-month { color: var(--faint); opacity: 0.5; }

.event-count-badge {
  font-size: 10px; font-weight: 700;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--warm-md); color: var(--muted);
}
.event-count-badge.billing  { background: #FEF3E8; color: #7A3800; }
.event-count-badge.contract { background: var(--warm); color: var(--text); border: 1px solid var(--border); }

.week-event-list-wrap { margin-top: 16px; flex: 1; }
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

.no-events, .no-selection { font-size: 12px; color: var(--faint); text-align: center; padding: 20px 0; }
</style>