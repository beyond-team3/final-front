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

            // 상세 정보 조회 (me)를 통해 실제 프로필 정보를 가져옴
            try {
                const profileResponse = await authApi.getMyInfo()
                const profileData = profileResponse.data
                me.value = profileData

                // profileData에 포함된 role을 사용하여 상태 업데이트
                if (profileData.role) {
                    setRole(profileData.role)
                }
            } catch (profileError) {
                console.warn('프로필 정보를 불러오는데 실패했습니다:', profileError)
            }

            return me.value || {}
        } catch (e) {
            // API 에러 처리 (axios 에러 객체에서 메시지 추출)
            const message = e.response?.data?.message || e.message || '로그인 중 오류 발생'
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
            const profileResponse = await authApi.getMyInfo()
            const profileData = profileResponse.data
            me.value = profileData

            if (profileData.role) {
                setRole(profileData.role)
            }
            return me.value
        } catch (profileError) {
            console.warn('인증 초기화 중 프로필 정보를 불러오는데 실패했습니다:', profileError)
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