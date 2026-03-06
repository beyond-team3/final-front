<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  contracts: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'select'])

const close = () => emit('update:modelValue', false)
const selectContract = (contract) => {
  emit('select', contract)
  close()
}

const onEsc = (event) => {
  if (event.key === 'Escape' && props.modelValue) close()
}

onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))
</script>

<template>
  <Teleport to="body">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="close"
    >
      <div class="flex w-full max-w-2xl flex-col rounded-lg border shadow-2xl" style="background-color: #F7F3EC; border-color: #DDD7CE; max-height: calc(100vh - 80px);">

        <!-- 헤더 -->
        <div class="flex items-center justify-between rounded-t-lg px-6 py-4" style="background-color: #C8622A;">
          <div>
            <h3 class="text-base font-bold text-white">계약서 선택</h3>
            <p class="mt-0.5 text-xs" style="color: rgba(255,255,255,0.75);">주문서는 체결된 계약서를 기반으로 작성됩니다.</p>
          </div>
          <button
              type="button"
              class="text-2xl font-bold text-white hover:opacity-75 transition-opacity"
              aria-label="닫기"
              @click="close"
          >×</button>
        </div>

        <!-- 바디 -->
        <div class="flex-1 overflow-y-auto p-5">
          <div class="overflow-hidden rounded border" style="border-color: #DDD7CE;">
            <table class="min-w-full text-sm border-collapse">
              <thead>
              <tr class="text-left" style="background-color: #EFEADF; color: #6B5F50;">
                <th class="px-4 py-2.5">계약 번호</th>
                <th class="px-4 py-2.5">계약 기간</th>
                <th class="px-4 py-2.5">담당 영업사원</th>
                <th class="px-4 py-2.5">상태</th>
                <th class="px-4 py-2.5"></th>
              </tr>
              </thead>
              <tbody>
              <tr
                  v-for="contract in contracts"
                  :key="contract.id"
                  class="group border-t transition-colors"
                  style="border-color: var(--color-border-divider);"
              >
                <td
                    class="px-4 py-3 font-bold group-hover:bg-[#FAF7F3]"
                    style="color: #C8622A;"
                >
                  {{ contract.contractCode || contract.id }}
                </td>

                <td
                    class="px-4 py-3 group-hover:bg-[#FAF7F3]"
                    style="color: #6B5F50;"
                >
                  {{ contract.startDate }} ~ {{ contract.endDate }}
                </td>

                <td
                    class="px-4 py-3 group-hover:bg-[#FAF7F3]"
                    style="color: #6B5F50;"
                >
                  {{ contract.salesRepName || contract.salesRep?.name || '-' }}
                </td>

                <td class="px-4 py-3 group-hover:bg-[#FAF7F3]">
      <span
          class="rounded-full px-2 py-0.5 text-xs font-bold"
          style="background-color: #C8D4A0; color: #3D3529;"
      >
        체결
      </span>
                </td>

                <td class="px-4 py-3 group-hover:bg-[#FAF7F3]">
                  <button
                      type="button"
                      class="rounded px-3 py-1 text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
                      style="background-color: #C8622A;"
                      @click="selectContract(contract)"
                  >
                    선택
                  </button>
                </td>
              </tr>

              <tr v-if="contracts.length === 0">
                <td
                    colspan="5"
                    class="px-4 py-10 text-center italic"
                    style="color: #BFB3A5;"
                >
                  선택 가능한 계약이 없습니다.
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 푸터 -->
        <div class="flex justify-end border-t px-6 py-3" style="border-color: #E8E3D8; background-color: #EFEADF;">
          <button
              type="button"
              class="rounded border px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90"
              style="border-color: #DDD7CE; background-color: transparent; color: #6B5F50;"
              @click="close"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #F7F3EC; }
::-webkit-scrollbar-thumb { background: #DDD7CE; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #C8622A; }
button:active { transform: scale(0.98); }
</style>