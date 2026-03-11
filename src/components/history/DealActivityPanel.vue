<script setup>
defineProps({
    activities: {
        type: Array,
        required: true,
    },
})
</script>

<template>
    <aside class="h-full rounded-[24px] border xl:rounded-none xl:border-0 xl:border-l" :style="{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-card)' }">
        <div class="p-6">
            <div class="mb-6">
                <h3 class="text-[16px] font-bold text-[var(--color-text-strong)]">딜 활동 로그</h3>
                <p class="text-[12px] text-[var(--color-text-placeholder)]">실제 deal timeline</p>
            </div>

            <div class="space-y-4">
                <div v-for="(activity, index) in activities" :key="activity.dealLogId" class="flex gap-3">
                    <div class="flex flex-col items-center">
                        <div class="mt-1.5 h-2 w-2 rounded-full" :style="{ backgroundColor: activity.color }" />
                        <div v-if="index < activities.length - 1" class="mt-1 min-h-10 w-px flex-1 bg-[var(--color-border-divider)]" />
                    </div>

                    <div class="flex-1 pb-2">
                        <div class="mb-1 flex items-center justify-between gap-3">
                            <span class="rounded-md bg-[var(--color-bg-section)] px-2 py-0.5 text-[10px] text-[var(--color-text-body)]">{{ activity.actionLabel }}</span>
                            <span class="text-[11px] text-[var(--color-text-placeholder)]">{{ activity.actionAtText }}</span>
                        </div>
                        <p class="text-[13px] text-[var(--color-text-body)]">{{ activity.description }}</p>
                    </div>
                </div>

                <div v-if="activities.length === 0" class="text-sm text-[var(--color-text-placeholder)]">
                    아직 기록된 활동 로그가 없습니다.
                </div>
            </div>
        </div>
    </aside>
</template>
