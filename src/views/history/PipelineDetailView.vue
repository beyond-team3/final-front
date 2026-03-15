<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import DealActivityPanel from '@/components/history/DealActivityPanel.vue'
import DealDocumentCard from '@/components/history/DealDocumentCard.vue'
import DealStageNavigator from '@/components/history/DealStageNavigator.vue'
import { useDealV2 } from '@/config/featureFlags'
import { useHistoryStore } from '@/stores/history'

const route = useRoute()
const router = useRouter()
const historyStore = useHistoryStore()

const selectedStageCode = ref('')

const deal = computed(() => historyStore.getPipelineById(route.params.id))
const allStageDocuments = computed(() => (deal.value?.documents || []).filter((document) => document.type === selectedStageCode.value))
const stageDocuments = computed(() => {
    const latestDocumentsByType = new Map()

    allStageDocuments.value.forEach((document) => {
        const current = latestDocumentsByType.get(document.type)

        if (!current || String(document.actionAt || '').localeCompare(String(current.actionAt || '')) > 0) {
            latestDocumentsByType.set(document.type, document)
        }
    })

    return [...latestDocumentsByType.values()].sort((a, b) => String(b.actionAt || '').localeCompare(String(a.actionAt || '')))
})
const stageSteps = computed(() => {
    if (!deal.value) return []

    return deal.value.steps.map((step) => ({
        ...step,
        documentCount: deal.value.documents.filter((document) => document.type === step.code).length,
    }))
})
const isPendingStage = computed(() => stageSteps.value.find((step) => step.code === selectedStageCode.value)?.state === 'pending')

watch(deal, (value) => {
    if (value) {
        selectedStageCode.value = value.latestDocType
    }
}, { immediate: true })

const goBack = () => {
    router.push({ name: 'sales-history' })
}

const openDocList = () => {
    router.push({
        name: 'sales-documents',
        query: {
            pipelineId: String(route.params.id),
            title: stageSteps.value.find((step) => step.code === selectedStageCode.value)?.label || '',
        },
    })
}

onMounted(async () => {
    if (!deal.value) {
        await historyStore.fetchPipelines()
    }

    if (route.params.id) {
        await historyStore.ensureDealLogs(String(route.params.id))
    }
})
</script>

