import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
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

const DEFAULT_CRITERIA = {
  env: true,
  res: true,
  growth: true,
  quality: true,
  conv: true,
}

const SIMILARITY_KEYS = ['env', 'res', 'growth', 'quality', 'conv']

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return error?.response?.data?.message || error?.message || fallback
}

function toId(item) {
  if (typeof item === 'number' || typeof item === 'string') {
    return Number(item)
  }

  if (item && typeof item === 'object') {
    return Number(item.productId ?? item.id)
  }

  return NaN
}

export const useProductStore = defineStore('product', () => {
  const products = ref([])
  const currentProduct = ref(null)
  const compareItems = ref([])
  const favoriteItems = ref([])
  const loading = ref(false)
  const error = ref(null)

  const selectedBaseProductId = ref(null)
  const similarityThreshold = ref(70)
  const similarityCriteria = ref({ ...DEFAULT_CRITERIA })

  const feedbackByProduct = ref({})
  const productNotes = ref({})

  const categoryOptions = computed(() => [...new Set(products.value.map((item) => item.category).filter(Boolean))])

  const envOptions = computed(() => {
    const all = products.value.flatMap((item) => item.tags?.env || [])
    return [...new Set(all)]
  })

  const compareProducts = computed(() => compareItems.value
    .map((id) => getProductById(id))
    .filter(Boolean))

  const favoriteProducts = computed(() => favoriteItems.value
    .map((id) => getProductById(id))
    .filter(Boolean))

  const enabledSimilarityKeys = computed(() => SIMILARITY_KEYS.filter((key) => similarityCriteria.value[key]))

  const getProductById = (id) => products.value.find((item) => Number(item.id) === Number(id))

  const isInCompare = (id) => compareItems.value.includes(Number(id))
  const isFavorite = (id) => favoriteItems.value.includes(Number(id))

  async function fetchProducts(params) {
    loading.value = true
    error.value = null

    try {
      const result = await getProducts(params)
      products.value = Array.isArray(result) ? result : []
      return products.value
    } catch (e) {
      error.value = getErrorMessage(e, '상품 목록을 불러오지 못했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  // API를 사용하여 즐겨찾기 목록 불러오기
  async function fetchFavorites() {
    try {
      const result = await getFavoritesApi()
      // API 응답 구조에 따라 수정 필요 (여기선 ID 배열 또는 객체 배열 가정)
      // 만약 객체 배열로 온다면 map으로 ID 추출 필요
      const ids = Array.isArray(result) 
        ? result.map(item => typeof item === 'object' ? item.productId : item)
        : []
      favoriteItems.value = ids.map(Number).filter(id => !isNaN(id))
      return favoriteItems.value
    } catch (e) {
      console.error('즐겨찾기 목록 로드 실패', e)
      return []
    }
  }

  // API를 사용하여 비교함 목록 불러오기
  async function fetchCompareList() {
    try {
      const result = await getCompareListApi()
      const ids = Array.isArray(result)
        ? result.map(item => typeof item === 'object' ? item.productId : item)
        : []
      compareItems.value = ids.map(Number).filter(id => !isNaN(id))
      return compareItems.value
    } catch (e) {
      console.error('비교함 목록 로드 실패', e)
      return []
    }
  }

  const addCompareItem = async (id) => {
    const productId = Number(id)
    if (compareItems.value.includes(productId)) {
      return { ok: true, reason: 'exists' }
    }

    if (compareItems.value.length >= 3) {
      return { ok: false, reason: 'limit' }
    }

    // 낙관적 업데이트
    compareItems.value.push(productId)
    
    try {
      await addToCompareApi(productId)
      return { ok: true, reason: 'added' }
    } catch (e) {
      // 실패 시 롤백
      compareItems.value = compareItems.value.filter(item => item !== productId)
      error.value = getErrorMessage(e, '비교함 추가 실패')
      return { ok: false, reason: 'error' }
    }
  }

  const removeCompareItem = async (id) => {
    const productId = Number(id)
    const previous = [...compareItems.value]
    compareItems.value = compareItems.value.filter((item) => item !== productId)
    
    try {
      await removeFromCompareApi(productId)
    } catch (e) {
      compareItems.value = previous
      error.value = getErrorMessage(e, '비교함 삭제 실패')
    }
  }

  const toggleCompareItem = (id) => {
    if (isInCompare(id)) {
      removeCompareItem(id)
      return { ok: true, reason: 'removed' }
    }

    return addCompareItem(id)
  }

  const clearCompareItems = async () => {
    const previous = [...compareItems.value]
    compareItems.value = []
    
    try {
      const results = await Promise.allSettled(previous.map(id => removeFromCompareApi(id)))
      
      const failed = results
        .map((result, index) => result.status === 'rejected' ? previous[index] : null)
        .filter(id => id !== null)

      if (failed.length > 0) {
        compareItems.value = failed
        error.value = '일부 항목을 비교함에서 삭제하지 못했습니다.'
      }
    } catch (e) {
      compareItems.value = previous
      error.value = getErrorMessage(e, '비교함 초기화 실패')
    }
  }

  const addFavoriteItem = async (id) => {
    const productId = Number(id)
    if (favoriteItems.value.includes(productId)) {
      return
    }

    favoriteItems.value.push(productId)
    
    try {
      await addFavoriteApi(productId)
    } catch (e) {
      favoriteItems.value = favoriteItems.value.filter(item => item !== productId)
      error.value = getErrorMessage(e, '즐겨찾기 추가 실패')
    }
  }

  const removeFavoriteItem = async (id) => {
    const productId = Number(id)
    const previous = [...favoriteItems.value]
    favoriteItems.value = favoriteItems.value.filter((item) => item !== productId)
    
    try {
      await removeFavoriteApi(productId)
    } catch (e) {
      favoriteItems.value = previous
      error.value = getErrorMessage(e, '즐겨찾기 삭제 실패')
    }
  }

  const toggleFavoriteItem = (id) => {
    if (isFavorite(id)) {
      removeFavoriteItem(id)
      return
    }

    addFavoriteItem(id)
  }

  const setSelectedBaseProduct = (id) => {
    selectedBaseProductId.value = id ? Number(id) : null
  }

  const clearSelectedBaseProduct = () => {
    selectedBaseProductId.value = null
  }

  const setSimilarityThreshold = (value) => {
    const next = Number(value)
    if (Number.isNaN(next)) {
      return
    }

    similarityThreshold.value = Math.min(100, Math.max(0, next))
  }

  const setSimilarityCriterion = (key, checked) => {
    if (!Object.prototype.hasOwnProperty.call(similarityCriteria.value, key)) {
      return
    }

    similarityCriteria.value = {
      ...similarityCriteria.value,
      [key]: Boolean(checked),
    }
  }

  const resetSimilarityOptions = () => {
    similarityThreshold.value = 70
    similarityCriteria.value = { ...DEFAULT_CRITERIA }
  }

  const calcTagScore = (baseTags = [], targetTags = []) => {
    if (!baseTags.length && !targetTags.length) {
      return 100
    }

    const baseSet = new Set(baseTags)
    const targetSet = new Set(targetTags)
    const union = new Set([...baseSet, ...targetSet])
    if (union.size === 0) {
      return 0
    }

    const intersectionCount = [...baseSet].filter((item) => targetSet.has(item)).length
    return Math.round((intersectionCount / union.size) * 100)
  }

  const getSimilarityScore = (baseId, targetId, customKeys = null) => {
    const baseProduct = getProductById(baseId)
    const targetProduct = getProductById(targetId)
    if (!baseProduct || !targetProduct) {
      return 0
    }

    const keys = (customKeys && customKeys.length ? customKeys : enabledSimilarityKeys.value)
    if (!keys.length) {
      return 0
    }

    const scores = keys.map((key) => calcTagScore(baseProduct.tags?.[key] || [], targetProduct.tags?.[key] || []))
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }

  const getSimilarProducts = (baseId, options = {}) => {
    const baseProduct = getProductById(baseId)
    if (!baseProduct) {
      return []
    }

    const threshold = Number(options.threshold ?? similarityThreshold.value)
    const keys = options.criteriaKeys || enabledSimilarityKeys.value

    return products.value
      .filter((item) => Number(item.id) !== Number(baseProduct.id))
      .map((item) => ({
        ...item,
        similarity: getSimilarityScore(baseProduct.id, item.id, keys),
      }))
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
  }

  const getFeedbackMessages = (productId) => feedbackByProduct.value[Number(productId)] || []

  const addFeedbackMessage = (productId, content, sender = '나') => {
    const key = Number(productId)
    if (!key || !content?.trim()) {
      return
    }

    const list = [...(feedbackByProduct.value[key] || [])]
    const nextId = Date.now()
    const next = {
      id: nextId,
      sender,
      content: content.trim(),
      isMine: true,
      createdAt: new Date().toISOString(),
    }

    feedbackByProduct.value = {
      ...feedbackByProduct.value,
      [key]: [...list, next],
    }

    submitFeedback(key, next).catch((e) => {
      error.value = getErrorMessage(e, '피드백 등록에 실패했습니다.')
    })
  }

  const updateFeedbackMessage = (productId, messageId, content) => {
    const key = Number(productId)
    if (!key || !content?.trim()) {
      return false
    }

    const list = [...(feedbackByProduct.value[key] || [])]
    const index = list.findIndex((item) => item.id === Number(messageId) && item.isMine)
    if (index < 0) {
      return false
    }

    list[index] = {
      ...list[index],
      content: content.trim(),
    }

    feedbackByProduct.value = {
      ...feedbackByProduct.value,
      [key]: list,
    }

    return true
  }

  const deleteFeedbackMessage = (productId, messageId) => {
    const key = Number(productId)
    if (!key) {
      return false
    }

    const list = [...(feedbackByProduct.value[key] || [])]
    const next = list.filter((item) => !(item.id === Number(messageId) && item.isMine))
    const changed = next.length !== list.length

    if (changed) {
      feedbackByProduct.value = {
        ...feedbackByProduct.value,
        [key]: next,
      }
    }

    return changed
  }

  const getProductNote = (productId) => productNotes.value[Number(productId)] || ''

  const setProductNote = (productId, text) => {
    productNotes.value = {
      ...productNotes.value,
      [Number(productId)]: text,
    }
  }

  const createProduct = (payload) => {
    const optimistic = {
      id: `temp-${Date.now()}`,
      ...payload,
    }

    products.value.unshift(optimistic)

    createProductApi(payload)
      .then((created) => {
        if (!created) {
          return
        }

        const index = products.value.findIndex((item) => String(item.id) === String(optimistic.id))
        if (index >= 0) {
          products.value[index] = created
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '상품 등록에 실패했습니다.')
        products.value = products.value.filter((item) => String(item.id) !== String(optimistic.id))
      })
  }

  const updateProduct = (id, payload) => {
    const productId = Number(id)
    const previous = getProductById(productId)

    products.value = products.value.map((item) => {
      if (Number(item.id) !== productId) {
        return item
      }

      return {
        ...item,
        ...payload,
      }
    })

    updateProductApi(productId, payload)
      .then((updated) => {
        if (!updated) {
          return
        }

        products.value = products.value.map((item) => {
          if (Number(item.id) !== productId) {
            return item
          }
          return {
            ...item,
            ...updated,
          }
        })
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '상품 수정에 실패했습니다.')

        if (previous) {
          products.value = products.value.map((item) => {
            if (Number(item.id) !== productId) {
              return item
            }
            return previous
          })
        }
      })
  }

  const deleteProduct = (id) => {
    const productId = Number(id)
    
    // 1. 상품 목록에서 제거
    products.value = products.value.filter((item) => Number(item.id) !== productId)
    
    // 2. 비교함/즐겨찾기에서 제거 (메모리 상태)
    const wasInCompare = compareItems.value.includes(productId)
    const wasFavorite = favoriteItems.value.includes(productId)
    
    compareItems.value = compareItems.value.filter((item) => item !== productId)
    favoriteItems.value = favoriteItems.value.filter((item) => item !== productId)

    // 3. 서버 API 동기화 (비교함/즐겨찾기 삭제)
    if (wasInCompare) {
      removeFromCompareApi(productId).catch(e => console.error('비교함 동기화 실패', e))
    }
    if (wasFavorite) {
      removeFavoriteApi(productId).catch(e => console.error('즐겨찾기 동기화 실패', e))
    }

    if (selectedBaseProductId.value === productId) {
      selectedBaseProductId.value = null
    }

    delete feedbackByProduct.value[productId]
    delete productNotes.value[productId]
  }

  async function initialize() {
    // 중복 호출 방지: fetchProducts는 각 View에서 호출
    await Promise.all([
      fetchFavorites(),
      fetchCompareList(),
    ])
  }

  void initialize()

  return {
    products,
    currentProduct,
    compareItems,
    favoriteItems,
    compareProducts,
    favoriteProducts,
    categoryOptions,
    envOptions,
    selectedBaseProductId,
    similarityThreshold,
    similarityCriteria,
    enabledSimilarityKeys,
    loading,
    error,
    fetchProducts,
    fetchFavorites,
    fetchCompareList,
    getProductById,
    isInCompare,
    isFavorite,
    addCompareItem,
    removeCompareItem,
    toggleCompareItem,
    clearCompareItems,
    addFavoriteItem,
    removeFavoriteItem,
    toggleFavoriteItem,
    setSelectedBaseProduct,
    clearSelectedBaseProduct,
    setSimilarityThreshold,
    setSimilarityCriterion,
    resetSimilarityOptions,
    getSimilarityScore,
    getSimilarProducts,
    getFeedbackMessages,
    addFeedbackMessage,
    updateFeedbackMessage,
    deleteFeedbackMessage,
    getProductNote,
    setProductNote,
    createProduct,
    updateProduct,
    deleteProduct,
  }
})