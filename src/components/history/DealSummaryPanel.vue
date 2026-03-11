<script setup>
import { computed } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatCurrency } from '@/utils/dealHistory'

const props = defineProps({
    deal: {
        type: Object,
        required: true,
    },
})

const emit = defineEmits(['close', 'open-detail'])

const progress = computed(() => Math.round((props.deal.stageOrder / props.deal.steps.length) * 100))
</script>

<template>
    <aside
        class="w-full rounded-[24px] border xl:sticky xl:top-6 xl:h-fit xl:w-[360px]"
        :style="{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-card)' }"
    >
        <div class="p-6">
            <div class="mb-6 flex items-start justify-between gap-4">
                <div>
                    <div class="text-[12px] text-[var(--color-text-sub)]">딜 요약</div>
                    <h3 class="mt-2 text-[18px] font-bold text-[var(--color-text-strong)]">{{ deal.clientName }}</h3>
                </div>
                <button type="button" class="text-xl text-[var(--color-text-sub)]" @click="emit('close')">×</button>
            </div>

            <div class="mb-6 flex items-center gap-2">
                <span class="rounded-md bg-[var(--color-bg-section)] px-2 py-1 text-[11px] text-[var(--color-text-sub)]">DEAL #{{ deal.id }}</span>
                <StatusBadge :label="deal.currentStatusLabel" :status="deal.currentStatus" />
            </div>

            <div class="mb-6 rounded-[20px] bg-[var(--color-bg-section)] p-5">
                <div class="mb-4 flex items-end justify-between">
                    <div>
                        <div class="text-[12px] text-[var(--color-text-sub)]">진행률</div>
                        <div class="text-[30px] font-bold text-[var(--color-text-strong)]">{{ progress }}%</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[12px] text-[var(--color-text-sub)]">현재 단계</div>
                        <div class="text-sm font-semibold text-[var(--color-olive)]">{{ deal.latestDocTypeLabel }}</div>
                    </div>
                </div>

                <div class="h-3 overflow-hidden rounded-full bg-[var(--color-border-divider)]">
                    <div class="h-full rounded-full bg-[var(--color-olive)]" :style="{ width: `${progress}%` }" />
                </div>
            </div>

            <section class="mb-4 rounded-[20px] bg-[var(--color-bg-section)] p-4">
                <dl class="space-y-3 text-[13px]">
                    <div class="flex justify-between gap-4">
                        <dt class="text-[var(--color-text-sub)]">담당자</dt>
                        <dd class="text-right text-[var(--color-text-strong)]">{{ deal.ownerEmpName }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                        <dt class="text-[var(--color-text-sub)]">최근 활동</dt>
                        <dd class="text-right text-[var(--color-text-strong)]">{{ deal.lastActivityText }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                        <dt class="text-[var(--color-text-sub)]">마지막 코드</dt>
                        <dd class="text-right text-[var(--color-text-strong)]">{{ deal.latestTargetCode || '-' }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                        <dt class="text-[var(--color-text-sub)]">예상 금액</dt>
                        <dd class="text-right text-[var(--color-text-strong)]">{{ formatCurrency(deal.latestAmount) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                        <dt class="text-[var(--color-text-sub)]">문서 수</dt>
                        <dd class="text-right text-[var(--color-text-strong)]">{{ deal.documentCount }}건</dd>
                    </div>
                </dl>
            </section>

            <section class="mb-4 rounded-[20px] bg-[var(--color-bg-input)] p-4">
                <div class="mb-3 text-[13px] text-[var(--color-text-sub)]">최근 문서</div>
                <div class="space-y-3">
                    <div v-for="document in deal.summaryDocuments" :key="document.documentKey" class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-[12px] text-[var(--color-text-sub)]">{{ document.targetCode }}</div>
                            <div class="truncate text-[13px] text-[var(--color-text-strong)]">{{ document.typeLabel }}</div>
                        </div>
                        <StatusBadge :label="document.statusLabel" :status="document.status" />
                    </div>

                    <div v-if="deal.summaryDocuments.length === 0" class="text-sm text-[var(--color-text-placeholder)]">
                        연결된 문서 정보가 아직 없습니다.
                    </div>
                </div>
            </section>

            <section class="rounded-[20px] bg-[var(--color-bg-input)] p-4">
                <div class="mb-3 text-[13px] text-[var(--color-text-sub)]">최근 활동</div>
                <div class="space-y-3">
                    <div v-for="item in deal.timelinePreview" :key="item.dealLogId" class="flex gap-3">
                        <div class="mt-1.5 h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" />
                        <div class="min-w-0 flex-1">
                            <div class="text-[13px] text-[var(--color-text-strong)]">{{ item.description }}</div>
                            <div class="text-[11px] text-[var(--color-text-placeholder)]">{{ item.actionAtText }}</div>
                        </div>
                    </div>

                    <div v-if="deal.timelinePreview.length === 0" class="text-sm text-[var(--color-text-placeholder)]">
                        활동 로그를 불러오는 중이거나 아직 없습니다.
                    </div>
                </div>
            </section>

            <button type="button" class="btn btn-primary mt-6 w-full" @click="emit('open-detail', deal.id)">
                상세 히스토리 보기
            </button>
        </div>
    </aside>
</template>
