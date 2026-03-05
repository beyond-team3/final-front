<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CdrButton, IconAccountProfile, IconArrowLeft, IconArrowRight, IconLocationPinStroke, IconRefresh } from '@rei/cedar'
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
const canUseScheduleTypeFilter = computed(() => isSalesRep.value || isAdmin.value)
const filterState = ref({ sales: 'ALL', client: 'ALL', employee: 'ALL', scheduleType: 'ALL' })
const showClientFilterMenu = ref(false)
const showEmployeeFilterMenu = ref(false)
const clientFilterOptions = [
  { value: 'ALL', label: '전체' },
  { value: 'C001', label: '대상팜' },
  { value: 'C002', label: '그린농원' },
  { value: 'C003', label: '해오름농장' },
]
const employeeFilterOptions = [
  { value: 'ALL', label: '전체' },
  { value: 'E001', label: '김영업' },
  { value: 'E002', label: '이영업' },
  { value: 'E003', label: '박영업' },
]

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

const dayModalOpen = ref(false)
const detailModalOpen = ref(false)
const editModalOpen = ref(false)
const detailEvent = ref(null)

const editTitle = ref('')
const editDesc = ref('')
const editStartAt = ref('')
const editEndAt = ref('')
const editAllDay = ref(false)
const editStatus = ref('PLANNED')
const editVisibility = ref('PRIVATE')
const editingId = ref(null)
const harvestAlerts = ref([])
const generatedEvents = ref([])
const harvestDummyItems = [
  { sourceKey: 'DUMMY-001', varietyName: '샤인토마토 F1', expectedHarvestMonth: 3, clientId: 'C001', clientName: '대상팜' },
  { sourceKey: 'DUMMY-002', varietyName: '프라임오이', expectedHarvestMonth: 3, clientId: 'C002', clientName: '그린농원' },
  { sourceKey: 'DUMMY-003', varietyName: '골드파프리카', expectedHarvestMonth: 4, clientId: 'C003', clientName: '해오름농장' },
]

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

// 3개 이상일 때는 "첫 번째 일정 + ..."만 표시 (셀 내 안정적 표시)
const MAX_BADGES_PER_CELL = 2

const truncateBadgeText = (text) => {
  const rawText = String(text ?? '')
  return rawText.length > 5 ? `${rawText.slice(0, 5)}...` : rawText
}

const scheduleStatusOptions = [
  { value: 'PLANNED', label: '예정' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELED', label: '취소' },
]

const scheduleVisibilityOptions = [
  { value: 'PRIVATE', label: '비공개' },
  { value: 'TEAM', label: '팀 공개' },
  { value: 'PUBLIC', label: '전체 공개' },
]

const formatToDateTimeLocal = (value) => {
  const dateObj = new Date(value)
  if (Number.isNaN(dateObj.getTime())) {
    return ''
  }
  return `${ymd(dateObj)}T${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`
}

const addHoursToDateTimeLocal = (dateTimeLocalValue, hoursToAdd = 1) => {
  const dateObj = new Date(dateTimeLocalValue)
  if (Number.isNaN(dateObj.getTime())) {
    return ''
  }
  dateObj.setHours(dateObj.getHours() + hoursToAdd)
  return formatToDateTimeLocal(dateObj)
}

const buildPersonalEvent = ({ id, title, description, startAt, endAt, allDay, status, visibility }) => {
  const startDate = new Date(startAt)
  const fallbackDate = selectedDate.value || ymd(new Date())
  const date = Number.isNaN(startDate.getTime()) ? fallbackDate : ymd(startDate)

  return {
    id,
    type: 'personal',
    title: `개인 일정: ${title}`,
    desc: description,
    startAt,
    endAt,
    allDay,
    status,
    visibility,
    date,
    time: allDay ? '' : (startAt?.split('T')[1] || ''),
  }
}

const getVisibleBadges = (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    return []
  }
  if (events.length >= 3) {
    return events.slice(0, 1)
  }
  return events.slice(0, MAX_BADGES_PER_CELL)
}

