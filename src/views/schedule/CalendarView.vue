<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdrButton, IconAccountProfile, IconArrowLeft, IconArrowRight, IconLocationPinStroke, IconRefresh } from '@rei/cedar'
import { createPersonalSchedule, deletePersonalSchedule, getSchedulesByCondition, updatePersonalSchedule } from '@/api/schedule'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { syncHarvestSchedulesForSalesRep } from '@/services/GrowingSeasonService'
import { ROLES } from '@/utils/constants'

const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const ym = (d) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`
const toLocalDateTime = (d) => `${ymd(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_VISIBLE_MULTIDAY_LANES = 10
const getErrorMessage = (error, fallback) => error?.response?.data?.error?.message
  || error?.response?.data?.message
  || error?.message
  || fallback

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const filterState = ref({ sales: 'ALL', client: 'ALL', employee: 'ALL', scheduleType: 'ALL' })
const showClientFilterMenu = ref(false)
const showEmployeeFilterMenu = ref(false)
const canUseScheduleTypeFilter = computed(() => isSalesRep.value || isAdmin.value)

const today = new Date()
const viewDate = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(ymd(today))
const events = ref([])
const scheduleLoading = ref(false)
const scheduleError = ref('')
const isSavingSchedule = ref(false)

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
const editVisibility = ref('PRIVATE')
const editingId = ref(null)
const editingStatus = ref(null)
const harvestAlerts = ref([])
const harvestDummyItems = [
  { sourceKey: 'DUMMY-001', varietyName: '샤인토마토 F1', expectedHarvestMonth: 3, clientId: 'C001', clientName: '대상팜' },
  { sourceKey: 'DUMMY-002', varietyName: '프라임오이', expectedHarvestMonth: 3, clientId: 'C002', clientName: '그린농원' },
  { sourceKey: 'DUMMY-003', varietyName: '골드파프리카', expectedHarvestMonth: 4, clientId: 'C003', clientName: '해오름농장' },
]

const normalizeScheduleItem = (item = {}) => {
  const itemType = String(item.itemType ?? item.scheduleItemType ?? item.type ?? '').toUpperCase()
  const isPersonalItem = itemType === 'PERSONAL'
  const startAt = item.startAt || null
  const startDate = startAt ? new Date(startAt) : null
  const normalizedDate = startDate && !Number.isNaN(startDate.getTime())
    ? ymd(startDate)
    : (typeof item.date === 'string' ? item.date.slice(0, 10) : selectedDate.value)

  return {
    ...item,
    id: item.id,
    type: isPersonalItem ? 'personal' : 'deal',
    title: item.title || '(제목 없음)',
    description: item.description || item.desc || '',
    date: normalizedDate,
    time: startAt?.slice(11, 16) || item.time || '',
    startAt,
    endAt: item.endAt || null,
    allDay: Boolean(item.allDay),
    status: item.status || (isPersonalItem ? 'PLANNED' : null),
    visibility: item.visibility || null,
    ownerUserId: item.ownerUserId ?? null,
    assigneeUserId: item.assigneeUserId ?? item.employeeId ?? null,
    assigneeUserName: item.assigneeUserName ?? item.employeeName ?? '',
    clientId: item.clientId ?? null,
    clientName: item.clientName ?? '',
    dealId: item.dealId ?? null,
    docType: item.docType ?? '',
    eventType: item.eventType ?? itemType ?? '',
    refDocId: item.refDocId ?? null,
    refDealLogId: item.refDealLogId ?? null,
    externalKey: item.externalKey ?? null,
  }
}

const dealLabel = (ev) => ev?.docType || ev?.eventType || '거래 일정'

const dealLabelWithOwner = (ev) => {
  const baseLabel = dealLabel(ev)
  if (isAdmin.value && ev?.type === 'deal' && ev?.assigneeUserName) {
    return `${baseLabel} - ${ev.assigneeUserName}`
  }
  return baseLabel
}

const eventTypeLabel = (eventItem) => {
  if (eventItem?.type === 'deal') {
    return dealLabelWithOwner(eventItem)
  }
  return '개인 일정'
}

const eventTypeDetailLabel = (eventItem) => {
  if (eventItem?.type === 'deal') {
    return `거래 일정 (${dealLabelWithOwner(eventItem)})`
  }
  return '개인 일정'
}

const formatDateTimeText = (value) => {
  if (!value) {
    return '-'
  }
  const dateObj = new Date(value)
  if (Number.isNaN(dateObj.getTime())) {
    return String(value)
  }
  return `${ymd(dateObj)} ${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`
}

const getEventDescription = (eventItem) => eventItem?.description ?? eventItem?.desc ?? '-'

const getEventDisplayTime = (eventItem) => {
  if (eventItem?.allDay) {
    return '종일'
  }
  if (eventItem?.startAt || eventItem?.endAt) {
    return `${formatDateTimeText(eventItem?.startAt)} ~ ${formatDateTimeText(eventItem?.endAt)}`
  }
  return eventItem?.time || '-'
}

const MAX_BADGES_PER_CELL = 2

const truncateBadgeText = (text) => {
  const rawText = String(text ?? '')
  return rawText.length > 5 ? `${rawText.slice(0, 5)}...` : rawText
}

const toStartOfDay = (value) => {
  const dateObj = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(dateObj.getTime())) {
    return null
  }
  dateObj.setHours(0, 0, 0, 0)
  return dateObj
}

const compareDay = (left, right) => {
  const leftDate = toStartOfDay(left)
  const rightDate = toStartOfDay(right)
  if (!leftDate || !rightDate) {
    return 0
  }
  return Math.round((leftDate.getTime() - rightDate.getTime()) / DAY_MS)
}

const getEventDayRange = (eventItem) => {
  const startDay = toStartOfDay(eventItem?.startAt || eventItem?.date)
  const endDay = toStartOfDay(eventItem?.endAt || eventItem?.startAt || eventItem?.date)

  if (!startDay) {
    return null
  }

  if (!endDay || endDay.getTime() < startDay.getTime()) {
    return { startDay, endDay: startDay }
  }

  return { startDay, endDay }
}

const isDateWithinEventRange = (dateStr, eventItem) => {
  const date = toStartOfDay(dateStr)
  const range = getEventDayRange(eventItem)
  if (!date || !range) {
    return false
  }

  return date.getTime() >= range.startDay.getTime() && date.getTime() <= range.endDay.getTime()
}

const isMultiDayEvent = (eventItem) => {
  const range = getEventDayRange(eventItem)
  if (!range) {
    return false
  }
  return compareDay(range.endDay, range.startDay) >= 1
}

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

const getVisibleBadges = (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    return []
  }
  return events.slice(0, MAX_BADGES_PER_CELL)
}

