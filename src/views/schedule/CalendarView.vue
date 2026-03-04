<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CdrButton, IconRefresh } from '@rei/cedar'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { syncHarvestSchedulesForSalesRep } from '@/services/GrowingSeasonService'
import { ROLES } from '@/utils/constants'

const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const ym = (d) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const filterState = ref({ sales: 'ALL', client: 'ALL', employee: 'ALL', scheduleType: 'ALL' })

const viewDate = ref(new Date(2026, 1, 1))
const selectedDate = ref('2026-02-10')

// TODO: API 연결
const events = ref([
  {
    id: 'H-001',
    type: 'history',
    historyCategory: 'RFQ',
    title: '견적요청서 접수',
    desc: '대상팜 - 봄작기 수박 대목 견적요청서 생성',
    date: '2026-02-03',
    time: '10:30',
    clientId: 'C001',
    clientName: '대상팜',
    employeeId: 'E001',
    employeeName: '김영업',
    docType: '견적요청서',
    docNo: 'RFQ-2026-0203-001',
  },
  {
    id: 'H-002',
    type: 'history',
    historyCategory: 'QUOTATION',
    title: '견적서 발행',
    desc: '그린농원 - 토마토 종자 견적서 발행',
    date: '2026-02-06',
    time: '14:00',
    clientId: 'C002',
    clientName: '그린농원',
    employeeId: 'E002',
    employeeName: '이영업',
    docType: '견적서',
    docNo: 'Q-2026-0206-002',
  },
  {
    id: 'H-003',
    type: 'history',
    historyCategory: 'CONTRACT',
    title: '계약서 승인 요청',
    desc: '해오름농장 - 2026 봄작 계약서 승인 요청',
    date: '2026-02-10',
    time: '09:20',
    clientId: 'C003',
    clientName: '해오름농장',
    employeeId: 'E001',
    employeeName: '김영업',
    docType: '계약서',
    docNo: 'C-2026-0210-003',
  },
  {
    id: 'H-004',
    type: 'history',
    historyCategory: 'ORDER',
    title: '주문서 생성',
    desc: '대상팜 - 수박 대목 500판 주문서 생성',
    date: '2026-02-18',
    time: '16:10',
    clientId: 'C001',
    clientName: '대상팜',
    employeeId: 'E003',
    employeeName: '박영업',
    docType: '주문서',
    docNo: 'O-2026-0218-004',
  },
  {
    id: 'P-101',
    type: 'personal',
    title: '개인 일정: 현장 방문 준비',
    desc: '방문 체크리스트 및 샘플 발송 확인',
    date: '2026-02-10',
    time: '13:30',
  },
  {
    id: 'P-102',
    type: 'personal',
    title: '개인 일정: 주간 회고',
    desc: '이번 주 이슈/성과 정리',
    date: '2026-02-14',
    time: '18:00',
  },
])

const recommendations = ref([
  { id: 1, name: '마라톤 수박 대목', tag: '내병성/중약세', colorA: '#f5f7fb', colorB: '#e6eefb' },
  { id: 2, name: '스위트 방울토마토', tag: '당도/수량성', colorA: '#f8fbf2', colorB: '#e2f4d9' },
  { id: 3, name: '프레시 오이', tag: '여름작 추천', colorA: '#f4fbfd', colorB: '#d9f0f7' },
  { id: 4, name: '파워 고추', tag: '내병성', colorA: '#fff7ef', colorB: '#ffe6cd' },
])
const recommendIdx = ref(0)
let carouselTimer = null

const dayModalOpen = ref(false)
const detailModalOpen = ref(false)
const editModalOpen = ref(false)
const detailEvent = ref(null)

const editDate = ref('')
const editTime = ref('09:00')
const editTitle = ref('')
const editDesc = ref('')
const editingId = ref(null)
const harvestAlerts = ref([])
const generatedEvents = ref([])

const labelHistory = (cat) => ({
  RFQ: '견적요청',
  QUOTATION: '견적',
  CONTRACT: '계약',
  ORDER: '주문',
  INVOICE: '청구',
}[cat] || '영업')

const historyLabelWithOwner = (ev) => {
  const baseLabel = labelHistory(ev?.historyCategory)
  if (isAdmin.value && ev?.type === 'history' && ev?.employeeName) {
    return `${baseLabel} - ${ev.employeeName}`
  }
  return baseLabel
}

