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

const onEsc = (e) => {
  if (e.key === 'Escape' && props.modelValue) close()
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
      <div
          class="flex w-full max-w-2xl flex-col rounded-lg border border-[#DDD7CE] bg-[#F7F3EC] shadow-2xl"
          style="max-height: calc(100vh - 80px)"
      >

        <!-- header -->
        <div class="flex items-center justify-between rounded-t-lg bg-[#C8622A] px-6 py-4">
          <div>
            <h3 class="text-base font-bold text-white">계약서 선택</h3>
            <p class="mt-0.5 text-xs text-white/70">
              주문서는 체결된 계약서를 기반으로 작성됩니다.
            </p>
          </div>

          <button
              class="text-2xl font-bold text-white transition hover:opacity-70"
              aria-label="닫기"
              @click="close"
          >
            ×
          </button>
        </div>

        <!-- body -->
        <div class="flex-1 overflow-y-auto p-5">
          <div class="overflow-hidden rounded border border-[#DDD7CE]">
            <table class="min-w-full text-sm">

              <!-- table head -->
              <thead class="bg-[#EFEADF] text-[#6B5F50]">
              <tr class="text-left">
                <th class="px-4 py-2.5">계약 번호</th>
                <th class="px-4 py-2.5">계약 기간</th>
                <th class="px-4 py-2.5">담당 영업사원</th>
                <th class="px-4 py-2.5">상태</th>
                <th class="px-4 py-2.5"></th>
              </tr>
              </thead>

              <!-- table body -->
              <tbody>
              <tr
                  v-for="contract in contracts"
                  :key="contract.id"
                  class="border-t border-[#E8E3D8] transition hover:bg-[#FAF7F3]"
              >
                <td class="px-4 py-3 font-bold text-[#C8622A]">
                  {{ contract.contractCode || contract.id }}
                </td>

                <td class="px-4 py-3 text-[#6B5F50]">
                  {{ contract.startDate }} ~ {{ contract.endDate }}
                </td>

                <td class="px-4 py-3 text-[#6B5F50]">
                  {{ contract.salesRepName || contract.salesRep?.name || '-' }}
                </td>

                <td class="px-4 py-3">
                    <span class="rounded-full bg-[#C8D4A0] px-2 py-0.5 text-xs font-bold text-[#3D3529]">
                      체결
                    </span>
                </td>

                <td class="px-4 py-3">
                  <button
                      class="rounded bg-[#C8622A] px-3 py-1 text-xs font-bold text-white transition hover:opacity-90 active:scale-95"
                      @click="selectContract(contract)"
                  >
                    선택
                  </button>
                </td>
              </tr>

              <!-- empty -->
              <tr v-if="contracts.length === 0">
                <td
                    colspan="5"
                    class="px-4 py-10 text-center italic text-[#BFB3A5]"
                >
                  선택 가능한 계약이 없습니다.
                </td>
              </tr>
              </tbody>

            </table>
          </div>
        </div>

        <!-- footer -->
        <div class="flex justify-end border-t border-[#E8E3D8] bg-[#EFEADF] px-6 py-3">
          <button
              class="rounded border border-[#DDD7CE] px-4 py-2 text-sm font-semibold text-[#6B5F50] transition hover:opacity-90"
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
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f7f3ec;
}

::-webkit-scrollbar-thumb {
  background: #ddd7ce;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #c8622a;
}
</style>