const clientFilterOptions = computed(() => {
  const options = events.value
    .filter((item) => item.clientId && item.clientName)
    .reduce((acc, item) => {
      acc.set(String(item.clientId), item.clientName)
      return acc
    }, new Map())

  return [
    { value: 'ALL', label: '전체' },
    ...Array.from(options.entries()).map(([value, label]) => ({ value, label })),
  ]
})

const employeeFilterOptions = computed(() => {
  const options = events.value
    .filter((item) => item.assigneeUserId && item.assigneeUserName)
    .reduce((acc, item) => {
      acc.set(String(item.assigneeUserId), item.assigneeUserName)
      return acc
    }, new Map())

  return [
    { value: 'ALL', label: '전체' },
    ...Array.from(options.entries()).map(([value, label]) => ({ value, label })),
  ]
})

const passDealFilter = (ev) => {
  if (ev.type !== 'deal') return true
  if (filterState.value.client !== 'ALL' && String(ev.clientId) !== String(filterState.value.client)) return false
  if (isAdmin.value && filterState.value.employee !== 'ALL' && String(ev.assigneeUserId) !== String(filterState.value.employee)) return false
  return true
}

const passScheduleTypeFilter = (ev) => {
  if (!canUseScheduleTypeFilter.value || filterState.value.scheduleType === 'ALL') {
    return true
  }

  if (filterState.value.scheduleType === 'BUSINESS') {
    return ev.type !== 'personal'
  }
  if (filterState.value.scheduleType === 'PERSONAL') {
    return ev.type === 'personal'
  }
  return true
}

const allEvents = computed(() => [...events.value])