const eventTypeLabel = (eventItem) => {
  if (eventItem?.type === 'history') {
    return historyLabelWithOwner(eventItem)
  }
  if (eventItem?.type === 'harvest') {
    return '수확 일정'
  }
  if (eventItem?.type === 'growing-season') {
    return '재배적기'
  }
  return '개인 일정'
}

const eventTypeDetailLabel = (eventItem) => {
  if (eventItem?.type === 'history') {
    return `영업 문서 일정 (${historyLabelWithOwner(eventItem)})`
  }
  if (eventItem?.type === 'harvest') {
    return '수확 일정'
  }
  if (eventItem?.type === 'growing-season') {
    return '재배적기 일정'
  }
  return '개인 일정'
}

const passHistoryFilter = (ev) => {
  if (ev.type !== 'history') return true
  if (filterState.value.sales !== 'ALL' && ev.historyCategory !== filterState.value.sales) return false
  if (filterState.value.client !== 'ALL' && ev.clientId !== filterState.value.client) return false
  if (isAdmin.value && filterState.value.employee !== 'ALL' && ev.employeeId !== filterState.value.employee) return false
  return true
}

const passScheduleTypeFilter = (ev) => {
  if (!isSalesRep.value || filterState.value.scheduleType === 'ALL') {
    return true
  }

  if (filterState.value.scheduleType === 'DOCUMENT') {
    return ev.type === 'history'
  }
  if (filterState.value.scheduleType === 'PERSONAL') {
    return ev.type === 'personal'
  }
  if (filterState.value.scheduleType === 'GROWING_SEASON') {
    return ev.type === 'growing-season'
  }
  if (filterState.value.scheduleType === 'HARVEST') {
    return ev.type === 'harvest'
  }
  return true
}

const growingSeasonEvents = computed(() => harvestAlerts.value.map((item) => ({
  id: `GS-${item.sourceKey}`,
  type: 'growing-season',
  title: `재배적기 점검: ${item.varietyName}`,
  desc: `${item.clientName} · 생육 상태 점검 및 수확 준비를 진행하세요.`,
  date: `${viewDate.value.getFullYear()}-${pad2(item.expectedHarvestMonth)}-01`,
  time: '08:30',
  clientId: item.clientId,
  clientName: item.clientName,
  varietyName: item.varietyName,
})))

const allEvents = computed(() => [...events.value, ...generatedEvents.value, ...growingSeasonEvents.value])

const eventsByDate = (dateStr) => allEvents.value
  .filter((ev) => ev.date === dateStr)
  .filter(passHistoryFilter)
  .filter(passScheduleTypeFilter)
  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

const monthTitle = computed(() => ym(viewDate.value))

const calendarCells = computed(() => {
  const first = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1)
  const last = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 0)
  const startDay = first.getDay()
  const daysInMonth = last.getDate()
  const prevLast = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 0)
  const prevDays = prevLast.getDate()

  return Array.from({ length: 42 }, (_, i) => {
    const cellIndex = i - startDay + 1
    let cellDate
    let muted = false

    if (cellIndex < 1) {
      cellDate = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, prevDays + cellIndex)
      muted = true
    } else if (cellIndex > daysInMonth) {
      cellDate = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, cellIndex - daysInMonth)
      muted = true
    } else {
      cellDate = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), cellIndex)
    }

    const date = ymd(cellDate)
    return {
      date,
      day: cellDate.getDate(),
      muted,
      events: eventsByDate(date),
    }
  })
})

const selectedDayEvents = computed(() => eventsByDate(selectedDate.value))
const currentRecommendation = computed(() => recommendations.value[recommendIdx.value])

const openDayModal = (date) => {
  selectedDate.value = date
  dayModalOpen.value = true
}

const openDetail = (eventItem) => {
  detailEvent.value = eventItem
  dayModalOpen.value = false
  detailModalOpen.value = true
}

const openEditModal = (eventItem = null) => {
  editingId.value = eventItem?.id || null
  editDate.value = eventItem?.date || selectedDate.value || ymd(new Date())
  editTime.value = eventItem?.time || '09:00'
  editTitle.value = (eventItem?.title || '').replace('개인 일정: ', '')
  editDesc.value = eventItem?.desc || ''
  editModalOpen.value = true
}

