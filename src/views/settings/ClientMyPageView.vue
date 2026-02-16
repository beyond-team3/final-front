<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ModalBase from '@/components/common/ModalBase.vue'
import UnifiedHistoryPanel from '@/components/history/UnifiedHistoryPanel.vue'

const router = useRouter()

const activeTab = ref('info')

const profile = reactive({
  name: 'OO육묘장',
  code: 'C-001',
  summary: '육묘장 | 사용중 | 서울특별시 ○○구',
  businessNumber: '123-45-67890',
  ceo: '김사장',
  phone: '02-123-4567',
  address: '서울특별시 ○○구 ○○로 00',
  type: '육묘장',
  manager: '김철수 과장',
  mobile: '010-1234-5678',
  email: 'kim@farm.com',
  crops: ['토마토', '파프리카', '오이', '고추', '상추'],
})

const pipelines = ref([
  {
    id: 8,
    title: '파이프라인 #8',
    startDate: '2026-01-29',
    amount: 15000000,
    statusText: '주문 진행',
    statusTone: 'primary',
    steps: [
      { name: '견적요청', state: 'completed', statusText: '완료' },
      { name: '견적서', state: 'completed', statusText: '완료' },
      { name: '계약서', state: 'completed', statusText: '완료' },
      { name: '주문서', state: 'in-progress', statusText: '진행' },
      { name: '명세서', state: 'waiting', statusText: '대기' },
      { name: '청구서', state: 'waiting', statusText: '대기' },
      { name: '결제완료', state: 'waiting', statusText: '대기' },
    ],
  },
  {
    id: 7,
    title: '파이프라인 #7',
    startDate: '2026-01-15',
    amount: 8500000,
    statusText: '결제 완료',
    statusTone: 'success',
    steps: [
      { name: '견적요청', state: 'completed', statusText: '완료' },
      { name: '견적서', state: 'completed', statusText: '완료' },
      { name: '계약서', state: 'completed', statusText: '완료' },
      { name: '주문서', state: 'completed', statusText: '완료' },
      { name: '명세서', state: 'completed', statusText: '완료' },
      { name: '청구서', state: 'completed', statusText: '완료' },
      { name: '결제완료', state: 'completed', statusText: '완료' },
    ],
  },
]) // TODO: API 연결

const isPwModalOpen = ref(false)
const pwForm = ref({ current: '', next: '', nextConfirm: '' })
const pwHint = ref('')

const openPwModal = () => {
  pwForm.value = { current: '', next: '', nextConfirm: '' }
  pwHint.value = ''
  isPwModalOpen.value = true
}

const closePwModal = () => {
  isPwModalOpen.value = false
  pwHint.value = ''
}

const submitPassword = () => {
  const { current, next, nextConfirm } = pwForm.value

  if (!current || !next || !nextConfirm) {
    pwHint.value = '모든 항목을 입력해주세요.'
    return
  }

  if (next !== nextConfirm) {
    pwHint.value = '새 비밀번호와 확인 값이 일치하지 않습니다.'
    return
  }

  if (next.length < 8) {
    pwHint.value = '새 비밀번호는 8자 이상을 권장합니다.'
    return
  }

  pwHint.value = '비밀번호가 수정되었습니다.'
  setTimeout(closePwModal, 700)
}

const openPipelineDetail = (pipelineId) => {
  router.push({ name: 'pipeline-detail', params: { id: pipelineId } })
}
</script>