const visibleEvents = computed(() => allEvents.value
  .filter(passDealFilter)
  .filter(passScheduleTypeFilter)
  .sort((a, b) => {
    const startCompare = String(a.startAt || a.date || '').localeCompare(String(b.startAt || b.date || ''))
    if (startCompare !== 0) {
      return startCompare
    }

    const aRange = getEventDayRange(a)
    const bRange = getEventDayRange(b)
    const durationCompare = compareDay(bRange?.endDay, bRange?.startDay) - compareDay(aRange?.endDay, aRange?.startDay)
    if (durationCompare !== 0) {
      return durationCompare
    }

    return String(a.title || '').localeCompare(String(b.title || ''))
  }))

const eventsByDate = (dateStr) => visibleEvents.value
  .filter((ev) => isDateWithinEventRange(dateStr, ev))

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
    const dayEvents = eventsByDate(date)
    return {
      date,
      day: cellDate.getDate(),
      muted,
      events: dayEvents,
      hasMultiDayEvent: dayEvents.some((eventItem) => isMultiDayEvent(eventItem)),
      inlineEvents: dayEvents.filter((eventItem) => !isMultiDayEvent(eventItem)),
    }
  })
})

const calendarWeeks = computed(() => Array.from({ length: 6 }, (_, index) => {
  const cells = calendarCells.value.slice(index * 7, index * 7 + 7)
  const weekStart = toStartOfDay(cells[0]?.date)
  const weekEnd = toStartOfDay(cells[6]?.date)
  const lanes = []
  const multiDaySegments = []

  visibleEvents.value
    .filter((eventItem) => {
      if (!isMultiDayEvent(eventItem)) {
        return false
      }
      const range = getEventDayRange(eventItem)
      if (!range || !weekStart || !weekEnd) {
        return false
      }
      return range.startDay.getTime() <= weekEnd.getTime() && range.endDay.getTime() >= weekStart.getTime()
    })
    .sort((left, right) => {
      const startCompare = String(right.startAt || right.date || '').localeCompare(String(left.startAt || left.date || ''))
      if (startCompare !== 0) {
        return startCompare
      }
      return String(right.title || '').localeCompare(String(left.title || ''))
    })
    .forEach((eventItem) => {
      const range = getEventDayRange(eventItem)
      const segmentStart = range.startDay.getTime() < weekStart.getTime() ? weekStart : range.startDay
      const segmentEnd = range.endDay.getTime() > weekEnd.getTime() ? weekEnd : range.endDay
      const startCol = compareDay(segmentStart, weekStart) + 1
      const endCol = compareDay(segmentEnd, weekStart) + 2
      let laneIndex = 0

      while (lanes[laneIndex] && lanes[laneIndex] >= startCol) {
        laneIndex += 1
      }

      if (laneIndex >= MAX_VISIBLE_MULTIDAY_LANES) {
        return
      }

      lanes[laneIndex] = endCol - 1
      multiDaySegments.push({
        key: `${eventItem.id}-${cells[0]?.date}`,
        event: eventItem,
        lane: laneIndex + 1,
        startCol,
        endCol,
        startsBeforeWeek: range.startDay.getTime() < weekStart.getTime(),
        endsAfterWeek: range.endDay.getTime() > weekEnd.getTime(),
      })
    })

  return {
    key: cells[0]?.date || `week-${index}`,
    cells,
    multiDaySegments,
    laneCount: lanes.length,
    barAreaHeight: lanes.length > 0 ? (lanes.length * 2) + ((lanes.length - 1) * 2) + 5 : 0,
  }
}))

const selectedDayEvents = computed(() => eventsByDate(selectedDate.value))
const currentRecommendation = computed(() => recommendations.value[recommendIdx.value])
const hasHarvestAlerts = computed(() => harvestAlerts.value.length > 0)
const harvestItems = computed(() => (hasHarvestAlerts.value ? harvestAlerts.value : harvestDummyItems))
const selectedClientLabel = computed(
  () => clientFilterOptions.value.find((item) => item.value === filterState.value.client)?.label || '전체',
)
const selectedEmployeeLabel = computed(
  () => employeeFilterOptions.value.find((item) => item.value === filterState.value.employee)?.label || '전체',
)
const scheduleDetailCoreItems = computed(() => {
  const eventItem = detailEvent.value
  if (!eventItem) {
    return []
  }

  return [
    { key: 'title', label: '제목', value: eventItem.title ?? '-' },
    { key: 'type', label: '구분', value: eventTypeDetailLabel(eventItem) },
    { key: 'status', label: '상태', value: eventItem.status ?? '-' },
    { key: 'description', label: '설명', value: getEventDescription(eventItem) },
  ]
})

