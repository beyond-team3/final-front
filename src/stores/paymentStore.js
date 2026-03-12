import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPayments, getMyPayments, processPayment } from '@/api/payment'

export const usePaymentStore = defineStore('payment', () => {
    // State
    const payments = ref([])
    const currentPayment = ref(null)
    const loading = ref(false)
    const error = ref(null)

    // Computed
    const allPayments = computed(() => payments.value)

    const pendingPayments = computed(() =>
        payments.value.filter(p => p.status === 'PENDING')
    )

    const completedPayments = computed(() =>
        payments.value.filter(p => p.status !== 'PENDING')
    )

    const totalPendingAmount = computed(() =>
        pendingPayments.value.reduce((sum, p) => sum + p.paymentAmount, 0)
    )

    // Actions
    /**
     * 전체 결제 목록 조회
     */
    const fetchPayments = async (params = {}) => {
        loading.value = true
        error.value = null
        try {
            const response = await getPayments(params)
            if (response.data.result === 'SUCCESS') {
                payments.value = response.data.data
                return response.data.data
            } else {
                error.value = response.data.error?.message || '결제 목록 조회 실패'
                return null
            }
        } catch (err) {
            error.value = err.message || '결제 목록 조회 중 오류 발생'
            console.error('Payment fetch error:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    /**
     * 현재 사용자(거래처) 결제 목록 조회
     */
    const fetchMyPayments = async (params = {}) => {
        loading.value = true
        error.value = null
        try {
            const response = await getMyPayments(params)
            if (response.data.result === 'SUCCESS') {
                payments.value = response.data.data
                return response.data.data
            } else {
                error.value = response.data.error?.message || '결제 목록 조회 실패'
                return null
            }
        } catch (err) {
            error.value = err.message || '결제 목록 조회 중 오류 발생'
            console.error('MyPayments fetch error:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    /**
     * 결제 단건 조회
     */
    const fetchPaymentDetail = async (paymentId) => {
        loading.value = true
        error.value = null
        try {
            const response = await getPayments({ paymentId })
            if (response.data.result === 'SUCCESS') {
                currentPayment.value = response.data.data
                return response.data.data
            } else {
                error.value = response.data.error?.message || '결제 조회 실패'
                return null
            }
        } catch (err) {
            error.value = err.message || '결제 조회 중 오류 발생'
            console.error('Payment detail fetch error:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    /**
     * 결제 처리
     * @param {Object} paymentData - { invoiceId, paymentMethod }
     */
    const executePayment = async (paymentData) => {
        loading.value = true
        error.value = null
        try {
            const response = await processPayment(paymentData)
            if (response.data.result === 'SUCCESS') {
                const newPayment = response.data.data
                payments.value.push(newPayment)
                currentPayment.value = newPayment
                return newPayment
            } else {
                error.value = response.data.error?.message || '결제 처리 실패'
                return null
            }
        } catch (err) {
            error.value = err.message || '결제 처리 중 오류 발생'
            console.error('Payment execution error:', err)
            return null
        } finally {
            loading.value = false
        }
    }

    /**
     * 현재 결제 정보 초기화
     */
    const clearCurrentPayment = () => {
        currentPayment.value = null
    }

    /**
     * 에러 초기화
     */
    const clearError = () => {
        error.value = null
    }

    /**
     * 결제 상태 업데이트 (낙관적 업데이트)
     */
    const updatePaymentStatus = (paymentId, status) => {
        const payment = payments.value.find(p => p.paymentId === paymentId)
        if (payment) {
            payment.status = status
        }
    }

    return {
        // State
        payments,
        currentPayment,
        loading,
        error,

        // Computed
        allPayments,
        pendingPayments,
        completedPayments,
        totalPendingAmount,

        // Actions
        fetchPayments,
        fetchMyPayments,
        fetchPaymentDetail,
        executePayment,
        clearCurrentPayment,
        clearError,
        updatePaymentStatus,
    }
})