<script setup>
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatCurrency } from '@/utils/dealHistory'

defineProps({
    document: {
        type: Object,
        required: true,
    },
})
</script>

<template>
    <article
        class="relative flex flex-col gap-4 rounded-[20px] border px-6 py-5 lg:flex-row lg:items-center"
        :style="{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-card)' }"
    >
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-section)] text-xl text-[var(--color-olive)]">
            ⎘
        </div>

        <div class="min-w-0 flex-1">
            <div class="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center">
                <span class="text-[12px] text-[var(--color-text-sub)]">{{ document.targetCode }}</span>
                <span class="truncate text-[15px] font-bold text-[var(--color-text-strong)]">{{ document.typeLabel }}</span>
                <StatusBadge class="lg:ml-auto" :label="document.statusLabel" :status="document.status" />
            </div>

            <div class="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-sub)]">
                <span>{{ document.actionAtText }}</span>
                <span class="rounded-md bg-[var(--color-bg-section)] px-2 py-0.5 text-[11px]">{{ document.actionLabel }}</span>
                <span>금액 {{ formatCurrency(document.amount) }}</span>
            </div>
        </div>
    </article>
</template>