const goToRecommendationDetail = async (item, index = null) => {
  if (item?.id == null) {
    return
  }
  if (index !== null) {
    recommendIdx.value = index
  }
  try {
    await router.push(`/products/${item.id}`)
  } catch (err) {
    // Ignore unexpected navigation errors.
  }
}

const goToClientDetail = async (clientId) => {
  if (!clientId) {
    return
  }
  try {
    await router.push(`/clients/${clientId}`)
  } catch (err) {
    // Ignore unexpected navigation errors.
  }
}

const resetFilters = () => {
  filterState.value = { sales: 'ALL', client: 'ALL', employee: 'ALL', scheduleType: 'ALL' }
}

const saveEdit = () => {
  if (!editDate.value || !editTitle.value.trim()) {
    window.alert('날짜와 제목은 필수입니다.')
    return
  }

  if (editingId.value) {
    const target = events.value.find((item) => item.id === editingId.value)
    if (target) {
      target.date = editDate.value
      target.time = editTime.value
      target.title = `개인 일정: ${editTitle.value.trim()}`
      target.desc = editDesc.value.trim()
    }
  } else {
    events.value.push({
      id: `P-${Date.now()}`,
      type: 'personal',
      date: editDate.value,
      time: editTime.value,
      title: `개인 일정: ${editTitle.value.trim()}`,
      desc: editDesc.value.trim(),
    })
  }

  editModalOpen.value = false
}

const deletePersonal = (id) => {
  events.value = events.value.filter((item) => item.id !== id)
  detailModalOpen.value = false
}

const prevMonth = async () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
  await loadHarvestSchedules()
}

const nextMonth = async () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
  await loadHarvestSchedules()
}

const startRecommendTimer = () => {
  carouselTimer = window.setInterval(() => {
    recommendIdx.value = (recommendIdx.value + 1) % recommendations.value.length
  }, 5000)
}

const loadHarvestSchedules = async () => {
  if (!isSalesRep.value) {
    return
  }

  const salesRepUserId = authStore.me?.id
  const salesRepEmployeeId = authStore.me?.refId

  if (!salesRepUserId || !salesRepEmployeeId) {
    return
  }

  try {
    const result = await syncHarvestSchedulesForSalesRep({
      salesRepUserId,
      salesRepEmployeeId,
      salesRepName: authStore.me?.name || '',
      currentDate: viewDate.value,
    })

    generatedEvents.value = result.scheduleEvents || []
    harvestAlerts.value = result.harvestAlerts || []
    notificationStore.mergeNotifications(ROLES.SALES_REP, result.notifications || [])
  } catch (error) {
    generatedEvents.value = []
    harvestAlerts.value = []
  }
}

onMounted(async () => {
  startRecommendTimer()
  await loadHarvestSchedules()
})

onBeforeUnmount(() => {
  if (carouselTimer) {
    window.clearInterval(carouselTimer)
  }
})
</script>

