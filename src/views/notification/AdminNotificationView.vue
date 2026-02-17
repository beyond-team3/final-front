<script setup>
import { computed, ref, watch } from 'vue'
import ModalBase from '@/components/common/ModalBase.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNotificationStore } from '@/stores/notification'
import { ROLES } from '@/utils/constants'

const store = useNotificationStore()
const role = ROLES.ADMIN

const selectedCategory = ref('전체')
const unreadOnly = ref(false)
const page = ref(1)
const pageSize = 8
const modalOpen = ref(false)
const selectedId = ref(null)

const categories = computed(() => store.getCategories(role))
const filteredNotifications = computed(() => store.getFiltered(role, selectedCategory.value, unreadOnly.value))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredNotifications.value.length / pageSize)))
const pagedNotifications = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredNotifications.value.slice(start, start + pageSize)
})
const unreadCount = computed(() => filteredNotifications.value.filter((item) => !item.read).length)
const selectedNotification = computed(() => store.getById(role, selectedId.value))

watch([selectedCategory, unreadOnly], () => {
  page.value = 1
})

watch(totalPages, (next) => {
  if (page.value > next) {
    page.value = next
  }
})

const openDetail = (item) => {
  selectedId.value = item.id
  if (!item.read) {
    store.markRead(role, item.id, true)
  }
  modalOpen.value = true
}

const toggleSelectedRead = () => {
  if (!selectedNotification.value) {
    return
  }
  store.toggleRead(role, selectedNotification.value.id)
}

const badgeClass = (category) => {
  if (category === '영업') return 'badge-sales'
  if (category === '일정') return 'badge-schedule'
  if (category === '상품') return 'badge-product'
  return 'badge-admin'
}
</script>

<template>
  <section class="screen-content">
    <PageHeader title="알림" subtitle="관리자용 알림을 확인하고 승인/관리 흐름을 점검합니다." />

    <div class="noti-topbar">
      <div class="noti-tabs" role="tablist" aria-label="알림 분류">
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="noti-tab"
          :class="{ active: selectedCategory === category }"
          :aria-selected="selectedCategory === category"
          @click="selectedCategory = category"
        >
          {{ category }}
        </button>
      </div>

      <div class="noti-actions">
        <button type="button" class="btn" :class="{ 'toggle-on': unreadOnly }" @click="unreadOnly = !unreadOnly">안읽음</button>
        <button type="button" class="btn ghost" @click="store.markAllRead(role)">모두 읽음</button>
      </div>
    </div>

    <div class="noti-list-wrap">
      <div v-if="pagedNotifications.length === 0" class="noti-empty">표시할 알림이 없습니다.</div>

      <div v-else class="noti-list">
        <article
          v-for="item in pagedNotifications"
          :key="item.id"
          class="noti-item"
          :class="{ unread: !item.read }"
          role="button"
          tabindex="0"
          @click="openDetail(item)"
          @keydown.enter.prevent="openDetail(item)"
        >
          <div class="noti-dot" />
          <div class="noti-main">
            <div class="noti-title">
              <strong>{{ item.title }}</strong>
              <div class="noti-meta">
                <span class="noti-badge" :class="badgeClass(item.category)">{{ item.category }}</span>
                <span>{{ item.createdAt }}</span>
              </div>
            </div>
            <p class="noti-preview">{{ item.message }}</p>
          </div>
        </article>
      </div>

      <footer class="noti-footer">
        <PaginationControls v-model="page" :total-pages="totalPages" />
        <span class="result-meta">총 {{ filteredNotifications.length }}건 · 미확인 {{ unreadCount }}건 · {{ page }}/{{ totalPages }} 페이지</span>
      </footer>
    </div>

    <ModalBase v-model="modalOpen" title="알림 상세" width-class="max-w-3xl">
      <template v-if="selectedNotification">
        <div class="modal-info">
          <span class="noti-badge" :class="badgeClass(selectedNotification.category)">{{ selectedNotification.category }}</span>
          <span class="noti-badge">{{ selectedNotification.type }}</span>
          <span>{{ selectedNotification.createdAt }}</span>
          <span>{{ selectedNotification.read ? '읽음' : '안읽음' }}</span>
        </div>

        <h4 class="modal-title">{{ selectedNotification.title }}</h4>
        <pre class="modal-message">{{ selectedNotification.message }}</pre>

        <div class="modal-actions">
          <button type="button" class="btn" @click="toggleSelectedRead">{{ selectedNotification.read ? '안읽음 처리' : '읽음 처리' }}</button>
          <a class="btn primary" :href="selectedNotification.url || '#'">연관 화면 이동</a>
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
.btn.primary { background: #0ea5e9; border-color: #0ea5e9; color: #fff; text-decoration: none; }
.btn.ghost { background: transparent; }
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
.badge-product { background: #f3e8ff; color: #6b21a8; }
.noti-preview { margin-top: 6px; font-size: 13px; color: #475569; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.noti-footer { display: flex; justify-content: space-between; gap: 10px; padding: 12px; background: #f8fafc; align-items: center; flex-wrap: wrap; }
.result-meta { font-size: 12px; color: #64748b; }
.noti-empty { padding: 40px 12px; text-align: center; color: #94a3b8; }
.modal-info { display: flex; gap: 8px; flex-wrap: wrap; color: #64748b; font-size: 12px; }
.modal-title { margin-top: 10px; font-size: 18px; font-weight: 700; color: #1f2937; }
.modal-message { margin-top: 12px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #334155; }
.modal-actions { margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px; }
</style>
