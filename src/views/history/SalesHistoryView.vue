<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CdrButton, IconSort } from '@rei/cedar'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import DealHistoryRow from '@/components/history/DealHistoryRow.vue'
import DealSummaryPanel from '@/components/history/DealSummaryPanel.vue'
import { useDealV2 } from '@/config/featureFlags'
import { useHistoryStore } from '@/stores/history'

const router = useRouter()
const historyStore = useHistoryStore()

const searchKeyword = ref('')
const selectedClient = ref('전체')
const selectedStage = ref('전체')
const sortType = ref('lastActivity')
const selectedDealId = ref('')
const summaryVisible = ref(true)
const showSortMenu = ref(false)

const pipelines = computed(() => historyStore.pipelinesForView)

const clientOptions = computed(() => ['전체', ...new Set(pipelines.value.map((deal) => deal.clientName).filter(Boolean))])
const stageOptions = computed(() => ['전체', ...new Set(pipelines.value.map((deal) => deal.latestDocTypeLabel))])
const totalDeals = computed(() => filteredDeals.value.length)
const selectedSortLabel = computed(() => {
    if (sortType.value === 'stage') return '단계 높은순'
    if (sortType.value === 'client') return '거래처명순'
    return '최신순'
})
const showDealV2 = computed(() => useDealV2())
const dealKpiCards = computed(() => {
    const kpis = historyStore.dealKpis || {}

    return [
        { key: 'dealCount', label: '전체 Deal', value: Number(kpis.dealCount ?? 0) },
        { key: 'openDealCount', label: '진행중', value: Number(kpis.openDealCount ?? 0) },
        { key: 'closedDealCount', label: '종결', value: Number(kpis.closedDealCount ?? 0) },
        { key: 'successRate', label: '성공률', value: `${Number(kpis.successRate ?? 0).toFixed(1)}%` },
    ]
})

const filteredDeals = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()

    return [...pipelines.value]
        .filter((deal) => {
            const matchesKeyword = !keyword
                || deal.ownerEmpName.toLowerCase().includes(keyword)
                || String(deal.id).toLowerCase().includes(keyword)
                || String(deal.latestTargetCode || '').toLowerCase().includes(keyword)
            const matchesClient = selectedClient.value === '전체' || deal.clientName === selectedClient.value
            const matchesStage = selectedStage.value === '전체' || deal.latestDocTypeLabel === selectedStage.value
            return matchesKeyword && matchesClient && matchesStage
        })
        .sort((a, b) => {
            if (sortType.value === 'stage') return b.stageOrder - a.stageOrder
            if (sortType.value === 'client') return a.clientName.localeCompare(b.clientName, 'ko')
            return String(b.lastActivityAt || '').localeCompare(String(a.lastActivityAt || ''))
        })
})

const selectedDeal = computed(() => {
    if (!summaryVisible.value) return null
    return filteredDeals.value.find((deal) => String(deal.id) === String(selectedDealId.value)) || filteredDeals.value[0] || null
})

watch(filteredDeals, (deals) => {
    if (!deals.some((deal) => String(deal.id) === String(selectedDealId.value))) {
        selectedDealId.value = deals[0]?.id || ''
    }
    if (deals.length > 0) {
        summaryVisible.value = true
    }
}, { immediate: true })

watch(selectedDeal, (deal) => {
    if (deal?.id) {
        void historyStore.ensureDealLogs(deal.id)
    }
}, { immediate: true })

const openDetail = (dealId) => {
    router.push({ name: 'pipeline-detail', params: { id: dealId } })
}

const previewDetail = (dealId) => {
    selectedDealId.value = dealId
    summaryVisible.value = true
}

const applySortType = (nextSortType) => {
    sortType.value = nextSortType
    showSortMenu.value = false
}

const closeSortMenu = () => {
    showSortMenu.value = false
}

onMounted(() => {
    document.addEventListener('click', closeSortMenu)
    void historyStore.fetchPipelines()
    if (useDealV2()) {
        void historyStore.fetchDealKpis()
    }
})

onBeforeUnmount(() => {
    document.removeEventListener('click', closeSortMenu)
})
</script>