<template>
  <section class="screen-content">
    <h2 class="screen-title">캘린더</h2>

    <section class="calendar-page">
      <div class="calendar-left">
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="filter-grid">
              <div class="select">
                <span class="select-prefix">거래처</span>
                <select id="clientSelector" v-model="filterState.client" aria-label="거래처 필터">
                  <option value="ALL">전체</option>
                  <option value="C001">대상팜</option>
                  <option value="C002">그린농원</option>
                  <option value="C003">해오름농장</option>
                </select>
              </div>

              <div v-if="isSalesRep" class="select">
                <span class="select-prefix">일정</span>
                <select id="scheduleTypeSelector" v-model="filterState.scheduleType" aria-label="일정 구분 필터">
                  <option value="ALL">전체</option>
                  <option value="DOCUMENT">문서 일정</option>
                  <option value="PERSONAL">개인 일정</option>
                  <option value="GROWING_SEASON">재배적기</option>
                  <option value="HARVEST">수확 일정</option>
                </select>
              </div>

              <div v-if="isAdmin" class="select">
                <span class="select-prefix">사원</span>
                <select id="employeeSelector" v-model="filterState.employee" aria-label="사원 필터">
                  <option value="ALL">전체</option>
                  <option value="E001">김영업</option>
                  <option value="E002">이영업</option>
                  <option value="E003">박영업</option>
                </select>
              </div>
            </div>
          </div>

          <div class="toolbar-right">
            <CdrButton
              class="toolbar-reset-icon"
              type="button"
              modifier="secondary"
              icon-only
              aria-label="필터 초기화"
              @click="resetFilters"
            >
              <IconRefresh />
            </CdrButton>
            <button class="btn btn-primary add-btn" type="button" @click="openEditModal(null)">+</button>
          </div>
        </div>

        <div class="calendar-shell">
          <div class="calendar-card calendar-wrapper"><!-- // UPDATED -->
            <div class="calendar-header">
              <div class="month-nav">
                <button class="icon-btn" type="button" aria-label="이전 달" @click="prevMonth">‹</button>
              </div>
              <div class="month-title">{{ monthTitle }}</div>
              <div class="month-nav">
                <button class="icon-btn" type="button" aria-label="다음 달" @click="nextMonth">›</button>
              </div>
            </div>

            <div class="calendar-grid">
              <div v-for="dow in ['일','월','화','수','목','금','토']" :key="dow" class="dow">{{ dow }}</div>

              <div
                v-for="cell in calendarCells"
                :key="cell.date"
                class="day-cell"
                :class="{ muted: cell.muted }"
                @click="openDayModal(cell.date)"
              >
                <div class="day-num">{{ cell.day }}</div>
                <div class="badge-row">
                  <div v-for="ev in cell.events.slice(0, 3)" :key="ev.id" class="badge" :class="ev.type">
                    {{ ev.type === 'history' ? `${historyLabelWithOwner(ev)} · ${ev.title}` : `${eventTypeLabel(ev)} · ${ev.title}` }}
                  </div>
                  <div v-if="cell.events.length > 3" class="badge">+{{ cell.events.length - 3 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="calendar-right">
        <div v-if="isSalesRep" class="harvest-card">
          <div class="harvest-card-header">
            <div class="harvest-card-title">수확 시즌 알림</div>
            <div class="harvest-card-subtitle">수확월 도달 품종</div>
          </div>
          <div v-if="harvestAlerts.length === 0" class="harvest-empty">이번 달 수확 예정 품종이 없습니다.</div>
          <div v-else class="harvest-list">
            <div v-for="item in harvestAlerts" :key="item.sourceKey" class="harvest-item">
              <div class="harvest-item-main">
                <div class="harvest-variety">{{ item.varietyName }}</div>
                <div class="harvest-month">예상 수확월: {{ item.expectedHarvestMonth }}월</div>
              </div>
              <button class="btn btn-primary harvest-cta" type="button" @click="goToClientDetail(item.clientId)">거래처 이동</button>
            </div>
          </div>
        </div>

        <div class="side-card">
          <div class="side-header">
            <div class="side-title">이번달 판매 추천</div>
            <span style="font-size:12px;color:#6b7a8c;">자동 슬라이드</span>
          </div>

          <div v-if="currentRecommendation" class="carousel">
            <div
              class="carousel-img"
              role="button"
              tabindex="0"
              :style="{ background: `linear-gradient(135deg, ${currentRecommendation.colorA}, ${currentRecommendation.colorB})` }"
              @click="goToRecommendationDetail(currentRecommendation)"
              @keydown.enter="goToRecommendationDetail(currentRecommendation)"
              @keydown.space.prevent="goToRecommendationDetail(currentRecommendation)"
            >
              <div class="carousel-main-text">{{ currentRecommendation.name }}</div>
            </div>
            <div class="carousel-caption">{{ currentRecommendation.name }}</div>
          </div>

          <div class="recommend-list">
            <div
              v-for="(item, index) in recommendations"
              :key="item.id"
              class="recommend-item"
              role="button"
              tabindex="0"
              @click="goToRecommendationDetail(item, index)"
              @keydown.enter="goToRecommendationDetail(item, index)"
              @keydown.space.prevent="goToRecommendationDetail(item, index)"
            >
              <div class="recommend-name">{{ item.name }}</div>
              <div class="recommend-tag">{{ item.tag }}</div>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <div v-if="dayModalOpen" class="modal-backdrop" @click.self="dayModalOpen = false">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title">일정 목록 · {{ selectedDate }}</div>
          <button class="modal-close" type="button" @click="dayModalOpen = false">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-section-title">요청 정보</div>
          <div class="modal-list">
            <div v-for="ev in selectedDayEvents" :key="ev.id" class="modal-item" @click="openDetail(ev)">
              <div class="modal-item-top">
                <div class="modal-item-title">{{ ev.time ? `${ev.time} · ` : '' }}{{ ev.title }}</div>
                <div class="pill" :class="ev.type">{{ eventTypeLabel(ev) }}</div>
              </div>
              <div class="modal-item-desc">{{ ev.desc }}</div>
            </div>
            <div v-if="selectedDayEvents.length === 0" class="empty">표시할 일정이 없습니다.</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="detailModalOpen" class="modal-backdrop offset-header" @click.self="detailModalOpen = false">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title">일정 상세 · {{ detailEvent?.date }}</div>
          <button class="modal-close" type="button" @click="detailModalOpen = false">×</button>
        </div>
        <div class="modal-body" style="display: grid; gap: 10px;">
          <div class="info-box"><div class="k">제목</div><div class="v">{{ detailEvent?.title }}</div></div>
          <div class="info-box"><div class="k">시간</div><div class="v">{{ detailEvent?.time || '-' }}</div></div>
          <div class="info-box"><div class="k">구분</div><div class="v">{{ eventTypeDetailLabel(detailEvent) }}</div></div>
          <div class="info-box"><div class="k">설명</div><div class="v">{{ detailEvent?.desc || '-' }}</div></div>

          <div class="modal-actions">
            <template v-if="detailEvent?.type === 'personal'">
              <button class="btn" type="button" @click="openEditModal(detailEvent)">수정</button>
              <button class="btn" type="button" @click="deletePersonal(detailEvent.id)">삭제</button>
            </template>
            <div v-else style="color:#6b7a8c;font-size:12px;font-weight:700;">※ 문서/재배적기/수확 일정은 자동 생성 일정입니다.</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="editModalOpen" class="modal-backdrop" @click.self="editModalOpen = false">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title">{{ editingId ? '개인 일정 수정' : '개인 일정 추가' }}</div>
          <button class="modal-close" type="button" @click="editModalOpen = false">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-section-title">요청 정보</div>
          <div class="form-grid">
            <div class="field">
              <label for="editDate">날짜</label>
              <input id="editDate" v-model="editDate" type="date">
            </div>
            <div class="field">
              <label for="editTime">시간</label>
              <input id="editTime" v-model="editTime" type="time">
            </div>
            <div class="field full">
              <label for="editTitle">제목</label>
              <input id="editTitle" v-model="editTitle" type="text" placeholder="예: 거래처 미팅 준비">
            </div>
            <div class="field full">
              <label for="editDesc">설명</label>
              <textarea id="editDesc" v-model="editDesc" placeholder="예: 자료 정리, 방문 일정 확정 등"></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn" type="button" @click="editModalOpen = false">취소</button>
            <button class="btn btn-primary" type="button" @click="saveEdit">저장</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.screen-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-strong, #3D3529);
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--color-border-divider, #E8E3D8);
}

.calendar-page { display: flex; gap: 20px; align-items: stretch; }
.calendar-left { flex: 1 1 auto; min-width: 640px; }
.calendar-right { width: 360px; flex: 0 0 360px; }

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: var(--color-bg-input, #FAF7F3);
  border: 1px solid var(--color-border-card, #DDD7CE);
  border-radius: 10px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: block;
  min-width: 0;
  flex: 1 1 auto;
}

.filter-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  flex-direction: row;
  align-items: center;
  flex: 0 0 auto;
}

.select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-body, #6B5F50);
  width: 220px;
  min-width: 220px;
  flex: 0 0 220px;
}

