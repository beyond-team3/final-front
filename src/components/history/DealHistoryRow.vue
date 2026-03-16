<script setup>
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps({
    deal: {
        type: Object,
        required: true,
    },
    selected: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['preview', 'open-detail'])

const previewDeal = () => emit('preview', props.deal.id)
const openDetail = () => emit('open-detail', props.deal.id)
</script>

<template>
    <div
        role="button"
        tabindex="0"
        class="group relative w-full overflow-hidden rounded-[20px] border text-left transition duration-200 hover:-translate-y-0.5"
        :style="{
            backgroundColor: selected ? 'var(--color-bg-section)' : 'var(--color-bg-card)',
            borderColor: 'var(--color-border-card)',
            boxShadow: selected ? 'var(--shadow-md)' : 'none',
        }"
        @click="previewDeal"
        @focus="previewDeal"
        @dblclick="openDetail"
        @keydown.enter="openDetail"
        @keydown.space.prevent="previewDeal"
    >
        <div class="flex flex-col gap-5 px-6 py-5 pl-8 2xl:flex-row 2xl:items-center">
            <div class="2xl:w-[260px] 2xl:flex-shrink-0">
                <div class="mb-1 text-[15px] font-bold text-[var(--color-text-strong)]">{{ deal.clientName }}</div>
                <div class="mb-3 inline-flex rounded-md bg-[var(--color-bg-section)] px-2 py-0.5 text-[11px] text-[var(--color-text-sub)]">
                    DEAL #{{ deal.id }}
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-olive-light)] text-xs font-bold text-[var(--color-olive-dark)]">
                        {{ deal.ownerInitial }}
                    </div>
                    <span class="text-[13px] text-[var(--color-text-sub)]">{{ deal.ownerEmpName }}</span>
                </div>
            </div>

            <div class="flex-1">
                <div class="flex items-center gap-2 overflow-x-auto pb-1">
                    <template v-for="(step, index) in deal.steps" :key="step.code">
                        <div class="flex flex-col items-center gap-2">
                            <div
                                class="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[11px] font-semibold"
                                :style="{
                                    backgroundColor: step.state === 'pending' ? 'var(--color-border-divider)' : 'var(--color-olive)',
                                    color: step.state === 'pending' ? 'var(--color-text-sub)' : '#fff',
                                }"
                            >
                                {{ step.shortLabel }}
                            </div>
                        </div>

                        <div
                            v-if="index < deal.steps.length - 1"
                            class="h-1 min-w-8 flex-1 rounded-full"
                            :style="{ backgroundColor: deal.steps[index + 1].state === 'pending' ? 'var(--color-border-card)' : 'var(--color-olive)' }"
                        />
                    </template>
                </div>
            </div>

            <div class="flex flex-col items-start gap-1 2xl:w-[220px] 2xl:flex-shrink-0 2xl:items-end">
                <div class="line-clamp-1 text-[12px] italic text-[var(--color-text-sub)]">{{ deal.summaryMemo || deal.latestActivityText }}</div>
                <div class="text-[11px] text-[var(--color-text-placeholder)]">{{ deal.lastActivityAgo }}</div>
                <div class="mt-1 flex items-center gap-2">
                    <StatusBadge :label="deal.currentStatusLabel" :status="deal.currentStatus" />
                    <span class="text-sm text-[var(--color-text-sub)]">›</span>
                </div>
            </div>
        </div>
    </div>
</template>
