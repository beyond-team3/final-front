<script setup>
import ModalBase from '@/components/common/ModalBase.vue'

defineProps({
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
</script>

<template>
  <ModalBase
    :model-value="modelValue"
    title="계약서 선택"
    width-class="max-w-4xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="overflow-hidden rounded-lg border border-slate-200">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-100 text-left text-slate-700">
          <tr>
            <th class="px-3 py-2">계약번호</th>
            <th class="px-3 py-2">거래처</th>
            <th class="px-3 py-2">기간</th>
            <th class="px-3 py-2 text-right">합계</th>
            <th class="px-3 py-2">선택</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="contract in contracts" :key="contract.id" class="border-t border-slate-100">
            <td class="px-3 py-2 font-semibold text-slate-800">{{ contract.id }}</td>
            <td class="px-3 py-2">{{ contract.client.name }}</td>
            <td class="px-3 py-2">{{ contract.startDate }} ~ {{ contract.endDate }}</td>
            <td class="px-3 py-2 text-right">{{ contract.totalAmount.toLocaleString() }}원</td>
            <td class="px-3 py-2">
              <button
                type="button"
                class="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                @click="selectContract(contract)"
              >
                선택
              </button>
            </td>
          </tr>
          <tr v-if="contracts.length === 0">
            <td colspan="5" class="px-3 py-8 text-center text-slate-400">선택 가능한 계약이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="close"
        >
          닫기
        </button>
      </div>
    </template>
  </ModalBase>
</template>
