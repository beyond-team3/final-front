<script setup>
import { ref } from 'vue'

defineProps({
  title: {
    type: String,
    default: '우선 연락 필요 거래처 top5',
  },
  badge: {
    type: String,
    default: '점수 기반',
  },
  items: {
    type: Array,
    default: () => [
      { rank: 1, name: '풍년농장', reason: '최근 주문 2주 경과 · 재배 시즌 임박', score: 95 },
      { rank: 2, name: '황금들판', reason: '회의록 3주 경과 · 주문 빈도 높음', score: 88 },
      { rank: 3, name: '녹색농협', reason: '재배 시즌 1개월 전 · 재주문 예상', score: 82 },
      { rank: 4, name: '푸른농원', reason: '주문 이력 좋음 · 시즌 적기 도래', score: 79 },
      { rank: 5, name: '희망농장', reason: '미팅 1개월 경과 · 주문 패턴 분석', score: 74 },
    ],
  },
})

const showScoreGuide = ref(false)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div class="title-group">
        <span class="panel-title">{{ title }}</span>
        <div class="info-guide-wrap">
          <button class="btn-info-guide" @click="showScoreGuide = !showScoreGuide" title="점수 산출 기준 안내">i</button>
          <transition name="fade">
            <div v-if="showScoreGuide" class="guide-popup">
              <button class="guide-close" @click="showScoreGuide = false">×</button>
              <h3 class="popup-title">💡 고객 관리 우선순위 점수란?</h3>
              <p class="popup-main">데이터를 기반으로 지금 바로 챙겨야 할 고객을 알려드리는 지표입니다. 점수가 높을수록 관리가 시급합니다.</p>
              <ul class="guide-list">
                <li><strong>• 계약 만료 (50%):</strong> 30일 이내 종료 시 점수 상승</li>
                <li><strong>• 주문 공백 (30%):</strong> 진행 중인 주문서 부재 시 점수 부여</li>
                <li><strong>• 장기 미방문 (20%):</strong> 마지막 방문 후 경과 시간 비례</li>
              </ul>
              <div class="popup-tip">✅ 점수가 높은 고객부터 우선 연락해보세요!</div>
            </div>
          </transition>
        </div>
      </div>
      <span class="panel-badge">{{ badge }}</span>
    </div>

    <div class="client-list">
      <div v-for="item in items" :key="item.rank" class="client-item">
        <div class="client-rank" :class="item.rank <= 3 ? `rank-${item.rank}` : ''">{{ item.rank }}</div>
        <div class="client-info">
          <div class="client-name">{{ item.name }}</div>
          <div class="client-reason">{{ item.reason }}</div>
        </div>
        <div class="client-score-wrap">
          <div class="client-score">{{ item.score }}</div>
          <div class="client-score-label">점수</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel { border: 1px solid #e8ecef; border-radius: 8px; padding: 22px; position: relative; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.title-group { display: flex; align-items: center; gap: 6px; }
.panel-title { font-size: 15px; font-weight: 600; color: #2c3e50; }
.panel-badge { font-size: 11px; color: #7f8c8d; background: #f0f3f4; padding: 3px 8px; border-radius: 4px; }

/* 정보 가이드 팝업 스타일 */
.info-guide-wrap { position: relative; display: flex; align-items: center; }
.btn-info-guide { width: 16px; height: 16px; border-radius: 50%; background: #bdc3c7; color: #fff; border: none; font-size: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; transition: background 0.2s; }
.btn-info-guide:hover { background: #95a5a6; }
.guide-popup { position: absolute; top: 24px; left: 0; width: 260px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 100; }
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
.client-reason { font-size: 12px; color: #95a5a6; }
.client-score-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.client-score { font-size: 18px; font-weight: 700; color: #2c3e50; }
.client-score-label { font-size: 10px; color: #bdc3c7; }
</style>
