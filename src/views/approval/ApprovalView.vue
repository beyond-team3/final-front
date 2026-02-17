<script setup>
import { computed, ref, watch } from 'vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import PageHeader from '@/components/common/PageHeader.vue'

const tabs = [
  { key: 'estimate', label: '견적서' },
  { key: 'contract', label: '계약서' },
  { key: 'account', label: '계정활성화' },
]

const requests = ref([
  { id: 'EST-2026-0210-001', type: 'estimate', title: '견적서 승인 요청', requester: '영업사원 김OO', time: '2026-02-10 10:12', priority: '일반', client: '대상 거래처: 한빛농원', amountOrRole: '견적금액: 12,800,000원', owner: '담당: 이OO', memo: '단가 변경 반영', doc: '견적서 검토 요청\n- 품목: 토마토 종자 A\n- 수량: 2,000 pack\n- 납기: 2026-02-20', done: false },
  { id: 'EST-2026-0210-002', type: 'estimate', title: '견적서 승인 요청', requester: '영업사원 박OO', time: '2026-02-10 09:03', priority: '긴급', client: '대상 거래처: 새봄농협', amountOrRole: '견적금액: 33,500,000원', owner: '담당: 최OO', memo: '출하 일정 촉박', doc: '긴급 견적 요청\n- 품목: 수박 대목 B\n- 수량: 5,000 pack\n- 납기: 2026-02-14', done: false },
  { id: 'CTR-2026-0209-013', type: 'contract', title: '계약서 승인 요청', requester: '영업사원 정OO', time: '2026-02-09 16:44', priority: '일반', client: '대상 거래처: 그린팜', amountOrRole: '계약금액: 58,000,000원', owner: '담당: 이OO', memo: '계약 조건 표준', doc: '계약서 요약\n- 계약기간: 2026-02-15 ~ 2026-06-30\n- 결제조건: 월말 정산, 익월 15일', done: false },
  { id: 'ACC-REQ-2026-0210-007', type: 'account', title: '계정 활성화 요청', requester: '거래처 관리자 윤OO', time: '2026-02-10 08:20', priority: '일반', client: '거래처: 다온농장', amountOrRole: '요청 권한: 거래처 관리자', owner: '담당: 고객지원 장OO', memo: '초기 ID/PW 발급 필요', doc: '계정 활성화 요청\n- 거래처명: 다온농장\n- 사업자번호: 123-45-67890', done: false },
  { id: 'CTR-2026-0208-004', type: 'contract', title: '계약서 승인 요청', requester: '영업사원 오OO', time: '2026-02-08 11:30', priority: '일반', client: '대상 거래처: 서해농자재', amountOrRole: '계약금액: 21,300,000원', owner: '담당: 박OO', memo: '납기 분할', doc: '계약서 요약\n- 납기: 2회 분할 납품\n- 결제: 선금 30% + 잔금 70%', done: false },
])

const state = ref({
  tab: 'estimate',
  page: 1,
  unreadOnly: false,
})
const pageSize = 6
const selectedId = ref(null)
const rejectReason = ref('')
const modalOpen = ref(false)