const scheduleDetailTimeItems = computed(() => {
  const eventItem = detailEvent.value
  if (!eventItem) {
    return []
  }

  return [
    { key: 'startAt', label: '시작(startAt)', value: formatDateTimeText(eventItem.startAt) },
    { key: 'endAt', label: '종료(endAt)', value: formatDateTimeText(eventItem.endAt) },
    { key: 'allDay', label: '종일', value: eventItem.allDay == null ? '-' : (eventItem.allDay ? '예' : '아니오') },
  ]
})

const scheduleDetailLinkItems = computed(() => {
  const eventItem = detailEvent.value
  if (!eventItem) {
    return []
  }

  return [
    { key: 'ownerUserId', label: '소유자', value: eventItem.ownerUserId },
    { key: 'assigneeUserId', label: '담당자', value: eventItem.assigneeUserId },
    { key: 'clientId', label: '거래처', value: eventItem.clientId },
    { key: 'dealId', label: '딜', value: eventItem.dealId },
    { key: 'docType', label: '문서 타입', value: eventItem.docType },
    { key: 'eventType', label: '이벤트 타입', value: eventItem.eventType },
  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
})

const scheduleDetailReferenceItems = computed(() => {
  const eventItem = detailEvent.value
  if (!eventItem) {
    return []
  }

  return [
    { key: 'refDocId', label: '참조 문서 ID', value: eventItem.refDocId },
    { key: 'refDealLogId', label: '참조 딜로그 ID', value: eventItem.refDealLogId },
    { key: 'externalKey', label: '외부 키', value: eventItem.externalKey },
  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
})

const scheduleItemIdText = computed(() => {
  const eventItem = detailEvent.value
  if (!eventItem) {
    return '-'
  }
  return eventItem.id ?? '-'
})

const scheduleItemTypeText = computed(() => {
  const eventItem = detailEvent.value
  if (!eventItem) {
    return '-'
  }
  return eventItem.type ?? '-'
})

const scheduleItemDisplayDate = computed(() => {
  const eventItem = detailEvent.value
  if (!eventItem) {
    return '-'
  }
  if (eventItem.startAt) {
    return formatDateTimeText(eventItem.startAt)
  }
  return eventItem.date ?? '-'
})

const hasReferenceItems = computed(() => scheduleDetailReferenceItems.value.length > 0)

const hasLinkItems = computed(() => scheduleDetailLinkItems.value.length > 0)

const canEditCurrentEvent = computed(() => detailEvent.value?.type === 'personal')

const queryRange = computed(() => {
  const first = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1)
  const last = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 0)
  const rangeStart = new Date(first)
  rangeStart.setDate(first.getDate() - first.getDay())
  rangeStart.setHours(0, 0, 0, 0)

  const rangeEnd = new Date(last)
  rangeEnd.setDate(last.getDate() + (6 - last.getDay()) + 1)
  rangeEnd.setHours(0, 0, 0, 0)

  return {
    from: toLocalDateTime(rangeStart),
    to: toLocalDateTime(rangeEnd),
  }
})

const loadSchedules = async () => {
  scheduleLoading.value = true
  scheduleError.value = ''

  try {
    const params = {
      from: queryRange.value.from,
      to: queryRange.value.to,
      includePersonal: true,
      includeDeal: true,
    }

    if (filterState.value.client !== 'ALL') {
      params.clientId = filterState.value.client
    }

    if (isAdmin.value && filterState.value.employee !== 'ALL') {
      params.assigneeUserId = filterState.value.employee
    }

    const response = await getSchedulesByCondition(params)
    const data = response?.data || response
    events.value = Array.isArray(data) ? data.map(normalizeScheduleItem) : []
  } catch (error) {
    events.value = []
    scheduleError.value = getErrorMessage(error, '일정 목록을 불러오지 못했습니다.')
  } finally {
    scheduleLoading.value = false
  }
}

const openDayModal = (date) => {
  selectedDate.value = date
  dayModalOpen.value = true
}

