import { defineStore } from 'pinia'
import { ref } from 'vue'

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
            const response = await fetch(`http://localhost:3001/users?loginId=${loginId}`)
            const users = await response.json()
            const account = users[0]

            if (!account) {
                throw new Error('등록되지 않은 사용자입니다.')
            }

            if (account.password !== password) {
                throw new Error('비밀번호가 일치하지 않습니다.')
            }

            let detailData = {}
            if (account.refId) {
                const table = account.role === 'CLIENT' ? 'clients' : 'employees'
                const detailRes = await fetch(`http://localhost:3001/${table}/${account.refId}`)
                if (detailRes.ok) {
                    detailData = await detailRes.json()
                }
            }

            // 5. [성공] 스토어 상태 업데이트
            const finalUser = { ...detailData, ...account  }
            me.value = finalUser
            setToken('fake-jwt-token-for-now') // 임시 토큰
            setRole(account.role)

            return finalUser
        } catch (e) {
            error.value = e.message || '로그인 중 오류 발생'
            throw e
        } finally {
            loading.value = false
        }
    }

    async function logout() {
        me.value = null
        setToken(null)
        setRole(null)
    }

    return {
        currentRole,
        token,
        me,
        loading,
        error,
        login,
        logout,
    }
})