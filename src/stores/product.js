import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  addFavorite,
  addToCompare,
  createProduct as createProductApi,
  getCompareList,
  getFavorites,
  getProducts,
  removeFavorite,
  removeFromCompare,
  submitFeedback,
  updateProduct as updateProductApi,
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

function normalizeIdList(list) {
  if (!Array.isArray(list)) {
    return []
  }

  return list
    .map((item) => toId(item))
    .filter((id) => !Number.isNaN(id))
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

  async function fetchFavorites() {
    try {
      favoriteItems.value = normalizeIdList(await getFavorites())
      return favoriteItems.value
    } catch (e) {
      error.value = getErrorMessage(e, '즐겨찾기 목록을 불러오지 못했습니다.')
      return favoriteItems.value
    }
  }

  async function fetchCompareList() {
    try {
      compareItems.value = normalizeIdList(await getCompareList())
      return compareItems.value
    } catch (e) {
      error.value = getErrorMessage(e, '비교 목록을 불러오지 못했습니다.')
      return compareItems.value
    }
  }

  const addCompareItem = (id) => {
    const productId = Number(id)
    if (compareItems.value.includes(productId)) {
      return { ok: true, reason: 'exists' }
    }

    if (compareItems.value.length >= 3) {
      return { ok: false, reason: 'limit' }
    }

    compareItems.value.push(productId)
    addToCompare(productId).catch((e) => {
      error.value = getErrorMessage(e, '비교 목록 추가에 실패했습니다.')
      compareItems.value = compareItems.value.filter((item) => item !== productId)
    })

    return { ok: true, reason: 'added' }
  }

  const removeCompareItem = (id) => {
    const productId = Number(id)
    const prev = [...compareItems.value]
    compareItems.value = compareItems.value.filter((item) => item !== productId)

    removeFromCompare(productId).catch((e) => {
      error.value = getErrorMessage(e, '비교 목록 삭제에 실패했습니다.')
      compareItems.value = prev
    })
  }

  const toggleCompareItem = (id) => {
    if (isInCompare(id)) {
      removeCompareItem(id)
      return { ok: true, reason: 'removed' }
    }

    return addCompareItem(id)
  }

  const clearCompareItems = () => {
    const prev = [...compareItems.value]
    compareItems.value = []

    Promise.all(prev.map((id) => removeFromCompare(id))).catch((e) => {
      error.value = getErrorMessage(e, '비교 목록 초기화에 실패했습니다.')
      compareItems.value = prev
    })
  }

  const addFavoriteItem = (id) => {
    const productId = Number(id)
    if (favoriteItems.value.includes(productId)) {
      return
    }

    favoriteItems.value.push(productId)
    addFavorite(productId).catch((e) => {
      error.value = getErrorMessage(e, '즐겨찾기 추가에 실패했습니다.')
      favoriteItems.value = favoriteItems.value.filter((item) => item !== productId)
    })
  }

  const removeFavoriteItem = (id) => {
    const productId = Number(id)
    const prev = [...favoriteItems.value]
    favoriteItems.value = favoriteItems.value.filter((item) => item !== productId)

    removeFavorite(productId).catch((e) => {
      error.value = getErrorMessage(e, '즐겨찾기 삭제에 실패했습니다.')
      favoriteItems.value = prev
    })
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

  const addFeedbackMessage = (productId, content, sender = '나', parentId = null) => {
    const key = Number(productId)
    if (!key || !content?.trim()) {
      return
    }

    const list = [...(feedbackByProduct.value[key] || [])]
    const nextId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const next = {
      id: nextId,
      sender,
      content: content.trim(),
      isMine: true,
      parentId,
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
    products.value = products.value.filter((item) => Number(item.id) !== productId)
    compareItems.value = compareItems.value.filter((item) => item !== productId)
    favoriteItems.value = favoriteItems.value.filter((item) => item !== productId)

    if (selectedBaseProductId.value === productId) {
      selectedBaseProductId.value = null
    }

    delete feedbackByProduct.value[productId]
    delete productNotes.value[productId]
  }

  async function initialize() {
    await Promise.all([
      fetchProducts(),
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
