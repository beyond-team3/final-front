import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: '신녹광고추',
    category: '고추',
    desc: '녹광의 상품성과 맛이 더 좋아진 맛있는 고추입니다. 바이러스에 특히 강합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1596502202029-281b37f44d82?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1000, unit: '립', price: 50000 },
    tags: {
      env: ['노지', '시설하우스'],
      res: ['탄저병', '바이러스', '역병'],
      growth: ['조생종'],
      quality: ['고당도', '착색우수'],
      conv: ['초세강', '착과용이'],
    },
  },
  {
    id: 2,
    name: '꿀모닝참외',
    category: '참외',
    desc: '아삭한 식감과 높은 당도를 자랑하는 대표 참외 품종입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 18000 },
    tags: {
      env: ['시설하우스', '가정원예'],
      res: ['시들음병'],
      growth: ['중생종'],
      quality: ['고당도', '저장성우수', '대과종'],
      conv: ['밀식적응'],
    },
  },
  {
    id: 3,
    name: '티탄대파',
    category: '파',
    desc: '추위에 강하고 연백부가 길어 상품성이 우수한 겨울 대파입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1618426569766-4c478df852bb?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 7200 },
    tags: {
      env: ['노지', '고랭지'],
      res: ['무름병'],
      growth: ['만생종'],
      quality: ['저장성우수'],
      conv: ['초세강', '작업용이'],
    },
  },
  {
    id: 4,
    name: '스피드꿀수박',
    category: '수박',
    desc: '저온기 비대력이 우수하고 당도가 13Brix 이상 나오는 고품질 수박입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 4100 },
    tags: {
      env: ['시설하우스'],
      res: ['탄저병', '역병'],
      growth: ['조생종', '극조생'],
      quality: ['고당도', '대과종'],
      conv: ['착과용이'],
    },
  },
  {
    id: 5,
    name: '불암3호배추',
    category: '배추',
    desc: '속이 노랗고 맛이 고소하며, 김장용으로 가장 인기가 많은 배추입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 3600 },
    tags: {
      env: ['노지'],
      res: ['무름병', '바이러스'],
      growth: ['중생종'],
      quality: ['저장성우수', '대과종'],
      conv: ['재배용이'],
    },
  },
  {
    id: 6,
    name: '청정백다다기오이',
    category: '오이',
    desc: '쓴맛이 없고 과형이 바르며 수확량이 많은 다수확 오이 품종입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1552642986-ccb41e7059e7?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 9200 },
    tags: {
      env: ['시설하우스', '가정원예'],
      res: ['바이러스'],
      growth: ['조생종'],
      quality: ['저장성우수', '착색우수'],
      conv: ['착과용이', '밀식적응'],
    },
  },
  {
    id: 7,
    name: '청운무',
    category: '무',
    desc: '뿌리가 매끈하고 바람들이가 적어 저장성이 매우 뛰어난 가을 무입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 2400 },
    tags: {
      env: ['노지', '고랭지'],
      res: ['시들음병'],
      growth: ['만생종'],
      quality: ['저장성우수', '대과종'],
      conv: ['작업용이'],
    },
  },
  {
    id: 8,
    name: '썸머킹토마토',
    category: '토마토',
    desc: '여름철 고온기에도 착과가 잘 되고 단단하여 유통성이 좋은 완숙 토마토입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 12500 },
    tags: {
      env: ['시설하우스'],
      res: ['시들음병', '바이러스', '역병'],
      growth: ['중생종'],
      quality: ['고당도', '저장성우수'],
      conv: ['초세강'],
    },
  },
  {
    id: 9,
    name: '대학찰옥수수',
    category: '옥수수',
    desc: '껍질이 얇아 식감이 부드럽고 쫀득쫀득한 맛이 일품인 찰옥수수입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80',
    priceData: { amount: 1, unit: 'kg', price: 5300 },
    tags: {
      env: ['노지', '가정원예'],
      res: [],
      growth: ['조생종'],
      quality: ['고당도'],
      conv: ['초세강', '밀식적응'],
    },
  },
]

const DEFAULT_CRITERIA = {
  env: true,
  res: true,
  growth: true,
  quality: true,
  conv: true,
}

const DEFAULT_FEEDBACK_MESSAGES = [
  { id: 1, sender: '김철수 대리', content: '작년 대비 수확량이 좋아졌다는 피드백이 많습니다.', isMine: false, createdAt: new Date().toISOString() },
  { id: 2, sender: '이영희 과장', content: '탄저병 저항성이 안정적이라 추천 반응이 좋았습니다.', isMine: false, createdAt: new Date().toISOString() },
  { id: 3, sender: '박민수 사원', content: '가격 경쟁력은 조금 더 보강이 필요해 보입니다.', isMine: false, createdAt: new Date().toISOString() },
]

