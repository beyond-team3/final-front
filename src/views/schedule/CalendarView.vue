<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const ym = (d) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`

const authStore = useAuthStore()
const router = useRouter()
const isAdmin = computed(() => authStore.currentRole === ROLES.ADMIN)
const filterState = ref({ sales: 'ALL', client: 'ALL', employee: 'ALL' })

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

const passHistoryFilter = (ev) => {
  if (ev.type !== 'history') return true
  if (filterState.value.sales !== 'ALL' && ev.historyCategory !== filterState.value.sales) return false
  if (filterState.value.client !== 'ALL' && ev.clientId !== filterState.value.client) return false
  if (isAdmin.value && filterState.value.employee !== 'ALL' && ev.employeeId !== filterState.value.employee) return false
  return true
}

const eventsByDate = (dateStr) => events.value
  .filter((ev) => ev.date === dateStr)
  .filter(passHistoryFilter)
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
  if (!item?.id) {
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

const resetFilters = () => {
  filterState.value = { sales: 'ALL', client: 'ALL', employee: 'ALL' }
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

const prevMonth = () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}

const startRecommendTimer = () => {
  carouselTimer = window.setInterval(() => {
    recommendIdx.value = (recommendIdx.value + 1) % recommendations.value.length
  }, 5000)
}

onMounted(() => {
  startRecommendTimer()
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
            <div class="select">
              <label for="salesSelector">영업</label>
              <select id="salesSelector" v-model="filterState.sales">
                <option value="ALL">전체</option>
                <option value="RFQ">견적요청</option>
                <option value="QUOTATION">견적</option>
                <option value="CONTRACT">계약</option>
                <option value="ORDER">주문</option>
                <option value="INVOICE">청구</option>
              </select>
            </div>

            <div class="select">
              <label for="clientSelector">거래처</label>
              <select id="clientSelector" v-model="filterState.client">
                <option value="ALL">전체</option>
                <option value="C001">대상팜</option>
                <option value="C002">그린농원</option>
                <option value="C003">해오름농장</option>
              </select>
            </div>

            <div v-if="isAdmin" class="select">
              <label for="employeeSelector">사원</label>
              <select id="employeeSelector" v-model="filterState.employee">
                <option value="ALL">전체</option>
                <option value="E001">김영업</option>
                <option value="E002">이영업</option>
                <option value="E003">박영업</option>
              </select>
            </div>

            <button class="btn btn-ghost" type="button" @click="resetFilters">초기화</button>
          </div>

          <div class="toolbar-right">
            <button class="btn btn-primary" type="button" @click="openEditModal(null)">+ 일정 추가</button>
          </div>
        </div>

        <div class="calendar-shell">
          <div class="calendar-card">
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
                    {{ ev.type === 'history' ? `${historyLabelWithOwner(ev)} · ${ev.title}` : ev.title }}
                  </div>
                  <div v-if="cell.events.length > 3" class="badge">+{{ cell.events.length - 3 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="calendar-right">
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
                <div class="pill" :class="ev.type">{{ ev.type === 'history' ? historyLabelWithOwner(ev) : '개인' }}</div>
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
          <div class="info-box"><div class="k">구분</div><div class="v">{{ detailEvent?.type === 'history' ? `영업 문서 일정 (${historyLabelWithOwner(detailEvent)})` : '개인 일정' }}</div></div>
          <div class="info-box"><div class="k">설명</div><div class="v">{{ detailEvent?.desc || '-' }}</div></div>

          <div class="modal-actions">
            <template v-if="detailEvent?.type === 'personal'">
              <button class="btn" type="button" @click="openEditModal(detailEvent)">수정</button>
              <button class="btn" type="button" @click="deletePersonal(detailEvent.id)">삭제</button>
            </template>
            <div v-else style="color:#6b7a8c;font-size:12px;font-weight:700;">※ 영업 문서 일정은 문서 히스토리에 의해 자동 생성됩니다.</div>
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
.screen-content { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, .1); min-height: 500px; }
.screen-title { font-size: 24px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ecf0f1; }
.calendar-page { display: flex; gap: 20px; align-items: stretch; }
.calendar-left { flex: 1 1 auto; min-width: 640px; }
.calendar-right { width: 360px; flex: 0 0 360px; }
.toolbar { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 16px; background: #fff; border: 1px solid #e9edf2; border-radius: 10px; margin-bottom: 16px; }
.toolbar-left, .toolbar-right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.select { display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid #e3e7ee; border-radius: 10px; background: #fff; font-size: 13px; color: #2c3e50; }
.select label { color: #6b7a8c; font-weight: 600; font-size: 12px; }
.select select { border: none; outline: none; background: transparent; font-size: 13px; color: #2c3e50; cursor: pointer; }
.btn { border: 1px solid #dfe6ef; background: #fff; color: #2c3e50; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; }
.btn-primary { border-color: #2d89ef33; background: #2d89ef; color: #fff; }
.btn-ghost { background: #f7f9fc; }
.calendar-card { border: 1px solid #e9edf2; border-radius: 12px; background: #fff; overflow: hidden; }
.calendar-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #eef2f6; background: #fff; }
.month-title { font-size: 18px; font-weight: 800; color: #2c3e50; }
.icon-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid #dfe6ef; background: #fff; cursor: pointer; font-size: 18px; display: inline-flex; align-items: center; justify-content: center; color: #2c3e50; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); border-top: 1px solid #eef2f6; }
.dow { padding: 10px 12px; font-size: 12px; font-weight: 800; color: #6b7a8c; background: #fbfcfe; border-bottom: 1px solid #eef2f6; }
.day-cell { aspect-ratio: 1 / 1; border-right: 1px solid #eef2f6; border-bottom: 1px solid #eef2f6; padding: 10px 10px 8px; cursor: pointer; background: #fff; position: relative; overflow: hidden; }
.day-cell:nth-child(7n) { border-right: none; }
.day-cell.muted { background: #fbfcfe; color: #9aa7b6; }
.day-num { font-size: 13px; font-weight: 800; color: inherit; }
.badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; border: 1px solid #e3e7ee; background: #f7f9fc; color: #425b76; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge.history { background: #fff7e8; border-color: #ffe2b7; color: #8a5a00; }
.badge.personal { background: #e8f7ee; border-color: #bfe9ce; color: #0f5a2a; }
.side-card { border: 1px solid #e9edf2; border-radius: 12px; background: #fff; overflow: hidden; }
.side-header { padding: 14px 16px; border-bottom: 1px solid #eef2f6; display: flex; align-items: center; justify-content: space-between; }
.side-title { font-size: 15px; font-weight: 800; color: #2c3e50; }
.carousel { padding: 12px 16px 0; }
.carousel-img { width: 100%; height: 190px; border-radius: 12px; border: 1px solid #eef2f6; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.carousel-main-text { font-size: 20px; font-weight: 800; color: #2c3e50; padding: 0 16px; text-align: center; }
.carousel-caption { margin-top: 10px; font-weight: 800; color: #2c3e50; font-size: 13px; }
.recommend-list { padding: 10px 10px 14px; }
.recommend-item { padding: 10px 10px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; }
.recommend-item:hover { background: #f6f8fb; }
.recommend-name { font-weight: 800; color: #2c3e50; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recommend-tag { font-size: 11px; padding: 4px 8px; border-radius: 999px; border: 1px solid #e3e7ee; background: #f7f9fc; color: #6b7a8c; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, .35); display: flex; align-items: center; justify-content: center; z-index: 2500; padding: 24px; }
.modal-backdrop.offset-header { align-items: flex-start; padding-top: 84px; }
.modal { width: min(720px, 100%); background: #fff; border-radius: 14px; border: 1px solid #e9edf2; box-shadow: 0 18px 45px rgba(0, 0, 0, .18); overflow: hidden; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
.modal-header { padding: 14px 16px; border-bottom: 1px solid #eef2f6; display: flex; align-items: center; justify-content: space-between; }
.modal-title { font-size: 15px; font-weight: 900; color: #2c3e50; }
.modal-close { width: 38px; height: 38px; border-radius: 10px; border: 1px solid #dfe6ef; background: #fff; cursor: pointer; font-size: 18px; }
.modal-body { padding: 14px 16px 16px; overflow: auto; }
.modal-section-title { font-size: 12px; font-weight: 900; color: #6b7a8c; letter-spacing: .4px; margin-bottom: 8px; text-transform: uppercase; }
.modal-list { display: grid; gap: 10px; }
.modal-item { border: 1px solid #eef2f6; background: #fbfcfe; border-radius: 12px; padding: 12px; cursor: pointer; }
.modal-item-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.modal-item-title { font-weight: 900; color: #2c3e50; font-size: 13px; }
.modal-item-desc { margin-top: 6px; font-size: 12px; color: #6b7a8c; line-height: 1.5; }
.pill { font-size: 11px; padding: 4px 8px; border-radius: 999px; border: 1px solid #e3e7ee; background: #fff; color: #425b76; }
.pill.history { background: #fff7e8; border-color: #ffe2b7; color: #8a5a00; }
.pill.personal { background: #e8f7ee; border-color: #bfe9ce; color: #0f5a2a; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-grid .full { grid-column: 1 / -1; }
.field { display: grid; gap: 6px; }
.field label { font-size: 12px; font-weight: 900; color: #6b7a8c; }
.field input, .field textarea { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #dfe6ef; font-size: 13px; color: #2c3e50; background: #fff; }
.field textarea { min-height: 92px; resize: vertical; }
.modal-actions { margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
.info-box { display: grid; gap: 6px; padding: 12px; border: 1px solid #eef2f6; border-radius: 12px; background: #fbfcfe; }
.info-box .k { font-size: 12px; font-weight: 900; color: #6b7a8c; }
.info-box .v { font-size: 13px; font-weight: 800; color: #2c3e50; line-height: 1.5; }
.empty { padding: 12px; color: #6b7a8c; }
@media (max-width: 1120px) {
  .calendar-page { flex-direction: column; }
  .calendar-left { min-width: 0; }
  .calendar-right { width: 100%; flex: 1 1 auto; }
}
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