const openDetail = (eventItem) => {
  detailEvent.value = {
    ...eventItem,
    description: eventItem?.description ?? eventItem?.desc ?? '',
  }
  dayModalOpen.value = false
  detailModalOpen.value = true
}

const openEditModal = (eventItem = null) => {
  editingId.value = eventItem?.id || null
  editingStatus.value = eventItem?.status || null
  editTitle.value = eventItem?.title || ''
  editDesc.value = eventItem?.description ?? eventItem?.desc ?? ''
  const baseDate = eventItem?.date || selectedDate.value || ymd(new Date())
  const fallbackStartAt = `${baseDate}T09:00`
  editStartAt.value = eventItem?.startAt ? formatToDateTimeLocal(eventItem.startAt) : fallbackStartAt
  editEndAt.value = eventItem?.endAt ? formatToDateTimeLocal(eventItem.endAt) : addHoursToDateTimeLocal(editStartAt.value)
  editAllDay.value = Boolean(eventItem?.allDay)
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

const saveEdit = async () => {
  const title = editTitle.value.trim()
  const description = editDesc.value.trim()

  if (!title || !editStartAt.value || !editEndAt.value) {
    window.alert('제목과 시작/종료 일시는 필수입니다.')
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

  const basePayload = {
    title,
    description,
    startAt: editStartAt.value,
    endAt: editEndAt.value,
    allDay: editAllDay.value,
    visibility: editVisibility.value || 'PRIVATE',
  }

  const updatePayload = editingStatus.value && editingStatus.value !== 'PLANNED'
    ? { ...basePayload, status: editingStatus.value }
    : basePayload

  isSavingSchedule.value = true

  try {
    if (editingId.value) {
      await updatePersonalSchedule(editingId.value, updatePayload)
    } else {
      await createPersonalSchedule(basePayload)
    }

    editModalOpen.value = false
    detailModalOpen.value = false
    await loadSchedules()
  } catch (error) {
    window.alert(getErrorMessage(error, '개인 일정 저장에 실패했습니다.'))
  } finally {
    isSavingSchedule.value = false
  }
}

const deletePersonal = async (id) => {
  try {
    await deletePersonalSchedule(id)
    detailModalOpen.value = false
    await loadSchedules()
  } catch (error) {
    window.alert(getErrorMessage(error, '개인 일정 삭제에 실패했습니다.'))
  }
}

const prevMonth = async () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
  await loadSchedules()
  await loadHarvestSchedules()
}

const nextMonth = async () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
  await loadSchedules()
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

    harvestAlerts.value = result.harvestAlerts || []
    notificationStore.mergeNotifications(ROLES.SALES_REP, result.notifications || [])
  } catch (error) {
    harvestAlerts.value = []
  }
}

watch(
  () => [filterState.value.client, isAdmin.value ? filterState.value.employee : 'ALL'],
  async () => {
    await loadSchedules()
  },
)