<template>
            <section
                class="screen-content sales-history-page"
                :style="{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }"
            >
            <section v-if="historyStore.loading" class="flex min-h-[420px] items-center justify-center">
                <LoadingSpinner text="영업 히스토리를 불러오는 중입니다." />
            </section>

            <ErrorMessage v-else-if="historyStore.error" :message="historyStore.error" @retry="historyStore.fetchPipelines" />

            <template v-else>
                <header class="mb-6 border-b border-[var(--color-border-divider)] pb-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                        <h1 class="text-2xl font-semibold text-[var(--color-text-strong)]">영업 히스토리</h1>
                        <p class="mt-1 text-xs text-[var(--color-text-sub)]">총 {{ totalDeals }}건</p>
                        </div>
                        <span v-if="showDealV2" class="rounded-full border border-[#C8622A] bg-[#FFF3EB] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[#C8622A]">V2 TEST</span>
                    </div>
                </header>

                <section
                    v-if="showDealV2"
                    class="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                >
                    <article
                        v-for="card in dealKpiCards"
                        :key="card.key"
                        class="rounded-[18px] border px-5 py-4"
                        :style="{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-card)' }"
                    >
                        <p class="text-[12px] text-[var(--color-text-sub)]">{{ card.label }}</p>
                        <p class="mt-2 text-[28px] font-bold text-[var(--color-text-strong)]">{{ card.value }}</p>
                    </article>
                </section>

                <section
                    class="mb-5 rounded-[20px] border px-5 py-4"
                    :style="{ backgroundColor: 'var(--color-bg-section)', borderColor: 'var(--color-border-card)' }"
                >
                    <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <label class="block xl:w-[320px]">
                            <input
                                v-model="searchKeyword"
                                type="text"
                                placeholder="담당자명, deal 번호, 문서코드 검색"
                                class="w-full rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-strong)] outline-none"
                            >
                        </label>

                        <select v-model="selectedClient" class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-body)] outline-none">
                            <option v-for="client in clientOptions" :key="client" :value="client">{{ client === '전체' ? '거래처 전체' : client }}</option>
                        </select>

                        <select v-model="selectedStage" class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-body)] outline-none">
                            <option v-for="stage in stageOptions" :key="stage" :value="stage">{{ stage === '전체' ? '단계 전체' : stage }}</option>
                        </select>

                        <div class="relative xl:ml-auto" @click.stop>
                            <CdrButton
                                type="button"
                                modifier="secondary"
                                icon-only
                                with-background
                                class="filter-icon-btn"
                                :aria-expanded="showSortMenu"
                                :aria-label="`정렬 선택 (${selectedSortLabel})`"
                                @click="showSortMenu = !showSortMenu"
                            >
                                <IconSort />
                            </CdrButton>
                            <div v-if="showSortMenu" class="filter-dropdown" @click.stop>
                                <button type="button" class="filter-dropdown-item" :class="{ active: sortType === 'lastActivity' }" @click="applySortType('lastActivity')">
                                    최신순
                                </button>
                                <button type="button" class="filter-dropdown-item" :class="{ active: sortType === 'stage' }" @click="applySortType('stage')">
                                    단계 높은순
                                </button>
                                <button type="button" class="filter-dropdown-item" :class="{ active: sortType === 'client' }" @click="applySortType('client')">
                                    거래처명순
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="filteredDeals.length === 0">
                    <EmptyState title="조회된 deal이 없습니다." description="검색 조건을 조정하거나 deal 데이터가 생성되었는지 확인해주세요." />
                </section>

                <section v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div class="space-y-3">
                        <DealHistoryRow
                            v-for="deal in filteredDeals"
                            :key="deal.id"
                            :deal="deal"
                            :selected="selectedDeal && String(selectedDeal.id) === String(deal.id)"
                            @preview="previewDetail"
                            @open-detail="openDetail"
                        />
                    </div>

                    <DealSummaryPanel
                        v-if="selectedDeal"
                        :deal="selectedDeal"
                        @close="summaryVisible = false"
                        @open-detail="openDetail"
                    />
                </section>
            </template>
            </section>
</template>

<style scoped>
.sales-history-page {
    box-shadow: 0 1px 3px rgba(61, 53, 41, 0.06);
}

.filter-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    min-width: 44px;
    min-height: 44px;
    height: 44px;
    padding: 0;
    border-radius: 10px;
    border: none;
    background: rgba(122, 140, 66, 0.28);
    color: var(--color-olive-dark);
    box-shadow: none;
    transition: background 0.2s ease, color 0.2s ease;
}

.filter-icon-btn:hover,
.filter-icon-btn:focus {
    background: var(--color-olive);
    color: #fff;
}

.filter-icon-btn:active {
    background: var(--color-olive-dark);
    color: #fff;
}

.filter-icon-btn :deep(svg) {
    width: 20px;
    height: 20px;
    margin: 0;
    fill: currentColor;
}

.filter-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 40;
    min-width: 130px;
    padding: 6px;
    border-radius: 10px;
    border: 1px solid var(--color-border-card);
    background: var(--color-bg-input);
    box-shadow: 0 6px 16px rgba(61, 53, 41, 0.12);
}

.filter-dropdown-item {
    width: 100%;
    border: none;
    background: transparent;
    border-radius: 8px;
    padding: 7px 9px;
    font-size: 12px;
    color: var(--color-text-body);
    text-align: left;
    cursor: pointer;
}

.filter-dropdown-item:hover {
    background: var(--color-bg-section);
    color: var(--color-text-strong);
}

.filter-dropdown-item.active {
    background: var(--color-olive-light);
    color: var(--color-olive-dark);
    font-weight: 700;
}
</style>