<template>
            <section class="screen-content pipeline-detail-page">
            <section v-if="historyStore.loading" class="flex min-h-[420px] items-center justify-center">
                <LoadingSpinner text="딜 정보를 불러오는 중입니다." />
            </section>

            <ErrorMessage v-else-if="historyStore.error" :message="historyStore.error" @retry="historyStore.fetchPipelines" />

            <EmptyState
                v-else-if="!deal"
                title="딜 정보를 찾을 수 없습니다."
                description="영업 히스토리 목록에서 다시 선택해주세요."
            />

            <section v-else class="pipeline-shell">
                        <section class="pipeline-card overflow-hidden">
                        <header class="border-b bg-[var(--color-bg-card)]" :style="{ borderColor: 'var(--color-border-card)' }">
                            <div class="flex flex-col gap-4 px-5 pb-3 pt-6 md:px-8 2xl:flex-row 2xl:items-center 2xl:justify-between">
                                <div class="flex items-center gap-2 text-sm">
                                    <button type="button" class="text-[var(--color-text-sub)] hover:underline" @click="goBack">영업 히스토리</button>
                                    <span class="text-[var(--color-text-sub)]">›</span>
                                    <span class="font-bold text-[var(--color-text-strong)]">{{ deal.clientName }} DEAL #{{ deal.id }}</span>
                                </div>

                                <div class="flex gap-2">
                                    <span v-if="useDealV2()" class="rounded-full border border-[#C8622A] bg-[#FFF3EB] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[#C8622A]">V2 TEST</span>
                                    <button type="button" class="btn" style="background: var(--color-orange); color: #fff;">딜 종료</button>
                                </div>
                            </div>

                            <div class="flex flex-col gap-5 px-5 pb-5 md:px-8 2xl:flex-row 2xl:items-center 2xl:justify-between">
                                <div class="flex flex-wrap items-center gap-3">
                                    <h2 class="text-[28px] font-bold text-[var(--color-text-strong)]">{{ deal.clientName }}</h2>
                                    <span class="rounded-md bg-[var(--color-bg-section)] px-2 py-1 text-[12px] text-[var(--color-text-sub)]">DEAL #{{ deal.id }}</span>
                                    <span class="rounded-md bg-[var(--color-olive-light)] px-2 py-1 text-[12px] text-[var(--color-olive-dark)]">{{ deal.currentStatusLabel }}</span>
                                </div>

                                <div class="flex flex-wrap items-center gap-5 text-sm">
                                    <div>
                                        <div class="text-[12px] text-[var(--color-text-sub)]">담당자</div>
                                        <div class="mt-1 text-[var(--color-text-strong)]">{{ deal.ownerEmpName }}</div>
                                    </div>
                                    <div>
                                        <div class="text-[12px] text-[var(--color-text-sub)]">최근 활동</div>
                                        <div class="mt-1 text-[var(--color-text-strong)]">{{ deal.lastActivityText }}</div>
                                    </div>
                                    <div>
                                        <div class="text-[12px] text-[var(--color-text-sub)]">현재 문서 단계</div>
                                        <div class="mt-1 font-semibold text-[var(--color-olive)]">{{ deal.latestDocTypeLabel }}</div>
                                    </div>
                                </div>
                            </div>
                        </header>
                        </section>

                        <section class="pipeline-card">
                        <DealStageNavigator :steps="stageSteps" :selected-code="selectedStageCode" @select="selectedStageCode = $event" />
                        </section>

                        <section class="pipeline-card p-5 md:p-6">
                                <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div class="flex items-center gap-3">
                                        <h3 class="text-2xl font-semibold text-[var(--color-text-strong)]">
                                            {{ stageSteps.find((step) => step.code === selectedStageCode)?.label || '-' }}
                                        </h3>
                                        <p class="text-xs text-[var(--color-text-sub)]">총 {{ allStageDocuments.length }}건</p>
                                    </div>

                                    <button type="button" class="btn btn-primary" @click="openDocList">더보기</button>
                                </div>

                            <section v-if="historyStore.logsLoading" class="pipeline-card flex justify-center py-12">
                                <LoadingSpinner text="딜 타임라인을 불러오는 중입니다." />
                            </section>

                            <section
                                v-else-if="isPendingStage"
                                class="pipeline-card border-dashed px-6 py-12 text-center"
                                :style="{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-card)' }"
                            >
                                <div class="text-lg font-semibold text-[var(--color-text-strong)]">아직 진행되지 않은 단계입니다.</div>
                                <div class="mt-2 text-sm text-[var(--color-text-sub)]">현재 단계 이전 문서가 완료되면 이 구간의 로그가 기록됩니다.</div>
                            </section>

                            <section
                                v-else-if="stageDocuments.length === 0"
                                class="pipeline-card border-dashed px-6 py-12 text-center"
                                :style="{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-card)' }"
                            >
                                <div class="text-lg font-semibold text-[var(--color-text-strong)]">해당 단계의 문서가 없습니다.</div>
                                <div class="mt-2 text-sm text-[var(--color-text-sub)]">실제 API 로그가 쌓이면 이 영역에 반영됩니다.</div>
                            </section>

                            <div v-else>
                                <div class="space-y-4">
                                <DealDocumentCard v-for="document in stageDocuments" :key="document.documentKey" :document="document" />
                                </div>
                            </div>
                        </section>

                <section class="pipeline-card pipeline-log-card">
                    <DealActivityPanel :activities="deal.timeline" />
                </section>
            </section>
            </section>
</template>

<style scoped>
.pipeline-detail-page {
    background: var(--color-surface);
}

.pipeline-shell {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

.pipeline-card {
    border: 1px solid var(--color-border-card);
    border-radius: 16px;
    background: var(--color-bg-card);
    box-shadow: 0 1px 3px rgba(61, 53, 41, 0.06);
}

.pipeline-log-card {
    overflow: hidden;
}

.pipeline-log-card :deep(aside) {
    border: 0;
    border-radius: 0;
    background: transparent;
}

.pipeline-log-card :deep(.p-6) {
    max-height: 360px;
    overflow-y: auto;
}
</style>