onMounted(async () => {
  window.addEventListener('click', closeFilterMenusByOutsideClick)
  await loadSchedules()
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
          <p v-if="scheduleError" class="schedule-feedback error">{{ scheduleError }}</p>
          <p v-else-if="scheduleLoading" class="schedule-feedback">일정을 불러오는 중입니다.</p>
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
              <div class="calendar-dow-grid">
                <div v-for="dow in ['일','월','화','수','목','금','토']" :key="dow" class="dow">{{ dow }}</div>
              </div>

              <div class="calendar-weeks">
                <div
                  v-for="week in calendarWeeks"
                  :key="week.key"
                  class="calendar-week"
                  :style="{ '--week-lane-count': String(week.laneCount), '--week-event-area': `${week.barAreaHeight}px` }"
                >
                  <div v-if="week.multiDaySegments.length > 0" class="week-multiday-layer">
                    <button
                      v-for="segment in week.multiDaySegments"
                      :key="segment.key"
                      type="button"
                      class="multiday-badge"
                      :class="[
                        segment.event.type,
                        { 'has-start-cap': !segment.startsBeforeWeek, 'has-end-cap': !segment.endsAfterWeek },
                      ]"
                      :style="{ gridColumn: `${segment.startCol} / ${segment.endCol}`, gridRow: String(segment.lane) }"
                      :aria-label="`${segment.event.title} (${formatDateTimeText(segment.event.startAt)} ~ ${formatDateTimeText(segment.event.endAt)})`"
                      @click.stop="openDetail(segment.event)"
                    />
                  </div>

                  <div class="week-day-grid">
                    <div
                      v-for="cell in week.cells"
                      :key="cell.date"
                      class="day-cell"
                      :class="{ muted: cell.muted }"
                      @click="openDayModal(cell.date)"
                    >
                      <div class="day-num">{{ cell.day }}</div>
                      <div v-if="cell.hasMultiDayEvent || cell.events.length >= 2" class="day-count-badge">{{ cell.events.length }}</div>
                      <div class="badge-row">
                        <div v-for="ev in getVisibleBadges(cell.hasMultiDayEvent ? [] : cell.inlineEvents)" :key="ev.id" class="badge" :class="ev.type">
                          {{ truncateBadgeText(`${eventTypeLabel(ev)} · ${ev.title}`) }}
                        </div>
                      </div>
                    </div>
                  </div>
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
            <div class="carousel-dots" role="group" aria-label="추천 품종 슬라이드 선택">
              <button
                v-for="(item, index) in recommendations"
                :key="item.id"
                type="button"
                class="carousel-dot"
                :class="{ active: index === recommendIdx }"
                :aria-label="`${item.name} 보기`"
                :aria-pressed="index === recommendIdx ? 'true' : 'false'"
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
            <div v-if="harvestItems.length === 0" class="harvest-empty">수확 임박 일정이 없습니다.</div>
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
            <div class="modal-section-title">일정 목록</div>
          <div class="modal-list">
            <div v-for="ev in selectedDayEvents" :key="ev.id" class="modal-item" @click="openDetail(ev)">
              <div class="modal-item-top">
                <div class="modal-item-title">{{ getEventDisplayTime(ev) !== '-' ? `${getEventDisplayTime(ev)} · ` : '' }}{{ ev.title }}</div>
                <div class="pill" :class="ev.type">{{ eventTypeLabel(ev) }}</div>
              </div>
              <div class="modal-item-desc">{{ getEventDescription(ev) }}</div>
            </div>
            <div v-if="selectedDayEvents.length === 0" class="empty">표시할 일정이 없습니다.</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="detailModalOpen" class="modal-backdrop offset-header" @click.self="detailModalOpen = false">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title">일정 상세 · {{ scheduleItemDisplayDate }}</div>
          <button class="modal-close" type="button" @click="detailModalOpen = false">×</button>
        </div>
        <div class="modal-body" style="display: grid; gap: 10px;">
          <div class="modal-section-title">기본 정보</div>
          <div class="schedule-modal-grid">
            <div class="info-box"><div class="k">일정 ID</div><div class="v">{{ scheduleItemIdText }}</div></div>
            <div class="info-box"><div class="k">ScheduleItemType</div><div class="v">{{ scheduleItemTypeText }}</div></div>
            <div class="info-box schedule-modal-wide"><div class="k">표시 시간</div><div class="v">{{ getEventDisplayTime(detailEvent) }}</div></div>
            <div v-for="item in scheduleDetailCoreItems" :key="item.key" class="info-box" :class="{ 'schedule-modal-wide': item.key === 'description' }">
              <div class="k">{{ item.label }}</div>
              <div class="v">{{ item.value }}</div>
            </div>
          </div>

          <div class="modal-section-title">일정 정보</div>
          <div class="schedule-modal-grid">
            <div v-for="item in scheduleDetailTimeItems" :key="item.key" class="info-box">
              <div class="k">{{ item.label }}</div>
              <div class="v">{{ item.value }}</div>
            </div>
          </div>

          <template v-if="hasLinkItems">
            <div class="modal-section-title">연관 정보</div>
            <div class="schedule-modal-grid">
              <div v-for="item in scheduleDetailLinkItems" :key="item.key" class="info-box">
                <div class="k">{{ item.label }}</div>
                <div class="v">{{ item.value }}</div>
              </div>
            </div>
          </template>

          <template v-if="hasReferenceItems">
            <div class="modal-section-title">참조 정보</div>
            <div class="schedule-modal-grid">
              <div v-for="item in scheduleDetailReferenceItems" :key="item.key" class="info-box">
                <div class="k">{{ item.label }}</div>
                <div class="v">{{ item.value }}</div>
              </div>
            </div>
          </template>

          <div class="modal-actions">
            <template v-if="canEditCurrentEvent">
              <button class="btn" type="button" @click="openEditModal(detailEvent)">수정</button>
              <button class="btn schedule-delete-btn" type="button" @click="deletePersonal(detailEvent.id)">삭제</button>
            </template>
            <div v-else class="text-xs font-bold text-[var(--color-text-sub)]">※ 거래 일정은 통합 조회 전용이며 이 화면에서 수정하거나 삭제할 수 없습니다.</div>
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
              <div class="schedule-modal-checkbox">
                <input id="editAllDay" v-model="editAllDay" type="checkbox" class="schedule-checkbox">
                <label for="editAllDay" class="schedule-checkbox-label">종일 일정</label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn" type="button" @click="editModalOpen = false">취소</button>
            <button class="btn btn-primary schedule-save-btn" type="button" :disabled="isSavingSchedule" @click="saveEdit">저장</button>
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
  border-top: 1px solid var(--color-border-divider, #E8E3D8);
}

.calendar-dow-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-weeks {
  display: grid;
}

.calendar-week {
  position: relative;
  --week-lane-count: 0;
  --week-lane-height: 2px;
  --week-lane-gap: 2px;
  --week-event-top: 34px;
  --week-event-area: 0px;
}

.week-day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
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

.day-count-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-orange, #C8622A);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  box-shadow: 0 4px 10px rgba(200, 98, 42, 0.24);
}