.select-prefix {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-sub, #9A8C7E);
  white-space: nowrap;
}

.select select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  border: 1px solid var(--color-border-card, #DDD7CE);
  border-radius: 8px;
  background-color: var(--color-bg-input, #FAF7F3);
  padding: 0 34px 0 10px;
  height: 44px;
  font-size: 13px;
  color: var(--color-text-body, #6B5F50);
  font-weight: 500;
  cursor: pointer;
  flex: 1 1 auto;
  min-width: 0;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%239A8C7E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-position: right 12px center;
  background-size: 12px 8px;
  background-repeat: no-repeat;
}

.select select::-ms-expand {
  display: none;
}

.select select:hover {
  border-color: var(--color-text-sub, #9A8C7E);
}

.select select:focus {
  outline: none;
  border-color: var(--color-border-focus, #6B7C45);
  box-shadow: 0 0 0 3px rgba(107, 124, 69, 0.16);
}

.btn {
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  color: var(--color-text-body, #6B5F50);
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-body, #6B5F50);
}

.toolbar-reset-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--color-orange-light, #F0C9A8);
  background: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
  box-shadow: none;
}

.toolbar-reset-icon:hover,
.toolbar-reset-icon:focus {
  border-color: var(--color-orange, #C8622A);
  background: var(--color-orange, #C8622A);
  color: #fff;
}

.toolbar-reset-icon:active {
  border-color: var(--color-orange-dark, #A34E20);
  background: var(--color-orange-dark, #A34E20);
  color: #fff;
}

.toolbar-reset-icon :deep(svg) {
  width: 20px;
  height: 20px;
  margin: 0;
  fill: currentColor;
}

.add-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  background: var(--color-orange-light, #F0C9A8);
  border-color: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
  font-size: 20px;
  line-height: 1;
}

.add-btn:hover {
  background: var(--color-orange, #C8622A);
  border-color: var(--color-orange, #C8622A);
  color: #fff;
}

.calendar-card {
  border: 1px solid var(--color-border-card, #DDD7CE);
  border-radius: 12px;
  background: var(--color-bg-input, #FAF7F3);
  overflow: hidden;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
}

.month-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  cursor: pointer;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-body, #6B5F50);
}

.icon-btn:hover { background: var(--color-bg-section, #EFEADF); }

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid var(--color-border-divider, #E8E3D8);
}

.dow {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-body, #6B5F50);
  background: var(--color-bg-input, #FAF7F3);
  text-align: center;
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
}

.day-cell {
  aspect-ratio: 1 / 1;
  border-right: 1px solid var(--color-border-divider, #E8E3D8);
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
  padding: 10px 10px 8px;
  cursor: pointer;
  background: var(--color-bg-input, #FAF7F3);
  position: relative;
  overflow: hidden;
  transition: background-color .15s ease;
}

.day-cell:hover { background: var(--color-bg-base, #EDE8DF); }
.day-cell:nth-child(7n) { border-right: none; }

.day-cell.muted {
  background: var(--color-bg-section, #EFEADF);
  color: var(--color-text-placeholder, #BFB3A5);
}

.day-num { font-size: 13px; font-weight: 800; color: inherit; }
.badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

.badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-section, #EFEADF);
  color: var(--color-text-body, #6B5F50);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge.history {
  background: var(--color-orange-light, #F0C9A8);
  border-color: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
}

.badge.personal {
  background: var(--color-bg-section, #EFEADF);
  border-color: var(--color-border-card, #DDD7CE);
  color: var(--color-text-body, #6B5F50);
}

.badge.growing-season {
  background: var(--color-olive-light, #C8D4A0);
  border-color: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
}

.badge.harvest {
  background: var(--color-orange-light, #F0C9A8);
  border-color: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
}

.harvest-card {
  border: 1px solid var(--color-orange-light, #F0C9A8);
  border-radius: 12px;
  background: var(--color-orange-light, #F0C9A8);
  margin-bottom: 14px;
}

.harvest-card-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
}

.harvest-card-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-orange-dark, #A34E20);
}

.harvest-card-subtitle {
  font-size: 12px;
  color: var(--color-text-sub, #9A8C7E);
  margin-top: 4px;
}

.harvest-list { padding: 10px; display: grid; gap: 8px; }

.harvest-item {
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.harvest-variety {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.harvest-month {
  font-size: 12px;
  color: var(--color-text-sub, #9A8C7E);
}

.harvest-empty {
  padding: 12px 14px;
  color: var(--color-orange-dark, #A34E20);
  font-size: 12px;
}

.harvest-cta { width: 100%; }

.side-card {
  border: 1px solid var(--color-border-card, #DDD7CE);
  border-radius: 12px;
  background: var(--color-bg-input, #FAF7F3);
  overflow: hidden;
}

.side-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-section, #EFEADF);
}

.side-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.carousel { padding: 12px 16px 0; }

.carousel-img {
  width: 100%;
  height: 190px;
  border-radius: 12px;
  border: 1px solid var(--color-border-divider, #E8E3D8);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.carousel-main-text {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
  padding: 0 16px;
  text-align: center;
}

.carousel-caption {
  margin-top: 10px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
  font-size: 13px;
}

.recommend-list { padding: 10px 10px 14px; }

.recommend-item {
  padding: 10px 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.recommend-item:hover { background: var(--color-bg-base, #EDE8DF); }

.recommend-name {
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-tag {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-section, #EFEADF);
  color: var(--color-text-sub, #9A8C7E);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  padding: 24px;
}

.modal-backdrop.offset-header { align-items: flex-start; padding-top: 84px; }

.modal {
  width: min(720px, 100%);
  background: var(--color-bg-base, #EDE8DF);
  border-radius: 14px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  box-shadow: 0 1px 3px rgba(61, 53, 41, 0.06);
  overflow: hidden;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-section, #EFEADF);
}

.modal-title {
  font-size: 15px;
  font-weight: 900;
  color: var(--color-text-strong, #3D3529);
}

.modal-close {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  cursor: pointer;
  font-size: 18px;
  color: var(--color-text-body, #6B5F50);
}

.modal-body { padding: 14px 16px 16px; overflow: auto; }

.modal-section-title {
  font-size: 12px;
  font-weight: 900;
  color: var(--color-text-sub, #9A8C7E);
  letter-spacing: .4px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.modal-list { display: grid; gap: 10px; }

.modal-item {
  border: 1px solid var(--color-border-divider, #E8E3D8);
  background: var(--color-bg-section, #EFEADF);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
}

.modal-item-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }

.modal-item-title {
  font-weight: 900;
  color: var(--color-text-strong, #3D3529);
  font-size: 13px;
}

.modal-item-desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-sub, #9A8C7E);
  line-height: 1.5;
}

.pill {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  color: var(--color-text-body, #6B5F50);
}

.pill.history {
  background: var(--color-orange-light, #F0C9A8);
  border-color: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
}

.pill.personal {
  background: var(--color-bg-section, #EFEADF);
  border-color: var(--color-border-card, #DDD7CE);
  color: var(--color-text-body, #6B5F50);
}

.pill.growing-season {
  background: var(--color-olive-light, #C8D4A0);
  border-color: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
}

.pill.harvest {
  background: var(--color-orange-light, #F0C9A8);
  border-color: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
}

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-grid .full { grid-column: 1 / -1; }
.field { display: grid; gap: 6px; }

.field label {
  font-size: 12px;
  font-weight: 900;
  color: var(--color-text-sub, #9A8C7E);
}

.field input, .field textarea {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  font-size: 13px;
  color: var(--color-text-body, #6B5F50);
  background: var(--color-bg-input, #FAF7F3);
}

.field textarea { min-height: 92px; resize: vertical; }

.modal-actions { margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

.info-box {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--color-border-divider, #E8E3D8);
  border-radius: 12px;
  background: var(--color-bg-section, #EFEADF);
}

.info-box .k {
  font-size: 12px;
  font-weight: 900;
  color: var(--color-text-sub, #9A8C7E);
}

.info-box .v {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
  line-height: 1.5;
}

.empty { padding: 12px; color: var(--color-text-sub, #9A8C7E); }

.dark .calendar-wrapper,
.dark .toolbar,
.dark .side-card,
.dark .modal { background: #1E1E1E; }

.dark .calendar-wrapper .calendar-header,
.dark .calendar-wrapper .dow,
.dark .calendar-wrapper .day-cell,
.dark .calendar-wrapper .day-cell.muted,
.dark .side-header,
.dark .modal-header { background: #252525; }

.dark .calendar-wrapper .day-cell:hover,
.dark .recommend-item:hover,
.dark .icon-btn:hover { background: #2C2C2C; }

@media (max-width: 1120px) {
  .calendar-page { flex-direction: column; }
  .calendar-left { min-width: 0; }
  .calendar-right { width: 100%; flex: 1 1 auto; }
}

@media (max-width: 640px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-grid {
    flex-wrap: wrap;
  }

  .toolbar-right {
    justify-content: flex-end;
  }

  .form-grid { grid-template-columns: 1fr; }
}
</style>
