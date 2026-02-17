import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMyInfo, login as loginApi, logout as logoutApi } from '@/api/auth'

const ROLE_KEY = 'currentRole'
const TOKEN_KEY = 'token'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return error?.response?.data?.message || error?.message || fallback
}

export const useAuthStore = defineStore('auth', () => {
  const currentRole = ref(localStorage.getItem(ROLE_KEY) || null)
  const token = ref(localStorage.getItem(TOKEN_KEY) || null)
  const me = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const setRole = (role) => {
    currentRole.value = role

    if (role) {
      localStorage.setItem(ROLE_KEY, role)
      return
    }

    localStorage.removeItem(ROLE_KEY)
  }

  const setToken = (nextToken) => {
    token.value = nextToken

    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken)
      return
    }

    localStorage.removeItem(TOKEN_KEY)
  }

  async function login(payload) {
    loading.value = true
    error.value = null

    try {
      const result = await loginApi(payload)

      if (result?.token) {
        setToken(result.token)
      }

      if (result?.role) {
        setRole(result.role)
      }

      if (result?.user) {
        me.value = result.user
      }

      return result
    } catch (e) {
      error.value = getErrorMessage(e, '로그인에 실패했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMyInfo() {
    loading.value = true
    error.value = null

    try {
      me.value = await getMyInfo()
      return me.value
    } catch (e) {
      error.value = getErrorMessage(e, '사용자 정보를 불러오지 못했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null

    try {
      if (token.value) {
        await logoutApi()
      }
    } catch (e) {
      error.value = getErrorMessage(e, '로그아웃 처리 중 오류가 발생했습니다.')
    } finally {
      me.value = null
      setToken(null)
      setRole(null)
      loading.value = false
    }
  }

  return {
    currentRole,
    token,
    me,
    loading,
    error,
    setRole,
    setToken,
    login,
    fetchMyInfo,
    logout,
  }
})