.badge-row {
  position: absolute;
  left: 10px;
  right: 10px;
  top: calc(38px + var(--week-event-area));
  bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  overflow: hidden;
}

.week-multiday-layer {
  position: absolute;
  top: var(--week-event-top);
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: var(--week-lane-height);
  gap: var(--week-lane-gap) 0;
  padding: 0 6px;
  pointer-events: none;
  z-index: 2;
}

.multiday-badge {
  min-width: 0;
  height: var(--week-lane-height);
  border: none;
  border-radius: 999px;
  background: rgba(122, 140, 66, 0.52);
  display: block;
  padding: 0;
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
  box-shadow: none;
  position: relative;
}

.multiday-badge::before,
.multiday-badge::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 1px;
  height: 6px;
  background: rgba(88, 104, 48, 0.75);
  transform: translateY(-50%);
  opacity: 0;
}

.multiday-badge.has-start-cap::before {
  left: 0;
  opacity: 1;
}

.multiday-badge.has-end-cap::after {
  right: 0;
  opacity: 1;
}

.badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-olive-light, #C8D4A0);
  background: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge.history {
  background: var(--color-olive-light, #C8D4A0);
  border-color: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
}

.badge.personal {
  background: var(--color-olive-light, #C8D4A0);
  border-color: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
}

.badge.growing-season {
  background: var(--color-olive-light, #C8D4A0);
  border-color: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
}

.badge.harvest {
  background: var(--color-olive-light, #C8D4A0);
  border-color: var(--color-olive-light, #C8D4A0);
  color: var(--color-olive-dark, #586830);
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
  border-bottom: 1px solid #d0c7b8;
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
  border: 1px solid #d0c7b8;
  background: #f7f3ec;
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

.schedule-feedback {
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-divider, #E8E3D8);
  border-radius: 10px;
  background: var(--color-bg-section, #EFEADF);
  color: var(--color-text-sub, #9A8C7E);
  font-size: 12px;
  font-weight: 700;
}

.schedule-feedback.error {
  border-color: rgba(200, 98, 42, 0.28);
  background: rgba(200, 98, 42, 0.08);
  color: var(--color-orange-dark, #A34E20);
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
  grid-template-columns: auto;
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

.schedule-delete-btn {
  border-color: var(--color-orange-light, #F0C9A8);
  background: var(--color-orange-light, #F0C9A8);
  color: var(--color-orange-dark, #A34E20);
}

.schedule-delete-btn:hover,
.schedule-delete-btn:focus {
  border-color: var(--color-orange, #C8622A);
  background: var(--color-orange, #C8622A);
  color: #fff;
}

.info-box {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid #d0c7b8;
  border-radius: 12px;
  background: #f7f3ec;
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
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
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
