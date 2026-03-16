<script setup>
const props = defineProps({
    steps: {
        type: Array,
        required: true,
    },
    selectedCode: {
        type: String,
        required: true,
    },
})

const emit = defineEmits(['select'])
</script>

<template>
    <div class="overflow-x-auto px-1 py-6">
        <div class="flex min-w-[860px] items-start gap-0">
            <template v-for="(step, index) in steps" :key="step.code">
                <div class="flex min-w-0 flex-1 items-center">
                    <div class="flex w-full flex-col items-center">
                        <button
                            type="button"
                            class="flex items-center justify-center rounded-full transition"
                            :disabled="step.state === 'pending'"
                            :style="{
                                minWidth: selectedCode === step.code ? '44px' : step.state === 'pending' ? '36px' : '40px',
                                height: selectedCode === step.code ? '44px' : step.state === 'pending' ? '36px' : '40px',
                                padding: '0 8px',
                                backgroundColor: step.state === 'pending' ? 'var(--color-bg-card)' : 'var(--color-olive)',
                                border: step.state === 'pending' ? '2px dashed var(--color-border-card)' : 'none',
                                color: step.state === 'pending' ? 'var(--color-text-placeholder)' : '#fff',
                                boxShadow: selectedCode === step.code ? '0 0 0 4px rgba(122, 140, 66, 0.18)' : 'none',
                            }"
                            @click="emit('select', step.code)"
                        >
                            {{ step.state === 'completed' ? '✓' : step.shortLabel }}
                        </button>

                        <div
                            class="mt-2 text-[12px]"
                            :style="{
                                color: selectedCode === step.code ? 'var(--color-text-strong)' : step.state === 'pending' ? 'var(--color-text-placeholder)' : 'var(--color-text-body)',
                                fontWeight: selectedCode === step.code ? 700 : 400,
                            }"
                        >
                            {{ step.label }}
                        </div>

                        <div
                            v-if="step.state !== 'pending'"
                            class="mt-1 rounded-md px-2 py-0.5 text-[11px]"
                            :style="{
                                backgroundColor: selectedCode === step.code ? 'var(--color-olive)' : 'var(--color-olive-light)',
                                color: selectedCode === step.code ? '#fff' : 'var(--color-olive-dark)',
                            }"
                        >
                            {{ step.documentCount ?? 0 }}건
                        </div>

                        <div v-if="selectedCode === step.code" class="mt-1 h-[3px] w-8 rounded-full bg-[var(--color-olive)]" />
                    </div>

                    <div
                        v-if="index < steps.length - 1"
                        class="mx-3 mb-[52px] h-[2px] flex-1"
                        :style="{ backgroundColor: steps[index + 1].state === 'pending' ? 'var(--color-border-card)' : 'var(--color-olive)' }"
                    />
                </div>
            </template>
        </div>
    </div>
</template>