const shouldShowMoreBadge = (events) => Array.isArray(events) && events.length >= 3

const passHistoryFilter = (ev) => {
  if (ev.type !== 'history') return true
  if (filterState.value.sales !== 'ALL' && ev.historyCategory !== filterState.value.sales) return false
  if (filterState.value.client !== 'ALL' && ev.clientId !== filterState.value.client) return false
  if (isAdmin.value && filterState.value.employee !== 'ALL' && ev.employeeId !== filterState.value.employee) return false
  return true
}

const passScheduleTypeFilter = (ev) => {
  if (!canUseScheduleTypeFilter.value || filterState.value.scheduleType === 'ALL') {
    return true
  }

  if (filterState.value.scheduleType === 'BUSINESS') {
    return ev.type === 'history'
  }
  if (filterState.value.scheduleType === 'PERSONAL') {
    return ev.type === 'personal'
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
const hasHarvestAlerts = computed(() => harvestAlerts.value.length > 0)
const harvestItems = computed(() => (hasHarvestAlerts.value ? harvestAlerts.value : harvestDummyItems))
const selectedClientLabel = computed(
  () => clientFilterOptions.find((item) => item.value === filterState.value.client)?.label || '전체',
)
const selectedEmployeeLabel = computed(
  () => employeeFilterOptions.find((item) => item.value === filterState.value.employee)?.label || '전체',
)

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
  editTitle.value = (eventItem?.title || '').replace('개인 일정: ', '')
  editDesc.value = eventItem?.desc || ''
  const baseDate = eventItem?.date || selectedDate.value || ymd(new Date())
  const fallbackStartAt = `${baseDate}T09:00`
  editStartAt.value = eventItem?.startAt ? formatToDateTimeLocal(eventItem.startAt) : fallbackStartAt
  editEndAt.value = eventItem?.endAt ? formatToDateTimeLocal(eventItem.endAt) : addHoursToDateTimeLocal(editStartAt.value)
  editAllDay.value = Boolean(eventItem?.allDay)
  editStatus.value = eventItem?.status || 'PLANNED'
  editVisibility.value = eventItem?.visibility || 'PRIVATE'
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

const prevRecommendation = () => {
  if (recommendations.value.length === 0) {
    return
  }
  recommendIdx.value = (recommendIdx.value - 1 + recommendations.value.length) % recommendations.value.length
}

const nextRecommendation = () => {
  if (recommendations.value.length === 0) {
    return
  }
  recommendIdx.value = (recommendIdx.value + 1) % recommendations.value.length
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

const toggleClientFilterMenu = () => {
  showClientFilterMenu.value = !showClientFilterMenu.value
  if (showClientFilterMenu.value) {
    showEmployeeFilterMenu.value = false
  }
}

const toggleEmployeeFilterMenu = () => {
  showEmployeeFilterMenu.value = !showEmployeeFilterMenu.value
  if (showEmployeeFilterMenu.value) {
    showClientFilterMenu.value = false
  }
}

const applyClientFilter = (value) => {
  filterState.value.client = value
  showClientFilterMenu.value = false
}

const applyEmployeeFilter = (value) => {
  filterState.value.employee = value
  showEmployeeFilterMenu.value = false
}

const closeFilterMenusByOutsideClick = (event) => {
  const target = event?.target
  if (!(target instanceof Element)) {
    return
  }

  if (!target.closest('.filter-popover')) {
    showClientFilterMenu.value = false
    showEmployeeFilterMenu.value = false
  }
}

const saveEdit = () => {
  const title = editTitle.value.trim()
  const description = editDesc.value.trim()

  if (!title || !editStartAt.value || !editEndAt.value || !editStatus.value || !editVisibility.value) {
    window.alert('제목, 시작/종료 일시, 상태, 공개 범위는 필수입니다.')
    return
  }

  if (title.length > 200) {
    window.alert('제목은 200자 이하여야 합니다.')
    return
  }

  const startDate = new Date(editStartAt.value)
  const endDate = new Date(editEndAt.value)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    window.alert('시작/종료 일시 형식이 올바르지 않습니다.')
    return
  }
  if (endDate <= startDate) {
    window.alert('종료 일시는 시작 일시보다 늦어야 합니다.')
    return
  }

  const payload = {
    title,
    description,
    startAt: editStartAt.value,
    endAt: editEndAt.value,
    allDay: editAllDay.value,
    status: editStatus.value,
    visibility: editVisibility.value,
  }

  if (editingId.value) {
    const target = events.value.find((item) => item.id === editingId.value)
    if (target) {
      Object.assign(target, buildPersonalEvent({ ...payload, id: editingId.value }))
    }
  } else {
    events.value.push(buildPersonalEvent({ ...payload, id: `P-${Date.now()}` }))
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
  window.addEventListener('click', closeFilterMenusByOutsideClick)
  await loadHarvestSchedules()
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeFilterMenusByOutsideClick)
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
              <div class="filter-popover">
                <CdrButton
                  type="button"
                  modifier="secondary"
                  icon-only
                  with-background
                  class="filter-icon-btn"
                  :aria-expanded="showClientFilterMenu"
                  :aria-label="`거래처 필터 (${selectedClientLabel})`"
                  @click.stop="toggleClientFilterMenu"
                >
                  <IconLocationPinStroke />
                </CdrButton>
                <div v-if="showClientFilterMenu" class="filter-dropdown" @click.stop>
                  <button
                    v-for="option in clientFilterOptions"
                    :key="option.value"
                    type="button"
                    class="filter-dropdown-item"
                    :class="{ active: filterState.client === option.value }"
                    @click="applyClientFilter(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div v-if="isAdmin" class="filter-popover">
                <CdrButton
                  type="button"
                  modifier="secondary"
                  icon-only
                  with-background
                  class="filter-icon-btn"
                  :aria-expanded="showEmployeeFilterMenu"
                  :aria-label="`사원 필터 (${selectedEmployeeLabel})`"
                  @click.stop="toggleEmployeeFilterMenu"
                >
                  <IconAccountProfile />
                </CdrButton>
                <div v-if="showEmployeeFilterMenu" class="filter-dropdown" @click.stop>
                  <button
                    v-for="option in employeeFilterOptions"
                    :key="option.value"
                    type="button"
                    class="filter-dropdown-item"
                    :class="{ active: filterState.employee === option.value }"
                    @click="applyEmployeeFilter(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div v-if="canUseScheduleTypeFilter" class="schedule-filter" role="group" aria-label="일정 구분 필터">
                <CdrButton
                  type="button"
                  size="small"
                  modifier="secondary"
                  class="schedule-filter-btn"
                  :class="{ 'is-active': filterState.scheduleType === 'ALL' }"
                  :aria-pressed="filterState.scheduleType === 'ALL'"
                  @click="filterState.scheduleType = 'ALL'"
                >
                  전체
                </CdrButton>
                <CdrButton
                  type="button"
                  size="small"
                  modifier="secondary"
                  class="schedule-filter-btn"
                  :class="{ 'is-active': filterState.scheduleType === 'BUSINESS' }"
                  :aria-pressed="filterState.scheduleType === 'BUSINESS'"
                  @click="filterState.scheduleType = 'BUSINESS'"
                >
                  거래 일정
                </CdrButton>
                <CdrButton
                  type="button"
                  size="small"
                  modifier="secondary"
                  class="schedule-filter-btn"
                  :class="{ 'is-active': filterState.scheduleType === 'PERSONAL' }"
                  :aria-pressed="filterState.scheduleType === 'PERSONAL'"
                  @click="filterState.scheduleType = 'PERSONAL'"
                >
                  개인 일정
                </CdrButton>
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
                  <div v-for="ev in getVisibleBadges(cell.events)" :key="ev.id" class="badge" :class="ev.type">
                    {{ truncateBadgeText(ev.type === 'history' ? `${historyLabelWithOwner(ev)} · ${ev.title}` : `${eventTypeLabel(ev)} · ${ev.title}`) }}
                  </div>
                  <div v-if="shouldShowMoreBadge(cell.events)" class="badge more">...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="calendar-right">
        <div class="side-card">
          <div class="side-header">
            <div class="side-title">이번달 추천 품종</div>
            <span style="font-size:12px;color:#6b7a8c;">자동 슬라이드</span>
          </div>

          <div v-if="currentRecommendation" class="carousel">
            <div class="carousel-img-wrap">
              <CdrButton
                class="carousel-arrow left"
                type="button"
                modifier="secondary"
                icon-only
                with-background
                aria-label="이전 추천 품종"
                @click.stop="prevRecommendation"
              >
                <IconArrowLeft />
              </CdrButton>
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
              <CdrButton
                class="carousel-arrow right"
                type="button"
                modifier="secondary"
                icon-only
                with-background
                aria-label="다음 추천 품종"
                @click.stop="nextRecommendation"
              >
                <IconArrowRight />
              </CdrButton>
            </div>
            <div class="carousel-caption">{{ currentRecommendation.name }}</div>
            <div class="carousel-dots" role="tablist" aria-label="추천 품종 슬라이드 선택">
              <button
                v-for="(item, index) in recommendations"
                :key="item.id"
                type="button"
                class="carousel-dot"
                :class="{ active: index === recommendIdx }"
                :aria-label="`${item.name} 보기`"
                :aria-current="index === recommendIdx ? 'true' : 'false'"
                @click="recommendIdx = index"
              />
            </div>
          </div>
        </div>

        <div v-if="isSalesRep" class="harvest-card">
          <div class="harvest-card-header">
            <div class="harvest-card-title">수확 임박</div>
          </div>
          <div class="harvest-list">
            <div v-for="item in harvestItems" :key="item.sourceKey" class="harvest-item">
              <div class="harvest-item-main">
                <div class="harvest-variety">{{ item.varietyName }}</div>
                <div class="harvest-meta">
                  <span class="harvest-month">수확 {{ item.expectedHarvestMonth }}월</span>
                  <span class="harvest-client">{{ item.clientName }}</span>
                </div>
              </div>
              <button class="btn btn-primary harvest-cta" type="button" @click="goToClientDetail(item.clientId)">거래처 이동</button>
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
          <p class="schedule-modal-note">
            개인 일정 생성 요청 스펙에 맞게 입력하세요. (제목 200자 이하, 종료 일시는 시작 이후)
          </p>
          <div class="schedule-modal-grid">
            <div class="schedule-field">
              <label for="editStartAt" class="schedule-label">시작 일시 *</label>
              <input id="editStartAt" v-model="editStartAt" type="datetime-local" class="schedule-control" required>
            </div>
            <div class="schedule-field">
              <label for="editEndAt" class="schedule-label">종료 일시 *</label>
              <input id="editEndAt" v-model="editEndAt" type="datetime-local" class="schedule-control" required>
            </div>
            <div class="schedule-field schedule-modal-wide">
              <label for="editTitle" class="schedule-label">제목 *</label>
              <input
                id="editTitle"
                v-model="editTitle"
                type="text"
                maxlength="200"
                class="schedule-control"
                placeholder="예: 거래처 미팅 준비"
                required
              >
            </div>
            <div class="schedule-field schedule-modal-wide">
              <label for="editDesc" class="schedule-label">설명</label>
              <textarea id="editDesc" v-model="editDesc" class="schedule-control schedule-textarea" placeholder="예: 자료 정리, 방문 일정 확정 등" />
            </div>
            <div class="schedule-inline-fields schedule-modal-wide">
              <div class="schedule-field">
                <label for="editStatus" class="schedule-label">상태 *</label>
                <select id="editStatus" v-model="editStatus" class="schedule-control" required>
                  <option v-for="option in scheduleStatusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              <div class="schedule-field">
                <label for="editVisibility" class="schedule-label">공개 범위 *</label>
                <select id="editVisibility" v-model="editVisibility" class="schedule-control" required>
                  <option v-for="option in scheduleVisibilityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              <div class="schedule-modal-checkbox">
                <input id="editAllDay" v-model="editAllDay" type="checkbox" class="schedule-checkbox">
                <label for="editAllDay" class="schedule-checkbox-label">종일 일정</label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn" type="button" @click="editModalOpen = false">취소</button>
            <button class="btn btn-primary schedule-save-btn" type="button" @click="saveEdit">저장</button>
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

.filter-popover {
  position: relative;
}

.filter-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  min-height: 44px;
  height: 44px;
  padding: 0;
  border-radius: 10px;
  border: none;
  background: rgba(122, 140, 66, 0.28);
  color: var(--color-olive-dark, #586830);
  box-shadow: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.filter-icon-btn:hover,
.filter-icon-btn:focus {
  background: var(--color-olive, #7A8C42);
  color: #fff;
}

.filter-icon-btn:active {
  background: var(--color-olive-dark, #586830);
  color: #fff;
}

.filter-icon-btn :deep(svg) {
  width: 20px;
  height: 20px;
  margin: 0;
  fill: currentColor;
}

.filter-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  min-width: 130px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  box-shadow: 0 6px 16px rgba(61, 53, 41, 0.12);
}

.filter-dropdown-item {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 12px;
  color: var(--color-text-body, #6B5F50);
  text-align: left;
  cursor: pointer;
}

.filter-dropdown-item:hover {
  background: var(--color-bg-section, #EFEADF);
  color: var(--color-text-strong, #3D3529);
}

.filter-dropdown-item.active {
  background: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
  font-weight: 700;
}

.schedule-filter {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
  flex-wrap: wrap;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(239, 234, 223, 0.92) 0%, rgba(247, 243, 236, 0.92) 100%);
  box-shadow: inset 0 0 0 1px rgba(221, 215, 206, 0.45);
}

.schedule-filter :deep(.schedule-filter-btn) {
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, rgba(250, 247, 243, 0.96) 0%, rgba(239, 234, 223, 0.96) 100%);
  color: var(--color-text-body, #6B5F50);
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(61, 53, 41, 0.08);
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease;
}

.schedule-filter :deep(.schedule-filter-btn:hover),
.schedule-filter :deep(.schedule-filter-btn:focus-visible) {
  background: linear-gradient(135deg, rgba(239, 234, 223, 0.95) 0%, rgba(200, 212, 160, 0.55) 100%);
  color: var(--color-text-strong, #3D3529);
  box-shadow: 0 0 0 4px rgba(122, 140, 66, 0.12), 0 6px 14px rgba(61, 53, 41, 0.14);
}

.schedule-filter :deep(.schedule-filter-btn.is-active) {
  background: linear-gradient(120deg, rgba(200, 212, 160, 0.92) 0%, rgba(122, 140, 66, 0.48) 100%);
  color: var(--color-text-strong, #3D3529);
  box-shadow: 0 0 0 4px rgba(122, 140, 66, 0.16), 0 6px 14px rgba(88, 104, 48, 0.2);
}

.schedule-filter :deep(.schedule-filter-btn:active) {
  transform: translateY(1px);
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
.badge-row {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 38px;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  overflow: hidden;
}

.badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
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

.badge.more {
  font-weight: 800;
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
  border: 1px solid var(--color-border-card, #DDD7CE);
  border-radius: 12px;
  background: var(--color-bg-input, #FAF7F3);
  margin-top: 14px;
  overflow: hidden;
}

.harvest-card-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--color-border-divider, #E8E3D8);
  background: var(--color-bg-section, #EFEADF);
}

.harvest-card-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.harvest-card-subtitle {
  font-size: 12px;
  color: var(--color-text-sub, #9A8C7E);
  margin-top: 4px;
}

.harvest-list { padding: 10px; display: grid; gap: 8px; }

.harvest-item {
  border: none;
  background: transparent;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.harvest-item:hover {
  background: var(--color-bg-base, #EDE8DF);
}

.harvest-variety {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
}

.harvest-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.harvest-month {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-olive-light, #C8D4A0);
  background: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
}

.harvest-client {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  background: var(--color-bg-input, #FAF7F3);
  color: var(--color-text-sub, #9A8C7E);
}

.harvest-empty {
  padding: 12px 14px;
  color: var(--color-text-sub, #9A8C7E);
  font-size: 12px;
}

.harvest-cta {
  width: auto;
  min-width: 86px;
  padding: 6px 10px;
  border-radius: 8px;
  border-color: var(--color-orange-light, #F0C9A8);
  background: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
  font-size: 12px;
  font-weight: 600;
}

.harvest-cta:hover {
  border-color: var(--color-orange, #C8622A);
  background: var(--color-orange, #C8622A);
  color: #fff;
}

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

.carousel { padding: 12px 16px 14px; }

.carousel-img-wrap {
  position: relative;
}

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

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: rgba(61, 53, 41, 0.36);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
}

.carousel-arrow.left { left: 8px; }
.carousel-arrow.right { right: 8px; }

.carousel-arrow:hover {
  background: rgba(61, 53, 41, 0.56);
}

.carousel-arrow :deep(svg) {
  width: 16px;
  height: 16px;
}

.carousel-caption {
  margin-top: 10px;
  font-weight: 800;
  color: var(--color-text-strong, #3D3529);
  font-size: 13px;
  text-align: center;
}

.carousel-dots {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border: none;
  border-radius: 999px;
  background: var(--color-border-card, #DDD7CE);
  cursor: pointer;
  padding: 0;
}

.carousel-dot.active {
  width: 18px;
  background: var(--color-olive, #7A8C42);
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

.schedule-modal-note {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--color-text-sub, #9A8C7E);
}

.schedule-modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}

.schedule-field {
  display: grid;
  gap: 6px;
}

.schedule-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-sub, #9A8C7E);
}

.schedule-modal-wide {
  grid-column: 1 / -1;
}

.schedule-control {
  width: 100%;
  height: 42px;
  padding: 0 10px;
  border: 1px solid var(--color-border-card, #DDD7CE);
  border-radius: 10px;
  background: var(--color-bg-input, #FAF7F3);
  color: var(--color-text-body, #6B5F50);
  font-size: 13px;
  outline: none;
}

.schedule-control:focus {
  border-color: var(--color-olive, #7A8C42);
  box-shadow: 0 0 0 3px rgba(122, 140, 66, 0.16);
}

.schedule-textarea {
  height: 96px;
  padding: 10px;
  resize: vertical;
}

.schedule-modal-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
}

.schedule-inline-fields {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  align-items: end;
}

.schedule-checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
}

.schedule-checkbox-label {
  font-size: 13px;
  color: var(--color-text-body, #6B5F50);
  font-weight: 600;
}

.modal-actions { margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

.schedule-save-btn {
  border-color: var(--color-orange, #C8622A);
  background: var(--color-orange, #C8622A);
  color: #fff;
  box-shadow: 0 6px 14px rgba(200, 98, 42, 0.28);
}

.schedule-save-btn:hover,
.schedule-save-btn:focus {
  border-color: var(--color-orange-dark, #A34E20);
  background: var(--color-orange-dark, #A34E20);
  color: #fff;
}

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

  .schedule-modal-grid { grid-template-columns: 1fr; }
  .schedule-inline-fields { grid-template-columns: 1fr; }
}
</style>