const filtered = computed(() => requests.value
  .filter((item) => item.type === state.value.tab)
  .filter((item) => (state.value.unreadOnly ? !item.done : true))
  .sort((a, b) => b.time.localeCompare(a.time)))
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pagedItems = computed(() => {
  const start = (state.value.page - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})
const selectedItem = computed(() => requests.value.find((item) => item.id === selectedId.value) || null)
const allPending = computed(() => requests.value.filter((item) => !item.done).length)

watch(() => state.value.tab, () => {
  state.value.page = 1
})

watch(() => state.value.unreadOnly, () => {
  state.value.page = 1
})

watch(totalPages, (next) => {
  if (state.value.page > next) {
    state.value.page = next
  }
})

const tabName = (tabKey) => tabs.find((tab) => tab.key === tabKey)?.label || ''

const openModal = (id) => {
  selectedId.value = id
  rejectReason.value = ''
  modalOpen.value = true
}

const approveSelected = () => {
  if (!selectedItem.value) {
    return
  }
  selectedItem.value.done = true
  selectedItem.value.result = 'approved'
  modalOpen.value = false
}

const rejectSelected = () => {
  if (!selectedItem.value || !rejectReason.value.trim()) {
    return
  }
  selectedItem.value.done = true
  selectedItem.value.result = 'rejected'
  selectedItem.value.reason = rejectReason.value.trim()
  modalOpen.value = false
}

const badgeClass = (type) => {
  if (type === 'estimate') return 'badge-sales'
  if (type === 'contract') return 'badge-schedule'
  return 'badge-admin'
}
</script>

<template>
  <section class="screen-content">
    <PageHeader title="승인 요청" subtitle="견적/계약/계정 활성화 승인 요청을 처리합니다." />

    <div class="noti-topbar">
      <div class="noti-tabs" role="tablist" aria-label="승인 요청 분류">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="noti-tab"
          :class="{ active: state.tab === tab.key }"
          :aria-selected="state.tab === tab.key"
          @click="state.tab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="noti-actions">
        <button type="button" class="btn" :class="{ 'toggle-on': state.unreadOnly }" @click="state.unreadOnly = !state.unreadOnly">대기만</button>
      </div>
    </div>

    <div class="noti-list-wrap">
      <div v-if="pagedItems.length === 0" class="noti-empty">표시할 승인 요청이 없습니다.</div>

      <div v-else class="noti-list">
        <article
          v-for="item in pagedItems"
          :key="item.id"
          class="noti-item"
          :class="{ unread: !item.done }"
          role="button"
          tabindex="0"
          @click="openModal(item.id)"
          @keydown.enter.prevent="openModal(item.id)"
        >
          <div class="noti-dot" />
          <div class="noti-main">
            <div class="noti-title">
              <strong>{{ item.title }}</strong>
              <div class="noti-meta">
                <span class="noti-badge" :class="badgeClass(item.type)">{{ tabName(item.type) }}</span>
                <span>{{ item.time }}</span>
              </div>
            </div>
            <p class="noti-preview">{{ item.id }} · {{ item.requester }} · {{ item.client }}</p>
          </div>
        </article>
      </div>

      <footer class="noti-footer">
        <PaginationControls v-model="state.page" :total-pages="totalPages" />
        <span class="result-meta">총 {{ requests.length }}건 · 대기 {{ allPending }}건 · {{ state.page }}/{{ totalPages }} 페이지</span>
      </footer>
    </div>

    <ModalBase v-model="modalOpen" :title="`검토 · ${selectedItem ? tabName(selectedItem.type) : ''}`" width-class="max-w-3xl">
      <template v-if="selectedItem">
        <div class="modal-info">
          <span class="noti-badge" :class="badgeClass(selectedItem.type)">{{ tabName(selectedItem.type) }}</span>
          <span class="noti-badge">{{ selectedItem.priority }}</span>
          <span>{{ selectedItem.time }}</span>
          <span>{{ selectedItem.done ? '처리완료' : '대기중' }}</span>
        </div>

        <h4 class="modal-title">{{ selectedItem.title }}</h4>
        <div class="detail-grid">
          <div><dt>요청자</dt><dd>{{ selectedItem.requester }}</dd></div>
          <div><dt>대상</dt><dd>{{ selectedItem.client }}</dd></div>
          <div><dt>금액/권한</dt><dd>{{ selectedItem.amountOrRole }}</dd></div>
          <div><dt>담당</dt><dd>{{ selectedItem.owner }}</dd></div>
          <div><dt>메모</dt><dd>{{ selectedItem.memo }}</dd></div>
        </div>

        <pre class="modal-message">{{ selectedItem.doc }}</pre>

        <label class="reason-field">
          반려 사유
          <textarea v-model="rejectReason" rows="4" placeholder="반려 사유를 입력하세요" />
        </label>
      </template>

      <template #footer>
        <div class="modal-actions">
          <button type="button" class="btn" @click="modalOpen = false">닫기</button>
          <button type="button" class="btn danger" :disabled="!rejectReason.trim()" @click="rejectSelected">반려</button>
          <button type="button" class="btn primary" @click="approveSelected">승인</button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
.screen-content { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, .1); min-height: 500px; }
.noti-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.noti-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.noti-tab { border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; }
.noti-tab.active { background: #1e293b; border-color: #1e293b; color: #fff; }
.noti-actions { display: flex; gap: 8px; }
.btn { border: 1px solid #dbe1e9; background: #fff; color: #334155; border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 700; }
.btn.primary { background: #0ea5e9; border-color: #0ea5e9; color: #fff; }
.btn.danger { background: #ef4444; border-color: #ef4444; color: #fff; }
.btn.toggle-on { background: #1e293b; border-color: #1e293b; color: #fff; }
.noti-list-wrap { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
.noti-list { max-height: 520px; overflow: auto; }
.noti-item { display: flex; gap: 10px; border-bottom: 1px solid #eef2f7; padding: 13px 14px; cursor: pointer; }
.noti-item:hover { background: #f8fafc; }
.noti-dot { width: 9px; height: 9px; border-radius: 999px; background: #0ea5e9; opacity: 0; margin-top: 7px; }
.noti-item.unread .noti-dot { opacity: 1; }
.noti-main { flex: 1; min-width: 0; }
.noti-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.noti-title strong { font-size: 14px; color: #1f2937; }
.noti-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #64748b; }
.noti-badge { padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #e2e8f0; color: #334155; }
.badge-sales { background: #e0f2fe; color: #0369a1; }
.badge-schedule { background: #dcfce7; color: #166534; }
.badge-admin { background: #fff7ed; color: #9a3412; }
.noti-preview { margin-top: 6px; font-size: 13px; color: #475569; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.noti-footer { display: flex; justify-content: space-between; gap: 10px; padding: 12px; background: #f8fafc; align-items: center; flex-wrap: wrap; }
.result-meta { font-size: 12px; color: #64748b; }
.noti-empty { padding: 40px 12px; text-align: center; color: #94a3b8; }
.modal-info { display: flex; gap: 8px; flex-wrap: wrap; color: #64748b; font-size: 12px; }
.modal-title { margin-top: 10px; font-size: 18px; font-weight: 700; color: #1f2937; }
.detail-grid { margin-top: 12px; display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.detail-grid dt { font-size: 12px; color: #64748b; }
.detail-grid dd { margin-top: 2px; font-size: 14px; color: #1f2937; font-weight: 600; }
.modal-message { margin-top: 12px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
.reason-field { margin-top: 12px; display: grid; gap: 6px; font-size: 13px; font-weight: 700; color: #334155; }
.reason-field textarea { resize: vertical; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; min-height: 100px; font-size: 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 860px) { .detail-grid { grid-template-columns: 1fr; } }
</style>