const SIMILARITY_KEYS = ['env', 'res', 'growth', 'quality', 'conv']

export const useProductStore = defineStore('product', () => {
  // TODO: API 연결
  const products = ref([...MOCK_PRODUCTS])
  const compareItems = ref([])
  const favoriteItems = ref([])

  const selectedBaseProductId = ref(null)
  const similarityThreshold = ref(70)
  const similarityCriteria = ref({ ...DEFAULT_CRITERIA })

  const feedbackByProduct = ref({})
  const productNotes = ref({})

  const categoryOptions = computed(() => [...new Set(products.value.map((item) => item.category))])

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

  const getProductById = (id) => products.value.find((item) => item.id === Number(id))

  const isInCompare = (id) => compareItems.value.includes(Number(id))
  const isFavorite = (id) => favoriteItems.value.includes(Number(id))

  const addCompareItem = (id) => {
    const productId = Number(id)
    if (compareItems.value.includes(productId)) {
      return { ok: true, reason: 'exists' }
    }

    if (compareItems.value.length >= 3) {
      return { ok: false, reason: 'limit' }
    }

    compareItems.value.push(productId)
    return { ok: true, reason: 'added' }
  }

  const removeCompareItem = (id) => {
    const productId = Number(id)
    compareItems.value = compareItems.value.filter((item) => item !== productId)
  }

  const toggleCompareItem = (id) => {
    if (isInCompare(id)) {
      removeCompareItem(id)
      return { ok: true, reason: 'removed' }
    }

    return addCompareItem(id)
  }

  const clearCompareItems = () => {
    compareItems.value = []
  }

  const addFavoriteItem = (id) => {
    const productId = Number(id)
    if (favoriteItems.value.includes(productId)) {
      return
    }

    favoriteItems.value.push(productId)
  }

  const removeFavoriteItem = (id) => {
    const productId = Number(id)
    favoriteItems.value = favoriteItems.value.filter((item) => item !== productId)
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
      .filter((item) => item.id !== baseProduct.id)
      .map((item) => ({
        ...item,
        similarity: getSimilarityScore(baseProduct.id, item.id, keys),
      }))
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
  }

  const ensureFeedbackMessages = (productId) => {
    const key = Number(productId)
    if (!feedbackByProduct.value[key]) {
      feedbackByProduct.value[key] = DEFAULT_FEEDBACK_MESSAGES.map((item) => ({
        ...item,
        id: Number(`${key}${item.id}`),
      }))
    }

    return feedbackByProduct.value[key]
  }

  const getFeedbackMessages = (productId) => {
    const key = Number(productId)
    if (!key) {
      return []
    }

    return ensureFeedbackMessages(key)
  }

  const addFeedbackMessage = (productId, content, sender = '나') => {
    const key = Number(productId)
    if (!key || !content?.trim()) {
      return
    }

    const list = ensureFeedbackMessages(key)
    const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1
    list.push({
      id: nextId,
      sender,
      content: content.trim(),
      isMine: true,
      createdAt: new Date().toISOString(),
    })
  }

  const updateFeedbackMessage = (productId, messageId, content) => {
    const key = Number(productId)
    if (!key || !content?.trim()) {
      return false
    }

    const list = ensureFeedbackMessages(key)
    const target = list.find((item) => item.id === Number(messageId) && item.isMine)
    if (!target) {
      return false
    }

    target.content = content.trim()
    return true
  }

  const deleteFeedbackMessage = (productId, messageId) => {
    const key = Number(productId)
    if (!key) {
      return false
    }

    const list = ensureFeedbackMessages(key)
    const before = list.length
    feedbackByProduct.value[key] = list.filter((item) => !(item.id === Number(messageId) && item.isMine))
    return before !== feedbackByProduct.value[key].length
  }

  const getProductNote = (productId) => productNotes.value[Number(productId)] || ''

  const setProductNote = (productId, text) => {
    productNotes.value = {
      ...productNotes.value,
      [Number(productId)]: text,
    }
  }

  const createProduct = (payload) => {
    const nextId = products.value.reduce((max, item) => Math.max(max, item.id), 0) + 1
    products.value.unshift({
      id: nextId,
      ...payload,
    })
  }

  const updateProduct = (id, payload) => {
    const productId = Number(id)
    products.value = products.value.map((item) => {
      if (item.id !== productId) {
        return item
      }

      return {
        ...item,
        ...payload,
      }
    })
  }

  const deleteProduct = (id) => {
    const productId = Number(id)
    products.value = products.value.filter((item) => item.id !== productId)
    removeCompareItem(productId)
    removeFavoriteItem(productId)

    if (selectedBaseProductId.value === productId) {
      selectedBaseProductId.value = null
    }

    delete feedbackByProduct.value[productId]
    delete productNotes.value[productId]
  }

  return {
    products,
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
