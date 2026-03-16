<script setup>
import { ref } from 'vue'

defineProps({
  title: {
    type: String,
    default: '우선 연락 필요 거래처 top5',
  },
  badge: {
    type: String,
    default: '고객관리 점수 기반',
  },
  items: {
    type: Array,
    default: () => [],
  },
})

const showScoreGuide = ref(false)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">{{ title }}</span>

      <div class="badge-guide-wrap">
        <button 
          class="panel-badge clickable" 
          @click="showScoreGuide = !showScoreGuide"
          title="점수 산출 기준 안내"
        >
          {{ badge }}
        </button>

        <transition name="fade">
          <div v-if="showScoreGuide" class="guide-popup badge-align">
            <button class="guide-close" @click="showScoreGuide = false">×</button>
            <h3 class="popup-title">고객 관리 우선순위 점수란?</h3>
            <p class="popup-main">데이터를 기반으로 지금 바로 챙겨야 할 고객을 알려드리는 지표입니다. 점수가 높을수록 관리가 시급합니다.</p>
            <ul class="guide-list">
              <li><strong>• 계약 만료 (50%):</strong> 30일 이내 종료 시 점수 상승</li>
              <li><strong>• 주문 공백 (30%):</strong> 진행 중인 주문서 부재 시 점수 부여</li>
              <li><strong>• 장기 미방문 (20%):</strong> 마지막 방문 후 경과 시간 비례</li>
            </ul>
            <div class="popup-tip">점수가 높은 고객부터 우선 연락해보세요!</div>
          </div>
        </transition>
      </div>
    </div>

    <div class="client-list">
      <div v-for="(item, idx) in items" :key="item.accountId || idx" class="client-item">
        <div class="client-rank" :class="idx + 1 <= 3 ? `rank-${idx + 1}` : ''">{{ idx + 1 }}</div>
        <div class="client-info">
          <div class="client-name">{{ item.accountName }}</div>
          <div class="client-reason">{{ item.primaryReason }}</div>
          <div v-if="item.detailDescription" class="client-detail-desc">{{ item.detailDescription }}</div>
        </div>
        <div class="client-score-wrap">
          <div class="client-score-label">점수</div>
          <div class="client-score">{{ Math.round(item.totalScore) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel { 
  border: 1px solid #e8ecef; 
  border-radius: 8px; 
  padding: 22px; 
  position: relative; 
  background: #fff; 
  overflow: visible; /* 팝업이 잘리지 않도록 설정 */
  z-index: 10; /* 기본 위젯들보다 약간 높게 설정 */
}
.panel:has(.guide-popup) {
  z-index: 100; /* 팝업이 열렸을 때 다른 위젯보다 위에 오도록 설정 */
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.panel-title { font-size: 15px; font-weight: 600; color: #2c3e50; }

.badge-guide-wrap { position: relative; }
.panel-badge { font-size: 11px; color: #7f8c8d; background: #f0f3f4; padding: 3px 8px; border-radius: 4px; border: none; }
.panel-badge.clickable { cursor: pointer; transition: background-color 0.2s, color 0.2s; }
.panel-badge.clickable:hover { background: #e2e6e7; color: #2c3e50; }

/* 정보 가이드 팝업 스타일 */
.guide-popup { position: absolute; top: 28px; right: 0; width: 270px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 100; }
.guide-popup.badge-align { right: 0; left: auto; }
.guide-close { position: absolute; top: 10px; right: 10px; border: none; background: none; color: #bdc3c7; cursor: pointer; font-size: 18px; line-height: 1; }
.popup-title { font-size: 13px; margin: 0 0 8px 0; color: #2c3e50; font-weight: 700; }
.popup-main { font-size: 11px; color: #7f8c8d; margin: 0 0 10px 0; line-height: 1.5; }
.guide-list { padding: 0; margin: 0 0 10px 0; list-style: none; }
.guide-list li { font-size: 10.5px; color: #556270; margin-bottom: 4px; line-height: 1.4; }
.guide-list li strong { color: #2c3e50; }
.popup-tip { font-size: 10.5px; color: #2980b9; background: #ebf5fb; padding: 8px; border-radius: 6px; border: 1px solid #d6eaf8; font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-5px); }

.client-list { display: flex; flex-direction: column; gap: 8px; }
.client-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid transparent; transition: transform .15s, background-color .15s; }
.client-item:hover { background: #edf0f1; transform: translateX(3px); border-left-color: #7f8c8d; }
.client-rank { font-size: 16px; font-weight: 700; color: #95a5a6; min-width: 24px; text-align: center; }
.client-rank.rank-1 { color: #2c3e50; }
.client-rank.rank-2 { color: #556270; }
.client-rank.rank-3 { color: #7f8c8d; }
.client-info { flex: 1; }
.client-name { font-size: 14px; font-weight: 600; color: #2c3e50; margin-bottom: 2px; }
.client-reason { font-size: 12px; color: #95a5a6; margin-bottom: 4px; }
.client-detail-desc { font-size: 11px; color: #bdc3c7; line-height: 1.4; }
.client-score-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.client-score { font-size: 18px; font-weight: 700; color: #2c3e50; }
.client-score-label { font-size: 10px; color: #bdc3c7; }
</style>
