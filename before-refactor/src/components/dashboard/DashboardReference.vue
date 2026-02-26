<script setup>
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
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">{{ title }}</span>
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
.panel { border: 1px solid #e8ecef; border-radius: 8px; padding: 22px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.panel-title { font-size: 15px; font-weight: 600; color: #2c3e50; }
.panel-badge { font-size: 11px; color: #7f8c8d; background: #f0f3f4; padding: 3px 8px; border-radius: 4px; }

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
