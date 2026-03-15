import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as authApi from '@/api/auth'

const ROLE_KEY = 'currentRole'
const TOKEN_KEY = 'token'

export const useAuthStore = defineStore('auth', () => {
    const currentRole = ref(localStorage.getItem(ROLE_KEY) || null)
    const token = ref(localStorage.getItem(TOKEN_KEY) || null)
    const me = ref(null)
    const loading = ref(false)
    const error = ref(null)

    const setRole = (role) => {
        currentRole.value = role
        role ? localStorage.setItem(ROLE_KEY, role) : localStorage.removeItem(ROLE_KEY)
    }

    const setToken = (nextToken) => {
        token.value = nextToken
        nextToken ? localStorage.setItem(TOKEN_KEY, nextToken) : localStorage.removeItem(TOKEN_KEY)
    }

    async function login({ loginId, password }) {
        loading.value = true
        error.value = null

        try {
            // 실제 백엔드 API 호출 (백엔드 스펙에 맞춰 loginPw로 전송)
            const response = await authApi.login({ loginId, loginPw: password })

            // 백엔드가 ApiResult<TokenResponse> 형식을 반환한다고 가정
            // response.data가 TokenResponse (accessToken, refreshToken 등) 일 것
            const { accessToken } = response.data

            if (!accessToken) {
                throw new Error('인증 토큰이 유효하지 않습니다.')
            }

            setToken(accessToken)
            // 백엔드가 이제 TokenResponse에 role을 포함시킴
            const role = response.data.role
            if (role) {
                setRole(role)
            }

            // 상세 정보 조회 (me)를 통해 실제 프로필 정보를 가져옴
            try {
                // 권한에 따라 다른 엔드포인트 호출
                const profileResponse = (role === 'CLIENT')
                    ? await authApi.getClientInfo()
                    : await authApi.getEmployeeInfo()

                const profileData = profileResponse.data
                me.value = profileData
            } catch (profileError) {
                console.warn('프로필 정보를 불러오는데 실패했습니다:', profileError)
            }

            return me.value || {}
        } catch (e) {
            // API 에러 처리 (여러 경로 탐색: ApiResult.error.message 또는 ApiResult.message)
            const message = e.response?.data?.error?.message || e.response?.data?.message || e.message || '로그인 중 오류 발생'
            error.value = message
            throw new Error(message)
        } finally {
            loading.value = false
        }
    }

    async function logout() {
        me.value = null
        setToken(null)
        setRole(null)
    }

    async function initializeAuth() {
        if (!token.value || me.value) return me.value

        loading.value = true
        try {
            // 저장된 role을 기반으로 적절한 API 호출
            const profileResponse = (currentRole.value === 'CLIENT')
                ? await authApi.getClientInfo()
                : await authApi.getEmployeeInfo()

            const profileData = profileResponse.data
            me.value = profileData

            // role 정보 동기화 (필요시)
            if (profileData.role && profileData.role !== currentRole.value) {
                setRole(profileData.role)
            }
            return me.value
        } catch (profileError) {
            console.warn('인증 초기화 중 프로필 정보를 불러오는데 실패했습니다:', profileError)
            error.value = profileError.response?.data?.error?.message || profileError.message
            await logout()
            return null
        } finally {
            loading.value = false
        }
    }

    return {
        currentRole,
        token,
        me,
        loading,
        error,
        login,
        logout,
        initializeAuth,
    }
})