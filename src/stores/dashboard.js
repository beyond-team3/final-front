import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAdminDashboard, getClientDashboard, getSalesRepDashboard } from '@/api/dashboard'

// ── 영업사원 대시보드 ────────────────────────────────────────────────────────
export const useSalesRepDashboardStore = defineStore('salesRepDashboard', () => {
    const data    = ref(null)
    const loading = ref(false)
    const error   = ref('')

    async function fetch() {
        if (loading.value) return
        loading.value = true
        error.value   = ''
        try {
            data.value = await getSalesRepDashboard()
        } catch (e) {
            error.value = e?.response?.data?.message || e?.message || '영업 대시보드를 불러오지 못했습니다.'
        } finally {
            loading.value = false
        }
    }

    function reset() {
        data.value    = null
        error.value   = ''
        loading.value = false
    }

    return { data, loading, error, fetch, reset }
})

// ── 관리자 대시보드 ─────────────────────────────────────────────────────────
export const useAdminDashboardStore = defineStore('adminDashboard', () => {
    const data    = ref(null)
    const loading = ref(false)
    const error   = ref('')

    async function fetch() {
        if (loading.value) return
        loading.value = true
        error.value   = ''
        try {
            data.value = await getAdminDashboard()
        } catch (e) {
            error.value = e?.response?.data?.message || e?.message || '관리자 대시보드를 불러오지 못했습니다.'
        } finally {
            loading.value = false
        }
    }

    function reset() {
        data.value    = null
        error.value   = ''
        loading.value = false
    }

    return { data, loading, error, fetch, reset }
})

// ── 거래처 대시보드 ─────────────────────────────────────────────────────────
export const useClientDashboardStore = defineStore('clientDashboard', () => {
    const data    = ref(null)
    const loading = ref(false)
    const error   = ref('')

    async function fetch() {
        if (loading.value) return
        loading.value = true
        error.value   = ''
        try {
            data.value = await getClientDashboard()
        } catch (e) {
            error.value = e?.response?.data?.message || e?.message || '거래처 대시보드를 불러오지 못했습니다.'
        } finally {
            loading.value = false
        }
    }

    function reset() {
        data.value    = null
        error.value   = ''
        loading.value = false
    }

    return { data, loading, error, fetch, reset }
})