<template>
  <section class="screen-content">
    <header class="detail-header">
      <div class="header-info">
        <h2>🏢 {{ profile.name }} <span class="muted">({{ profile.code }})</span></h2>
        <p>{{ profile.summary }}</p>
      </div>
      <button type="button" class="btn-primary" @click="openPwModal">비밀번호 변경</button>
    </header>

    <div class="tabs">
      <div class="tab-buttons">
        <button type="button" class="tab-btn" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">기본 정보</button>
        <button type="button" class="tab-btn" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">영업 히스토리</button>
      </div>

      <section v-if="activeTab === 'info'" class="tab-content">
        <div class="info-grid">
          <article class="info-card">
            <h3>기본 정보</h3>
            <div class="info-item">
              <span class="info-label">법인명</span>
              <p class="info-value">{{ profile.name }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">사업자번호</span>
              <p class="info-value">{{ profile.businessNumber }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">대표이름</span>
              <p class="info-value">{{ profile.ceo }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">회사유선번호</span>
              <p class="info-value">{{ profile.phone }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">주소</span>
              <p class="info-value">{{ profile.address }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">거래처 유형</span>
              <p class="info-value badge badge-blue">{{ profile.type }}</p>
            </div>
          </article>

          <article class="info-card">
            <h3>담당자 정보</h3>
            <div class="info-item">
              <span class="info-label">담당자명</span>
              <p class="info-value">{{ profile.manager }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">연락처</span>
              <p class="info-value">{{ profile.mobile }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">이메일</span>
              <p class="info-value">{{ profile.email }}</p>
            </div>
          </article>

          <article class="info-card">
            <h3>취급 품종</h3>
            <div class="crops-list">
              <span v-for="crop in profile.crops" :key="crop" class="crop-badge">{{ crop }}</span>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="tab-content">
        <UnifiedHistoryPanel
          :title="`${profile.name}의 영업 파이프라인`"
          :pipelines="pipelines"
          :show-client-name="false"
          :show-edit-button="false"
          @detail="openPipelineDetail"
        />
      </section>
    </div>

    <ModalBase v-model="isPwModalOpen" title="비밀번호 수정" width-class="max-w-xl">
      <div class="grid gap-3">
        <label class="form-group">
          <span class="form-label">기존 비밀번호</span>
          <input v-model="pwForm.current" class="form-input" type="password" autocomplete="current-password" placeholder="기존 비밀번호를 입력하세요">
        </label>
        <label class="form-group">
          <span class="form-label">새 비밀번호</span>
          <input v-model="pwForm.next" class="form-input" type="password" autocomplete="new-password" placeholder="새 비밀번호를 입력하세요">
        </label>
        <label class="form-group">
          <span class="form-label">새 비밀번호 확인</span>
          <input v-model="pwForm.nextConfirm" class="form-input" type="password" autocomplete="new-password" placeholder="새 비밀번호를 다시 입력하세요">
        </label>
        <p class="form-hint">{{ pwHint }}</p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-sub" @click="closePwModal">취소</button>
          <button type="button" class="btn-primary" @click="submitPassword">수정</button>
        </div>
      </template>
    </ModalBase>
  </section>
</template>

<style scoped>
.screen-content { background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); min-height: 500px; }
.detail-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.header-info { flex: 1; }
.header-info h2 { font-size: 24px; font-weight: 700; color: #111827; }
.header-info p { margin-top: 4px; color: #6b7280; font-size: 14px; }
.muted { color: #95a5a6; font-size: 14px; font-weight: 400; }

.tabs { margin-top: 20px; }
.tab-buttons { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 25px; }
.tab-btn { padding: 12px 24px; background: none; border: none; font-size: 15px; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; }
.tab-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

.info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.info-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background-color: #fff; }
.info-card h3 { font-size: 16px; font-weight: 600; color: #2c3e50; margin-bottom: 15px; }
.info-item { margin-bottom: 12px; }
.info-label { font-size: 13px; color: #7f8c8d; display: block; margin-bottom: 4px; }
.info-value { font-weight: 500; color: #2c3e50; font-size: 15px; }

.badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
.badge-blue { background-color: var(--color-primary-light); color: var(--color-primary-dark); }

.crops-list { display: flex; flex-wrap: wrap; gap: 8px; }
.crop-badge { padding: 4px 12px; background-color: #f1f3f5; color: #495057; border: 1px solid #dee2e6; border-radius: 6px; font-size: 13px; }

.form-group { display: grid; gap: 6px; }
.form-label { font-size: 13px; font-weight: 600; color: #2c3e50; }
.form-input { height: 40px; border: 1px solid #dfe6e9; border-radius: 8px; padding: 0 12px; outline: none; font-size: 14px; }
.form-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(51, 65, 85, 0.15); }
.form-hint { min-height: 18px; font-size: 12px; color: #7f8c8d; }

@media (max-width: 1024px) {
  .info-grid { grid-template-columns: 1fr; }
}
</style>
