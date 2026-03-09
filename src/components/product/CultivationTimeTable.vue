<script setup>
import { ref, watch } from 'vue'
import { getCultivationTimes } from '@/api/product'

const props = defineProps({
  productId: {
    type: Number,
    required: true
  }
})

const loading = ref(true)
const times = ref([])
const error = ref(null)

// 그룹화된 데이터 (Rowspan 렌더링용)
// [ { croppingSystem: '터널', rows: [ { region: '남부', sowingStart: 2, ... }, { region: '중부', ... } ], rowspan: 2 }, ... ]
const groupedTimes = ref([])

watch(
  () => props.productId,
  async (newId) => {
    if (!newId) return
    loading.value = true
    error.value = null
    try {
      const times_data = await getCultivationTimes(newId)
      times.value = times_data || []
      
      // '작형(croppingSystem)'을 기준으로 데이터 그룹화
      const map = new Map()
      times.value.forEach(item => {
        const sys = item.croppingSystem || '기타'
        if (!map.has(sys)) {
          map.set(sys, [])
        }
        map.get(sys).push(item)
      })

      const grouped = []
      map.forEach((rows, sys) => {
        grouped.push({
          croppingSystem: sys,
          rows: rows,
          rowspan: rows.length
        })
      })
      groupedTimes.value = grouped

    } catch (e) {
      error.value = '재배적기 데이터를 불러오는 데 실패했습니다.'
      console.error(e)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

const months = Array.from({ length: 12 }, (_, i) => i + 1)

// 월(month)가 주어진 기간에 해당하는지 확인 (순환 구간 지원: 예 11월~2월)
const isMonthInRange = (month, start, end) => {
  if (!start || !end) return false
  if (start <= end) {
    return month >= start && month <= end
  } else {
    // start > end 인 경우 (예: 11월 시작 ~ 2월 종료)
    return month >= start || month <= end
  }
}
</script>

<template>
  <div class="mt-8">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-xl font-bold text-[var(--color-text-strong)]">재배적기표</h3>
      <div class="flex items-center gap-4 text-sm font-medium">
        <div class="flex items-center gap-1">
          <span class="h-3 w-3 rounded-full bg-[var(--color-olive)]"></span>
          <span>파종</span>
        </div>
        <div class="flex items-center gap-1 text-[var(--color-purple)]">
          <span class="text-lg font-bold leading-none">×</span>
          <span>정식</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="h-3 w-3 bg-[var(--color-orange)]"></span>
          <span>수확</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="animate-pulse rounded-lg bg-[var(--color-bg-section)] h-40"></div>
    <div v-else-if="error" class="rounded-lg border border-[var(--color-status-error)] bg-[#FEF2F2] p-4 text-center text-sm text-[var(--color-status-error)]">
      {{ error }}
    </div>
    <div v-else-if="groupedTimes.length === 0" class="rounded-lg border border-[var(--color-border-card)] bg-[var(--color-bg-section)] p-8 text-center text-sm text-[var(--color-text-sub)]">
      등록된 재배적기 데이터가 없습니다.
    </div>
    
    <div v-else class="overflow-x-auto rounded-lg border border-[var(--color-border-divider)]">
      <table class="w-full min-w-[600px] border-collapse text-center text-sm">
        <thead>
          <tr class="bg-[var(--color-bg-section)]">
            <th class="border-b border-r border-[var(--color-border-divider)] py-3 px-2 w-20 font-semibold text-[var(--color-text-sub)]">작형</th>
            <th class="border-b border-r border-[var(--color-border-divider)] py-3 px-2 w-20 font-semibold text-[var(--color-text-sub)]">지역</th>
            <th v-for="m in months" :key="m" class="border-b border-l border-[var(--color-border-divider)] py-3 px-1 w-[6%] font-semibold text-[var(--color-text-sub)]">
              {{ m }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- 작형 그룹 루프 -->
          <template v-for="(group, gIdx) in groupedTimes" :key="gIdx">
            <!-- 그룹 내 지역행 루프 -->
            <tr v-for="(row, rIdx) in group.rows" :key="`${gIdx}-${rIdx}`" class="border-b border-[var(--color-border-divider)] last:border-0 bg-white hover:bg-slate-50 transition-colors">
              
              <!-- 첫 번째 row인 경우에만 작형 셀 출력 (rowspan 적용) -->
              <td v-if="rIdx === 0" :rowspan="group.rowspan" class="border-r border-[var(--color-border-divider)] py-3 px-2 font-medium bg-[var(--color-bg-section)]">
                {{ group.croppingSystem }}
              </td>
              
              <!-- 지역 셀 -->
              <td class="border-r border-[var(--color-border-divider)] py-3 px-2 text-[var(--color-text-sub)] bg-[var(--color-bg-section)]">
                {{ row.region || '-' }}
              </td>

              <!-- 월별 타임라인 셀 -->
              <td v-for="m in months" :key="m" class="relative border-l border-[var(--color-border-divider)] p-0 h-16">
                <!-- 가이드 라인 (가운데) -->
                <div class="absolute inset-y-0 left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-[var(--color-border-divider)] z-0"></div>
                
                <div class="relative z-10 flex h-full w-full items-center justify-center">
                  <!-- 파종 -->
                  <div v-if="isMonthInRange(m, row.sowingStart, row.sowingEnd)" 
                       class="absolute left-0 right-0 top-2 mx-auto flex w-full items-center justify-center">
                    <!-- 기간 중 선 연결 -->
                    <div v-if="row.sowingStart !== row.sowingEnd" class="absolute h-[2px] w-full bg-slate-300 left-1/2"></div>
                    <div class="h-3 w-3 rounded-full bg-[var(--color-olive)] z-10" :title="`파종: ${row.sowingStart}월 ~ ${row.sowingEnd}월`"></div>
                  </div>

                  <!-- 정식 -->
                  <div v-if="isMonthInRange(m, row.plantingStart, row.plantingEnd)" 
                       class="absolute left-0 right-0 top-1/2 -translate-y-1/2 mx-auto flex w-full items-center justify-center">
                    <div v-if="row.plantingStart !== row.plantingEnd" class="absolute h-[2px] w-full bg-slate-300 right-1/2"></div>
                    <span class="text-xl font-bold leading-none text-[var(--color-purple)] z-10 mix-blend-multiply bg-white/50 px-1 rounded" :title="`정식: ${row.plantingStart}월 ~ ${row.plantingEnd}월`">×</span>
                  </div>

                  <!-- 수확 (우선순위 제일 앞) -->
                  <div v-if="isMonthInRange(m, row.harvestingStart, row.harvestingEnd)" 
                       class="absolute left-0 right-0 bottom-3 mx-auto flex w-full items-center justify-center">
                    <div v-if="row.harvestingStart !== row.harvestingEnd" class="absolute h-[2px] w-full bg-[var(--color-orange)] z-10"></div>
                    <div class="h-3 w-8 bg-[var(--color-orange)] z-20 shadow-sm" :title="`수확: ${row.harvestingStart}월 ~ ${row.harvestingEnd}월`"></div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
