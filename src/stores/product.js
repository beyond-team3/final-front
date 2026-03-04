import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  createProduct as createProductApi,
  getProducts,
  submitFeedback as submitFeedbackApi,
  getFeedbacks as getFeedbacksApi,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
  getFavorites as getFavoritesApi,
  toggleBookmark as toggleBookmarkApi,
  getCompareHistory as getCompareHistoryApi,
  addToCompare as addToCompareApi,
  removeFromCompare as removeFromCompareApi,
  getSimilarProducts as getSimilarProductsApi,
  getCategories as getCategoriesApi
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
  const compareHistories = ref([])
  const favoriteItems = ref([])
  const serverCategories = ref([])
  const loading = ref(false)
  const error = ref(null)

  const selectedBaseProductId = ref(null)
  const similarityThreshold = ref(70)
  const similarityCriteria = ref({ ...DEFAULT_CRITERIA })
  const feedbackByProduct = ref({})
  const productNotes = ref({})

  const categoryOptions = computed(() => {
    if (serverCategories.value.length > 0) return serverCategories.value.map(c => c.name)
    return [...new Set((products.value || []).map((item) => item.category).filter(Boolean))]
  })
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
    if (authStore.me?.id) return Number(authStore.me.id)
    return 1
  }

  async function fetchProducts(params) {
    loading.value = true
    error.value = null
    try {
      const result = await getProducts(params)
      // Backend 응답 DTO를 UI 규격에 맞게 매핑
      products.value = (Array.isArray(result) ? result : []).map(p => ({
        ...p,
        category: p.category,
        price: p.priceData?.price,
        amount: p.priceData?.amount,
        unit: p.priceData?.unit,
      }))
    } catch (e) {
      error.value = getErrorMessage(e, '상품 목록 로드 실패')
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    try {
      const res = await getCategoriesApi()
      serverCategories.value = Array.isArray(res) ? res : []
    } catch (e) {
      error.value = getErrorMessage(e, 'category fetch error')
    }
  }

  async function fetchFavorites() {
    const userId = await ensureUser()
    if (!userId) return []
    try {
      const result = await getFavoritesApi()
      favoriteItems.value = Array.isArray(result)
        ? result.map(item => ({ id: item.id, productId: Number(item.id), userId: Number(userId) }))
        : []
      return favoriteItems.value
    } catch (e) { return [] }
  }

  async function fetchCompareList() {
    const userId = await ensureUser()
    if (!userId) return []
    try {
      const result = await getCompareHistoryApi()
      compareHistories.value = Array.isArray(result) ? result : []
      return compareHistories.value
    } catch (e) { return [] }
  }

  const addCompareItem = async (id) => {
    const productId = Number(id)
    if (isInCompare(productId)) return { ok: true, reason: 'exists' }
    if (compareItems.value.length >= 3) return { ok: false, reason: 'limit' }

    // Staging locally
    compareItems.value.push({ id: Date.now(), productId })
    return { ok: true, reason: 'added' }
  }

  const removeCompareItem = async (id) => {
    const productId = Number(id)
    compareItems.value = compareItems.value.filter((item) => Number(item.productId) !== productId)
    return { ok: true }
  }

  const toggleCompareItem = async (id) => {
    if (isInCompare(id)) return await removeCompareItem(id)
    return await addCompareItem(id)
  }

  const clearCompareItems = async () => {
    compareItems.value = []
  }

  const saveCompareHistoryToBackend = async (title) => {
    const productIds = compareItems.value.map(i => i.productId)
    if (productIds.length < 2) return false
    try {
      await addToCompareApi({ productIds, title })
      await fetchCompareList() // Refresh history
      return true
    } catch (e) {
      return false
    }
  }

  const deleteCompareHistory = async (compareId) => {
    try {
      await removeFromCompareApi(compareId)
      await fetchCompareList()
    } catch (e) { }
  }

  const addFavoriteItem = async (id) => {
    const productId = Number(id)
    const userId = await ensureUser()
    if (!userId || isFavorite(productId)) return
    try {
      await toggleBookmarkApi(productId)
      favoriteItems.value.push({ id: Date.now(), productId: Number(productId), userId: Number(userId) })
    } catch (e) { }
  }

  const removeFavoriteItem = async (id) => {
    const productId = Number(id)
    const prevItems = [...favoriteItems.value]
    favoriteItems.value = favoriteItems.value.filter((item) => Number(item.productId) !== productId)
    try {
      await toggleBookmarkApi(productId)
    } catch (e) {
      favoriteItems.value = prevItems // 롤백
      error.value = getErrorMessage(e, '서버 동기화 실패(즐겨찾기)')
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

  // API request logic update for feedback
  const fetchFeedbackMessages = async (pid) => {
    try {
      const res = await getFeedbacksApi(pid)
      feedbackByProduct.value[pid] = Array.isArray(res) ? res : []
    } catch (e) { }
  }

  const getFeedbackMessages = (pid) => feedbackByProduct.value[pid] || []

  const addFeedbackMessage = async (pid, content, sender, parentId = null) => {
    try {
      const payload = {
        content,
        ...(parentId != null ? { parentId } : {}),
        ...(sender ? { sender } : {}),
      }
      await submitFeedbackApi(pid, payload)
      await fetchFeedbackMessages(pid)
    } catch (e) { }
  }

  const updateFeedbackMessage = (pid, mid, content) => {
    // 로컬 상태 업데이트 (추후 백엔드 API 지원 시 연동 필요)
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

  const createProduct = async (payload) => {
    const res = await createProductApi(payload)
    if (res) await fetchProducts()
    return res
  }
  const updateProduct = async (id, payload) => {
    await updateProductApi(id, payload)
    await fetchProducts()
  }
  const deleteProduct = async (id) => {
    await deleteProductApi(id)
    await fetchProducts()
  }

  return {
    products, compareItems, compareHistories, favoriteItems, serverCategories, loading, error,
    compareProducts, favoriteProducts, categoryOptions, envOptions,
    selectedBaseProductId, similarityThreshold, similarityCriteria, enabledSimilarityKeys,
    fetchProducts, fetchCategories, fetchFavorites, fetchCompareList, getProductById,
    isInCompare, isFavorite, toggleCompareItem, toggleFavoriteItem,
    removeCompareItem, removeFavoriteItem, clearCompareItems,
    saveCompareHistoryToBackend, deleteCompareHistory,
    setSelectedBaseProduct, setSimilarityThreshold, setSimilarityCriterion,
    getSimilarityScore, getSimilarProducts, fetchFeedbackMessages, getFeedbackMessages, addFeedbackMessage,
    updateFeedbackMessage, deleteFeedbackMessage, getProductNote, setProductNote,
    createProduct, updateProduct, deleteProduct
  }
})
