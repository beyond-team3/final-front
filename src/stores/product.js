import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { getMyInfo } from '@/api/auth'
import {
  createProduct as createProductApi,
  getProducts,
  submitFeedback,
  updateProduct as updateProductApi,
  getFavorites as getFavoritesApi,
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
  getCompareList as getCompareListApi,
  addToCompare as addToCompareApi,
  removeFromCompare as removeFromCompareApi,
} from '@/api/product'

const DEFAULT_CRITERIA = { env: true, res: true, growth: true, quality: true, conv: true }
const SIMILARITY_KEYS = ['env', 'res', 'growth', 'quality', 'conv']

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return error?.response?.data?.message || error?.message || fallback
}

export const useProductStore = defineStore('product', () => {
  const authStore = useAuthStore()
  const products = ref([])
  const compareItems = ref([])
  const favoriteItems = ref([])
  const loading = ref(false)
  const error = ref(null)

  const selectedBaseProductId = ref(null)
  const similarityThreshold = ref(70)
  const similarityCriteria = ref({ ...DEFAULT_CRITERIA })
  const feedbackByProduct = ref({})
  const productNotes = ref({})

  const categoryOptions = computed(() => [...new Set((products.value || []).map((item) => item.category).filter(Boolean))])
  const envOptions = computed(() => {
    const all = (products.value || []).flatMap((item) => item.tags?.env || [])
    return [...new Set(all)]
  })

  const compareProducts = computed(() => (compareItems.value || [])
    .map((item) => getProductById(item.productId))
    .filter(Boolean))

  const favoriteProducts = computed(() => (favoriteItems.value || [])
    .map((item) => getProductById(item.productId))
    .filter(Boolean))

  const enabledSimilarityKeys = computed(() => SIMILARITY_KEYS.filter((key) => similarityCriteria.value[key]))

  const getProductById = (id) => (products.value || []).find((item) => Number(item.id) === Number(id))
  const isInCompare = (id) => (compareItems.value || []).some((item) => Number(item.productId) === Number(id))
  const isFavorite = (id) => (favoriteItems.value || []).some((item) => Number(item.productId) === Number(id))

  async function ensureUser() {
    if (authStore.me?.id) return authStore.me.id
    try {
      const myInfo = await getMyInfo()
      if (myInfo?.id) {
        authStore.me = myInfo
        return myInfo.id
      }
    } catch (e) {}
    return null
  }

  async function fetchProducts(params) {
    loading.value = true
    error.value = null
    try {
      const result = await getProducts(params)
      products.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = getErrorMessage(e, '상품 목록 로드 실패')
    } finally {
      loading.value = false
    }
  }

  async function fetchFavorites() {
    const userId = await ensureUser()
    if (!userId) return []
    try {
      const result = await getFavoritesApi()
      favoriteItems.value = Array.isArray(result) 
        ? result.filter(item => Number(item.userId) === Number(userId))
            .map(item => ({ id: item.id, productId: Number(item.productId), userId: Number(item.userId) }))
        : []
      return favoriteItems.value
    } catch (e) { return [] }
  }

  async function fetchCompareList() {
    const userId = await ensureUser()
    if (!userId) return []
    try {
      const result = await getCompareListApi()
      compareItems.value = Array.isArray(result)
        ? result.filter(item => Number(item.userId) === Number(userId))
            .map(item => ({ id: item.id, productId: Number(item.productId), userId: Number(item.userId) }))
        : []
      return compareItems.value
    } catch (e) { return [] }
  }

  const addCompareItem = async (id) => {
    const productId = Number(id)
    const userId = await ensureUser()
    if (!userId) return { ok: false, reason: 'unauthorized' }
    if (isInCompare(productId)) return { ok: true, reason: 'exists' }
    if (compareItems.value.length >= 3) return { ok: false, reason: 'limit' }

    try {
      const response = await addToCompareApi({ productId, userId: Number(userId) })
      if (response) {
        compareItems.value.push({ id: response.id, productId: Number(response.productId), userId: Number(response.userId) })
      }
      return { ok: true, reason: 'added' }
    } catch (e) { return { ok: false, reason: 'error' } }
  }

  const removeCompareItem = async (id) => {
    const productId = Number(id)
    const record = compareItems.value.find(item => Number(item.productId) === productId)
    
    // 낙관적 업데이트: UI에서 먼저 제거
    compareItems.value = compareItems.value.filter((item) => Number(item.productId) !== productId)
    
    if (record?.id) {
      try {
        await removeFromCompareApi(record.id)
      } catch (e) {
        console.error('서버 동기화 실패(비교함):', e)
        // 실패하더라도 UI는 이미 지워진 상태 유지 (사용자 편의)
      }
    }
    return { ok: true }
  }

  const toggleCompareItem = async (id) => {
    if (isInCompare(id)) return await removeCompareItem(id)
    return await addCompareItem(id)
  }

  const clearCompareItems = async () => {
    const previous = [...compareItems.value]
    compareItems.value = []
    try {
      await Promise.all(previous.map(item => removeFromCompareApi(item.id)))
    } catch (e) {}
  }

  const addFavoriteItem = async (id) => {
    const productId = Number(id)
    const userId = await ensureUser()
    if (!userId || isFavorite(productId)) return
    try {
      const response = await addFavoriteApi({ productId, userId: Number(userId) })
      if (response) {
        favoriteItems.value.push({ id: response.id, productId: Number(response.productId), userId: Number(response.userId) })
      }
    } catch (e) {}
  }

  const removeFavoriteItem = async (id) => {
    const productId = Number(id)
    const record = favoriteItems.value.find(item => Number(item.productId) === productId)
    
    // 낙관적 업데이트: UI에서 먼저 제거
    favoriteItems.value = favoriteItems.value.filter((item) => Number(item.productId) !== productId)
    
    if (record?.id) {
      try {
        await removeFavoriteApi(record.id)
      } catch (e) {
        console.error('서버 동기화 실패(즐겨찾기):', e)
      }
    }
  }

  const toggleFavoriteItem = async (id) => {
    if (isFavorite(id)) await removeFavoriteItem(id)
    else await addFavoriteItem(id)
  }

  const setSelectedBaseProduct = (id) => { selectedBaseProductId.value = id ? Number(id) : null }
  const setSimilarityThreshold = (val) => { similarityThreshold.value = Number(val) }
  const setSimilarityCriterion = (key, val) => { similarityCriteria.value[key] = val }

  const getSimilarityScore = (baseId, targetId) => {
    const base = getProductById(baseId)
    const target = getProductById(targetId)
    if (!base || !target) return 0
    const keys = enabledSimilarityKeys.value
    if (!keys.length) return 0
    const scores = keys.map(k => {
      const bTags = base.tags?.[k] || [], tTags = target.tags?.[k] || []
      if (!bTags.length && !tTags.length) return 100
      const intersection = bTags.filter(t => tTags.includes(t)).length
      const union = new Set([...bTags, ...tTags]).size
      return union === 0 ? 0 : Math.round((intersection / union) * 100)
    })
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  const getSimilarProducts = (baseId, opts = {}) => {
    const base = getProductById(baseId)
    if (!base) return []
    const threshold = opts.threshold ?? similarityThreshold.value
    return (products.value || [])
      .filter(p => Number(p.id) !== Number(base.id))
      .map(p => ({ ...p, similarity: getSimilarityScore(base.id, p.id) }))
      .filter(p => p.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
  }

  const getFeedbackMessages = (pid) => feedbackByProduct.value[pid] || []
  const addFeedbackMessage = (pid, content) => {
    const msg = { id: Date.now(), content, sender: '나', isMine: true, createdAt: new Date().toISOString() }
    feedbackByProduct.value[pid] = [...getFeedbackMessages(pid), msg]
    submitFeedback(pid, msg).catch(() => {})
  }
  const updateFeedbackMessage = (pid, mid, content) => {
    const msgs = getFeedbackMessages(pid)
    const idx = msgs.findIndex(m => m.id === mid && m.isMine)
    if (idx < 0) return false
    msgs[idx].content = content
    return true
  }
  const deleteFeedbackMessage = (pid, mid) => {
    feedbackByProduct.value[pid] = getFeedbackMessages(pid).filter(m => !(m.id === mid && m.isMine))
  }

  const getProductNote = (pid) => productNotes.value[pid] || ''
  const setProductNote = (pid, text) => { productNotes.value[pid] = text }

  const createProduct = (payload) => {
    createProductApi(payload).then(res => { if (res) products.value.unshift(res) })
  }
  const updateProduct = (id, payload) => {
    updateProductApi(id, payload).then(res => {
      if (res) products.value = products.value.map(p => Number(p.id) === Number(id) ? res : p)
    })
  }
  const deleteProduct = (id) => {
    products.value = (products.value || []).filter(p => Number(p.id) !== Number(id))
  }

  return {
    products, compareItems, favoriteItems, loading, error,
    compareProducts, favoriteProducts, categoryOptions, envOptions,
    selectedBaseProductId, similarityThreshold, similarityCriteria, enabledSimilarityKeys,
    fetchProducts, fetchFavorites, fetchCompareList, getProductById,
    isInCompare, isFavorite, toggleCompareItem, toggleFavoriteItem,
    removeCompareItem, removeFavoriteItem, clearCompareItems,
    setSelectedBaseProduct, setSimilarityThreshold, setSimilarityCriterion,
    getSimilarityScore, getSimilarProducts, getFeedbackMessages, addFeedbackMessage,
    updateFeedbackMessage, deleteFeedbackMessage, getProductNote, setProductNote,
    createProduct, updateProduct, deleteProduct
  }
})